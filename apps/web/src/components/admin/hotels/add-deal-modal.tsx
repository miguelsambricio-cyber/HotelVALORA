"use client";

import { useState, useTransition } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  addManualTransaction,
  addManualProject,
  type ManualTransactionPayload,
  type ManualProjectPayload,
} from "@/lib/admin/hotels/manual-deal-entry";
import { cn } from "@/lib/utils";

/**
 * Phase 3.c · "+ Add" modal for the Search transactions & projects
 * section. Single modal with a tab switcher so the operator picks the
 * entity kind explicitly (different field sets) without leaving the
 * surface.
 *
 * Mirrors the architecture of AddHotelModal: form data → server action
 * → Supabase Storage write → router.refresh() → snapshot reader merges
 * the new entry within 30s.
 */
type Kind = "transaction" | "project";

export function AddDealModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("transaction");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      let res;
      if (kind === "transaction") {
        const payload: ManualTransactionPayload = {
          asset_name: String(formData.get("asset_name") ?? ""),
          country: String(formData.get("country") ?? "ES").toUpperCase(),
          market_name: String(formData.get("market_name") ?? "") || null,
          submarket_name: String(formData.get("submarket_name") ?? "") || null,
          closed_at: String(formData.get("closed_at") ?? "") || null,
          price_eur: Number(formData.get("price_eur")) || null,
          rooms_count: Number(formData.get("rooms_count")) || null,
          buyer: String(formData.get("buyer") ?? "") || null,
          seller: String(formData.get("seller") ?? "") || null,
          notes: String(formData.get("notes") ?? "") || null,
        };
        res = await addManualTransaction(payload);
      } else {
        const payload: ManualProjectPayload = {
          project_name: String(formData.get("project_name") ?? ""),
          country: String(formData.get("country") ?? "ES").toUpperCase(),
          market_name: String(formData.get("market_name") ?? "") || null,
          city: String(formData.get("city") ?? "") || null,
          street: String(formData.get("street") ?? "") || null,
          postal_code: String(formData.get("postal_code") ?? "") || null,
          phase: String(formData.get("phase") ?? "") || null,
          status: String(formData.get("status") ?? "") || null,
          opening_date: String(formData.get("opening_date") ?? "") || null,
          construction_type: String(formData.get("construction_type") ?? "") || null,
          stars: Number(formData.get("stars")) || null,
          rooms_count: Number(formData.get("rooms_count")) || null,
          office_company: String(formData.get("office_company") ?? "") || null,
          notes: String(formData.get("notes") ?? "") || null,
        };
        res = await addManualProject(payload);
      }
      if (res.ok) {
        setSuccess(`Added · ${kind} id: ${res.id}`);
        setTimeout(() => {
          router.refresh();
          setOpen(false);
          setSuccess(null);
        }, 1200);
      } else {
        setError(res.error ?? "Submission failed");
      }
    });
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md bg-forest-900 px-3 py-2 font-headline text-[11px] font-extrabold uppercase tracking-[0.22em] text-lime-300 hover:opacity-90"
        >
          <Plus size={12} aria-hidden /> Add
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col border-slate-200 bg-white shadow-2xl outline-none",
            "inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl border-t",
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[88vh] sm:w-[36rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border",
          )}
        >
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
            <div>
              <DialogPrimitive.Title className="font-headline text-[15px] font-extrabold tracking-tight text-forest-900">
                Add {kind}
              </DialogPrimitive.Title>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Tagged <code className="rounded bg-slate-100 px-1 font-mono text-[10px]">NEW</code> until reconciled with CoStar.
              </p>
            </div>
            <DialogPrimitive.Close className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </header>

          {/* Kind tab switcher */}
          <div className="flex border-b border-slate-200 px-5">
            <KindTab label="Transaction" active={kind === "transaction"} onClick={() => setKind("transaction")} />
            <KindTab label="Project (pipeline)" active={kind === "project"} onClick={() => setKind("project")} />
          </div>

          <form action={handleSubmit} className="space-y-3 overflow-y-auto px-5 py-4">
            {kind === "transaction" ? <TransactionFields /> : <ProjectFields />}

            {error && (
              <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-[12px] text-rose-900">{error}</p>
            )}
            {success && (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-[12px] text-emerald-900">{success}</p>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <DialogPrimitive.Close className="rounded-md border border-slate-200 px-3 py-2 font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600 hover:bg-slate-50">
                Cancel
              </DialogPrimitive.Close>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-forest-900 px-3 py-2 font-headline text-[11px] font-extrabold uppercase tracking-[0.22em] text-lime-300 disabled:opacity-50"
              >
                {pending ? "Adding…" : `Add ${kind}`}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function KindTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-b-2 px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.22em] transition-colors",
        active
          ? "border-forest-900 text-forest-900"
          : "border-transparent text-slate-500 hover:text-slate-700",
      )}
    >
      {label}
    </button>
  );
}

function TransactionFields() {
  return (
    <>
      <Field label="Asset name" required>
        <input name="asset_name" required maxLength={200} placeholder="e.g. Hotel Palace Madrid" className={fieldCls} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Country" required>
          <input name="country" required maxLength={2} defaultValue="ES" className={fieldCls} />
        </Field>
        <Field label="Market">
          <input name="market_name" placeholder="Madrid" className={fieldCls} />
        </Field>
        <Field label="Submarket">
          <input name="submarket_name" placeholder="Salamanca" className={fieldCls} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Closed at">
          <input name="closed_at" placeholder="2024-09 or 2024-09-15" className={fieldCls} />
        </Field>
        <Field label="Price (€)">
          <input name="price_eur" type="number" min={0} step={100000} placeholder="55000000" className={fieldCls} />
        </Field>
        <Field label="Rooms">
          <input name="rooms_count" type="number" min={1} placeholder="120" className={fieldCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Buyer">
          <input name="buyer" placeholder="Acquiring entity" className={fieldCls} />
        </Field>
        <Field label="Seller">
          <input name="seller" placeholder="Divesting entity" className={fieldCls} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea name="notes" rows={2} placeholder="Optional context" className={cn(fieldCls, "min-h-[60px] resize-none")} />
      </Field>
    </>
  );
}

function ProjectFields() {
  return (
    <>
      <Field label="Project name" required>
        <input name="project_name" required maxLength={200} placeholder="e.g. Four Seasons Madrid Phase II" className={fieldCls} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Country" required>
          <input name="country" required maxLength={2} defaultValue="ES" className={fieldCls} />
        </Field>
        <Field label="Market">
          <input name="market_name" placeholder="Madrid" className={fieldCls} />
        </Field>
        <Field label="City">
          <input name="city" placeholder="Madrid" className={fieldCls} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Phase">
          <select name="phase" defaultValue="" className={fieldCls}>
            <option value="">— unspecified —</option>
            <option value="Planning">Planning</option>
            <option value="Approved">Approved</option>
            <option value="Construction">Construction</option>
            <option value="Pre-Opening">Pre-Opening</option>
            <option value="Operating">Operating</option>
          </select>
        </Field>
        <Field label="Status">
          <input name="status" placeholder="On track / delayed / …" className={fieldCls} />
        </Field>
        <Field label="Opening date">
          <input name="opening_date" placeholder="2026-Q4 or 2026-10" className={fieldCls} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Construction type">
          <select name="construction_type" defaultValue="" className={fieldCls}>
            <option value="">— unspecified —</option>
            <option value="New Build">New Build</option>
            <option value="Renovation">Renovation</option>
            <option value="Conversion">Conversion</option>
            <option value="Expansion">Expansion</option>
          </select>
        </Field>
        <Field label="Stars">
          <input name="stars" type="number" min={1} max={5} placeholder="5" className={fieldCls} />
        </Field>
        <Field label="Rooms">
          <input name="rooms_count" type="number" min={1} placeholder="180" className={fieldCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Street">
          <input name="street" placeholder="Address line" className={fieldCls} />
        </Field>
        <Field label="Postal code">
          <input name="postal_code" placeholder="28004" className={fieldCls} />
        </Field>
      </div>
      <Field label="Developer / company">
        <input name="office_company" placeholder="Operator's developer" className={fieldCls} />
      </Field>
      <Field label="Notes">
        <textarea name="notes" rows={2} placeholder="Optional context" className={cn(fieldCls, "min-h-[60px] resize-none")} />
      </Field>
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </span>
      {children}
    </label>
  );
}

const fieldCls =
  "w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-forest-900 focus:outline-none";
