import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIctDateString } from "@/lib/habits";

type RouteParams = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .eq("id", userId)
    .single();

  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [{ data: habits }, { data: logs }, { data: followRow }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, emoji, category, frequency, frequency_target, current_streak, best_streak, target_type, target_quantity, target_unit, is_public, created_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("habit_logs")
      .select("id, log_date, habit_id")
      .eq("user_id", userId),
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .maybeSingle(),
  ]);

  const publicHabits = (habits ?? []).filter((h) => h.is_public);
  const totalCheckins = (logs ?? []).length;
  const bestStreak = Math.max(0, ...(habits ?? []).map((h) => Math.max(h.current_streak ?? 0, h.best_streak ?? 0)));

  const todayStr = getIctDateString();
  const todayDate = new Date(todayStr + "T00:00:00Z");
  const sevenDaysAgo = new Date(todayDate);
  sevenDaysAgo.setUTCDate(todayDate.getUTCDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const { data: recentLogs } = await supabase
    .from("habit_logs")
    .select("id, log_date, quantity, created_at, habits!inner(name, emoji, category, is_public)")
    .eq("user_id", userId)
    .eq("habits.is_public", true)
    .gte("log_date", sevenDaysAgoStr)
    .lte("log_date", todayStr)
    .order("created_at", { ascending: false })
    .limit(20);

  type HabitRef = { name: string; emoji: string; category: string; is_public: boolean };

  return NextResponse.json({
    profile: {
      ...profile,
      is_following: !!followRow,
      is_self: userId === user.id,
    },
    habits: publicHabits,
    stats: { total_checkins: totalCheckins, best_streak: bestStreak },
    recent_logs: (recentLogs ?? []).map((log) => {
      const h = (Array.isArray(log.habits) ? log.habits[0] : log.habits) as HabitRef | null;
      return {
        id: log.id,
        log_date: log.log_date,
        quantity: log.quantity,
        created_at: log.created_at,
        habit: { name: h?.name ?? "", emoji: h?.emoji ?? "✅", category: h?.category ?? "" },
      };
    }),
  });
}
