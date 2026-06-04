import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Flame, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      {/* Subtle background accent */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full blur-[160px]"
          style={{ background: "rgba(79,70,229,0.06)" }} />
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-8">
        {/* Nav */}
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-slate-900">Worst Generation</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost text-sm px-4 py-2">Log in</Link>
            <Link href="/signup" className="btn-primary text-sm px-4 py-2">Sign up</Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
            Build habits. Build streaks. Build character.
          </div>

          <h1 className="max-w-sm text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl" style={{ lineHeight: 1.1 }}>
            Track habits with your{" "}
            <span className="text-indigo-600">crew</span>
          </h1>

          <p className="mt-5 max-w-xs text-base leading-7 text-slate-500">
            Stay consistent, build streaks, and compete on the leaderboard — all in one place.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary text-sm px-8 py-3">Get started free</Link>
            <Link href="/login" className="btn-ghost text-sm px-8 py-3">Log in</Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid gap-4 pb-8 sm:grid-cols-3">
          {[
            { icon: CheckCircle2, color: "text-indigo-600", bg: "bg-indigo-50", title: "Daily Habits", desc: "Build a custom checklist that fits your life. Yes/no or quantity targets." },
            { icon: Flame, color: "text-orange-500", bg: "bg-orange-50", title: "Streak System", desc: "Keep your streak alive with a built-in grace day — one per week to protect your progress." },
            { icon: Trophy, color: "text-amber-500", bg: "bg-amber-50", title: "Leaderboard", desc: "Weekly and all-time rankings. See who on your crew is the most consistent." },
          ].map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className="card p-5">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
