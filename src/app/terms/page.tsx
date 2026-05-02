import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | MyGradePal",
  description: "MyGradePal Terms of Service and policies.",
};

export default function TermsPage() {
  return (
    <main className="body-font mx-auto max-w-3xl px-6 py-12 text-gray-600 leading-relaxed">
      <p className="mb-2 text-sm text-gray-500">Last updated: May 2026</p>
      <h1 className="heading-font mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
        MYGRADEPAL TERMS OF SERVICE
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        <Link href="/" className="text-[#189080] hover:underline">
          ← Back to home
        </Link>
      </p>

      <section id="introduction">
        <h2 className="heading-font mb-3 mt-0 flex gap-2 text-lg font-semibold text-gray-900">
          <span className="shrink-0 text-[#189080]">1.</span>
          <span>Introduction</span>
        </h2>
        <p>
          MyGradePal (&quot;the Platform&quot;) is operated by MyGradePal (Private) Limited, Pakistan. By creating an
          account, you agree to these Terms.
        </p>
      </section>

      <section id="account-security">
        <h2 className="heading-font mt-8 mb-3 flex gap-2 text-lg font-semibold text-gray-900">
          <span className="shrink-0 text-[#189080]">2.</span>
          <span>Account Registration and Security</span>
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>You must provide accurate information</li>
          <li>You are responsible for maintaining confidentiality of your password</li>
          <li>You must notify us immediately of any unauthorized use</li>
          <li>Maximum 2 devices may be logged in simultaneously per account</li>
        </ul>
      </section>

      <section id="one-account">
        <h2 className="heading-font mt-8 mb-3 flex gap-2 text-lg font-semibold text-gray-900">
          <span className="shrink-0 text-[#189080]">3.</span>
          <span>One Account Per Student Policy</span>
        </h2>
        <p className="mb-3">Each subscription is for ONE individual student only. You may not:</p>
        <ul className="list-decimal space-y-2 pl-6">
          <li>Share your login credentials with others</li>
          <li>Allow multiple students to use one account</li>
          <li>Transfer your account to another person</li>
        </ul>
        <p className="mt-3">
          Violation will result in immediate account termination without refund.
        </p>
      </section>

      <section id="prohibited">
        <h2 className="heading-font mt-8 mb-3 flex gap-2 text-lg font-semibold text-gray-900">
          <span className="shrink-0 text-[#189080]">4.</span>
          <span>Prohibited Activities</span>
        </h2>
        <p className="mb-3">You may not:</p>
        <ol className="list-decimal space-y-2 pl-6">
          <li>Copy, download, or distribute platform content</li>
          <li>Screenshot or photograph content for distribution</li>
          <li>Use automated tools to scrape content</li>
          <li>Attempt to bypass security measures</li>
          <li>Share past paper questions or mark schemes obtained from this platform</li>
          <li>Resell or sublicense access to the platform</li>
        </ol>
      </section>

      <section id="intellectual-property">
        <h2 className="heading-font mt-8 mb-3 flex gap-2 text-lg font-semibold text-gray-900">
          <span className="shrink-0 text-[#189080]">5.</span>
          <span>Intellectual Property</span>
        </h2>
        <p>
          All content on MyGradePal including questions, explanations, flashcards, audio, and study notes are the
          intellectual property of MyGradePal (Private) Limited. Cambridge past paper questions are used under fair
          use for educational purposes. Unauthorized reproduction is strictly prohibited.
        </p>
      </section>

      <section id="content-protection">
        <h2 className="heading-font mt-8 mb-3 flex gap-2 text-lg font-semibold text-gray-900">
          <span className="shrink-0 text-[#189080]">6.</span>
          <span>Content Protection</span>
        </h2>
        <p>
          Our platform content is protected by technical and legal measures. Circumventing these measures is a
          violation of these Terms and may constitute a criminal offense under Pakistan&apos;s Electronic Crimes Act
          (PECA) 2016.
        </p>
      </section>

      <section id="payment-refunds">
        <h2 className="heading-font mt-8 mb-3 flex gap-2 text-lg font-semibold text-gray-900">
          <span className="shrink-0 text-[#189080]">7.</span>
          <span>Payment and Refunds</span>
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>All fees are in Pakistani Rupees (PKR)</li>
          <li>Subscription: Rs 5,000 per subject per month</li>
          <li>Free trial: 1 topic + 1 year past papers included at no cost</li>
          <li>Refunds within 7 days of payment if no significant usage (less than 10 questions attempted)</li>
          <li>No refund after 7 days</li>
          <li>Pricing is subject to change with 30 days notice to existing subscribers</li>
        </ul>
      </section>

      <section id="privacy-summary">
        <h2 className="heading-font mt-8 mb-3 flex gap-2 text-lg font-semibold text-gray-900">
          <span className="shrink-0 text-[#189080]">8.</span>
          <span>Privacy Policy Summary</span>
        </h2>
        <p>
          We collect name, email, exam date, and usage data to provide the service. We share progress data with
          parents/guardians as part of the platform&apos;s core functionality. We do not sell your data to third
          parties.
        </p>
      </section>

      <section id="termination">
        <h2 className="heading-font mt-8 mb-3 flex gap-2 text-lg font-semibold text-gray-900">
          <span className="shrink-0 text-[#189080]">9.</span>
          <span>Termination</span>
        </h2>
        <p className="mb-3">We reserve the right to terminate accounts that:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Violate the one-account-per-student policy</li>
          <li>Share or distribute platform content</li>
          <li>Engage in fraudulent activity</li>
          <li>Attempt to circumvent security measures</li>
        </ul>
        <p className="mt-3">Termination is immediate and without refund for policy violations.</p>
      </section>

      <section id="contact">
        <h2 className="heading-font mt-8 mb-3 flex gap-2 text-lg font-semibold text-gray-900">
          <span className="shrink-0 text-[#189080]">10.</span>
          <span>Contact</span>
        </h2>
        <p className="mb-2">For any queries contact:</p>
        <ul className="list-none space-y-1 pl-0">
          <li>
            <span className="font-medium text-gray-800">Email:</span>{" "}
            <a href="mailto:support@mygradepal.com" className="text-[#189080] hover:underline">
              support@mygradepal.com
            </a>
          </li>
          <li>
            <span className="font-medium text-gray-800">WhatsApp:</span> [your number]
          </li>
          <li>
            <span className="font-medium text-gray-800">Website:</span>{" "}
            <a href="https://www.mygradepal.com" className="text-[#189080] hover:underline" rel="noreferrer">
              www.mygradepal.com
            </a>
          </li>
        </ul>
      </section>

      <p className="mt-10 border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
        By using MyGradePal you agree to these Terms.
      </p>
    </main>
  );
}
