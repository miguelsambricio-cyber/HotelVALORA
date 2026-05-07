import Link from "next/link";
import { CheckCircle2, BadgeCheck } from "lucide-react";
import type { PricingPlan, PricingFeature } from "@/types/hotel-search";
import { cn } from "@/lib/utils";

// ── Feature icon ──────────────────────────────────────────────────────────────

function FeatureIcon({ variant }: { variant: PricingFeature["icon"] }) {
  return variant === "verified" ? (
    <BadgeCheck className="text-forest-900 shrink-0" size={20} aria-hidden />
  ) : (
    <CheckCircle2 className="text-forest-900 shrink-0" size={16} aria-hidden />
  );
}

// ── Watermark ─────────────────────────────────────────────────────────────────

const WATERMARK_SRC =
  "https://lh3.googleusercontent.com/aida/ADBb0uga57VKq-ZhZz7rDm7NUr25TcNmzrUgaGqjCTWjS-dYUvSOEiFj27qaLShLXGmEzG0F7wZCJQrlXZUdkbUwctQK9-4l9RgQiEqTqEZpXHSFqP19ZgwMxaV0J49-aaPfLKebfRogYJhZaFgbOOnlOSFD7QUkL2UopcGs9zI7wUp3XE5Co08bthebMJCj6ObdJARfRNt1yxKir_k8ZEWxuKF642Vyf0tO4jm00KoV65tJR6Xn-wtO5gfzieOeoqvumcY16pGSe9X82zw";

// ── Pricing card ──────────────────────────────────────────────────────────────

export function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <article
      aria-label={`Plan ${plan.name}`}
      className={cn(
        "relative bg-white p-8 rounded-3xl group overflow-hidden transition-all flex flex-col justify-between",
        plan.featured
          ? "border-2 border-forest-900 shadow-2xl scale-105 z-20"
          : "border border-slate-200 shadow-sm hover:shadow-xl"
      )}
    >
      {/* Decorative brand watermark — purely presentational */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={WATERMARK_SRC}
        alt=""
        aria-hidden
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 pointer-events-none select-none z-0",
          plan.featured ? "opacity-[0.05]" : "opacity-[0.03]"
        )}
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="mb-6">
          {plan.featured ? (
            <span className="inline-block px-3 py-1 bg-forest-900 text-white text-[10px] font-bold tracking-[0.2em] rounded-full uppercase mb-4">
              {plan.tier}
            </span>
          ) : (
            <span className="block text-xs font-bold tracking-[0.3em] text-slate-400 uppercase">
              {plan.tier}
            </span>
          )}

          <h3
            className={cn(
              "text-3xl font-extrabold text-forest-900",
              !plan.featured && "mt-2"
            )}
          >
            {plan.name}
          </h3>

          {plan.subtitle && (
            <p className="text-forest-700 font-semibold mt-1 text-sm opacity-80">
              {plan.subtitle}
            </p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8 flex-grow" aria-label={`Características del plan ${plan.name}`}>
          {plan.features.map((feature) => (
            <li
              key={feature.text}
              className={cn(
                "flex items-center gap-3 text-sm",
                plan.featured
                  ? "font-semibold text-slate-800"
                  : "font-medium text-slate-500"
              )}
            >
              <FeatureIcon variant={feature.icon} />
              {feature.text}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link
          href={plan.href}
          className={cn(
            "block w-full py-3 text-center font-bold rounded-xl transition-all uppercase text-xs tracking-widest",
            plan.featured
              ? "bg-forest-900 text-white shadow-lg shadow-forest-900/20 hover:brightness-110"
              : "border-2 border-forest-900 text-forest-900 group-hover:bg-forest-900 group-hover:text-white"
          )}
        >
          {plan.ctaLabel}
        </Link>

      </div>
    </article>
  );
}
