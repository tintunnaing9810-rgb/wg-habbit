import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-lg pb-safe pt-0">{children}</main>
      <BottomNav />
    </div>
  );
}
