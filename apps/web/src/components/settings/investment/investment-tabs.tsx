"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { InvestmentTab } from "@/lib/investment";

const TABS: { id: InvestmentTab; label: string; href: string }[] = [
  { id: "asset", label: "Hotel Asset", href: "/settings/investment" },
  { id: "market", label: "Hotel Market", href: "/settings/investment/market" },
  { id: "value", label: "Hotel Value", href: "/settings/investment/value" },
];

/**
 * Top sub-tabs within the Investment Requirements page. Each tab is a
 * real route (`/settings/investment[/market|/value]`) so analysts can
 * deep-link / refresh into any tab and the browser back button works.
 * Active state derived from `usePathname()` — no extra state needed.
 */
export function InvestmentTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-8 border-b border-slate-200">
      {TABS.map((t) => {
        const isActive = pathname === t.href;
        return (
          <Link
            key={t.id}
            href={t.href}
            prefetch
            className={cn(
              "relative -mb-px px-1 pb-4 text-sm font-bold transition-colors font-headline",
              isActive
                ? "border-b-2 border-forest-900 text-forest-900"
                : "border-b-2 border-transparent text-slate-500 hover:text-forest-900",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
