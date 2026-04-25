import Link from "next/link";

export default function ParentTopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div>
          <p className="heading-font text-2xl font-bold text-brand-teal">MyGradePal</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Parent Portal</p>
        </div>
        <Link
          href="/parent/login"
          className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Logout
        </Link>
      </div>
    </header>
  );
}
