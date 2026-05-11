import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { InstitutionalFooter } from "@/components/layout/institutional-footer";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

/**
 * Admin shell for /user/admin/*. Mirrors the SettingsLayout pattern so the
 * Administrator section feels native to HOTELVALORA:
 *
 *   ┌─────────────────────────────────────────────┐
 *   │ AppHeader (sticky, institutional)           │
 *   ├─────────────────────────────────────────────┤
 *   │  bg-[#f6f8f7]                               │
 *   │  ┌──────────┐  ┌─────────────────────────┐  │
 *   │  │ Admin    │  │ {children}              │  │
 *   │  │ Sidebar  │  │                         │  │
 *   │  └──────────┘  └─────────────────────────┘  │
 *   ├─────────────────────────────────────────────┤
 *   │ Footer (institutional dark, slim)           │
 *   └─────────────────────────────────────────────┘
 *
 * Inherits typography, spacing, color tokens, and sticky-sidebar behaviour
 * from the existing user area at /settings/*. The only differences are:
 *   - sidebar brand block flips to forest-900 + lime-300 (operations tint)
 *   - "Planned" group lists future admin surfaces explicitly
 */
export default function AdminRouteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8f7]">
      <AppHeader />

      <div className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-10 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <AdminSidebar />
          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <InstitutionalFooter variant="slim" />
    </div>
  );
}
