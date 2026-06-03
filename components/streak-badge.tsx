import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type StreakBadgeProps = {
  streak: number;
  frequency?: string;
  className?: string;
};

export function StreakBadge({ streak, frequency, className }: StreakBadgeProps) {
  const label = frequency === "x_per_week" ? `${streak}w` : `${streak}d`;
  const active = streak > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
        active
          ? "bg-orange-50 text-orange-600 ring-1 ring-orange-200"
          : "bg-slate-100 text-slate-400",
        className,
      )}
    >
      <Flame className={cn("h-3 w-3", active ? "text-orange-500" : "text-slate-400")} />
      {label}
    </span>
  );
}
