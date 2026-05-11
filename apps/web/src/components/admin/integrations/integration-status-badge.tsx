import { cn } from "@/lib/utils";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import type {
  AuthStatus,
  ConnectionStatus,
} from "@/lib/admin/integrations";
import {
  AUTH_STATUS_VISUAL,
  CONNECTION_VISUAL,
} from "@/lib/admin/integrations";

interface ConnectionBadgeProps {
  status: ConnectionStatus;
  className?: string;
  variant?: "dark" | "light";
}

/** Pill rendering the integration's overall connection status. */
export function ConnectionStatusBadge({
  status,
  className,
  variant = "dark",
}: ConnectionBadgeProps) {
  const visual = CONNECTION_VISUAL[status];
  const signal = SIGNAL_VISUAL[visual.signal];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
        variant === "dark"
          ? cn(signal.bg, signal.ring, signal.text)
          : signal.text === "text-emerald-400"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : signal.text === "text-amber-400"
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : signal.text === "text-rose-400"
          ? "bg-rose-50 text-rose-700 ring-rose-200"
          : "bg-slate-100 text-slate-600 ring-slate-200",
        className,
      )}
      title={visual.hint}
    >
      <span aria-hidden className={cn(signal.text, signal.pulse && "animate-pulse")}>
        {signal.dot}
      </span>
      {visual.label}
    </span>
  );
}

interface AuthBadgeProps {
  status: AuthStatus;
  className?: string;
  variant?: "dark" | "light";
}

/** Pill rendering the integration's session auth status. */
export function AuthStatusBadge({
  status,
  className,
  variant = "dark",
}: AuthBadgeProps) {
  const visual = AUTH_STATUS_VISUAL[status];
  const signal = SIGNAL_VISUAL[visual.signal];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
        variant === "dark"
          ? cn(signal.bg, signal.ring, signal.text)
          : signal.text === "text-emerald-400"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : signal.text === "text-amber-400"
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : signal.text === "text-rose-400"
          ? "bg-rose-50 text-rose-700 ring-rose-200"
          : "bg-slate-100 text-slate-600 ring-slate-200",
        className,
      )}
      title={visual.hint}
    >
      <span aria-hidden className={cn(signal.text, signal.pulse && "animate-pulse")}>
        {signal.dot}
      </span>
      {visual.label}
    </span>
  );
}
