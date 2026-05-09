"use client";

import {
  AuthCard,
  ConnectedProviders,
  ConnectivityStatusBar,
} from "@/components/auth";

/**
 * Client wrapper for the centered auth experience.
 *
 * Lives inside `<Suspense>` from the server `page.tsx` because the
 * underlying AuthCard reads `useSearchParams()` for the `?next=` redirect
 * target — same pattern as the financial pages.
 */
export function LoginContent() {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      {/* Hero */}
      <div className="text-center mb-10 px-4">
        <h1 className="font-headline text-3xl font-extrabold uppercase tracking-tight text-forest-900 leading-[1.05] md:text-4xl">
          Hotel Valuation
          <br />
          <span className="text-emerald-700">Intelligence Platform</span>
        </h1>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          Institutional underwriting access
        </p>
      </div>

      {/* Auth card */}
      <AuthCard className="w-full" />

      {/* Connected data providers */}
      <ConnectedProviders className="mt-8" />

      {/* Connectivity status */}
      <ConnectivityStatusBar className="mt-10" />
    </div>
  );
}
