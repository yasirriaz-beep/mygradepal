"use client";

import Link from "next/link";
import Logo from "@/components/Logo";

export default function ReferralPage() {
  return (
    <main className="min-h-screen bg-[#f7faf9] px-4 py-10">
      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-[#d0f7f2] bg-white p-6 shadow-card sm:p-8">
        <Logo className="justify-center text-center" />

        <h1 className="heading-font mt-8 text-center text-3xl font-extrabold text-[#0e1a1a]">
          Refer a friend — you both save Rs 1,000
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-base leading-7 text-[#2d5252]">
          Share MyGradePal with another parent. When they subscribe, you both get Rs 1,000 off
          your next month automatically.
        </p>

        <div className="mt-8 rounded-2xl border border-[#d0f7f2] bg-[#edfaf8] p-5">
          <h2 className="heading-font text-lg font-bold text-[#137066]">How it works</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#2d5252]">
            <li>Share your unique referral link</li>
            <li>Friend signs up and subscribes</li>
            <li>You both get Rs 1,000 off next month</li>
          </ol>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-[#0e1a1a]">Your referral link</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 rounded-xl border border-[#d0f7f2] bg-[#f7faf9] px-4 py-3 text-sm text-[#2d5252]">
              www.mygradepal.com?ref=YOUR-CODE
            </div>
            <button
              type="button"
              className="rounded-full bg-[#189080] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#137066]"
            >
              Copy link
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 text-sm">
          <Link href="/login" className="font-semibold text-[#f5731e] hover:underline">
            Not a member yet?
          </Link>
          <Link href="/" className="text-[#137066] hover:underline">
            ← Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
