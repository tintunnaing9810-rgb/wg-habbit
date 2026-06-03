"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type AuthFormProps = { mode: "login" | "signup" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const searchError = searchParams.get("error");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "");

    if (mode === "signup") {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard`,
          data: { name },
        },
      });
      if (signupError) {
        setError(signupError.message);
        setPending(false);
        return;
      }
      if (!data.session) {
        setNotice("Account created! Check your email to confirm before logging in.");
        setPending(false);
        return;
      }
    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        setError(loginError.message);
        setPending(false);
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full card p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
          <CheckCircle2 className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Worst Generation</h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "signup" ? "Create your account to get started" : "Welcome back"}
        </p>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        {mode === "signup" && (
          <div>
            <label className="label">Display Name</label>
            <input
              name="name"
              required
              placeholder="Your name"
              className="input"
            />
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="input"
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="At least 6 characters"
            className="input"
          />
        </div>

        {(error || searchError) && (
          <p className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-200">
            {error ?? searchError}
          </p>
        )}
        {notice && (
          <p className="rounded-lg px-4 py-3 text-sm bg-green-50 text-green-700 border border-green-200">
            {notice}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full mt-2">
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {pending
            ? "Please wait..."
            : mode === "signup"
            ? "Create account"
            : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
        <Link
          href={mode === "signup" ? "/login" : "/signup"}
          className="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          {mode === "signup" ? "Log in" : "Sign up"}
        </Link>
      </p>
    </div>
  );
}
