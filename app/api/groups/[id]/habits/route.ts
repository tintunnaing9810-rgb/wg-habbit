import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: Promise<{ id: string }> };

const createSchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().default("✅"),
});

export async function POST(request: Request, { params }: RouteParams) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify membership
  const { data: membership } = await supabase
    .from("group_members").select("role").eq("group_id", groupId).eq("user_id", user.id).single();
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("group_habits")
    .insert({ ...parsed.data, group_id: groupId, created_by: user.id })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ habit: data }, { status: 201 });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { habit_id } = await request.json().catch(() => ({}));
  if (!habit_id) return NextResponse.json({ error: "habit_id required" }, { status: 400 });

  // Only creator or group owner can delete
  const { data: membership } = await supabase
    .from("group_members").select("role").eq("group_id", groupId).eq("user_id", user.id).single();

  const { data: habit } = await supabase
    .from("group_habits").select("created_by").eq("id", habit_id).single();

  if (!membership || (habit?.created_by !== user.id && membership.role !== "owner")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabase.from("group_habits").delete().eq("id", habit_id);
  return NextResponse.json({ success: true });
}
