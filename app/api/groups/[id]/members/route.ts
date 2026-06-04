import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: Promise<{ id: string }> };

async function assertMember(supabase: Awaited<ReturnType<typeof createClient>>, groupId: string, userId: string) {
  const { data } = await supabase.from("group_members").select("role").eq("group_id", groupId).eq("user_id", userId).single();
  return data;
}

// Add member by user_id (owner only) or join via invite_code
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { user_id, invite_code } = body;

  // Join via invite code
  if (invite_code) {
    const { data: group } = await supabase.from("groups").select("id").eq("invite_code", invite_code).single();
    if (!group) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });

    const { error } = await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id, role: "member" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ group_id: group.id }, { status: 201 });
  }

  // Owner adds a specific user
  const membership = await assertMember(supabase, id, user.id);
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Only owners can add members" }, { status: 403 });
  }

  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const { error } = await supabase.from("group_members").insert({ group_id: id, user_id, role: "member" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true }, { status: 201 });
}

// Leave group
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user_id } = await request.json().catch(() => ({}));
  const targetId = user_id ?? user.id;

  // Only owners can remove others
  if (targetId !== user.id) {
    const membership = await assertMember(supabase, id, user.id);
    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Only owners can remove members" }, { status: 403 });
    }
  }

  await supabase.from("group_members").delete().eq("group_id", id).eq("user_id", targetId);
  return NextResponse.json({ success: true });
}
