import Link from "next/link";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContactDetail } from "@/lib/admin/contacts/live";
import {
  updateContactFromForm,
  markInvalidFromForm,
  assignOwnerFromForm,
  updateStatusFromForm,
} from "@/lib/admin/contacts/mutations";

/**
 * Phase 2.D.2 · Edit drawer (PRIMERA OLA).
 *
 * Server component · the form `action` props point at server actions
 * declared in `lib/admin/contacts/mutations.ts`. No client interactivity
 * needed: each form's submit triggers its server action, which
 * `revalidatePath`s + `redirect`s back to view mode (or to edit mode
 * with an error querystring).
 *
 * Layout mirrors the view drawer so toggling Edit ↔ View feels native.
 * One Save button for the bulk-edit form; smaller dedicated forms for
 * granular actions (mark invalid, assign owner, update band).
 *
 * Tag management lives in the VIEW drawer (operator tags section) so
 * +/− is reachable without entering edit mode.
 */
export function ContactDetailDrawerEdit({
  detail,
  closeHref,
  errorMessage,
}: {
  detail: ContactDetail;
  /** Where Cancel + the close button go */
  closeHref: string;
  /** When the previous edit attempt failed, the error to surface */
  errorMessage?: string | null;
}) {
  const c = detail.contact;
  return (
    <aside className="rounded-2xl border border-lime-300/40 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-2xl lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      <header className="space-y-2 border-b border-slate-800/60 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
              Edit · {c.master_id}
            </p>
            <h2 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-white">
              {c.full_name || "(no name)"}
            </h2>
            <p className="mt-0.5 font-mono text-[10.5px] text-slate-400">{c.email || "—"}</p>
          </div>
          <Link
            href={closeHref}
            aria-label="Cancel edit"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-800/60 hover:text-slate-200"
          >
            <X size={16} />
          </Link>
        </div>
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 p-2.5">
            <AlertTriangle size={12} className="mt-0.5 text-rose-300" />
            <p className="font-mono text-[10.5px] leading-relaxed text-rose-200">{errorMessage}</p>
          </div>
        )}
      </header>

      {/* ── Main edit form ─────────────────────────────────────────── */}
      <Section title="Identity">
        <form action={updateContactFromForm} className="space-y-3">
          <input type="hidden" name="contactId" value={c.id} />
          <Grid>
            <Field label="Full name" name="full_name" defaultValue={c.full_name ?? ""} />
            <Field label="Email" name="email" type="email" defaultValue={c.email ?? ""} />
            <Field label="Phone" name="phone" defaultValue={c.phone ?? ""} />
            <Field label="LinkedIn" name="linkedin" defaultValue={c.linkedin ?? ""} />
            <Field label="Title" name="title" defaultValue={c.title ?? ""} />
            <Field label="Role" name="role" defaultValue={c.role ?? ""} />
            <Field label="Company name" name="company_name" defaultValue={c.company_name ?? ""} />
            <Field
              label="Investor / operator / lender classification"
              name="investor_type"
              defaultValue={c.investor_type ?? ""}
            />
            <Field
              label="Collaboration potential (0–100)"
              name="collaboration_potential_score"
              type="number"
              min={0}
              max={100}
              defaultValue={String(c.collaboration_potential_score)}
            />
          </Grid>
          <Textarea
            label="Relationship notes"
            name="notes_consolidated"
            defaultValue={c.notes_consolidated ?? ""}
            rows={5}
          />
          <div className="flex items-center justify-end gap-2">
            <Link
              href={closeHref}
              className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1.5 font-headline text-[10.5px] font-bold uppercase tracking-[0.2em] text-slate-300 hover:text-slate-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-md bg-lime-300 px-3 py-1.5 font-headline text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-forest-900 hover:bg-lime-200"
            >
              Save changes
            </button>
          </div>
        </form>
      </Section>

      {/* ── Relationship status ────────────────────────────────────── */}
      <Section title="Relationship status">
        <form action={updateStatusFromForm} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="contactId" value={c.id} />
          <Select
            label="Band"
            name="relationship_band"
            defaultValue={c.relationship_band || "cold"}
            options={[
              { value: "strategic", label: "Strategic" },
              { value: "active", label: "Active" },
              { value: "warm", label: "Warm" },
              { value: "cold", label: "Cold" },
              { value: "dormant", label: "Dormant" },
              { value: "invalid", label: "Invalid" },
            ]}
          />
          <button
            type="submit"
            className="self-end rounded-md bg-lime-300/20 px-3 py-1.5 font-headline text-[10.5px] font-bold uppercase tracking-[0.2em] text-lime-200 ring-1 ring-lime-300/40 hover:bg-lime-300/30"
          >
            Update band
          </button>
        </form>
      </Section>

      {/* ── Relationship owner ─────────────────────────────────────── */}
      <Section title="Relationship owner">
        <form action={assignOwnerFromForm} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="contactId" value={c.id} />
          <Field
            label="Owner email"
            name="relationship_owner_email"
            type="email"
            defaultValue={c.relationship_owner_email ?? ""}
            placeholder="leave empty to clear"
            className="flex-1 min-w-[220px]"
          />
          <button
            type="submit"
            className="rounded-md bg-lime-300/20 px-3 py-1.5 font-headline text-[10.5px] font-bold uppercase tracking-[0.2em] text-lime-200 ring-1 ring-lime-300/40 hover:bg-lime-300/30"
          >
            Assign owner
          </button>
        </form>
      </Section>

      {/* ── Mark invalid ───────────────────────────────────────────── */}
      <Section title="Email health · operator override">
        <form action={markInvalidFromForm} className="space-y-2">
          <input type="hidden" name="contactId" value={c.id} />
          <Field
            label="Reason (optional, ≤ 500 chars)"
            name="reason"
            defaultValue=""
            placeholder="e.g. left company · address bounced · domain dead"
          />
          <button
            type="submit"
            className="rounded-md bg-rose-500/20 px-3 py-1.5 font-headline text-[10.5px] font-bold uppercase tracking-[0.2em] text-rose-200 ring-1 ring-rose-500/40 hover:bg-rose-500/30"
          >
            Mark invalid · move to DATASITE-CORREGIR
          </button>
          <p className="font-mono text-[10px] leading-relaxed text-slate-500">
            Sets `email_validity=invalid` · `flagged_for_correction=true` ·
            `relationship_band=invalid` · `bucket=DATASITE-CORREGIR`. Action
            is logged to `activity_log` with the optional reason. Tag
            management + Add/Delete/Merge land in SEGUNDA OLA.
          </p>
        </form>
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-slate-800/60 py-4 last:border-b-0">
      <h3 className="mb-3 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  name,
  defaultValue,
  type,
  min,
  max,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </span>
      <input
        name={name}
        type={type ?? "text"}
        defaultValue={defaultValue}
        min={min}
        max={max}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11.5px] text-slate-100 placeholder:text-slate-600 focus:border-lime-300/50 focus:outline-none"
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  rows,
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows ?? 4}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11.5px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-lime-300/50 focus:outline-none"
      />
    </label>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11.5px] text-slate-100 focus:border-lime-300/50 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
