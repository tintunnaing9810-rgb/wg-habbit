"use client";

import { Flame, CheckCircle2, TrendingUp } from "lucide-react";

type WeeklySummaryProps = {
  totalDue: number;
  totalCompleted: number;
  bestStreak: number;
};

export function WeeklySummary({ totalDue, totalCompleted, bestStreak }: WeeklySummaryProps) {
  const completionPct = totalDue > 0 ? Math.round((totalCompleted / totalDue) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="card p-4 text-center">
        <CheckCircle2 className="mx-auto mb-1.5 h-5 w-5 text-indigo-500" />
        <p className="text-lg font-bold text-slate-900">
          {totalCompleted}/{totalDue}
        </p>
        <p className="text-xs text-slate-500">This week</p>
      </div>

      <div className="card p-4 text-center">
        <TrendingUp className="mx-auto mb-1.5 h-5 w-5 text-green-500" />
        <p className="text-lg font-bold text-slate-900">{completionPct}%</p>
        <p className="text-xs text-slate-500">Completion</p>
      </div>

      <div className="card p-4 text-center">
        <Flame className="mx-auto mb-1.5 h-5 w-5 text-orange-500" />
        <p className="text-lg font-bold text-slate-900">{bestStreak}d</p>
        <p className="text-xs text-slate-500">Best streak</p>
      </div>
    </div>
  );
}
