import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const reactionSchema = z.object({
  log_id: z.string().uuid(),
  emoji: z.string().min(1).max(8),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { log_id, emoji } = parsed.data;

  // Check if user already reacted to this log
  const { data: existing } = await supabase
    .from("habit_reactions")
    .select("id, emoji")
    .eq("log_id", log_id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    if (existing.emoji === emoji) {
      // Toggle off — delete
      await supabase
        .from("habit_reactions")
        .delete()
        .eq("id", existing.id);
    } else {
      // Change emoji
      await supabase
        .from("habit_reactions")
        .update({ emoji })
        .eq("id", existing.id);
    }
  } else {
    // Insert new reaction
    await supabase
      .from("habit_reactions")
      .insert({ log_id, user_id: user.id, emoji });
  }

  // Return updated reaction counts for this log
  const { data: allReactions } = await supabase
    .from("habit_reactions")
    .select("emoji")
    .eq("log_id", log_id);

  const emojiCounts = new Map<string, number>();
  for (const r of allReactions ?? []) {
    emojiCounts.set(r.emoji, (emojiCounts.get(r.emoji) ?? 0) + 1);
  }

  const reactions = Array.from(emojiCounts.entries()).map(([e, count]) => ({
    emoji: e,
    count,
  }));

  return NextResponse.json({ reactions });
}
