"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";

export default function ParentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    router.push("/parent/dashboard");
    router.refresh();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
        <div className="text-center">
          <Logo className="justify-center" />
          <p className="mt-2 text-sm text-slate-600">You pay. You deserve to know everything.</p>
        </div>
        <form className="mt-6 space-y-4" onSubmit={handleLogin}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="block w-full rounded-xl bg-brand-teal px-4 py-3 text-center font-semibold text-white disabled:opacity-70"
          >
            {isSubmitting ? "Signing in..." : "Parent login"}
          </button>
        </form>
        {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <p className="mt-4 text-center text-sm text-slate-600">
          Are you a student?{" "}
          <Link href="/login" className="font-semibold text-brand-teal hover:underline">
            Login here →
          </Link>
        </p>
      </section>
    </main>
  );
}
