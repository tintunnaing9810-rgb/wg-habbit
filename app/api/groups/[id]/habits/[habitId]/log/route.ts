import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIctDateString } from "@/lib/habits";

type RouteParams = { params: Promise<{ id: string; habitId: string }> };

export async function POST(_req: Request, { params }: RouteParams) {
  const { id: groupId, habitId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify membership
  const { data: membership } = await supabase
    .from("group_members").select("role").eq("group_id", groupId).eq("user_id", user.id).single();
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const todayStr = getIctDateString();

  const { error } = await supabase.from("group_habit_logs").insert({
    group_habit_id: habitId,
    user_id: user.id,
    log_date: todayStr,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { habitId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todayStr = getIctDateString();

  await supabase.from("group_habit_logs").delete()
    .eq("group_habit_id", habitId)
    .eq("user_id", user.id)
    .eq("log_date", todayStr);

  return NextResponse.json({ success: true });
}
