"use client";

import { useCallback, useEffect, useState } from "react";
import { Edit2, PlusCircle, Trash2 } from "lucide-react";
import { HabitForm } from "@/components/habit-form";
import { StreakBadge } from "@/components/streak-badge";
import { formatFrequency } from "@/lib/habits";
import type { Habit } from "@/types/database";

type HabitFormData = {
  name: string;
  emoji: string;
  category: "Health & Body" | "Mind & Focus" | "No Bad Habits" | "Custom";
  frequency: "daily" | "weekdays" | "x_per_week";
  frequency_target: number;
  target_type: "yes_no" | "quantity";
  target_quantity: number | null;
  is_public: boolean;
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchHabits = useCallback(async () => {
    try {
      const res = await fetch("/api/habits");
      if (!res.ok) return;
      const json = await res.json();
      setHabits((json.habits as { habit: Habit }[])?.map((h) => h.habit) ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  async function handleSave(data: HabitFormData) {
    const method = editingHabit ? "PATCH" : "POST";
    const url = editingHabit ? `/api/habits/${editingHabit.id}` : "/api/habits";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Failed to save habit.");
    }

    setShowForm(false);
    setEditingHabit(null);
    await fetchHabits();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/habits/${id}`, { method: "DELETE" });
      await fetchHabits();
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  const CATEGORY_ICONS: Record<string, string> = {
    "Health & Body": "💪",
    "Mind & Focus": "🧠",
    "No Bad Habits": "🚫",
    "Custom": "⭐",
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Habits</h1>
          <p className="text-sm text-slate-500">{habits.length} habits tracked</p>
        </div>
        <button
          onClick={() => {
            setEditingHabit(null);
            setShowForm(true);
          }}
          className="btn-primary text-sm px-4 py-2"
        >
          <PlusCircle className="h-4 w-4" />
          Add
        </button>
      </div>

      {/* Habits list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-20 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-sm font-medium text-slate-700">No habits yet</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">Create your first habit to get started</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary text-sm px-6 py-2.5"
          >
            <PlusCircle className="h-4 w-4" />
            Add Habit
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => (
            <div key={habit.id} className="card p-4">
              <div className="flex items-start gap-3">
                {/* Emoji */}
                <span className="text-2xl leading-none shrink-0 mt-0.5">{habit.emoji}</span>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900 truncate">{habit.name}</p>
                    <StreakBadge streak={habit.current_streak} frequency={habit.frequency} />
                  </div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <span>{CATEGORY_ICONS[habit.category] ?? "⭐"}</span>
                      {habit.category}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">
                      {formatFrequency(habit.frequency, habit.frequency_target)}
                    </span>
                    {habit.is_public && (
                      <>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-indigo-500">Public</span>
                      </>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                    <span>Best: {habit.best_streak}{habit.frequency === "x_per_week" ? "w" : "d"}</span>
                    {habit.last_logged_date && (
                      <span>Last: {habit.last_logged_date}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditingHabit(habit);
                      setShowForm(true);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(habit.id)}
                    disabled={deletingId === habit.id}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative card p-6 w-full max-w-sm animate-pop-in">
            <h3 className="text-base font-semibold text-slate-900">Delete habit?</h3>
            <p className="mt-2 text-sm text-slate-500">
              This will permanently delete this habit and all its logs. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="btn-danger flex-1"
              >
                {deletingId === confirmDeleteId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Habit form modal */}
      {showForm && (
        <HabitForm
          habit={editingHabit ?? undefined}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingHabit(null);
          }}
        />
      )}
    </div>
  );
}
