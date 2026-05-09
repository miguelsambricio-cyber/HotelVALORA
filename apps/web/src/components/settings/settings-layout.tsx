import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { SettingsSidebar } from "./settings-sidebar";

export interface SettingsLayoutProps {
  children: ReactNode;
}

/**
 * Outer shell for any /settings/* page. Composes:
 *
 *   ┌─────────────────────────────────────────────┐
 *   │ AppHeader (sticky, institutional)           │
 *   ├─────────────────────────────────────────────┤
 *   │  bg-[#f6f8f7]                               │
 *   │  ┌──────────┐  ┌─────────────────────────┐  │
 *   │  │ Sidebar  │  │ {children}              │  │
 *   │  │ (sticky) │  │                         │  │
 *   │  └──────────┘  └─────────────────────────┘  │
 *   ├─────────────────────────────────────────────┤
 *   │ Footer (institutional dark)                 │
 *   └─────────────────────────────────────────────┘
 *
 * Server component — only sub-pieces hydrate (Sidebar reads pathname,
 * AppHeader reads useAuth).
 */
export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8f7]">
      <AppHeader />

      <div className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-10 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <SettingsSidebar />
          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <SettingsFooter />
    </div>
  );
}

/**
 * Institutional dark footer — copy mirrors the login footer so the
 * auth + settings surfaces share the same chrome. Future iteration:
 * extract `<InstitutionalFooter />` to `components/layout/` for reuse
 * across landing too.
 */
function SettingsFooter() {
  return (
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
  );
}
