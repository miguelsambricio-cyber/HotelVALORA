import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingHeader } from "@/components/landing/landing-header";
import { LoginContent } from "./login-content";

export const metadata: Metadata = {
  title: "Access Platform — HotelVALORA",
  description:
    "Institutional access to the HotelVALORA hotel underwriting platform.",
};

/**
 * Centered auth page — institutional landing-cousin layout.
 *
 * Server shell renders the existing landing header + the page chrome at
 * build time so the user sees the institutional framing instantly. The
 * interactive auth card hydrates inside Suspense (it reads
 * `useSearchParams` for the `?next=` redirect target).
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <LandingHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16 pt-28">
        <Suspense fallback={null}>
          <LoginContent />
        </Suspense>
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
