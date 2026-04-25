"use client";

import clsx from "clsx";
import Link from "next/link";
import { Bell, CalendarDays, House, Settings, SquareChartGantt } from "lucide-react";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/parent/dashboard", label: "Home", icon: House },
  { href: "/parent/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/parent/reports", label: "Reports", icon: SquareChartGantt },
  { href: "/parent/notifications", label: "Alerts", icon: Bell },
  { href: "/parent/settings", label: "Settings", icon: Settings },
];

export default function ParentBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-2 py-2 shadow-[0_-6px_20px_rgba(15,23,42,0.08)]">
      <ul className="mx-auto flex max-w-5xl items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={clsx(
                  "flex min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition",
                  active ? "bg-teal-50 text-brand-teal" : "text-slate-500 hover:text-slate-700",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
