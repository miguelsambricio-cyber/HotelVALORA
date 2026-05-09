"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  COUNTRIES,
  ROLE_OPTIONS,
  useProfile,
  type UserProfile,
  type UserRole,
} from "@/lib/settings";

/**
 * Institutional Profile form — single editable card with three USALI-style
 * sections (Personal / Company / Address) plus consent checkboxes and a
 * primary CTA. State lives in the global `useProfile` store so the
 * floating ProfileCompletionCard re-renders live as the user fills fields.
 *
 * v1: `commitProfile` is a no-op + console.info. v2: replace its body
 * with `await api.put("/api/v1/me/profile", profile)` — UI stays same.
 */
export function ProfileForm() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    profile,
    setField,
    setAddressField,
    setConsent,
    hydrateEmail,
    commitProfile,
  } = useProfile();

  // Hydrate the locked email from the authenticated session, once
  useEffect(() => {
    if (user?.email && user.email !== profile.email) {
      hydrateEmail(user.email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await commitProfile();
    setSubmitting(false);
    if (result.ok) {
      setSavedAt(Date.now());
      // Future: router.push("/settings/credentials") to advance the
      // institutional onboarding flow.
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,51,30,0.04)] md:p-8"
      noValidate
    >
      <FormSection title="Personal Information">
        <FieldGrid cols={3}>
          <Field
            label="First Name"
            value={profile.firstName}
            onChange={(v) => setField("firstName", v)}
            required
          />
          <Field
            label="Middle Name"
            value={profile.middleName ?? ""}
            onChange={(v) => setField("middleName", v)}
          />
          <Field
            label="Last Name"
            value={profile.lastName}
            onChange={(v) => setField("lastName", v)}
            required
          />
        </FieldGrid>
        <FieldGrid cols={1} className="mt-4">
          <Field
            label="Email Address"
            value={profile.email}
            onChange={() => {}}
            readonly
            iconRight={<Lock size={14} className="text-slate-400" />}
          />
        </FieldGrid>
      </FormSection>

      <Divider />

      <FormSection title="Company Details">
        <FieldGrid cols={3}>
          <Field
            label="Company"
            value={profile.company}
            onChange={(v) => setField("company", v)}
            required
          />
          <Field
            label="Position"
            value={profile.position}
            onChange={(v) => setField("position", v)}
            required
          />
          <SelectField
            label="Role"
            value={profile.role}
            onChange={(v) => setField("role", v as UserRole)}
            options={ROLE_OPTIONS.map((r) => ({ value: r.id, label: r.label }))}
            required
          />
        </FieldGrid>
      </FormSection>

      <Divider />

      <FormSection title="Address & Contact">
        <FieldGrid cols={2}>
          <Field
            label="Street"
            value={profile.address.street}
            onChange={(v) => setAddressField("street", v)}
            required
          />
          <Field
            label="City"
            value={profile.address.city}
            onChange={(v) => setAddressField("city", v)}
            required
          />
        </FieldGrid>
        <FieldGrid cols={2} className="mt-4">
          <Field
            label="ZIP / Postal Code"
            value={profile.address.zip}
            onChange={(v) => setAddressField("zip", v)}
          />
          <Field
            label="State / Region"
            value={profile.address.state}
            onChange={(v) => setAddressField("state", v)}
          />
        </FieldGrid>
        <FieldGrid cols={2} className="mt-4">
          <SelectField
            label="Country"
            value={profile.address.countryCode}
            onChange={(v) => setAddressField("countryCode", v)}
            options={COUNTRIES.map((c) => ({
              value: c.code,
              label: `${c.name} (${c.dialCode})`,
            }))}
            required
          />
          <Field
            label="Phone"
            value={profile.address.phone}
            onChange={(v) => setAddressField("phone", v)}
            required
          />
        </FieldGrid>
      </FormSection>

      <Divider />

      <div className="space-y-3">
        <CheckboxLine
          checked={profile.consents.marketing}
          onChange={(v) => setConsent("marketing", v)}
          label="Autoriza contactar para promoción y noticias HotelVALORA by METCUB."
        />
        <CheckboxLine
          checked={profile.consents.confidentiality}
          onChange={(v) => setConsent("confidentiality", v)}
          label="Acuerdo de confidencialidad y cláusulas generales."
          required
        />
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        {savedAt && (
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            Profile saved
          </span>
        )}
        <button
          type="submit"
          disabled={submitting || !profile.consents.confidentiality}
          className={cn(
            "inline-flex w-full max-w-xs items-center justify-center rounded-xl bg-forest-900 px-6 py-3.5 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-md transition-all",
            "hover:brightness-110 active:scale-[0.98]",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          onClick={() => {
            // pretend to navigate to /credentials when ready (future step)
            void router;
          }}
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </div>
    </form>
  );
}

// ── Form internals ──────────────────────────────────────────────────────────

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Divider() {
  return <hr className="my-8 border-slate-100" />;
}

function FieldGrid({
  cols,
  children,
  className,
}: {
  cols: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}) {
  const colClass =
    cols === 1
      ? "grid-cols-1"
      : cols === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-3";
  return <div className={cn("grid gap-4", colClass, className)}>{children}</div>;
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  readonly?: boolean;
  iconRight?: ReactNode;
}

function Field({ label, value, onChange, required, readonly, iconRight }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      <div className="relative">
        <input
          type="text"
          value={value}
          readOnly={readonly}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800",
            "focus:border-forest-900 focus:outline-none focus:ring-1 focus:ring-forest-900",
            "read-only:cursor-default read-only:bg-slate-50 read-only:text-slate-500 read-only:focus:ring-0 read-only:focus:border-slate-200",
            iconRight && "pr-10",
          )}
        />
        {iconRight && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            {iconRight}
          </span>
        )}
      </div>
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}

function SelectField({ label, value, onChange, options, required }: SelectFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full appearance-none cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-800",
            "focus:border-forest-900 focus:outline-none focus:ring-1 focus:ring-forest-900",
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4l3 3 3-3" />
          </svg>
        </span>
      </div>
    </label>
  );
}

function CheckboxLine({
  checked,
  onChange,
  label,
  required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-xs text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-forest-900 focus:ring-forest-900/30"
      />
      <span className="leading-relaxed">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
    </label>
  );
}

/**
 * @internal — re-export the shape so the page can also read `useProfile`
 * directly to feed the floating ProfileCompletionCard if desired.
 */
export type { UserProfile };
