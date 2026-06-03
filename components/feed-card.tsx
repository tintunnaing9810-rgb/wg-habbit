"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

type Reaction = {
  emoji: string;
  count: number;
};

type FeedCardProps = {
  logId: string;
  logDate: string;
  createdAt: string;
  quantity: number | null;
  habit: { name: string; emoji: string; category: string };
  user: { name: string; avatar_url: string | null };
  reactions: Reaction[];
  currentUserId: string | null;
};

const REACTION_OPTIONS = ["🔥", "💪", "🎯", "✅", "⭐"];

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-9 w-9 rounded-full object-cover bg-slate-100 shrink-0"
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
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 shrink-0">
      {initials || "?"}
    </div>
  );
}

export function FeedCard({
  logId,
  createdAt,
  quantity,
  habit,
  user,
  reactions: initialReactions,
  currentUserId,
}: FeedCardProps) {
  const [reactions, setReactions] = useState<Reaction[]>(initialReactions);
  const [pendingReaction, setPendingReaction] = useState<string | null>(null);

  async function handleReaction(emoji: string) {
    if (!currentUserId) return;
    if (pendingReaction) return;
    setPendingReaction(emoji);

    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log_id: logId, emoji }),
      });
      const data = await res.json();
      if (data.reactions) {
        setReactions(data.reactions);
      }
    } catch {
      // ignore
    } finally {
      setPendingReaction(null);
    }
  }

  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar name={user.name} avatarUrl={user.avatar_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{user.name}</span>
            <span className="text-xs text-slate-400">{timeAgo}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-base">{habit.emoji}</span>
            <span className="text-sm text-slate-700">{habit.name}</span>
            {quantity !== null && (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {quantity} logged
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{habit.category}</p>
        </div>
      </div>

      {/* Reactions */}
      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        {REACTION_OPTIONS.map((emoji) => {
          const reaction = reactions.find((r) => r.emoji === emoji);
          const count = reaction?.count ?? 0;
          return (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              disabled={!currentUserId || pendingReaction === emoji}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                count > 0
                  ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              } disabled:opacity-50`}
            >
              <span>{emoji}</span>
              {count > 0 && <span>{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
