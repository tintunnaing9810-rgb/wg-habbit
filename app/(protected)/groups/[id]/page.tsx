"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, LoaderCircle, PlusCircle, RotateCcw, Trash2, UserPlus } from "lucide-react";

type Member = {
  user_id: string;
  role: string;
  user: { id: string; name: string; avatar_url: string | null };
};

type GroupHabit = {
  id: string;
  name: string;
  emoji: string;
  created_by: string;
  checked_in_user_ids: string[];
  my_checked_in: boolean;
};

type GroupData = {
  group: { id: string; name: string; emoji: string; invite_code: string; created_by: string; role: string };
  members: Member[];
  habits: GroupHabit[];
  today: string;
};

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitEmoji, setNewHabitEmoji] = useState("✅");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<{ id: string; name: string; is_following: boolean }[]>([]);
  const [codeCopied, setCodeCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`/api/groups/${id}`);
      if (!r.ok) { router.push("/groups"); return; }
      setData(await r.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (memberSearch.length < 2) { setMemberResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/users/search?q=${encodeURIComponent(memberSearch)}`);
      const d = await r.json();
      const existingIds = new Set(data?.members.map((m) => m.user_id) ?? []);
      setMemberResults((d.users ?? []).filter((u: { id: string }) => !existingIds.has(u.id)));
    }, 300);
    return () => clearTimeout(t);
  }, [memberSearch, data?.members]);

  async function handleCheckIn(habitId: string, isCheckedIn: boolean) {
    setPending(habitId);
    await fetch(`/api/groups/${id}/habits/${habitId}/log`, {
      method: isCheckedIn ? "DELETE" : "POST",
    });
    await fetchData();
    setPending(null);
  }

  async function handleAddHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    setPending("new-habit");
    await fetch(`/api/groups/${id}/habits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newHabitName.trim(), emoji: newHabitEmoji }),
    });
    setShowAddHabit(false); setNewHabitName(""); setNewHabitEmoji("✅");
    setPending(null);
    fetchData();
  }

  async function handleDeleteHabit(habitId: string) {
    await fetch(`/api/groups/${id}/habits`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habit_id: habitId }),
    });
    fetchData();
  }

  async function handleAddMember(userId: string) {
    await fetch(`/api/groups/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    setMemberResults((prev) => prev.filter((u) => u.id !== userId));
    fetchData();
  }

  async function handleLeave() {
    if (!confirm("Leave this group?")) return;
    await fetch(`/api/groups/${id}/members`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    router.push("/groups");
  }

  async function handleDeleteGroup() {
    if (!confirm("Delete this group? This cannot be undone.")) return;
    const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/groups");
  }

  function copyCode() {
    if (!data) return;
    navigator.clipboard.writeText(data.group.invite_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoaderCircle className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!data) return null;

  const { group, members, habits } = data;
  const isOwner = group.role === "owner";

  return (
    <div className="px-4 pt-3 pb-6 space-y-4">
      {/* Header */}
      <div>
        <button onClick={() => router.push("/groups")} className="flex items-center gap-1 text-sm text-slate-500 mb-3 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Groups
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{group.emoji}</span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{group.name}</h1>
              <p className="text-xs text-slate-500">{members.length} {members.length === 1 ? "member" : "members"}</p>
            </div>
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            {codeCopied ? "Copied!" : group.invite_code}
          </button>
        </div>
      </div>

      {/* Today's habits */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Today's Habits</h2>
          <button
            onClick={() => setShowAddHabit(!showAddHabit)}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {showAddHabit && (
          <form onSubmit={handleAddHabit} className="card p-3 mb-3 flex gap-2">
            <input
              className="input !w-12 text-center text-xl"
              value={newHabitEmoji}
              onChange={(e) => setNewHabitEmoji(e.target.value.slice(-2) || "✅")}
              maxLength={2}
            />
            <input
              className="input flex-1"
              placeholder="Habit name"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              autoFocus
            />
            <button type="submit" disabled={!newHabitName.trim() || pending === "new-habit"} className="btn-primary !px-3 !py-2 text-xs">
              Add
            </button>
          </form>
        )}

        {habits.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-slate-500">No habits yet — add the first one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {habits.map((habit) => {
              const checkedCount = habit.checked_in_user_ids.length;
              const total = members.length;
              return (
                <div key={habit.id} className="card p-3 flex items-center gap-3">
                  <span className="text-xl shrink-0">{habit.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{habit.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: total > 0 ? `${(checkedCount / total) * 100}%` : "0%" }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 shrink-0">{checkedCount}/{total}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteHabit(habit.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {pending === habit.id ? (
                      <LoaderCircle className="h-7 w-7 animate-spin text-indigo-300" />
                    ) : habit.my_checked_in ? (
                      <button
                        onClick={() => handleCheckIn(habit.id, true)}
                        className="h-8 w-8 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                        title="Undo"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCheckIn(habit.id, false)}
                        className="h-8 w-8 flex items-center justify-center rounded-full border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                        title="Check in"
                      >
                        <Check className="h-4 w-4 text-slate-300" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Members */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Members</h2>
          {isOwner && (
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <UserPlus className="h-3.5 w-3.5" /> Invite
            </button>
          )}
        </div>

        {showAddMember && (
          <div className="card p-3 mb-3 space-y-2">
            <input
              className="input"
              placeholder="Search by name..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              autoFocus
            />
            {memberResults.map((u) => (
              <div key={u.id} className="flex items-center gap-2">
                <div className="h-7 w-7 flex items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <p className="flex-1 text-sm text-slate-800">{u.name}</p>
                <button onClick={() => handleAddMember(u.id)} className="btn-primary !py-1 !px-2 text-xs">Add</button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {members.map((m) => {
            const checkedToday = habits.some((h) => h.checked_in_user_ids.includes(m.user_id));
            return (
              <div key={m.user_id} className="card p-3 flex items-center gap-3">
                <div className="h-9 w-9 flex items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 shrink-0">
                  {m.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-slate-900 truncate">{m.user.name}</p>
                    {m.role === "owner" && (
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Owner</span>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${checkedToday ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                  {checkedToday ? "Done ✓" : "Pending"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leave / Delete group */}
      {isOwner ? (
        <button onClick={handleDeleteGroup} className="btn-danger w-full text-sm">
          Delete group
        </button>
      ) : (
        <button onClick={handleLeave} className="btn-danger w-full text-sm">
          Leave group
        </button>
      )}
    </div>
  );
}
