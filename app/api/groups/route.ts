import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getIctDateString } from "@/lib/habits";

const createGroupSchema = z.object({
  name: z.string().min(1).max(50),
  emoji: z.string().default("🏆"),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todayStr = getIctDateString();

  // Get all groups the user is a member of
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ groups: [] });
  }

  const groupIds = memberships.map((m) => m.group_id);
  const roleMap = new Map(memberships.map((m) => [m.group_id, m.role]));

  const { data: groups } = await supabase
    .from("groups")
    .select("*")
    .in("id", groupIds)
    .order("created_at", { ascending: true });

  if (!groups || groups.length === 0) return NextResponse.json({ groups: [] });

  // Member counts
  const { data: allMembers } = await supabase
    .from("group_members")
    .select("group_id, user_id")
    .in("group_id", groupIds);

  const memberCountMap = new Map<string, number>();
  for (const m of allMembers ?? []) {
    memberCountMap.set(m.group_id, (memberCountMap.get(m.group_id) ?? 0) + 1);
  }

  // Today's group habit log counts
  const { data: groupHabits } = await supabase
    .from("group_habits")
    .select("id, group_id")
    .in("group_id", groupIds);

  const habitIds = (groupHabits ?? []).map((h) => h.id);
  const habitGroupMap = new Map((groupHabits ?? []).map((h) => [h.id, h.group_id]));

  let todayLogCounts = new Map<string, number>(); // group_id → # unique members logged today
  if (habitIds.length > 0) {
    const { data: todayLogs } = await supabase
      .from("group_habit_logs")
      .select("group_habit_id, user_id")
      .in("group_habit_id", habitIds)
      .eq("log_date", todayStr);

    const checkedMembersPerGroup = new Map<string, Set<string>>();
    for (const log of todayLogs ?? []) {
      const gid = habitGroupMap.get(log.group_habit_id)!;
      if (!checkedMembersPerGroup.has(gid)) checkedMembersPerGroup.set(gid, new Set());
      checkedMembersPerGroup.get(gid)!.add(log.user_id);
    }
    for (const [gid, set] of checkedMembersPerGroup) {
      todayLogCounts.set(gid, set.size);
    }
  }

  return NextResponse.json({
    groups: groups.map((g) => ({
      ...g,
      role: roleMap.get(g.id) ?? "member",
      member_count: memberCountMap.get(g.id) ?? 0,
      checked_in_today: todayLogCounts.get(g.id) ?? 0,
    })),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: groupId, error } = await supabase.rpc("create_group", {
    group_name: parsed.data.name,
    group_emoji: parsed.data.emoji,
  });

  if (error || !groupId) return NextResponse.json({ error: error?.message ?? "Failed to create group" }, { status: 500 });

  const { data: group } = await supabase.from("groups").select("*").eq("id", groupId).single();

  return NextResponse.json({ group }, { status: 201 });
}
