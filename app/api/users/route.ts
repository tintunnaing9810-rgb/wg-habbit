import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: users } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .neq("id", user.id)
    .order("name");

  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followingSet = new Set((follows ?? []).map((f) => f.following_id));

  return NextResponse.json({
    users: (users ?? []).map((u) => ({
      ...u,
      is_following: followingSet.has(u.id),
    })),
  });
}
