"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart2, Home, ListChecks, Users } from "lucide-react";

const tabs = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/feed", label: "Feed", icon: Activity },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/stats", label: "Stats", icon: BarChart2 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-3"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
    >
      <nav className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white/95 backdrop-blur-md shadow-lg shadow-slate-200/60 px-2 py-1.5">
        <div className="flex items-center justify-around">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-semibold rounded-xl transition-all ${
                  active
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : "stroke-2"}`} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
