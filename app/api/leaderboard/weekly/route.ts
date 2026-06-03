import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIctDateString } from "@/lib/habits";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todayStr = getIctDateString();
  const todayDate = new Date(todayStr + "T00:00:00Z");
  const dow = todayDate.getUTCDay() || 7; // 1=Mon..7=Sun
  const weekStart = new Date(todayDate);
  weekStart.setUTCDate(todayDate.getUTCDate() - (dow - 1));
  const weekStartStr = weekStart.toISOString().split("T")[0];

  // Get all users
  const { data: users } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .order("name");

  if (!users || users.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const userIds = users.map((u) => u.id);

  // Get active habits
  const { data: habits } = await supabase
    .from("habits")
    .select("id, user_id, frequency, frequency_target, current_streak, is_active")
    .in("user_id", userIds)
    .eq("is_active", true);

  // Get this week's logs
  const { data: weekLogs } = await supabase
    .from("habit_logs")
    .select("user_id, habit_id, log_date")
    .in("user_id", userIds)
    .gte("log_date", weekStartStr)
    .lte("log_date", todayStr);

  const leaderboard = users
    .map((u) => {
      const userHabits = (habits ?? []).filter((h) => h.user_id === u.id);
      if (userHabits.length === 0) return null;

      const userWeekLogs = (weekLogs ?? []).filter((l) => l.user_id === u.id);
      const totalCheckins = userWeekLogs.length;

      const bestStreak = Math.max(0, ...userHabits.map((h) => h.current_streak));

      // This week: expected vs actual
      let weeklyDue = 0;
      let weeklyCompleted = 0;

      const weekLogByHabit = new Map<string, number>();
      for (const log of userWeekLogs) {
        weekLogByHabit.set(log.habit_id, (weekLogByHabit.get(log.habit_id) ?? 0) + 1);
      }

      for (const habit of userHabits) {
        const count = weekLogByHabit.get(habit.id) ?? 0;
        if (habit.frequency === "x_per_week") {
          weeklyDue += habit.frequency_target;
          weeklyCompleted += Math.min(count, habit.frequency_target);
        } else {
          const start = new Date(weekStartStr + "T00:00:00Z");
          const end = new Date(todayStr + "T00:00:00Z");
          for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
            const dowD = d.getUTCDay();
            if (habit.frequency === "weekdays" && (dowD === 0 || dowD === 6)) continue;
            weeklyDue++;
          }
          weeklyCompleted += count;
        }
      }

      const completionPct = weeklyDue > 0
        ? Math.min(100, Math.round((weeklyCompleted / weeklyDue) * 100))
        : 0;

      return {
        user_id: u.id,
        name: u.name,
        avatar_url: u.avatar_url,
        best_streak: bestStreak,
        completion_pct: completionPct,
        total_checkins: totalCheckins,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.completion_pct - a!.completion_pct)
    .slice(0, 50);

  return NextResponse.json({ data: leaderboard });
}
