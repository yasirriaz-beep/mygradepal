"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";

type AuthTab = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("login");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [parentName, setParentName] = useState("");
  const [childName, setChildName] = useState("");
  const [childGrade, setChildGrade] = useState("Grade 6");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    const user = data.user;
    if (!user) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("onboarding_complete")
      .eq("id", user.id)
      .single();

    if (studentError || !student?.onboarding_complete) {
      router.push("/onboarding");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  };

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const email = signupEmail;
    const password = signupPassword;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      }
    })

    if (error) {
      setError(error.message);
      setIsSubmitting(false);
      return;
    }

    if (data.user && !error) {
      await supabase.from("students").insert({
        id: data.user.id,
        email: email,
        name: childName || email.split("@")[0],
        onboarding_complete: false,
        created_at: new Date().toISOString(),
      });
    }

    const user = data.user;
    if (!user) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("onboarding_complete")
      .eq("id", user.id)
      .single();

    if (studentError || !student?.onboarding_complete) {
      router.push("/onboarding");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10">
      <section className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <div className="mb-7 text-center">
          <Logo className="justify-center" />
          <p className="mt-3 text-sm text-slate-600">Your child&apos;s smartest study companion</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              tab === "login" ? "bg-brand-teal text-white" : "text-slate-700"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setTab("signup")}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              tab === "signup" ? "bg-brand-teal text-white" : "text-slate-700"
            }`}
          >
            Sign up
          </button>
        </div>

        {tab === "login" ? (
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="student@email.com"
                className="w-full rounded-xl border border-teal-100 bg-white px-4 py-3 outline-none ring-brand-teal transition focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-teal-100 bg-white px-4 py-3 outline-none ring-brand-teal transition focus:ring-2"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="block w-full rounded-xl bg-brand-teal px-4 py-3 text-center font-semibold text-white transition hover:bg-brand-teal-dark disabled:opacity-70"
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleSignup}>
            <div>
              <label htmlFor="parent-name" className="mb-1 block text-sm font-medium text-slate-700">
                Parent name
              </label>
              <input
                id="parent-name"
                type="text"
                required
                value={parentName}
                onChange={(event) => setParentName(event.target.value)}
                className="w-full rounded-xl border border-teal-100 bg-white px-4 py-3 outline-none ring-brand-teal transition focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="child-name" className="mb-1 block text-sm font-medium text-slate-700">
                Child name
              </label>
              <input
                id="child-name"
                type="text"
                required
                value={childName}
                onChange={(event) => setChildName(event.target.value)}
                className="w-full rounded-xl border border-teal-100 bg-white px-4 py-3 outline-none ring-brand-teal transition focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="child-grade" className="mb-1 block text-sm font-medium text-slate-700">
                Child grade
              </label>
              <select
                id="child-grade"
                value={childGrade}
                onChange={(event) => setChildGrade(event.target.value)}
                className="w-full rounded-xl border border-teal-100 bg-white px-4 py-3 outline-none ring-brand-teal transition focus:ring-2"
              >
                {["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"].map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                required
                value={signupEmail}
                onChange={(event) => setSignupEmail(event.target.value)}
                className="w-full rounded-xl border border-teal-100 bg-white px-4 py-3 outline-none ring-brand-teal transition focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                required
                value={signupPassword}
                onChange={(event) => setSignupPassword(event.target.value)}
                className="w-full rounded-xl border border-teal-100 bg-white px-4 py-3 outline-none ring-brand-teal transition focus:ring-2"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="block w-full rounded-xl bg-brand-teal px-4 py-3 text-center font-semibold text-white transition hover:bg-brand-teal-dark disabled:opacity-70"
            >
              {isSubmitting ? "Creating..." : "Create account"}
            </button>
          </form>
        )}

        {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>
    </main>
  );
}
