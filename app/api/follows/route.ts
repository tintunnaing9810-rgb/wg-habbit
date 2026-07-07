import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: followingRows }, { data: followerRows }] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
    supabase.from("follows").select("follower_id").eq("following_id", user.id),
  ]);

  const followingIds = (followingRows ?? []).map((f) => f.following_id);
  const followerIds = (followerRows ?? []).map((f) => f.follower_id);

  const allIds = [...new Set([...followingIds, ...followerIds])];

  let profileMap: Record<string, { id: string; name: string; avatar_url: string | null }> = {};
  if (allIds.length > 0) {
    const { data: profiles } = await supabase
      .from("users")
      .select("id, name, avatar_url")
      .in("id", allIds);
    for (const p of profiles ?? []) profileMap[p.id] = p;
  }

  const followingSet = new Set(followingIds);

  return NextResponse.json({
    following: followingIds.map((id) => ({
      ...(profileMap[id] ?? { id, name: "Unknown", avatar_url: null }),
      is_following: true,
    })),
    followers: followerIds.map((id) => ({
      ...(profileMap[id] ?? { id, name: "Unknown", avatar_url: null }),
      is_following: followingSet.has(id),
    })),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { following_id } = await request.json().catch(() => ({}));
  if (!following_id) return NextResponse.json({ error: "following_id required" }, { status: 400 });

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { following_id } = await request.json().catch(() => ({}));
  if (!following_id) return NextResponse.json({ error: "following_id required" }, { status: 400 });

  await supabase.from("follows").delete()
    .eq("follower_id", user.id)
    .eq("following_id", following_id);

  return NextResponse.json({ success: true });
}
