import Link from "next/link";
import { BarChart3, BookOpen, CircleHelp, LayoutGrid, Sparkles, UserRound, Waypoints, BookMarked } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/flashcards", label: "🃏 Flashcards", icon: BookMarked },
  { href: "/practice", label: "Practice", icon: Waypoints },
  { href: "/onboarding", label: "How to use", icon: CircleHelp },
  { href: "/predict", label: "Predict", icon: Sparkles },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/account", label: "Account", icon: UserRound }
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-teal-100 bg-white/95 px-4 py-2 backdrop-blur-sm lg:hidden">
      <ul className="mx-auto flex max-w-2xl items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className="flex flex-col items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-teal-50 hover:text-brand-teal"
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
