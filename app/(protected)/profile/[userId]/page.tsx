"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Flame, UserCheck, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  is_following: boolean;
  is_self: boolean;
};

type Habit = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  frequency: string;
  frequency_target: number;
  current_streak: number;
  best_streak: number;
  target_type: string;
  target_quantity: number | null;
  target_unit: string | null;
};

type RecentLog = {
  id: string;
  log_date: string;
  quantity: number | null;
  created_at: string;
  habit: { name: string; emoji: string; category: string };
};

type Stats = { total_checkins: number; best_streak: number };

function Avatar({ name, avatarUrl, size = "lg" }: { name: string; avatarUrl: string | null; size?: "lg" | "sm" }) {
  const dim = size === "lg" ? "h-16 w-16 text-xl" : "h-9 w-9 text-xs";
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${dim} rounded-full object-cover bg-slate-100`} />;
  }
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className={`flex ${dim} items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700`}>
      {initials || "?"}
    </div>
  );
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [followPending, setFollowPending] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) { router.replace("/dashboard"); return; }
      const d = await res.json();
      setProfile(d.profile);
      setHabits(d.habits ?? []);
      setStats(d.stats);
      setRecentLogs(d.recent_logs ?? []);
    } catch {
      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  async function toggleFollow() {
    if (!profile || followPending) return;
    setFollowPending(true);
    await fetch("/api/follows", {
      method: profile.is_following ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ following_id: profile.id }),
    });
    setProfile((p) => p ? { ...p, is_following: !p.is_following } : p);
    setFollowPending(false);
  }

  if (loading) {
    return (
      <div className="px-4 pt-3 pb-6 space-y-4">
        <div className="card h-28 animate-pulse bg-slate-100" />
        <div className="card h-20 animate-pulse bg-slate-100" />
        {[1, 2, 3].map((i) => <div key={i} className="card h-16 animate-pulse bg-slate-100" />)}
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="px-4 pt-3 pb-6 space-y-4">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 -ml-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Profile header */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <Avatar name={profile.name} avatarUrl={profile.avatar_url} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">{profile.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{habits.length} public habit{habits.length !== 1 ? "s" : ""}</p>
          </div>
          {!profile.is_self && (
            <button
              onClick={toggleFollow}
              disabled={followPending}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                profile.is_following
                  ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {profile.is_following
                ? <><UserCheck className="h-4 w-4" /> Following</>
                : <><UserPlus className="h-4 w-4" /> Follow</>}
            </button>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-orange-50 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-xl font-bold text-orange-600">{stats.best_streak}</span>
              </div>
              <p className="text-xs text-orange-500 mt-0.5">Best streak</p>
            </div>
            <div className="rounded-xl bg-indigo-50 px-4 py-3 text-center">
              <p className="text-xl font-bold text-indigo-600">{stats.total_checkins}</p>
              <p className="text-xs text-indigo-500 mt-0.5">Total check-ins</p>
            </div>
          </div>
        )}
      </div>

      {/* Public habits */}
      {habits.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Public Habits</p>
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {habits.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl w-8 text-center">{h.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{h.name}</p>
                  <p className="text-xs text-slate-400">{h.category} · {h.frequency === "daily" ? "Every day" : h.frequency === "weekdays" ? "Weekdays" : `${h.frequency_target}×/week`}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-xs font-bold text-orange-600">{h.current_streak}{h.frequency === "x_per_week" ? "w" : "d"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {habits.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-sm text-slate-500">No public habits yet</p>
        </div>
      )}

      {/* Recent activity */}
      {recentLogs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recent Activity</p>
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl w-8 text-center">{log.habit.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{log.habit.name}</p>
                  <p className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    {log.quantity !== null && ` · ${log.quantity} logged`}
                  </p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{log.log_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
