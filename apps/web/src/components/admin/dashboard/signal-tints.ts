import type { SignalLevel } from "@/lib/admin/dashboard";

/**
 * Visual contract for the four signal tints surfaced across the
 * institutional Executive Control Room: OK / WARN / ERROR / NEUTRAL.
 *
 * Bloomberg + Palantir convention — saturated indicator on top of a
 * muted slate canvas. Reuse across KPI cards · pipeline cards ·
 * infrastructure indicators · activity timeline.
 */

export interface SignalVisual {
  /** Tailwind text class for the dot + emphasized label */
  text: string;
  /** Tailwind background for pills */
  bg: string;
  /** Tailwind ring for pills */
  ring: string;
  /** Side rail color (KPI card left edge) */
  rail: string;
  /** Dot glyph */
  dot: string;
  /** Whether the dot should pulse */
  pulse: boolean;
}

export const SIGNAL_VISUAL: Record<SignalLevel, SignalVisual> = {
  ok: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/20",
    rail: "bg-emerald-400",
    dot: "●",
    pulse: true,
  },
  warn: {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/20",
    rail: "bg-amber-400",
    dot: "◐",
    pulse: false,
  },
  error: {
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    ring: "ring-rose-500/20",
    rail: "bg-rose-500",
    dot: "▲",
    pulse: true,
  },
  neutral: {
    text: "text-slate-400",
    bg: "bg-slate-500/10",
    ring: "ring-slate-500/20",
    rail: "bg-slate-500",
    dot: "○",
    pulse: false,
  },
};
