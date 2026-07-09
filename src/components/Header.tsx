"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, Wallet, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { KeplrWallet } from "@/components/KeplrWallet";
import { GoaliqWordmark } from "@/components/GoaliqWordmark";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/copilot", label: "AI Copilot", icon: MessageSquare },
  { href: "/fund", label: "Fund Wallet", icon: Wallet },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-goaliq-border/80 bg-goaliq-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href="/" className="group transition-opacity hover:opacity-90">
          <GoaliqWordmark size="md" />
        </Link>

        <nav className="flex items-center gap-1.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-goaliq-accent/10 text-goaliq-accent"
                  : "text-goaliq-muted hover:bg-goaliq-surface hover:text-goaliq-fg"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
          <div className="ml-2 flex items-center gap-2 border-l border-goaliq-border pl-2">
            <ThemeToggle />
            <KeplrWallet />
          </div>
        </nav>
      </div>
    </header>
  );
}
