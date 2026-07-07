"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Home, ListChecks, Trophy, Users } from "lucide-react";

const tabs = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/feed", label: "Feed", icon: Activity },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${
                active ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {active && (
                <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-indigo-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
