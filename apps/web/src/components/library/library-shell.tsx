import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { InstitutionalFooter } from "@/components/layout/institutional-footer";

export interface LibraryShellProps {
  children: ReactNode;
}

/**
 * Institutional shell for /library/*.
 *
 *   ┌──────────────── AppHeader (sticky) ─────────────────┐
 *   ├─────────────────────────────────────────────────────┤
 *   │                                                     │
 *   │   { children }  →  fullscreen sidebar + map row     │
 *   │                                                     │
 *   ├──────────────── InstitutionalFooter ────────────────┤
 *   └─────────────────────────────────────────────────────┘
 *
 * The viewport is locked to `h-screen` so children can render a
 * "kiosk" layout — sidebar + edge-to-edge map — without page-level
 * scroll. Only the inner sidebar scrolls vertically.
 */
export function LibraryShell({ children }: LibraryShellProps) {
  return (
    <div className="flex h-screen min-h-[640px] flex-col bg-[#f8f9fa]">
      <AppHeader />
      <main className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        {children}
      </main>
      <InstitutionalFooter variant="slim" />
    </div>
  );
}
