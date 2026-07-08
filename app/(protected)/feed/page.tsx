"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Activity, Search, UserCheck, UserPlus, X } from "lucide-react";
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

type DiscoverUser = {
  id: string;
  name: string;
  avatar_url: string | null;
  is_following: boolean;
};

type PeopleTab = "feed" | "following" | "followers" | "discover";

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} className="h-9 w-9 rounded-full object-cover bg-slate-100" />
    );
  }
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
      {initials || "?"}
    </div>
  );
}

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState<PeopleTab>("feed");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [following, setFollowing] = useState<SearchUser[]>([]);
  const [followers, setFollowers] = useState<SearchUser[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [discover, setDiscover] = useState<DiscoverUser[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/feed");
      const d = await res.json();
      setItems(d.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const fetchPeople = useCallback(async () => {
    setPeopleLoading(true);
    try {
      const res = await fetch("/api/follows");
      const d = await res.json();
      setFollowing(d.following ?? []);
      setFollowers(d.followers ?? []);
    } catch { /* ignore */ }
    finally { setPeopleLoading(false); }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((r) => setCurrentUserId(r.data.user?.id ?? null));
    fetchFeed();
  }, [fetchFeed]);

  const fetchDiscover = useCallback(async () => {
    setDiscoverLoading(true);
    try {
      const res = await fetch("/api/users");
      const d = await res.json();
      setDiscover(d.users ?? []);
    } catch { /* ignore */ }
    finally { setDiscoverLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === "following" || activeTab === "followers") fetchPeople();
    if (activeTab === "discover") fetchDiscover();
  }, [activeTab, fetchPeople, fetchDiscover]);

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
    fetchPeople();
  }

  async function toggleFollowPeople(userId: string, isFollowing: boolean) {
    await fetch("/api/follows", {
      method: isFollowing ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ following_id: userId }),
    });
    fetchPeople();
    fetchFeed();
  }

  async function toggleFollowDiscover(userId: string, isFollowing: boolean) {
    await fetch("/api/follows", {
      method: isFollowing ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ following_id: userId }),
    });
    setDiscover((prev) =>
      prev.map((u) => u.id === userId ? { ...u, is_following: !isFollowing } : u)
    );
    fetchFeed();
  }

  const tabs: { key: PeopleTab; label: string }[] = [
    { key: "feed", label: "Feed" },
    { key: "discover", label: "Discover" },
    { key: "following", label: "Following" },
    { key: "followers", label: "Followers" },
  ];

  return (
    <div className="px-4 pt-3 pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <Activity className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Feed</h1>
            <p className="text-xs text-slate-500">Activity &amp; connections</p>
          </div>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
        >
          {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              activeTab === key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
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
              <Avatar name={u.name} avatarUrl={u.avatar_url} />
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

      {/* Feed tab */}
      {activeTab === "feed" && (
        loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-28 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-3">👀</p>
            <p className="text-sm font-medium text-slate-700">No public check-ins yet</p>
            <p className="text-xs text-slate-500 mt-1">
              When others log public habits, they&apos;ll show up here
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
                userId={item.user_id}
                habit={item.habit}
                user={item.user}
                reactions={item.reactions}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )
      )}

      {/* Discover tab */}
      {activeTab === "discover" && (
        discoverLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card h-16 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : discover.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-3">🌍</p>
            <p className="text-sm font-medium text-slate-700">No other users yet</p>
            <p className="text-xs text-slate-500 mt-1">Invite friends to join the app</p>
          </div>
        ) : (
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {discover.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/profile/${u.id}`}><Avatar name={u.name} avatarUrl={u.avatar_url} /></Link>
                <Link href={`/profile/${u.id}`} className="flex-1 text-sm font-semibold text-slate-900 truncate hover:text-indigo-600">{u.name}</Link>
                <button
                  onClick={() => toggleFollowDiscover(u.id, u.is_following)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    u.is_following
                      ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {u.is_following
                    ? <><UserCheck className="h-3.5 w-3.5" /> Following</>
                    : <><UserPlus className="h-3.5 w-3.5" /> Follow</>}
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Following tab */}
      {activeTab === "following" && (
        peopleLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-16 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : following.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm font-medium text-slate-700">Not following anyone yet</p>
            <p className="text-xs text-slate-500 mt-1">Use the search icon to find people</p>
          </div>
        ) : (
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {following.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/profile/${u.id}`}><Avatar name={u.name} avatarUrl={u.avatar_url} /></Link>
                <Link href={`/profile/${u.id}`} className="flex-1 text-sm font-semibold text-slate-900 truncate hover:text-indigo-600">{u.name}</Link>
                <button
                  onClick={() => toggleFollowPeople(u.id, true)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Following
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Followers tab */}
      {activeTab === "followers" && (
        peopleLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-16 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : followers.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-3">👥</p>
            <p className="text-sm font-medium text-slate-700">No followers yet</p>
            <p className="text-xs text-slate-500 mt-1">Share the app with friends to grow your circle</p>
          </div>
        ) : (
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {followers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/profile/${u.id}`}><Avatar name={u.name} avatarUrl={u.avatar_url} /></Link>
                <Link href={`/profile/${u.id}`} className="flex-1 text-sm font-semibold text-slate-900 truncate hover:text-indigo-600">{u.name}</Link>
                <button
                  onClick={() => toggleFollowPeople(u.id, u.is_following)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    u.is_following
                      ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {u.is_following ? (
                    <><UserCheck className="h-3.5 w-3.5" /> Following</>
                  ) : (
                    <><UserPlus className="h-3.5 w-3.5" /> Follow back</>
                  )}
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
