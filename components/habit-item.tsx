"use client";

import { useState } from "react";
import { Check, LoaderCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { StreakBadge } from "@/components/streak-badge";
import type { Habit, HabitLog } from "@/types/database";

type HabitItemProps = {
  habit: Habit;
  todayLog: HabitLog | null;
  onCheckIn: (habitId: string, quantity?: number) => Promise<void>;
  onUndo: (logId: string) => Promise<void>;
};

export function HabitItem({ habit, todayLog, onCheckIn, onUndo }: HabitItemProps) {
  const [pending, setPending] = useState(false);
  const [quantityInput, setQuantityInput] = useState<string>("");
  const [showQuantityInput, setShowQuantityInput] = useState(false);

  const isCompleted = todayLog !== null;

  async function handleCheck() {
    if (isCompleted) return;
    if (habit.target_type === "quantity" && !showQuantityInput) {
      setShowQuantityInput(true);
      return;
    }
    setPending(true);
    const qty = habit.target_type === "quantity" ? (parseInt(quantityInput) || undefined) : undefined;
    await onCheckIn(habit.id, qty);
    setPending(false);
    setShowQuantityInput(false);
    setQuantityInput("");
  }

  async function handleUndo() {
    if (!todayLog) return;
    setPending(true);
    await onUndo(todayLog.id);
    setPending(false);
  }

  return (
    <div
      className={cn(
        "card flex items-center gap-3 p-4 transition-all duration-300",
        isCompleted && "opacity-70",
      )}
    >
      {/* Emoji */}
      <span className="text-2xl leading-none shrink-0">{habit.emoji}</span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={cn(
              "font-medium text-slate-900 truncate",
              isCompleted && "line-through text-slate-400",
            )}
          >
            {habit.name}
          </p>
          <StreakBadge streak={habit.current_streak} frequency={habit.frequency} />
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {habit.category}
          {habit.target_type === "quantity" && habit.target_quantity
            ? ` · ${habit.target_quantity} target`
            : ""}
        </p>

        {/* Quantity input */}
        {showQuantityInput && !isCompleted && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              placeholder={`Qty (target: ${habit.target_quantity ?? "?"})`}
              className="input !w-36 !py-1.5 !text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCheck();
                if (e.key === "Escape") {
                  setShowQuantityInput(false);
                  setQuantityInput("");
                }
              }}
            />
            <button
              onClick={handleCheck}
              disabled={pending || !quantityInput}
              className="btn-primary !py-1.5 !px-3 text-xs"
            >
              Log
            </button>
            <button
              onClick={() => {
                setShowQuantityInput(false);
                setQuantityInput("");
              }}
              className="btn-ghost !py-1.5 !px-3 text-xs"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="shrink-0">
        {pending ? (
          <LoaderCircle className="h-6 w-6 animate-spin text-indigo-400" />
        ) : isCompleted ? (
          <button
            onClick={handleUndo}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
            title="Undo check-in"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleCheck}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
              showQuantityInput
                ? "border-indigo-600 bg-indigo-50"
                : "border-slate-200 hover:border-indigo-400 hover:bg-indigo-50",
            )}
            title="Mark complete"
          >
            <Check className="h-4 w-4 text-slate-300 group-hover:text-indigo-400" />
          </button>
        )}
      </div>
    </div>
  );
}
