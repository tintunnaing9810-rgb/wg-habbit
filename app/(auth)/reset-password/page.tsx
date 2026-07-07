"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md card p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">New password</h1>
          <p className="mt-1 text-sm text-slate-500">Choose a strong password for your account</p>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Same password again"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-200">{error}</p>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full mt-2">
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {pending ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}
