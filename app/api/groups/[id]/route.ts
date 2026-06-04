import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIctDateString } from "@/lib/habits";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todayStr = getIctDateString();

  // Verify membership
  const { data: myMembership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", user.id)
    .single();

  if (!myMembership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const [{ data: group }, { data: members }, { data: habits }] = await Promise.all([
    supabase.from("groups").select("*").eq("id", id).single(),
    supabase.from("group_members").select("user_id, role, joined_at").eq("group_id", id),
    supabase.from("group_habits").select("*").eq("group_id", id).order("created_at"),
  ]);

  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get member user info
  const memberIds = (members ?? []).map((m) => m.user_id);
  const { data: memberUsers } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .in("id", memberIds);

  const userMap = new Map((memberUsers ?? []).map((u) => [u.id, u]));

  // Today's logs for each habit
  const habitIds = (habits ?? []).map((h) => h.id);
  const { data: todayLogs } = habitIds.length > 0
    ? await supabase
        .from("group_habit_logs")
        .select("group_habit_id, user_id")
        .in("group_habit_id", habitIds)
        .eq("log_date", todayStr)
    : { data: [] };

  // Map: habit_id → Set of user_ids who checked in
  const checkedMap = new Map<string, Set<string>>();
  for (const log of todayLogs ?? []) {
    if (!checkedMap.has(log.group_habit_id)) checkedMap.set(log.group_habit_id, new Set());
    checkedMap.get(log.group_habit_id)!.add(log.user_id);
  }

  return NextResponse.json({
    group: { ...group, role: myMembership.role },
    members: (members ?? []).map((m) => ({
      ...m,
      user: userMap.get(m.user_id) ?? { id: m.user_id, name: "Unknown", avatar_url: null },
    })),
    habits: (habits ?? []).map((h) => ({
      ...h,
      checked_in_user_ids: Array.from(checkedMap.get(h.id) ?? []),
      my_checked_in: checkedMap.get(h.id)?.has(user.id) ?? false,
    })),
    today: todayStr,
  });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("groups").delete()
    .eq("id", id).eq("created_by", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ success: true });
}
