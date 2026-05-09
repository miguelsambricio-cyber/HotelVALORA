"use client";

import Link from "next/link";
import { ArrowUpRight, MonitorSmartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActiveSessionsCardProps {
  /** Number of currently active devices/sessions (mock value for v1) */
  count?: number;
  className?: string;
}

/**
 * Active sessions card — Section 3 right.
 *
 * White editorial card sized to balance visually with the larger 2FA
 * card on its left. v1 ships a static count; v2 reads from
 * `GET /api/v1/me/sessions` and the "Review sessions" link routes to
 * a sessions table page (TODO: /settings/credentials/sessions).
 */
export function ActiveSessionsCard({
  count = 3,
  className,
}: ActiveSessionsCardProps) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,51,30,0.04)]",
        className,
      )}
    >
      <header className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <MonitorSmartphone
            size={18}
            className="text-forest-900"
            strokeWidth={2.2}
          />
        </div>
        <div>
          <h2 className="font-headline text-base font-extrabold text-forest-900">
            Active Sessions
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            You are currently logged in on{" "}
            <strong className="text-forest-900">{count} devices</strong>.
          </p>
        </div>
      </header>

      <div className="mt-auto pt-2">
        <Link
          href="#sessions"
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-forest-900 transition-colors",
            "hover:text-emerald-700",
          )}
        >
          Review sessions
          <ArrowUpRight size={14} strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}
