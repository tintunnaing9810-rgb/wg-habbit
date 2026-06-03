import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIctDateString } from "@/lib/habits";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todayStr = getIctDateString();

  // Find the log
  const { data: log, error: findError } = await supabase
    .from("habit_logs")
    .select("*, habits(current_streak, best_streak, last_logged_date, frequency)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (findError || !log) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  // Only allow undoing today's check-in
  if (log.log_date !== todayStr) {
    return NextResponse.json({ error: "Can only undo today's check-in" }, { status: 400 });
  }

  // Delete the log
  const { error: deleteError } = await supabase
    .from("habit_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Reset streak: find the previous log date before today
  const { data: prevLog } = await supabase
    .from("habit_logs")
    .select("log_date")
    .eq("habit_id", log.habit_id)
    .lt("log_date", todayStr)
    .order("log_date", { ascending: false })
    .limit(1)
    .single();

  // Recalculate streak conservatively: just decrement if > 0
  // More accurate would be to recompute from scratch, but decrement is safe for undo
  const habitData = (log.habits as unknown) as {
    current_streak: number;
    best_streak: number;
    last_logged_date: string | null;
  } | null;

  const currentStreak = habitData?.current_streak ?? 0;
  const newStreak = Math.max(0, currentStreak - 1);

  await supabase
    .from("habits")
    .update({
      current_streak: newStreak,
      last_logged_date: prevLog?.log_date ?? null,
    })
    .eq("id", log.habit_id);

  return NextResponse.json({ success: true });
}
