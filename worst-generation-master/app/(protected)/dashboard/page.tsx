"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { HabitItem } from "@/components/habit-item";
import { WeeklySummary } from "@/components/weekly-summary";
import { getIctDateString } from "@/lib/habits";
import type { Habit, HabitLog } from "@/types/database";

type HabitWithLog = {
  habit: Habit;
  todayLog: HabitLog | null;
};

type DashboardData = {
  habits: HabitWithLog[];
  userName: string;
  weeklyCompleted: number;
  weeklyDue: number;
  bestStreak: number;
};

function getGreeting() {
  const ictHour = new Date(Date.now() + 7 * 60 * 60 * 1000).getUTCHours();
  if (ictHour < 12) return "Good morning";
  if (ictHour < 18) return "Good afternoon";
  return "Good evening";
}

function formatTodayICT(): string {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/habits");
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCheckIn(habitId: string, quantity?: number) {
    const res = await fetch("/api/habit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habit_id: habitId, quantity }),
    });
    if (res.ok) {
      await fetchData();
    }
  }

  async function handleUndo(logId: string) {
    const res = await fetch(`/api/habit-logs/${logId}`, { method: "DELETE" });
    if (res.ok) {
      await fetchData();
    }
  }

  const todayStr = getIctDateString();
  const incomplete = data?.habits.filter((h) => h.todayLog === null) ?? [];
  const completed = data?.habits.filter((h) => h.todayLog !== null) ?? [];

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-500">{formatTodayICT()}</p>
        <h1 className="mt-0.5 text-xl font-bold text-slate-900">
          {getGreeting()}{data?.userName ? `, ${data.userName.split(" ")[0]}` : ""}
        </h1>
      </div>

      {/* Weekly summary */}
      {data && (
        <WeeklySummary
          totalDue={data.weeklyDue}
          totalCompleted={data.weeklyCompleted}
          bestStreak={data.bestStreak}
        />
      )}

      {/* Habits checklist */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-[72px] animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : data?.habits.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-3xl mb-3">🌱</p>
          <p className="text-sm font-medium text-slate-700">No habits yet</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">Add your first habit to start building streaks</p>
          <Link href="/habits" className="btn-primary text-sm px-6 py-2.5">
            <PlusCircle className="h-4 w-4" />
            Add Habit
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Today's date */}
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Today · {todayStr}
          </p>

          {/* Incomplete habits */}
          {incomplete.map(({ habit, todayLog }) => (
            <HabitItem
              key={habit.id}
              habit={habit}
              todayLog={todayLog}
              onCheckIn={handleCheckIn}
              onUndo={handleUndo}
            />
          ))}

          {/* Completed habits */}
          {completed.length > 0 && (
            <>
              {incomplete.length > 0 && (
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide pt-2">
                  Completed
                </p>
              )}
              {completed.map(({ habit, todayLog }) => (
                <HabitItem
                  key={habit.id}
                  habit={habit}
                  todayLog={todayLog}
                  onCheckIn={handleCheckIn}
                  onUndo={handleUndo}
                />
              ))}
            </>
          )}

          {incomplete.length === 0 && completed.length > 0 && (
            <div className="card p-4 text-center bg-green-50 border-green-200">
              <p className="text-2xl mb-1">🎉</p>
              <p className="text-sm font-semibold text-green-800">All done for today!</p>
              <p className="text-xs text-green-600">Great work. Come back tomorrow to keep the streak going.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
