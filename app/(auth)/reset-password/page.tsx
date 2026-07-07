"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Handle PKCE flow: token_hash in URL query params
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");

    if (tokenHash && type === "recovery") {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ error }) => {
        if (error) {
          router.replace("/login?error=Reset+link+is+invalid+or+expired.");
        } else {
          setReady(true);
        }
      });
      return;
    }

    // Handle implicit flow: access_token in URL hash, fires PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // If no token in URL at all, check for existing recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      else if (!tokenHash) {
        setTimeout(() => {
          router.replace("/login?error=Reset+link+is+invalid+or+expired.");
        }, 1500);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

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

        {!ready ? (
          <div className="flex justify-center py-8">
            <LoaderCircle className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : (
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
        )}
      </div>
    </main>
  );
}
