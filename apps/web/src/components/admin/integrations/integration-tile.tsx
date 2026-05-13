import { cn } from "@/lib/utils";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import type { SignalLevel } from "@/lib/admin/dashboard";
import type { UnifiedStatus } from "@/lib/admin/integrations/unified-status";

/**
 * Compact integration tile — canonical visual contract is the
 * Infrastructure Monitoring row in /user/admin Section 05
 * (`components/admin/dashboard/infra-indicator.tsx`).
 *
 *   - rounded-xl border-slate-800 bg-slate-950 p-4
 *   - h-2.5 status dot (pulses when ok/error)
 *   - 13px extrabold provider/name
 *   - 9.5px uppercase mono status badge + region pill
 *   - 11px slate-400 description (1-line clamp)
 *   - 10.5px mono slate-500 metadata
 *
 * Visual proportions are intentionally identical so the integrations page
 * reads as the same monitoring dashboard. Use inside an
 * `<IntegrationDetailSheet>` to make the tile clickable.
 */
export function IntegrationTile({
  signal,
  name,
  statusLabel,
  status,
  regionLabel,
  description,
  metadata,
}: {
  /** Drives the status dot color + pulse (SIGNAL_VISUAL lookup). */
  signal: SignalLevel;
  /** Provider / integration display name. */
  name: string;
  /** Short status text inside the badge (e.g. "LIVE"). */
  statusLabel: string;
  /** Unified status taxonomy bucket — drives badge tone. */
  status: UnifiedStatus;
  /** Trailing region/layer pill (e.g. "EU · FRA1", "Layer 1"). */
  regionLabel: string;
  /** 1-line truncated description of what the integration does. */
  description: string;
  /** Single mono metadata line (e.g. "session valid · 12h ago"). */
  metadata: string;
}) {
  const v = SIGNAL_VISUAL[signal];
  const badge = STATUS_BADGE[status];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 transition-colors",
        "group-hover:border-slate-700 group-focus-visible:border-lime-300/40",
      )}
    >
      <div className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0 items-center justify-center">
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full",
            v.rail,
            v.pulse && "animate-pulse",
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-headline text-[13px] font-extrabold tracking-tight text-white">
            {name}
          </h3>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-widest ring-1",
              badge.bg,
              badge.ring,
              badge.text,
            )}
          >
            {statusLabel}
          </span>
          <span className="ml-auto shrink-0 rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-widest text-slate-400">
            {regionLabel}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-slate-400">
          {description}
        </p>
        <p className="mt-1.5 truncate font-mono text-[10.5px] text-slate-500">
          {metadata}
        </p>
      </div>
    </div>
  );
}

/** Status badge tones — keyed by unified taxonomy. */
const STATUS_BADGE: Record<
  UnifiedStatus,
  { bg: string; ring: string; text: string }
> = {
  live: {
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/20",
    text: "text-emerald-300",
  },
  partial: {
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/20",
    text: "text-amber-300",
  },
  not_wired: {
    bg: "bg-sky-500/10",
    ring: "ring-sky-500/20",
    text: "text-sky-300",
  },
  fail: {
    bg: "bg-rose-500/10",
    ring: "ring-rose-500/20",
    text: "text-rose-300",
  },
  planned: {
    bg: "bg-violet-500/10",
    ring: "ring-violet-500/20",
    text: "text-violet-300",
  },
};
