import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const followSchema = z.object({ following_id: z.string().uuid() });

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: followingRows }, { data: followerRows }] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
    supabase.from("follows").select("follower_id").eq("following_id", user.id),
  ]);

  const followingIds = (followingRows ?? []).map((r) => r.following_id);
  const followerIds = (followerRows ?? []).map((r) => r.follower_id);
  const allIds = [...new Set([...followingIds, ...followerIds])];

  if (allIds.length === 0) {
    return NextResponse.json({ following: [], followers: [] });
  }

  const { data: profiles } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .in("id", allIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const followingSet = new Set(followingIds);

  const following = followingIds
    .map((id) => {
      const p = profileMap.get(id);
      if (!p) return null;
      return { id: p.id, name: p.name, avatar_url: p.avatar_url, is_following: true };
    })
    .filter(Boolean);

  const followers = followerIds
    .map((id) => {
      const p = profileMap.get(id);
      if (!p) return null;
      return { id: p.id, name: p.name, avatar_url: p.avatar_url, is_following: followingSet.has(id) };
    })
    .filter(Boolean);

  return NextResponse.json({ following, followers });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = followSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { following_id } = parsed.data;
  if (following_id === user.id) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ success: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = followSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { following_id } = parsed.data;

  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", following_id);

  return NextResponse.json({ success: true });
}
