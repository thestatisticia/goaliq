"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddressCopyProps {
  label: string;
  address: string;
  hint?: string;
  highlight?: boolean;
  className?: string;
}

export function AddressCopy({ label, address, hint, highlight, className }: AddressCopyProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        highlight ? "border-goaliq-gold/40 bg-goaliq-gold/5" : "border-goaliq-border bg-black/20",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className={cn("text-xs font-medium", highlight ? "text-goaliq-gold" : "text-gray-400")}>
          {label}
        </p>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-xs text-goaliq-accent hover:underline"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <p className="font-mono text-xs break-all text-gray-200">{address}</p>
      {hint && <p className="text-[11px] text-gray-500 mt-2">{hint}</p>}
    </div>
  );
}
