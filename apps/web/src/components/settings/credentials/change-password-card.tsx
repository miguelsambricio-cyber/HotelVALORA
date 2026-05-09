"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Key } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChangePasswordCardProps {
  className?: string;
}

/**
 * Password rotation card — Section 1 of the Credentials page.
 *
 * Same institutional card system as the rest of the settings shell
 * (rounded-2xl, slate-200 border, soft 0_8px_24px shadow). Three
 * password fields with individual eye toggles + a primary CTA in the
 * forest-900 brand colour.
 *
 * v1: submission is a 350ms mock + green "Password updated" badge. v2:
 * replace `handleSubmit` body with `await api.put("/api/v1/me/password",
 * { currentPassword, newPassword })`. UI doesn't change.
 */
export function ChangePasswordCard({ className }: ChangePasswordCardProps) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedAt(null);

    if (!current || !next || !confirm) {
      setError("All three password fields are required.");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 350));
    setSubmitting(false);
    setSavedAt(Date.now());
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,51,30,0.04)] md:p-8",
        className,
      )}
    >
      <header className="mb-6 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <Key size={20} className="text-forest-900" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <h2 className="font-headline text-base font-extrabold text-forest-900 md:text-lg">
            Change Password
          </h2>
          <p className="mt-1 text-xs text-slate-500 md:text-sm">
            Ensure your account uses a long, random password to stay secure.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <PasswordField
          id="current-password"
          label="Current Password"
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
        />
        <PasswordField
          id="new-password"
          label="New Password"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          hint="At least 8 characters."
        />
        <PasswordField
          id="confirm-password"
          label="Confirm New Password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />

        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
          >
            {error}
          </div>
        )}

        {savedAt && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            Password updated successfully.
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "inline-flex items-center justify-center rounded-xl bg-forest-900 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-md transition-all",
              "hover:brightness-110 active:scale-[0.98]",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {submitting ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
    </section>
  );
}

// ── Password input with eye toggle ──────────────────────────────────────────

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  hint?: string;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className={cn(
            "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-800",
            "placeholder:text-slate-400",
            "focus:border-forest-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-forest-900",
          )}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-forest-900"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}
