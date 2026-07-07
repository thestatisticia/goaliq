"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { KeplrWallet } from "@/components/KeplrWallet";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/copilot", label: "AI Copilot", icon: MessageSquare },
  { href: "/fund", label: "Fund Wallet", icon: Wallet },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-goaliq-border/80 bg-goaliq-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-goaliq-accent to-goaliq-accentDim shadow-glow">
            <span className="text-sm font-black text-goaliq-bg">G</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight">
              GOAL<span className="text-goaliq-accent">IQ</span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-goaliq-muted">
              World Cup Intelligence
            </span>
          </div>
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
                  : "text-goaliq-muted hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
          <div className="ml-2 border-l border-goaliq-border pl-2">
            <KeplrWallet />
          </div>
        </nav>
      </div>
    </header>
  );
}
