import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all users with habits
  const { data: users } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .order("name");

  if (!users || users.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const userIds = users.map((u) => u.id);

  // Get all habits for these users
  const { data: habits } = await supabase
    .from("habits")
    .select("id, user_id, frequency, frequency_target, current_streak, best_streak, created_at, is_active")
    .in("user_id", userIds)
    .eq("is_active", true);

  // Get all-time log counts per user
  const { data: logCounts } = await supabase
    .from("habit_logs")
    .select("user_id, habit_id, log_date")
    .in("user_id", userIds);

  // Build leaderboard
  const leaderboard = users
    .map((u) => {
      const userHabits = (habits ?? []).filter((h) => h.user_id === u.id);
      if (userHabits.length === 0) return null;

      const userLogs = (logCounts ?? []).filter((l) => l.user_id === u.id);
      const totalCheckins = userLogs.length;

      const bestStreak = Math.max(0, ...userHabits.map((h) => h.best_streak));

      // Compute completion %: actual logs / expected logs since each habit was created
      let totalExpected = 0;
      let totalActual = 0;

      const today = new Date(Date.now() + 7 * 60 * 60 * 1000); // ICT
      const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;

      for (const habit of userHabits) {
        const created = new Date(habit.created_at);
        // normalize to date only
        const createdStr = `${created.getUTCFullYear()}-${String(created.getUTCMonth() + 1).padStart(2, "0")}-${String(created.getUTCDate()).padStart(2, "0")}`;
        const createdDate = new Date(createdStr + "T00:00:00Z");
        const todayDate = new Date(todayStr + "T00:00:00Z");

        if (habit.frequency === "x_per_week") {
          // Count completed weeks (ISO weeks from creation to now)
          const msPerWeek = 7 * 24 * 60 * 60 * 1000;
          const weeksElapsed = Math.ceil((todayDate.getTime() - createdDate.getTime()) / msPerWeek);
          const expectedWeeks = Math.max(1, weeksElapsed);
          totalExpected += expectedWeeks * habit.frequency_target;

          const habitLogs = userLogs.filter((l) => l.habit_id === habit.id);
          totalActual += Math.min(habitLogs.length, expectedWeeks * habit.frequency_target);
        } else {
          // Count days since creation
          for (const d = new Date(createdDate); d <= todayDate; d.setUTCDate(d.getUTCDate() + 1)) {
            const dow = d.getUTCDay();
            if (habit.frequency === "weekdays" && (dow === 0 || dow === 6)) continue;
            totalExpected++;
          }
          const habitLogs = userLogs.filter((l) => l.habit_id === habit.id);
          totalActual += habitLogs.length;
        }
      }

      const completionPct = totalExpected > 0
        ? Math.min(100, Math.round((totalActual / totalExpected) * 100))
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
