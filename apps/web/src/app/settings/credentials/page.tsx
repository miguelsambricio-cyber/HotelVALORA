import type { Metadata } from "next";
import { Key } from "lucide-react";
import { SettingsHeader } from "@/components/settings";

export const metadata: Metadata = {
  title: "Credentials — HotelVALORA",
};

export default function CredentialsPage() {
  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Credentials"
        subtitle="Connected accounts, API keys, and session management."
      />

      <ComingSoon icon={<Key size={28} className="text-forest-900" strokeWidth={2} />}>
        Credentials management ships in the next release. You will be able to
        review linked OAuth identities, rotate API keys, and audit active
        sessions from this surface.
      </ComingSoon>
    </div>
  );
}

function ComingSoon({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200">
        {icon}
      </div>
      <h3 className="font-headline text-lg font-extrabold uppercase tracking-tight text-forest-900">
        Coming Soon
      </h3>
      <p className="max-w-md text-sm text-slate-500">{children}</p>
    </div>
  );
}
