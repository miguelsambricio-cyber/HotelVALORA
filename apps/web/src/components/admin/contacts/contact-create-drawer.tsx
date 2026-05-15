import Link from "next/link";
import { X, AlertTriangle, UserPlus } from "lucide-react";
import { createContactAction } from "@/lib/admin/contacts/mutations";

/**
 * Manual contact creation drawer · server component.
 * Opens when the URL carries `?mode=create`. Posts to
 * createContactAction · on success redirects to ?selected=<new-id>.
 *
 * Minimal field set · only full_name + email required. Operator can
 * fill the rest later via the edit drawer (Phase 2.D.2 mutations).
 */
export function ContactCreateDrawer({
  closeHref,
  filterQs,
  errorMessage,
}: {
  closeHref: string;
  filterQs: string;
  errorMessage?: string | null;
}) {
  return (
    <aside className="rounded-2xl border border-lime-300/40 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-2xl lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      <header className="space-y-2 border-b border-slate-800/60 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
              <UserPlus size={11} />
              New contact · manual entry
            </p>
            <h2 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-white">
              Add contact
            </h2>
            <p className="mt-0.5 font-mono text-[10.5px] text-slate-400">
              full_name + email required · everything else optional
            </p>
          </div>
          <Link
            href={closeHref}
            aria-label="Cancel new contact"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-800/60 hover:text-slate-200"
          >
            <X size={16} />
          </Link>
        </div>
      </header>

      {errorMessage && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 p-2.5 font-mono text-[11px] text-rose-200">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form action={createContactAction} className="mt-4 grid gap-3">
        <input type="hidden" name="filter_qs" value={filterQs} />

        <Field label="Full name" required>
          <Input name="full_name" placeholder="Jane Doe" required maxLength={200} autoFocus />
        </Field>

        <Field label="Email" required>
          <Input name="email" type="email" placeholder="jane@company.com" required maxLength={320} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company">
            <Input name="company_name" placeholder="Acme Capital" maxLength={300} />
          </Field>
          <Field label="Type">
            <Select name="investor_type" defaultValue="">
              <option value="">— pick —</option>
              <option value="Investor">Investor</option>
              <option value="Family Office">Family Office</option>
              <option value="Fund">Fund</option>
              <option value="REIT/SOCIMI">REIT/SOCIMI</option>
              <option value="Owner">Owner</option>
              <option value="Hotel Chain">Hotel Chain</option>
              <option value="Operator">Operator</option>
              <option value="Brand">Brand</option>
              <option value="F&B Operator">F&B Operator</option>
              <option value="Broker">Broker</option>
              <option value="Lender">Lender</option>
              <option value="Developer">Developer</option>
              <option value="Service Provider">Service Provider</option>
              <option value="Media">Media</option>
              <option value="Insurance">Insurance</option>
              <option value="Unknown">Unknown</option>
            </Select>
          </Field>
        </div>

        <Field label="Title / Role">
          <Input name="title" placeholder="Managing Director · Acquisitions" maxLength={200} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Phone">
            <Input name="phone" placeholder="+34 600 000 000" maxLength={80} />
          </Field>
          <Field label="LinkedIn">
            <Input name="linkedin" placeholder="https://linkedin.com/in/…" maxLength={500} />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            name="notes_consolidated"
            placeholder="optional · context, source, intro hook…"
            maxLength={10_000}
            rows={3}
            className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-lime-300/50 focus:outline-none"
          />
        </Field>

        <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-800/60 pt-3">
          <Link
            href={closeHref}
            className="rounded-md px-3 py-1.5 font-headline text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-300 ring-1 ring-slate-700/60 hover:bg-slate-800/60"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md bg-lime-300 px-3 py-1.5 font-headline text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-forest-900 hover:bg-lime-200"
          >
            <UserPlus size={12} />
            Create contact
          </button>
        </div>

        <p className="font-mono text-[10px] leading-relaxed text-slate-500">
          Defaults applied: bucket=active · band=cold · email_validity=uncertain ·
          contact_category_v2=Uncategorized · master_id auto-generated. Audit logged.
          Refuses if email already exists.
        </p>
      </form>
    </aside>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-headline text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-400">
        {label} {required && <span className="text-rose-300">*</span>}
      </span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function Input({
  name,
  type,
  placeholder,
  required,
  maxLength,
  autoFocus,
}: {
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
}) {
  return (
    <input
      name={name}
      type={type ?? "text"}
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
      autoFocus={autoFocus}
      autoComplete="off"
      className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-lime-300/50 focus:outline-none"
    />
  );
}

function Select({
  name,
  defaultValue,
  children,
}: {
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11px] text-slate-100 focus:border-lime-300/50 focus:outline-none"
    >
      {children}
    </select>
  );
}
