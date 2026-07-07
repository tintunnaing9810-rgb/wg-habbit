"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { LeaderboardTable } from "@/components/leaderboard-table";

type LeaderboardEntry = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  best_streak: number;
  completion_pct: number;
  total_checkins: number;
};

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"weekly" | "alltime">("weekly");
  const [weeklyData, setWeeklyData] = useState<LeaderboardEntry[]>([]);
  const [alltimeData, setAlltimeData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [weeklyRes, alltimeRes] = await Promise.all([
          fetch("/api/leaderboard/weekly"),
          fetch("/api/leaderboard"),
        ]);
        const weekly = await weeklyRes.json();
        const alltime = await alltimeRes.json();
        setWeeklyData(weekly.data ?? []);
        setAlltimeData(alltime.data ?? []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <Trophy className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Leaderboard</h1>
          <p className="text-xs text-slate-500 live-dot">Live rankings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
        <button
          onClick={() => setActiveTab("weekly")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
            activeTab === "weekly"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setActiveTab("alltime")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
            activeTab === "alltime"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          All Time
        </button>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 text-xs font-medium text-slate-400">
        <div className="w-8" />
        <div className="w-9" />
        <div className="flex-1">Name</div>
        <div className="w-10 text-center">Streak</div>
        <div className="w-10 text-right">Done</div>
        <div className="w-8" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card h-16 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : (
        <LeaderboardTable
          initialData={activeTab === "weekly" ? weeklyData : alltimeData}
          type={activeTab}
        />
      )}
    </div>
  );
}
