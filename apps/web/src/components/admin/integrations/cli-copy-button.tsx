"use client";

import { useState } from "react";
import { Clipboard, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One-click copy button for an operator CLI command. Pure UX polish —
 * makes the "always-available refresh runbook" pattern feel like a real
 * operations console instead of a static string.
 *
 * Stays minimal: no toast, no global state. Local 2-second checkmark
 * confirmation, then back to the clipboard icon.
 */
export function CliCopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (HTTP, old browser) — silently no-op.
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ?? "Copy command"}
      className={cn(
        "ml-2 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] transition-colors",
        copied
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
          : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:text-white",
      )}
    >
      {copied ? <ClipboardCheck size={11} aria-hidden /> : <Clipboard size={11} aria-hidden />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
