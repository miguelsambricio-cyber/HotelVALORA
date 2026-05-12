"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Eye, EyeOff, KeyRound, Lock, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  invalidateCredentialsAction,
  provisionCredentialsAction,
} from "@/lib/intelligence/credentials/actions";
import type { CredentialActionResult } from "@/lib/intelligence/credentials";

const TOKEN_STORAGE_KEY = "hv:operator-token";

interface ProvisionCredentialsModalProps {
  open: boolean;
  onClose: () => void;
  mode: "provision" | "rotate" | "invalidate";
  sourceSlug: string;
  sourceName: string;
}

/**
 * Modal for provisioning / rotating / invalidating credentials. Client
 * island — the server action runs in Node, the modal just collects input
 * and surfaces the generic ok/fail result.
 *
 * SECURITY CONTRACT:
 *   - Inputs never leave this component except via the server action.
 *   - On success or failure, password field is cleared.
 *   - Operator token is stored in sessionStorage (per-tab) so the operator
 *     doesn't have to retype across actions in one session. Gone on tab
 *     close. NEVER persisted to localStorage.
 *   - The server action's response never echoes inputs back — the modal
 *     only sees ok/fail + a coarse error category.
 */
export function ProvisionCredentialsModal({
  open,
  onClose,
  mode,
  sourceSlug,
  sourceName,
}: ProvisionCredentialsModalProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [operatorToken, setOperatorToken] = useState("");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const reasonRef = useRef<HTMLInputElement | null>(null);

  // Hydrate operator token from sessionStorage (per-tab only).
  useEffect(() => {
    if (!open) return;
    try {
      const saved = sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
      setOperatorToken(saved);
    } catch {
      /* sessionStorage unavailable — operator types every time */
    }
    setError(null);
    setShowPassword(false);
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  function persistToken(token: string) {
    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      /* swallow */
    }
  }

  function clearPassword() {
    if (passwordRef.current) passwordRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set("sourceSlug", sourceSlug);
    form.set("operatorToken", operatorToken);

    startTransition(async () => {
      let result: CredentialActionResult;
      try {
        if (mode === "invalidate") {
          result = await invalidateCredentialsAction(form);
        } else {
          result = await provisionCredentialsAction(form);
        }
      } catch {
        clearPassword();
        setError("Unexpected error. The operation did not complete.");
        return;
      }
      clearPassword();
      if (result.ok) {
        persistToken(operatorToken);
        onClose();
      } else {
        switch (result.error) {
          case "unauthorized":
            setError("Operator token rejected.");
            break;
          case "validation":
            setError("Input rejected by validation.");
            break;
          case "encryption":
            setError("Encryption failed. Server-side key configuration issue.");
            break;
          case "storage":
            setError("Storage write failed.");
            break;
          case "not_provisioned":
            setError("No active credential row to act on.");
            break;
        }
      }
    });
  }

  const isInvalidate = mode === "invalidate";
  const titleByMode = {
    provision: "Provision Credentials",
    rotate: "Rotate Credentials",
    invalidate: "Invalidate Credentials",
  } as const;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="provision-credentials-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-800/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            {isInvalidate ? (
              <ShieldAlert size={16} className="text-rose-400" aria-hidden />
            ) : (
              <KeyRound size={16} className="text-lime-300" aria-hidden />
            )}
            <div>
              <h2
                id="provision-credentials-title"
                className="font-headline text-base font-extrabold tracking-tighter text-white"
              >
                {titleByMode[mode]}
              </h2>
              <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">
                {sourceName} · institutional T1.5
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white"
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 p-5" autoComplete="off">
          {/* Operator-token field */}
          <Field
            label="Operator Token"
            hint="One-time per tab session. From INTELLIGENCE_REFRESH_TOKEN env."
          >
            <input
              type="password"
              name="operatorToken"
              required
              autoComplete="off"
              value={operatorToken}
              onChange={(e) => setOperatorToken(e.target.value)}
              className="block w-full rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-2 font-mono text-[12px] text-lime-300 placeholder-slate-600 focus:border-lime-300/40 focus:outline-none focus:ring-1 focus:ring-lime-300/30"
              placeholder="hex token"
              spellCheck={false}
            />
          </Field>

          {/* Credential inputs for provision/rotate */}
          {!isInvalidate && (
            <>
              <Field label="Subscriber Email / Username">
                <input
                  ref={usernameRef}
                  type="text"
                  name="username"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  className="block w-full rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-2 font-mono text-[12.5px] text-white placeholder-slate-600 focus:border-lime-300/40 focus:outline-none focus:ring-1 focus:ring-lime-300/30"
                  placeholder="account@example.com"
                />
              </Field>

              <Field label="Subscriber Password">
                <div className="relative">
                  <input
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    autoComplete="off"
                    className="block w-full rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-2 pr-10 font-mono text-[12.5px] text-white placeholder-slate-600 focus:border-lime-300/40 focus:outline-none focus:ring-1 focus:ring-lime-300/30"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-slate-500 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                  </button>
                </div>
              </Field>
            </>
          )}

          {/* Reason field for invalidate */}
          {isInvalidate && (
            <Field label="Operator-facing Reason (optional)" hint="Will appear in audit. Never include secrets.">
              <input
                ref={reasonRef}
                type="text"
                name="reason"
                maxLength={200}
                autoComplete="off"
                className="block w-full rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-2 font-mono text-[12.5px] text-white placeholder-slate-600 focus:border-lime-300/40 focus:outline-none focus:ring-1 focus:ring-lime-300/30"
                placeholder="scheduled rotation"
              />
            </Field>
          )}

          {/* Security guarantee panel */}
          <div className="rounded-md border border-slate-800/60 bg-slate-900/40 p-3">
            <p className="flex items-center gap-1.5 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
              <ShieldCheck size={11} aria-hidden /> Security Contract
            </p>
            <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-slate-400">
              <li>· AES-256-GCM encryption at rest, distinct IV per field</li>
              <li>· Service-role-only RLS — anon + authenticated cannot read</li>
              <li>· Never logged · never echoed back · never in audit rows</li>
              <li>· Plaintext discarded server-side immediately after encrypt</li>
            </ul>
          </div>

          {error && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">
              {error}
            </div>
          )}

          <footer className="flex items-center justify-end gap-2 border-t border-slate-800/60 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-2 font-headline text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 hover:bg-slate-800/60 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 font-headline text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                isInvalidate
                  ? "bg-rose-500 text-white hover:bg-rose-400 disabled:bg-rose-500/50"
                  : "bg-lime-300 text-forest-900 hover:bg-lime-200 disabled:bg-lime-300/50",
              )}
            >
              <Lock size={12} aria-hidden />
              {pending ? "Submitting..." : isInvalidate ? "Invalidate" : titleByMode[mode]}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[10.5px] text-slate-500">{hint}</p>}
    </label>
  );
}
