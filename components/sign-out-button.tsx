"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="btn-ghost w-full"
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </button>
  );
}
