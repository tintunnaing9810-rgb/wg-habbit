"use client";

import React, { useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import type { Habit } from "@/types/database";

type HabitCategory = "Health & Body" | "Mind & Focus" | "No Bad Habits" | "Custom";
type HabitFrequency = "daily" | "weekdays" | "x_per_week";
type TargetType = "yes_no" | "quantity";

const COMMON_EMOJIS = [
  "✅", "💪", "🏃", "🧘", "💤", "💧", "🥗", "📚", "✍️", "🎯",
  "🚭", "🍺", "📵", "💊", "🛁", "🌅", "🌙", "🎵", "🧹", "💰",
  "❤️", "😊", "🏋️", "🚴", "🤸", "🧠", "🫁", "🦷", "🌿", "⭐",
];

const CATEGORIES: HabitCategory[] = ["Health & Body", "Mind & Focus", "No Bad Habits", "Custom"];

type HabitFormData = {
  name: string;
  emoji: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  frequency_target: number;
  target_type: TargetType;
  target_quantity: number | null;
  is_public: boolean;
};

type HabitFormProps = {
  habit?: Habit;
  onSave: (data: HabitFormData) => Promise<void>;
  onClose: () => void;
};

export function HabitForm({ habit, onSave, onClose }: HabitFormProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(habit?.name ?? "");
  const [emoji, setEmoji] = useState(habit?.emoji ?? "✅");
  const [category, setCategory] = useState<HabitCategory>(habit?.category ?? "Custom");
  const [frequency, setFrequency] = useState<HabitFrequency>(habit?.frequency ?? "daily");
  const [frequencyTarget, setFrequencyTarget] = useState(habit?.frequency_target ?? 3);
  const [targetType, setTargetType] = useState<TargetType>(habit?.target_type ?? "yes_no");
  const [targetQuantity, setTargetQuantity] = useState<string>(
    habit?.target_quantity ? String(habit.target_quantity) : "",
  );
  const [isPublic, setIsPublic] = useState(habit?.is_public ?? false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Habit name is required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        emoji,
        category,
        frequency,
        frequency_target: frequency === "x_per_week" ? frequencyTarget : 1,
        target_type: targetType,
        target_quantity: targetType === "quantity" && targetQuantity ? parseInt(targetQuantity) : null,
        is_public: isPublic,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col animate-pop-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {habit ? "Edit Habit" : "New Habit"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form id="habit-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Name + Emoji */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Habit Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Morning run"
                required
              />
            </div>
            <div>
              <label className="label">Emoji</label>
              <div className="relative group">
                <div className="input !w-14 text-center text-2xl cursor-pointer select-none">
                  {emoji}
                </div>
              </div>
            </div>
          </div>

          {/* Emoji picker */}
          <div>
            <label className="label">Pick Emoji</label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`h-9 w-9 rounded-lg text-lg transition-all ${
                    emoji === e
                      ? "bg-indigo-100 ring-2 ring-indigo-500"
                      : "bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="label">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium text-left transition-all ${
                    category === cat
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="label">Frequency</label>
            <div className="grid grid-cols-3 gap-2">
              {(["daily", "weekdays", "x_per_week"] as HabitFrequency[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    frequency === f
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {f === "daily" ? "Every day" : f === "weekdays" ? "Weekdays" : "X / week"}
                </button>
              ))}
            </div>

            {frequency === "x_per_week" && (
              <div className="mt-2 flex items-center gap-3">
                <label className="text-sm text-slate-600">Times per week:</label>
                <input
                  type="number"
                  min={2}
                  max={6}
                  value={frequencyTarget}
                  onChange={(e) => setFrequencyTarget(parseInt(e.target.value) || 2)}
                  className="input !w-20"
                />
              </div>
            )}
          </div>

          {/* Target type */}
          <div>
            <label className="label">Target Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["yes_no", "quantity"] as TargetType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTargetType(t)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    targetType === t
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {t === "yes_no" ? "Yes / No" : "Quantity"}
                </button>
              ))}
            </div>

            {targetType === "quantity" && (
              <div className="mt-2 flex items-center gap-3">
                <label className="text-sm text-slate-600">Target amount:</label>
                <input
                  type="number"
                  min={1}
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(e.target.value)}
                  placeholder="e.g. 8 (glasses)"
                  className="input !w-36"
                />
              </div>
            )}
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Public habit</p>
              <p className="text-xs text-slate-500">Show check-ins in the crew feed</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                isPublic ? "bg-indigo-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                  isPublic ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

        </form>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4">
          {error && (
            <p className="rounded-lg px-4 py-2.5 text-sm bg-red-50 text-red-700 border border-red-200">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button
              form="habit-form"
              type="submit"
              disabled={pending}
              className="btn-primary flex-1"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {pending ? "Saving..." : habit ? "Save Changes" : "Add Habit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
