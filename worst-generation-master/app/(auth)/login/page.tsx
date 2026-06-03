import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </div>
    </main>
  );
}
