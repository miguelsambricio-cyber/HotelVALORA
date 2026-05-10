import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { InstitutionalFooter } from "@/components/layout/institutional-footer";
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

      <InstitutionalFooter variant="slim" />
    </div>
  );
}
