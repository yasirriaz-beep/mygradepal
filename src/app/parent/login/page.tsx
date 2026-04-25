import Link from "next/link";
import Logo from "@/components/Logo";

export default function ParentLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
        <div className="text-center">
          <Logo className="justify-center" />
          <p className="mt-2 text-sm text-slate-600">You pay. You deserve to know everything.</p>
        </div>
        <form className="mt-6 space-y-4">
          <input type="email" placeholder="Email" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
          <input type="password" placeholder="Password" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
          <Link href="/parent/dashboard" className="block w-full rounded-xl bg-brand-teal px-4 py-3 text-center font-semibold text-white">
            Parent login
          </Link>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/" className="font-semibold text-brand-teal hover:underline">
            I am a student
          </Link>
        </p>
      </section>
    </main>
  );
}
