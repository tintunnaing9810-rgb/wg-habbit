import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ users: [] });

  const { data: users } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .ilike("name", `%${q}%`)
    .neq("id", user.id)
    .limit(20);

  const ids = (users ?? []).map((u) => u.id);
  if (ids.length === 0) return NextResponse.json({ users: [] });

  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id)
    .in("following_id", ids);

  const followingSet = new Set((follows ?? []).map((f) => f.following_id));

  return NextResponse.json({
    users: (users ?? []).map((u) => ({
      id: u.id,
      name: u.name,
      avatar_url: u.avatar_url,
      is_following: followingSet.has(u.id),
    })),
  });
}
