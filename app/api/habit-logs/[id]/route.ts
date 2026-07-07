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
    .select("*, habits(current_streak, best_streak, last_logged_date, frequency, frequency_target)")
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

  const habitData = (log.habits as unknown) as {
    current_streak: number;
    best_streak: number;
    last_logged_date: string | null;
    frequency: string;
    frequency_target: number;
  } | null;

  const currentStreak = habitData?.current_streak ?? 0;
  let newStreak = Math.max(0, currentStreak - 1);

  if (habitData?.frequency === "x_per_week") {
    // For x_per_week: only decrement if this log was the quota-completing log.
    // If remaining logs this week still meet quota, don't touch the streak.
    const todayDate = new Date(todayStr + "T00:00:00Z");
    const dow = todayDate.getUTCDay() || 7;
    const weekStart = new Date(todayDate);
    weekStart.setUTCDate(todayDate.getUTCDate() - (dow - 1));
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const { data: remainingWeekLogs } = await supabase
      .from("habit_logs")
      .select("id")
      .eq("habit_id", log.habit_id)
      .gte("log_date", weekStartStr)
      .lte("log_date", todayStr);

    const remainingCount = remainingWeekLogs?.length ?? 0;
    if (remainingCount >= habitData.frequency_target) {
      newStreak = currentStreak; // quota still met — streak unchanged
    }
    // else: this was the completing log, decrement (already set above)
  }

  await supabase
    .from("habits")
    .update({
      current_streak: newStreak,
      last_logged_date: prevLog?.log_date ?? null,
    })
    .eq("id", log.habit_id);

  return NextResponse.json({ success: true });
}
