"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { FeedCard } from "@/components/feed-card";
import { createClient } from "@/lib/supabase/client";

type FeedItem = {
  log_id: string;
  log_date: string;
  created_at: string;
  quantity: number | null;
  habit: { name: string; emoji: string; category: string };
  user: { name: string; avatar_url: string | null };
  reactions: { emoji: string; count: number }[];
};

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((result) => {
      setCurrentUserId(result.data.user?.id ?? null);
    });

    fetch("/api/feed")
      .then((r) => r.json())
      .then((d) => setItems(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
          <Activity className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Crew Feed</h1>
          <p className="text-xs text-slate-500">Public check-ins from the last 7 days</p>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-28 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-3xl mb-3">👀</p>
          <p className="text-sm font-medium text-slate-700">Nothing in the feed yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Make a habit public and check in to appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <FeedCard
              key={item.log_id}
              logId={item.log_id}
              logDate={item.log_date}
              createdAt={item.created_at}
              quantity={item.quantity}
              habit={item.habit}
              user={item.user}
              reactions={item.reactions}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
