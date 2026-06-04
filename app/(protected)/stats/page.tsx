"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart2, Flame, LogOut } from "lucide-react";
import { AvatarUpload } from "@/components/avatar-upload";
import { WeeklySummary } from "@/components/weekly-summary";
import { createClient } from "@/lib/supabase/client";
import type { Habit, HabitLog } from "@/types/database";

type HabitStats = {
  habit: Habit;
  last7Days: { date: string; logged: boolean }[];
};

type StatsData = {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  weeklyCompleted: number;
  weeklyDue: number;
  bestStreak: number;
  habitStats: HabitStats[];
};

function DotCalendar({ days }: { days: { date: string; logged: boolean }[] }) {
  return (
    <div className="flex gap-1">
      {days.map(({ date, logged }) => (
        <div
          key={date}
          title={date}
          className={`h-5 w-5 rounded-md ${
            logged ? "bg-indigo-500" : "bg-slate-100"
          }`}
        />
      ))}
    </div>
  );
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [namePending, setNamePending] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const fetchData = useCallback(async () => {
    try {
      const [habitsRes, userRes] = await Promise.all([
        fetch("/api/habits"),
        supabase.auth.getUser(),
      ]);

      if (!habitsRes.ok) return;
      const habitsJson = await habitsRes.json();
      const userId = userRes.data.user?.id;
      if (!userId) return;

      // Get last 7 days logs for each habit
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      const today = new Date(Date.now() + 7 * 60 * 60 * 1000);
      const last7Dates: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setUTCDate(d.getUTCDate() - i);
        const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        last7Dates.push(dateStr);
      }

      const habits: Habit[] = habitsJson.habits?.map((h: { habit: Habit }) => h.habit) ?? [];

      const habitStats: HabitStats[] = await Promise.all(
        habits.map(async (habit) => {
          const { data: logs } = await supabase
            .from("habit_logs")
            .select("log_date")
            .eq("habit_id", habit.id)
            .in("log_date", last7Dates);

          const loggedDates = new Set((logs ?? []).map((l: HabitLog) => l.log_date));

          return {
            habit,
            last7Days: last7Dates.map((date) => ({
              date,
              logged: loggedDates.has(date),
            })),
          };
        }),
      );

      const displayName = userData?.name ?? "User";
      setUserName(displayName);
      setData({
        userId,
        userName: displayName,
        avatarUrl: userData?.avatar_url ?? null,
        weeklyCompleted: habitsJson.weeklyCompleted ?? 0,
        weeklyDue: habitsJson.weeklyDue ?? 0,
        bestStreak: habitsJson.bestStreak ?? 0,
        habitStats,
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleNameSave() {
    if (!data?.userId || !userName.trim()) return;
    setNamePending(true);
    await supabase.from("users").update({ name: userName.trim() }).eq("id", data.userId);
    setNamePending(false);
    setEditingName(false);
    await fetchData();
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <BarChart2 className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Stats</h1>
            <p className="text-sm text-slate-500">Your progress overview</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>

      {/* Profile section */}
      {data && (
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <AvatarUpload
              userId={data.userId}
              name={data.userName}
              currentAvatarUrl={data.avatarUrl}
              onUpdate={(url) => setData((prev: StatsData | null) => prev ? { ...prev, avatarUrl: url } : null)}
            />
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    className="input !py-1.5 text-sm"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleNameSave();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleNameSave}
                    disabled={namePending}
                    className="btn-primary !py-1.5 !px-3 text-xs"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-slate-900 truncate">{data.userName}</p>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-xs text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weekly summary */}
      {data && (
        <WeeklySummary
          totalDue={data.weeklyDue}
          totalCompleted={data.weeklyCompleted}
          bestStreak={data.bestStreak}
        />
      )}

      {/* Per-habit stats */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Habit History</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-20 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : data?.habitStats.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-slate-500">No habits tracked yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.habitStats.map(({ habit, last7Days }) => (
              <div key={habit.id} className="card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl">{habit.emoji}</span>
                    <p className="text-sm font-medium text-slate-900 truncate">{habit.name}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                      <span className="font-semibold text-orange-600">
                        {habit.current_streak}{habit.frequency === "x_per_week" ? "w" : "d"}
                      </span>
                    </div>
                    <div>
                      Best:{" "}
                      <span className="font-semibold text-slate-700">
                        {habit.best_streak}{habit.frequency === "x_per_week" ? "w" : "d"}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-2">Last 7 days</p>
                  <DotCalendar days={last7Days} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
