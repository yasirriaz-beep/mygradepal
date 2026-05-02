import type { Metadata } from "next";

import ContentProtectionShell from "@/components/ContentProtectionShell";
import SessionDeviceSync from "@/components/SessionDeviceSync";
import { DM_Sans, Sora } from "next/font/google";

import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "600", "700"],
  preload: false
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "700"],
  preload: false
});

export const metadata: Metadata = {
  title: "MyGradePal",
  description: "Your child's smartest study companion"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${dmSans.variable} body-font antialiased`}>
        <ContentProtectionShell>
          <SessionDeviceSync />
          {children}
        </ContentProtectionShell>
      </body>
    </html>
  );
}
