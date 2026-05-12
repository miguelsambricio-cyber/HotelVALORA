"use client";

import { useState } from "react";
import { KeyRound, RefreshCw, ShieldAlert, ShieldCheck, ShieldX, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import type { CredentialStatusDescriptor } from "@/lib/intelligence/credentials";
import type { SignalLevel } from "@/lib/admin/dashboard";
import { ProvisionCredentialsModal } from "./provision-credentials-modal";

/**
 * Credentials panel for the per-integration detail page.
 *
 * Renders the operator-facing descriptor of the T1.5 credentials layer:
 *   - Provisioning state (provisioned / not)
 *   - Last rotation timestamp
 *   - Rotation count
 *   - Last used by ingestion
 *   - KEK identifier (forensics only; the KEK itself never leaves env)
 *   - Status (active / invalidated / auth_failure)
 *
 * Buttons trigger the ProvisionCredentialsModal client island. The
 * descriptor passed in is computed server-side via getCredentialStatus —
 * the encrypted bytes never reach the browser bundle.
 */
export function CredentialsPanel({
  sourceSlug,
  sourceName,
  descriptor,
}: {
  sourceSlug: string;
  sourceName: string;
  descriptor: CredentialStatusDescriptor;
}) {
  const [modal, setModal] = useState<null | "provision" | "rotate" | "invalidate">(null);

  const { signal, label, hint, Icon } = computeVisual(descriptor);
  const sig = SIGNAL_VISUAL[signal];

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
            Credentials · T1.5
          </h3>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
              sig.bg,
              sig.ring,
              sig.text,
            )}
          >
            <span aria-hidden className={cn(sig.text, sig.pulse && "animate-pulse")}>{sig.dot}</span>
            {label}
          </span>
        </header>

        <div className="flex items-start gap-3">
          <Icon size={20} className={iconClass(signal)} aria-hidden />
          <div className="flex-1">
            <p className="font-headline text-sm font-extrabold text-white">{headline(descriptor)}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{hint}</p>
          </div>
        </div>

        {/* Telemetry grid */}
        {descriptor.provisioned && (
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-800/60 pt-4 sm:grid-cols-4">
            <Field label="Status" value={descriptor.status ?? "—"} />
            <Field label="KEK" value={descriptor.encKeyId ?? "—"} mono />
            <Field label="Rotation Count" value={String(descriptor.rotationCount)} mono />
            <Field label="Encryption" value="AES-256-GCM" mono />
            <Field label="Last Rotated" value={formatTs(descriptor.lastRotatedAt)} mono />
            <Field label="Last Used" value={formatTs(descriptor.lastUsedAt)} mono />
            {descriptor.invalidatedAt && (
              <Field
                label="Invalidated At"
                value={formatTs(descriptor.invalidatedAt)}
                mono
                className="text-rose-300"
              />
            )}
            {descriptor.invalidatedReason && (
              <Field
                label="Invalidated Reason"
                value={descriptor.invalidatedReason}
                className="col-span-full text-rose-300"
              />
            )}
          </dl>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-4">
          {!descriptor.provisioned ? (
            <button
              type="button"
              onClick={() => setModal("provision")}
              className="inline-flex items-center gap-1.5 rounded-md bg-lime-300 px-3 py-2 font-headline text-[11px] font-bold uppercase tracking-[0.18em] text-forest-900 transition-colors hover:bg-lime-200"
            >
              <KeyRound size={12} aria-hidden /> Provision Credentials
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setModal("rotate")}
                className="inline-flex items-center gap-1.5 rounded-md bg-lime-300 px-3 py-2 font-headline text-[11px] font-bold uppercase tracking-[0.18em] text-forest-900 transition-colors hover:bg-lime-200"
              >
                <RefreshCw size={12} aria-hidden /> Rotate
              </button>
              <button
                type="button"
                onClick={() => setModal("invalidate")}
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 font-headline text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300 transition-colors hover:bg-rose-500/20"
              >
                <ShieldX size={12} aria-hidden /> Invalidate
              </button>
            </>
          )}
          <p className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] text-slate-500">
            <Lock size={11} aria-hidden /> Encrypted at rest · service-role only · zero plaintext persisted
          </p>
        </div>
      </section>

      <ProvisionCredentialsModal
        open={modal !== null}
        onClose={() => setModal(null)}
        mode={modal ?? "provision"}
        sourceSlug={sourceSlug}
        sourceName={sourceName}
      />
    </>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function computeVisual(d: CredentialStatusDescriptor): {
  signal: SignalLevel;
  label: string;
  hint: string;
  Icon: typeof ShieldCheck;
} {
  if (!d.provisioned) {
    return {
      signal: "warn",
      label: "Not Provisioned",
      hint: "Operator-managed credentials are not yet provisioned for this source.",
      Icon: ShieldAlert,
    };
  }
  if (d.status === "active") {
    return {
      signal: "ok",
      label: "Active",
      hint: "Encrypted credentials provisioned · refresh script can authenticate.",
      Icon: ShieldCheck,
    };
  }
  if (d.status === "auth_failure") {
    return {
      signal: "error",
      label: "Auth Failure",
      hint: "Last login attempt with these credentials failed. Rotate to provision a fresh password.",
      Icon: ShieldX,
    };
  }
  if (d.status === "invalidated") {
    return {
      signal: "warn",
      label: "Invalidated",
      hint: "Credentials were explicitly invalidated by an operator.",
      Icon: ShieldX,
    };
  }
  return {
    signal: "neutral",
    label: d.status ?? "Unknown",
    hint: "",
    Icon: ShieldCheck,
  };
}

function headline(d: CredentialStatusDescriptor): string {
  if (!d.provisioned) return "Credentials not yet provisioned";
  if (d.status === "active") return "Encrypted credentials active";
  if (d.status === "auth_failure") return "Authentication failed with current credentials";
  if (d.status === "invalidated") return "Credentials invalidated by operator";
  return "Credential state";
}

function iconClass(signal: SignalLevel): string {
  if (signal === "ok") return "text-emerald-400";
  if (signal === "warn") return "text-amber-400";
  if (signal === "error") return "text-rose-400";
  return "text-slate-400";
}

function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-[12.5px] text-white",
          mono ? "font-mono text-[12px] text-lime-300" : "font-headline font-extrabold",
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function formatTs(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
  } catch {
    return iso;
  }
}
