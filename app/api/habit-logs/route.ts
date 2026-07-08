import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { computeStreakUpdate, getIctDateString, getIsoWeek } from "@/lib/habits";

const createLogSchema = z.object({
  habit_id: z.string().uuid(),
  quantity: z.number().int().min(0).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = createLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { habit_id, quantity } = parsed.data;
  const todayStr = getIctDateString();

  // Verify habit ownership
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("*")
    .eq("id", habit_id)
    .eq("user_id", user.id)
    .single();

  if (habitError || !habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  // Check for existing log today
  const { data: existingLog } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("habit_id", habit_id)
    .eq("log_date", todayStr)
    .single();

  // For quantity habits: accumulate instead of blocking
  if (existingLog && habit.target_type === "quantity") {
    const prevTotal = existingLog.quantity ?? 0;
    const newTotal = prevTotal + (quantity ?? 0);

    const { data: updatedLog, error: updateError } = await supabase
      .from("habit_logs")
      .update({ quantity: newTotal })
      .eq("id", existingLog.id)
      .select()
      .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // Only update streak when crossing the target threshold for the first time
    if (habit.target_quantity && newTotal >= habit.target_quantity && prevTotal < habit.target_quantity) {
      const { data: userRecord } = await supabase
        .from("users").select("grace_week_year, grace_week_num").eq("id", user.id).single();
      const { year: currentYear, week: currentWeek } = getIsoWeek(todayStr);
      const graceUsedThisWeek =
        userRecord?.grace_week_year === currentYear && userRecord?.grace_week_num === currentWeek;

      let newStreak = habit.current_streak;
      let newBestStreak = habit.best_streak;

      if (habit.frequency === "x_per_week") {
        const todayDate = new Date(todayStr + "T00:00:00Z");
        const dow = todayDate.getUTCDay() || 7;
        const weekStart = new Date(todayDate);
        weekStart.setUTCDate(todayDate.getUTCDate() - (dow - 1));
        const weekStartStr = weekStart.toISOString().split("T")[0];
        const { data: weekLogs } = await supabase.from("habit_logs").select("id")
          .eq("habit_id", habit_id).gte("log_date", weekStartStr).lte("log_date", todayStr);
        const weekCount = weekLogs?.length ?? 0; // current log already exists
        if (weekCount === habit.frequency_target) {
          const prevWeekEnd = new Date(weekStart);
          prevWeekEnd.setUTCDate(weekStart.getUTCDate() - 1);
          const prevWeekEndStr = prevWeekEnd.toISOString().split("T")[0];
          const prevWeekStart = new Date(prevWeekEnd);
          prevWeekStart.setUTCDate(prevWeekEnd.getUTCDate() - 6);
          const { data: prevWeekLogs } = await supabase.from("habit_logs").select("id")
            .eq("habit_id", habit_id)
            .gte("log_date", prevWeekStart.toISOString().split("T")[0])
            .lte("log_date", prevWeekEndStr);
          newStreak = (prevWeekLogs?.length ?? 0) >= habit.frequency_target ? habit.current_streak + 1 : 1;
          newBestStreak = Math.max(newBestStreak, newStreak);
        }
      } else {
        const streakUpdate = computeStreakUpdate(habit.frequency, habit.current_streak, habit.last_logged_date, todayStr, graceUsedThisWeek);
        newStreak = streakUpdate.newStreak;
        newBestStreak = Math.max(habit.best_streak, newStreak);
        if (streakUpdate.useGrace) {
          await supabase.from("users").update({ grace_week_year: currentYear, grace_week_num: currentWeek }).eq("id", user.id);
        }
      }

      await supabase.from("habits").update({
        current_streak: newStreak,
        best_streak: newBestStreak,
        last_logged_date: todayStr,
      }).eq("id", habit_id);

      return NextResponse.json({ log: updatedLog, streak: newStreak, bestStreak: newBestStreak }, { status: 200 });
    }

    return NextResponse.json({ log: updatedLog, streak: habit.current_streak, bestStreak: habit.best_streak }, { status: 200 });
  }

  if (existingLog) {
    return NextResponse.json({ error: "Already checked in today" }, { status: 409 });
  }

  // Get user's grace day info
  const { data: userRecord } = await supabase
    .from("users")
    .select("grace_week_year, grace_week_num")
    .eq("id", user.id)
    .single();

  const { year: currentYear, week: currentWeek } = getIsoWeek(todayStr);
  const graceUsedThisWeek =
    userRecord?.grace_week_year === currentYear &&
    userRecord?.grace_week_num === currentWeek;

  let newStreak = habit.current_streak;
  let useGrace = false;
  let newBestStreak = habit.best_streak;

  if (habit.frequency === "x_per_week") {
    // Count logs this week
    const todayDate = new Date(todayStr + "T00:00:00Z");
    const dow = todayDate.getUTCDay() || 7;
    const weekStart = new Date(todayDate);
    weekStart.setUTCDate(todayDate.getUTCDate() - (dow - 1));
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const { data: weekLogs } = await supabase
      .from("habit_logs")
      .select("id")
      .eq("habit_id", habit_id)
      .gte("log_date", weekStartStr)
      .lte("log_date", todayStr);

    const weekCount = (weekLogs?.length ?? 0) + 1; // +1 for the current log

    if (weekCount === habit.frequency_target) {
      // Just hit the weekly quota — check if previous week also hit quota
      const prevWeekEnd = new Date(weekStart);
      prevWeekEnd.setUTCDate(weekStart.getUTCDate() - 1);
      const prevWeekEndStr = prevWeekEnd.toISOString().split("T")[0];
      const prevWeekStart = new Date(prevWeekEnd);
      prevWeekStart.setUTCDate(prevWeekEnd.getUTCDate() - 6);
      const prevWeekStartStr = prevWeekStart.toISOString().split("T")[0];

      const { data: prevWeekLogs } = await supabase
        .from("habit_logs")
        .select("id")
        .eq("habit_id", habit_id)
        .gte("log_date", prevWeekStartStr)
        .lte("log_date", prevWeekEndStr);

      if ((prevWeekLogs?.length ?? 0) >= habit.frequency_target) {
        newStreak = habit.current_streak + 1;
      } else {
        newStreak = 1;
      }
      newBestStreak = Math.max(newBestStreak, newStreak);
    }
    // if not yet hit quota, streak stays the same
  } else {
    const streakUpdate = computeStreakUpdate(
      habit.frequency,
      habit.current_streak,
      habit.last_logged_date,
      todayStr,
      graceUsedThisWeek,
    );
    newStreak = streakUpdate.newStreak;
    useGrace = streakUpdate.useGrace;
    newBestStreak = Math.max(habit.best_streak, newStreak);
  }

  // Insert log
  const { data: log, error: logError } = await supabase
    .from("habit_logs")
    .insert({
      habit_id,
      user_id: user.id,
      log_date: todayStr,
      quantity: quantity ?? null,
    })
    .select()
    .single();

  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 });
  }

  // Update habit streak
  await supabase
    .from("habits")
    .update({
      current_streak: newStreak,
      best_streak: newBestStreak,
      last_logged_date: todayStr,
    })
    .eq("id", habit_id);

  // Update grace day if used
  if (useGrace) {
    await supabase
      .from("users")
      .update({ grace_week_year: currentYear, grace_week_num: currentWeek })
      .eq("id", user.id);
  }

  return NextResponse.json({ log, streak: newStreak, bestStreak: newBestStreak }, { status: 201 });
}
