"use client";

import { useEffect, useState, useCallback } from "react";
import { PlusCircle, Users, LogIn } from "lucide-react";
import Link from "next/link";

type GroupItem = {
  id: string;
  name: string;
  emoji: string;
  invite_code: string;
  role: string;
  member_count: number;
  checked_in_today: number;
};

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmoji, setCreateEmoji] = useState("🏆");
  const [joinCode, setJoinCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const r = await fetch("/api/groups");
      const d = await r.json();
      setGroups(d.groups ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    setPending(true); setError(null);
    const r = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: createName.trim(), emoji: createEmoji }),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error ?? "Failed to create group"); setPending(false); return; }
    setShowCreate(false); setCreateName(""); setCreateEmoji("🏆");
    setPending(false);
    fetchGroups();
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setPending(true); setError(null);
    const r = await fetch(`/api/groups/${joinCode}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: joinCode.trim() }),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error ?? "Invalid invite code"); setPending(false); return; }
    setShowJoin(false); setJoinCode("");
    setPending(false);
    fetchGroups();
  }

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Groups</h1>
            <p className="text-xs text-slate-500">Shared habits with your crew</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJoin(!showJoin); setShowCreate(false); setError(null); }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <LogIn className="h-3.5 w-3.5" />
            Join
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setShowJoin(false); setError(null); }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="card p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900">Create a group</p>
          <div className="flex gap-2">
            <input
              className="input !w-14 text-center text-xl"
              value={createEmoji}
              onChange={(e) => setCreateEmoji(e.target.value.slice(-2) || "🏆")}
              maxLength={2}
            />
            <input
              className="input flex-1"
              placeholder="Group name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              maxLength={50}
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1 text-sm">Cancel</button>
            <button type="submit" disabled={pending || !createName.trim()} className="btn-primary flex-1 text-sm">
              {pending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      )}

      {/* Join form */}
      {showJoin && (
        <form onSubmit={handleJoin} className="card p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900">Join with invite code</p>
          <input
            className="input"
            placeholder="Enter 8-character code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.trim())}
            maxLength={8}
            autoFocus
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowJoin(false)} className="btn-ghost flex-1 text-sm">Cancel</button>
            <button type="submit" disabled={pending || joinCode.length < 6} className="btn-primary flex-1 text-sm">
              {pending ? "Joining..." : "Join"}
            </button>
          </div>
        </form>
      )}

      {/* Groups list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="card h-20 animate-pulse bg-slate-100" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-sm font-medium text-slate-700">No groups yet</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">Create one or join with an invite code</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`} className="card p-4 flex items-center gap-3 active:scale-[0.98] transition-transform">
              <span className="text-2xl shrink-0">{g.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900 truncate">{g.name}</p>
                  {g.role === "owner" && (
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Owner</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {g.member_count} {g.member_count === 1 ? "member" : "members"}
                  {" · "}
                  <span className="text-indigo-600 font-medium">{g.checked_in_today} checked in today</span>
                </p>
              </div>
              <span className="text-slate-300 text-lg">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
