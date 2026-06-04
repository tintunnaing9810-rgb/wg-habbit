"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, Search, UserPlus, X } from "lucide-react";
import { FeedCard } from "@/components/feed-card";
import { createClient } from "@/lib/supabase/client";

type FeedItem = {
  log_id: string;
  log_date: string;
  created_at: string;
  quantity: number | null;
  user_id: string;
  habit: { name: string; emoji: string; category: string };
  user: { name: string; avatar_url: string | null };
  reactions: { emoji: string; count: number }[];
};

type SearchUser = {
  id: string;
  name: string;
  avatar_url: string | null;
  is_following: boolean;
};

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFollows, setHasFollows] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/feed");
      const d = await res.json();
      setItems(d.data ?? []);
      setHasFollows(d.hasFollows ?? false);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((r) => setCurrentUserId(r.data.user?.id ?? null));
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    if (searchQ.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(searchQ)}`);
        const d = await r.json();
        setSearchResults(d.users ?? []);
      } catch { /* ignore */ }
      finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  async function toggleFollow(userId: string, isFollowing: boolean) {
    await fetch("/api/follows", {
      method: isFollowing ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ following_id: userId }),
    });
    setSearchResults((prev) =>
      prev.map((u) => u.id === userId ? { ...u, is_following: !isFollowing } : u)
    );
    fetchFeed();
  }

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <Activity className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {hasFollows ? "Following" : "Discover"}
            </h1>
            <p className="text-xs text-slate-500">
              {hasFollows ? "Check-ins from people you follow" : "Public check-ins · find people to follow"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
        >
          {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
        </button>
      </div>

      {/* Find people search */}
      {showSearch && (
        <div className="card p-4 space-y-3">
          <input
            className="input"
            placeholder="Search by name..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            autoFocus
          />
          {searchLoading && <p className="text-xs text-slate-400 text-center">Searching...</p>}
          {searchResults.map((u) => (
            <div key={u.id} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 shrink-0">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <p className="flex-1 text-sm font-medium text-slate-900 truncate">{u.name}</p>
              <button
                onClick={() => toggleFollow(u.id, u.is_following)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  u.is_following
                    ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {!u.is_following && <UserPlus className="h-3.5 w-3.5" />}
                {u.is_following ? "Following" : "Follow"}
              </button>
            </div>
          ))}
          {searchQ.length >= 2 && !searchLoading && searchResults.length === 0 && (
            <p className="text-xs text-slate-400 text-center">No users found</p>
          )}
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-28 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-3xl mb-3">{hasFollows ? "😴" : "👀"}</p>
          <p className="text-sm font-medium text-slate-700">
            {hasFollows ? "Nothing from your crew yet" : "No public check-ins yet"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {hasFollows
              ? "People you follow haven't checked in recently"
              : "Tap the search icon to find people to follow"}
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
