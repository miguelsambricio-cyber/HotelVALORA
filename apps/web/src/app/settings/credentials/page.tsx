import type { Metadata } from "next";
import { SettingsHeader } from "@/components/settings";
import {
  ActiveSessionsCard,
  ChangePasswordCard,
  LinkedAccountCard,
  TwoFactorCard,
} from "@/components/settings/credentials";

export const metadata: Metadata = {
  title: "Credentials & Security — HotelVALORA",
  description:
    "Manage your password, linked institutional accounts, two-factor authentication and active sessions.",
};

export default function CredentialsPage() {
  return (
    <div className="space-y-8">
      <SettingsHeader
        title="Credentials & Security"
        subtitle="Manage your password and external account connections."
      />

      {/* SECTION 1 — Change Password */}
      <ChangePasswordCard />

      {/* SECTION 2 — Linked Accounts */}
      <section className="space-y-5">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h2 className="font-headline text-lg font-extrabold text-forest-900 md:text-xl">
              Linked Accounts
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Integrate professional networks for rapid authentication and
              direct report publishing.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 md:self-end">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            System Ready
          </span>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <LinkedAccountCard
            provider="linkedin"
            title="LinkedIn"
            description="Sync profile and share valuation insights."
            ctaLabel="Connect Account"
            topRightAction={{ label: "Disconnect", variant: "danger" }}
          />
          <LinkedAccountCard
            provider="google"
            title="Google Workspace"
            description="valora.admin@gmail.com"
            ctaLabel="Unlink Account"
          />
          <LinkedAccountCard
            provider="apple"
            title="Apple ID"
            description="Use FaceID for instant vault access."
            ctaLabel="Link Account"
          />
          <LinkedAccountCard
            provider="microsoft"
            title="Microsoft Azure"
            description="Connector for Active Directory sync."
            ctaLabel="Connect Account"
            badge={{ label: "Enterprise", variant: "enterprise" }}
          />
        </div>
      </section>

      {/* SECTION 3 — Security row (2FA large + Active Sessions small) */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <TwoFactorCard className="md:col-span-2" />
        <ActiveSessionsCard className="md:col-span-1" />
      </section>

      {/* Bottom CTA */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          className="inline-flex w-full max-w-xs items-center justify-center rounded-xl bg-forest-900 px-6 py-3.5 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
