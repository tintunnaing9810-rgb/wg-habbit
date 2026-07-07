"use client";

import { useEffect, useState } from "react";
import { Flame, Medal, UserCheck, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type LeaderboardEntry = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  best_streak: number;
  completion_pct: number;
  total_checkins: number;
};

type LeaderboardTableProps = {
  initialData: LeaderboardEntry[];
  type: "weekly" | "alltime";
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return (
    <span className="w-7 text-center text-sm font-semibold text-slate-400">
      {rank}
    </span>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-9 w-9 rounded-full object-cover bg-slate-100"
      />
    );
  }
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
      {initials || "?"}
    </div>
  );
}

export function LeaderboardTable({ initialData, type }: LeaderboardTableProps) {
  const [data, setData] = useState<LeaderboardEntry[]>(initialData);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      setFollowing(new Set((follows ?? []).map((f) => f.following_id)));
    }
    init();

    const channel = supabase
      .channel(`leaderboard-${type}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "habit_logs" },
        () => {
          fetch(`/api/leaderboard${type === "weekly" ? "/weekly" : ""}`)
            .then((r) => r.json())
            .then((d) => { if (d.data) setData(d.data); })
            .catch(() => {});
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [type]);

  async function toggleFollow(targetId: string) {
    if (pendingId) return;
    setPendingId(targetId);
    const supabase = createClient();
    const isFollowing = following.has(targetId);
    if (isFollowing) {
      await supabase.from("follows").delete()
        .eq("follower_id", currentUserId!)
        .eq("following_id", targetId);
      setFollowing((prev) => { const next = new Set(prev); next.delete(targetId); return next; });
    } else {
      await supabase.from("follows").insert({ follower_id: currentUserId!, following_id: targetId });
      setFollowing((prev) => new Set(prev).add(targetId));
    }
    setPendingId(null);
  }

  if (data.length === 0) {
    return (
      <div className="card p-10 text-center">
        <Medal className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm text-slate-500">No entries yet. Start logging habits to appear here!</p>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-slate-100 overflow-hidden">
      {data.map((entry, index) => {
        const rank = index + 1;
        const isSelf = entry.user_id === currentUserId;
        const isFollowing = following.has(entry.user_id);
        return (
          <div key={entry.user_id} className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 shrink-0 flex justify-center">
              <RankBadge rank={rank} />
            </div>
            <Avatar name={entry.name} avatarUrl={entry.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{entry.name}</p>
              {isSelf && <p className="text-[10px] text-indigo-500">You</p>}
            </div>
            <div className="flex shrink-0 flex-col items-center w-10">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-bold text-orange-600">{entry.best_streak}d</span>
            </div>
            <div className="shrink-0 w-10 text-right">
              <p className="text-sm font-bold text-indigo-600">{entry.completion_pct}%</p>
              <p className="text-[10px] text-slate-400">done</p>
            </div>
            <div className="shrink-0">
              {isSelf ? <div className="w-8" /> : (
                <button
                  onClick={() => toggleFollow(entry.user_id)}
                  disabled={pendingId === entry.user_id}
                  title={isFollowing ? "Unfollow" : "Follow"}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    isFollowing
                      ? "bg-indigo-100 text-indigo-600 hover:bg-red-50 hover:text-red-500"
                      : "bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                >
                  {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
