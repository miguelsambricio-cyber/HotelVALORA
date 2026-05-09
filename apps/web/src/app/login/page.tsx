import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/layout/app-header";
import {
  AuthCard,
  ConnectedProviders,
  ConnectivityStatusBar,
} from "@/components/auth";

export const metadata: Metadata = {
  title: "Access Platform — HotelVALORA",
  description:
    "Institutional access to the HotelVALORA hotel underwriting platform.",
};

/**
 * Centered auth page — institutional landing-cousin layout.
 *
 * Server component: hero + providers + connectivity bar + footer all
 * pre-render statically. Only the AuthCard hydrates inside Suspense
 * because it reads `useSearchParams` for the `?next=` redirect target.
 *
 * The provider components are marked `"use client"` for their internal
 * UI state (eye toggle, scoped CSS animation), but server can compose
 * them — Next handles the boundary automatically.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="mx-auto flex w-full max-w-md flex-col items-center">
          {/* Hero — server-rendered, visible immediately */}
          <div className="mb-10 px-4 text-center">
            <h1 className="font-headline text-3xl font-extrabold uppercase leading-[1.05] tracking-tight text-forest-900 md:text-4xl">
              Hotel Valuation
              <br />
              <span className="text-emerald-700">Intelligence Platform</span>
            </h1>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Institutional underwriting access
            </p>
          </div>

          {/* Auth card — Suspense for ?next= search-param resolution */}
          <Suspense fallback={<AuthCardSkeleton />}>
            <AuthCard className="w-full" />
          </Suspense>

          {/* Connected data providers — static */}
          <ConnectedProviders className="mt-8" />

          {/* Connectivity status — animated, but no Suspense bailout */}
          <ConnectivityStatusBar className="mt-10" />
        </div>
      </main>

      <footer className="w-full bg-slate-950 px-8 py-3">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 md:flex-row">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
            © 2026 HotelVALORA Institutional. Underwriting-grade intelligence.
          </span>
          <nav aria-label="Footer" className="flex gap-5">
            <a
              href="#privacy"
              className="text-[10px] uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-emerald-300"
            >
              Privacy
            </a>
            <a
              href="#terms"
              className="text-[10px] uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-emerald-300"
            >
              Terms
            </a>
            <a
              href="#contact"
              className="text-[10px] uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-emerald-300"
            >
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** Loading shape — preserves layout while AuthCard's Suspense resolves. */
function AuthCardSkeleton() {
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-[0_20px_40px_rgba(0,51,30,0.06)]">
      <div className="space-y-5">
        <div className="h-3 w-12 animate-pulse rounded bg-slate-100" />
        <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
        <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
        <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
        <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}
