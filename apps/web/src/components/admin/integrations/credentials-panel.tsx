"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Lock,
  RotateCw,
  ShieldOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AuditEntry,
  CredentialsStatusView,
} from "@/lib/intelligence/credentials-store";
import {
  invalidateCredentialsAction,
  provisionCredentialsAction,
} from "@/app/user/admin/integrations/[integrationId]/actions";

/**
 * Provision / rotate / invalidate panel for one integration's credentials.
 *
 * Lives on the dark canvas (Bloomberg-terminal) alongside SessionStatusPanel.
 * Plaintext is sent to the server action over HTTPS, encrypted server-side
 * with AES-256-GCM, and persisted as ciphertext. The form clears immediately
 * on submit; the panel NEVER displays the plaintext again.
 */
export function CredentialsPanel({
  sourceSlug,
  sourceName,
  status,
  audit,
}: {
  sourceSlug: string;
  sourceName: string;
  status: CredentialsStatusView;
  audit: AuditEntry[];
}) {
  const [mode, setMode] = useState<"idle" | "form" | "submitting" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showInvalidateConfirm, setShowInvalidateConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setErrorMessage(null);
    setMode("submitting");
    startTransition(async () => {
      const result = await provisionCredentialsAction(sourceSlug, formData);
      if (result.ok) {
        setMode("success");
        // Drop the form after 2.5s so the success state lingers, then reset.
        window.setTimeout(() => setMode("idle"), 2500);
      } else {
        setErrorMessage(result.error ?? "Unknown error");
        setMode("error");
      }
    });
  }

  async function handleInvalidate() {
    setErrorMessage(null);
    setShowInvalidateConfirm(false);
    startTransition(async () => {
      const result = await invalidateCredentialsAction(sourceSlug);
      if (!result.ok) {
        setErrorMessage(result.error ?? "Unknown error");
        setMode("error");
      } else {
        setMode("idle");
      }
    });
  }

  const headerBadge = badgeForStatus(status);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <KeyRound size={14} className="text-slate-400" aria-hidden />
          <h3 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
            Credentials · {sourceName}
          </h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
            headerBadge.cls,
          )}
        >
          <span aria-hidden>{headerBadge.dot}</span>
          {headerBadge.label}
        </span>
      </header>

      {/* Status grid */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-slate-800/60 pb-4 sm:grid-cols-4">
        <Field label="Configured" value={status.configured ? "Yes" : "No"} />
        <Field label="KEK" value={status.encKeyId ?? "—"} mono />
        <Field label="Rotations" value={String(status.rotationCount)} mono />
        <Field label="Last Rotated" value={formatTs(status.lastRotatedAt)} mono />
        <Field label="Last Login" value={formatTs(status.lastLoginAt)} mono />
        <Field
          label="Login Status"
          value={status.lastLoginStatus ?? "—"}
          mono
          className={
            status.lastLoginStatus === "failure" ? "text-rose-400" : undefined
          }
        />
        {status.lastLoginError && (
          <Field
            label="Last Login Error"
            value={status.lastLoginError}
            mono
            className="col-span-full text-rose-400"
          />
        )}
      </dl>

      {/* Action region */}
      <div className="mt-4 space-y-4">
        {mode === "idle" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("form")}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-lime-300 px-3 py-1.5 font-headline text-[11px] font-extrabold uppercase tracking-[0.18em] text-forest-900 transition-colors hover:bg-lime-200 disabled:opacity-50"
            >
              {status.configured ? <RotateCw size={12} aria-hidden /> : <KeyRound size={12} aria-hidden />}
              {status.configured ? "Rotate Credentials" : "Provision Credentials"}
            </button>
            {status.configured && status.status === "active" && (
              <button
                type="button"
                onClick={() => setShowInvalidateConfirm(true)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 font-headline text-[11px] font-extrabold uppercase tracking-[0.18em] text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
              >
                <ShieldOff size={12} aria-hidden /> Invalidate
              </button>
            )}
          </div>
        )}

        {showInvalidateConfirm && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3">
            <p className="text-[12.5px] leading-relaxed text-rose-200">
              Invalidating marks the active credentials inactive. The refresh script
              will fail until you provision new credentials.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleInvalidate}
                disabled={isPending}
                className="rounded-md bg-rose-500 px-3 py-1.5 font-headline text-[11px] font-extrabold uppercase tracking-[0.18em] text-white hover:bg-rose-600 disabled:opacity-50"
              >
                Confirm Invalidate
              </button>
              <button
                type="button"
                onClick={() => setShowInvalidateConfirm(false)}
                className="rounded-md border border-slate-700 px-3 py-1.5 font-headline text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-300 hover:border-slate-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {(mode === "form" || mode === "submitting") && (
          <form
            action={handleSubmit}
            className="space-y-3 rounded-lg border border-slate-800/60 bg-slate-900/40 p-4"
            autoComplete="off"
          >
            <p className="flex items-center gap-1.5 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              <Lock size={11} aria-hidden /> Plaintext is encrypted server-side. Never persisted in plaintext. Never logged.
            </p>
            <div>
              <label className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400" htmlFor="cred-username">
                Username / Email
              </label>
              <input
                id="cred-username"
                name="username"
                type="text"
                required
                autoComplete="off"
                spellCheck={false}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-[12.5px] text-white outline-none ring-1 ring-transparent transition-colors focus:border-lime-300/60 focus:ring-lime-300/30"
              />
            </div>
            <div>
              <label className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400" htmlFor="cred-password">
                Password
              </label>
              <input
                id="cred-password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-[12.5px] text-white outline-none ring-1 ring-transparent transition-colors focus:border-lime-300/60 focus:ring-lime-300/30"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={isPending || mode === "submitting"}
                className="rounded-md bg-lime-300 px-3 py-1.5 font-headline text-[11px] font-extrabold uppercase tracking-[0.18em] text-forest-900 hover:bg-lime-200 disabled:opacity-50"
              >
                {mode === "submitting" ? "Encrypting…" : "Encrypt & Store"}
              </button>
              <button
                type="button"
                onClick={() => setMode("idle")}
                disabled={isPending}
                className="rounded-md border border-slate-700 px-3 py-1.5 font-headline text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-300 hover:border-slate-500"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {mode === "success" && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-[12.5px] leading-relaxed text-emerald-200">
            <CheckCircle2 size={16} className="mt-0.5 text-emerald-400" aria-hidden />
            <div>
              Credentials encrypted (AES-256-GCM) and stored. Audit row written. Next refresh
              run will use the new credentials.
            </div>
          </div>
        )}

        {mode === "error" && errorMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-[12.5px] leading-relaxed text-rose-200">
            <AlertTriangle size={16} className="mt-0.5 text-rose-400" aria-hidden />
            <div className="flex-1">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em]">
                Error
              </p>
              <p className="mt-1 font-mono text-[11.5px]">{errorMessage}</p>
              <button
                type="button"
                onClick={() => {
                  setMode("idle");
                  setErrorMessage(null);
                }}
                className="mt-2 rounded-md border border-rose-500/40 px-2 py-1 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-500/20"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit feed */}
      <details className="mt-5 border-t border-slate-800/60 pt-4">
        <summary className="cursor-pointer font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 hover:text-slate-200">
          Audit Trail · {audit.length} event{audit.length === 1 ? "" : "s"}
        </summary>
        {audit.length === 0 ? (
          <p className="mt-3 text-[12.5px] text-slate-500">
            No credential events recorded yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {audit.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-2 border-b border-slate-800/40 pb-2 last:border-b-0 last:pb-0"
              >
                <span
                  className={cn(
                    "inline-flex items-center rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
                    eventVisual(entry.eventKind),
                  )}
                >
                  {entry.eventKind.replace("_", " ")}
                </span>
                <span className="font-mono text-[10.5px] text-slate-400">
                  {formatTs(entry.createdAt)}
                </span>
                {entry.error && (
                  <span className="font-mono text-[10.5px] text-rose-300">
                    {entry.error}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </details>
    </section>
  );
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
        className={
          mono
            ? "mt-1 font-mono text-[12px] text-lime-300"
            : "mt-1 font-headline text-[12.5px] font-extrabold text-white"
        }
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function badgeForStatus(status: CredentialsStatusView): { label: string; dot: string; cls: string } {
  if (!status.configured) {
    return {
      label: "Not Provisioned",
      dot: "○",
      cls: "bg-slate-500/10 text-slate-300 ring-slate-500/20",
    };
  }
  if (status.status === "invalidated") {
    return {
      label: "Invalidated",
      dot: "▲",
      cls: "bg-rose-500/10 text-rose-300 ring-rose-500/20",
    };
  }
  if (status.lastLoginStatus === "failure") {
    return {
      label: "Auth Failing",
      dot: "▲",
      cls: "bg-rose-500/10 text-rose-300 ring-rose-500/20",
    };
  }
  return {
    label: "Active · Encrypted",
    dot: "●",
    cls: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
  };
}

function eventVisual(kind: AuditEntry["eventKind"]): string {
  switch (kind) {
    case "provisioned":
    case "rotated":
    case "auth_success":
      return "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20";
    case "invalidated":
    case "auth_failure":
    case "decryption_error":
      return "bg-rose-500/10 text-rose-300 ring-rose-500/20";
    default:
      return "bg-slate-500/10 text-slate-300 ring-slate-500/20";
  }
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
