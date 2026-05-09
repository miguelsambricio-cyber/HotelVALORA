"use client";

import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TwoFactorCardProps {
  className?: string;
}

/**
 * Two-Factor Authentication card — Section 3 left.
 *
 * Dark forest gradient surface (the only non-white card on the page),
 * decorative ShieldCheck mark in the upper-right corner at low opacity,
 * white headline + body, yellow accent CTA. Visual weight matches the
 * EBITDA Stabilized hero card on the P&L page so the institutional
 * design system stays coherent.
 *
 * v1: enabling 2FA is a 350ms mock + state toggle ("ENABLE 2FA" → "2FA
 * ENABLED"). v2: redirect to a setup wizard (TOTP enrolment, backup
 * codes, etc.).
 */
export function TwoFactorCard({ className }: TwoFactorCardProps) {
  const [enabled, setEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleEnable = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 350));
    setEnabled(true);
    setSubmitting(false);
  };

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-900 via-forest-900 to-emerald-900 p-7 text-white shadow-[0_12px_32px_rgba(0,51,30,0.18)]",
        className,
      )}
    >
      {/* Decorative shield in the corner — semi-transparent so it reads as a watermark */}
      <ShieldCheck
        size={180}
        strokeWidth={1.2}
        className="pointer-events-none absolute -right-10 -bottom-10 text-emerald-700/30"
        aria-hidden
      />

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full bg-emerald-700/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-300">
          <ShieldCheck size={12} strokeWidth={2.5} />
          Recommended
        </div>

        <h2 className="font-headline text-xl font-extrabold leading-tight md:text-2xl">
          Two-Factor Authentication
        </h2>

        <p className="mt-3 max-w-md text-sm leading-relaxed text-emerald-50/85">
          Add an extra layer of security to your institutional account. We
          recommend using an authenticator app for the highest level of
          protection.
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleEnable}
            disabled={submitting || enabled}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] transition-all",
              enabled
                ? "cursor-default bg-emerald-700/40 text-yellow-200"
                : "bg-yellow-400 text-forest-900 shadow-md hover:brightness-110 active:scale-[0.98]",
              "disabled:opacity-80",
            )}
          >
            {enabled
              ? "2FA Enabled"
              : submitting
                ? "Enabling…"
                : "Enable 2FA"}
            {!enabled && <ArrowRight size={14} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </section>
  );
}
