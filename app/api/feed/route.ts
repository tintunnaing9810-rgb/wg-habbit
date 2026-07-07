import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIctDateString } from "@/lib/habits";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todayStr = getIctDateString();

  const { data: logs, error } = await supabase
    .from("habit_logs")
    .select(`
      id, log_date, quantity, created_at, habit_id, user_id,
      habits!inner ( name, emoji, category, is_public ),
      users ( name, avatar_url )
    `)
    .eq("log_date", todayStr)
    .eq("habits.is_public", true)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!logs || logs.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const logIds = logs.map((l) => l.id);
  const { data: reactions } = await supabase
    .from("habit_reactions")
    .select("log_id, emoji")
    .in("log_id", logIds);

  const reactionMap = new Map<string, Map<string, number>>();
  for (const r of reactions ?? []) {
    if (!reactionMap.has(r.log_id)) reactionMap.set(r.log_id, new Map());
    const emojiMap = reactionMap.get(r.log_id)!;
    emojiMap.set(r.emoji, (emojiMap.get(r.emoji) ?? 0) + 1);
  }

  type HabitData = { name: string; emoji: string; category: string; is_public: boolean };
  type UserData = { name: string; avatar_url: string | null };

  const feedData = logs.map((log) => {
    const habit = (Array.isArray(log.habits) ? log.habits[0] : log.habits) as HabitData;
    const logUser = (Array.isArray(log.users) ? log.users[0] : log.users) as UserData | null;
    const emojiMap = reactionMap.get(log.id);
    return {
      log_id: log.id,
      log_date: log.log_date,
      created_at: log.created_at,
      quantity: log.quantity,
      user_id: log.user_id,
      habit: { name: habit?.name ?? "", emoji: habit?.emoji ?? "✅", category: habit?.category ?? "Custom" },
      user: { name: logUser?.name ?? "Unknown", avatar_url: logUser?.avatar_url ?? null },
      reactions: emojiMap ? Array.from(emojiMap.entries()).map(([emoji, count]) => ({ emoji, count })) : [],
    };
  });

  return NextResponse.json({ data: feedData });
}
