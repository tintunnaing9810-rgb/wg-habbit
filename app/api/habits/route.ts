import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getIctDateString, getIsoWeek } from "@/lib/habits";

const createHabitSchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().default("✅"),
  category: z.enum(["Health & Body", "Mind & Focus", "No Bad Habits", "Custom"]),
  frequency: z.enum(["daily", "weekdays", "x_per_week"]),
  frequency_target: z.number().int().min(1).max(7).default(1),
  target_type: z.enum(["yes_no", "quantity"]),
  target_quantity: z.number().int().min(1).nullable().optional(),
  target_unit: z.string().max(20).nullable().optional(),
  is_public: z.boolean().default(false),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todayStr = getIctDateString();
  const { year, week } = getIsoWeek(todayStr);

  // Get start of current ISO week (Monday)
  const todayDate = new Date(todayStr + "T00:00:00Z");
  const dow = todayDate.getUTCDay() || 7; // 1=Mon, 7=Sun
  const weekStart = new Date(todayDate);
  weekStart.setUTCDate(todayDate.getUTCDate() - (dow - 1));
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekEndStr = todayStr;

  // Get user profile
  const { data: userProfile } = await supabase
    .from("users")
    .select("name, avatar_url")
    .eq("id", user.id)
    .single();

  // Get active habits
  const { data: habits, error } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!habits || habits.length === 0) {
    return NextResponse.json({
      habits: [],
      userName: userProfile?.name ?? "",
      weeklyCompleted: 0,
      weeklyDue: 0,
      bestStreak: 0,
    });
  }

  // Get today's logs for all habits
  const { data: todayLogs } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", todayStr);

  // Get this week's logs for x_per_week tracking
  const { data: weekLogs } = await supabase
    .from("habit_logs")
    .select("habit_id, log_date, quantity")
    .eq("user_id", user.id)
    .gte("log_date", weekStartStr)
    .lte("log_date", weekEndStr);

  const todayLogMap = new Map((todayLogs ?? []).map((l) => [l.habit_id, l]));

  // Group week logs by habit
  const weekLogsByHabit = new Map<string, { log_date: string; quantity: number | null }[]>();
  for (const log of weekLogs ?? []) {
    if (!weekLogsByHabit.has(log.habit_id)) weekLogsByHabit.set(log.habit_id, []);
    weekLogsByHabit.get(log.habit_id)!.push(log);
  }

  const habitsWithLogs = habits.map((habit) => {
    const log = todayLogMap.get(habit.id) ?? null;
    const todayQuantity = log?.quantity ?? 0;
    // For quantity habits, only mark done when cumulative total >= target
    const isQuantityDone = habit.target_type === "quantity" && habit.target_quantity != null
      ? todayQuantity >= habit.target_quantity
      : true;
    return {
      habit,
      todayLog: log && isQuantityDone ? log : null,
      todayQuantity: habit.target_type === "quantity" ? todayQuantity : undefined,
    };
  });

  // Weekly summary: count expected vs completed for this week
  let weeklyDue = 0;
  let weeklyCompleted = 0;

  for (const habit of habits) {
    const habitWeekLogs = weekLogsByHabit.get(habit.id) ?? [];
    // A log counts as completed only if quantity target is met (for quantity habits)
    const isLogComplete = (log: { quantity: number | null }) =>
      habit.target_type === "quantity" && habit.target_quantity != null
        ? (log.quantity ?? 0) >= habit.target_quantity
        : true;
    const completedWeekLogs = habitWeekLogs.filter(isLogComplete);

    if (habit.frequency === "x_per_week") {
      weeklyDue += habit.frequency_target;
      weeklyCompleted += Math.min(completedWeekLogs.length, habit.frequency_target);
    } else {
      // Count days from week start to today
      const start = new Date(weekStartStr + "T00:00:00Z");
      const end = new Date(todayStr + "T00:00:00Z");
      for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const dowD = d.getUTCDay();
        if (habit.frequency === "weekdays" && (dowD === 0 || dowD === 6)) continue;
        weeklyDue++;
      }
      weeklyCompleted += completedWeekLogs.length;
    }
  }

  const bestStreak = Math.max(0, ...habits.map((h) => h.current_streak));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void year; void week; // suppress unused vars warning

  return NextResponse.json({
    habits: habitsWithLogs,
    userName: userProfile?.name ?? "",
    weeklyCompleted,
    weeklyDue,
    bestStreak,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = createHabitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("habits")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ habit: data }, { status: 201 });
}
