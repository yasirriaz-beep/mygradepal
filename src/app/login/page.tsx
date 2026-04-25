import Link from "next/link";
import Logo from "@/components/Logo";

export default function LoginPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10">
      <section className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <div className="mb-8 text-center">
          <Logo className="justify-center" />
          <p className="mt-3 text-sm text-slate-600">
            Your child&apos;s smartest study companion
          </p>
        </div>

        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="parent@email.com"
              className="w-full rounded-xl border border-teal-100 bg-white px-4 py-3 outline-none ring-brand-teal transition focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-teal-100 bg-white px-4 py-3 outline-none ring-brand-teal transition focus:ring-2"
            />
          </div>

          <Link
            href="/dashboard"
            className="block w-full rounded-xl bg-brand-teal px-4 py-3 text-center font-semibold text-white transition hover:bg-brand-teal-dark"
          >
            Login
          </Link>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          <a href="#" className="font-semibold text-brand-orange hover:underline">
            Start free 7-day trial
          </a>
        </p>
      </section>
    </main>
  );
}
