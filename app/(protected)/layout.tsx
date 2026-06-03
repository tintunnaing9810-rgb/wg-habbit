import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-lg pb-safe pt-0">{children}</main>
      <BottomNav />
    </div>
  );
}
