"use client";

import { useState, useTransition } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { addManualHotel, type ManualHotelPayload } from "@/lib/admin/hotels/manual-entry";
import { cn } from "@/lib/utils";

/**
 * Operator-facing "Add hotel" modal.
 *
 * Used when the institutional CoStar pipeline doesn't yet know about a
 * property (boutique, just opened, off-CoStar-coverage) and the operator
 * needs to seed it manually. The submission lands in Supabase Storage at
 * `manual_hotels/<YYYY-MM>/<hotel_id>.json` and shows up in the live
 * inventory immediately (snapshot reader merges manual_hotels on read).
 *
 * Every manual entry is tagged `_meta.source = "manual_entry"` and
 * `_meta.review_status = "new"` so the row carries a NEW badge until
 * either CoStar absorbs it or the operator promotes it.
 */
export function AddHotelModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    const payload: ManualHotelPayload = {
      name: String(formData.get("name") ?? ""),
      country: String(formData.get("country") ?? "ES").toUpperCase(),
      market_name: String(formData.get("market_name") ?? ""),
      submarket_name: String(formData.get("submarket_name") ?? "") || null,
      chain_scale:
        (String(formData.get("chain_scale") ?? "") as ManualHotelPayload["chain_scale"]) || null,
      rooms_count: Number(formData.get("rooms_count")) || null,
      brand: String(formData.get("brand") ?? "") || null,
      operator: String(formData.get("operator") ?? "") || null,
      owner: String(formData.get("owner") ?? "") || null,
      address_line: String(formData.get("address_line") ?? "") || null,
      postal_code: String(formData.get("postal_code") ?? "") || null,
      year_opened: Number(formData.get("year_opened")) || null,
      notes: String(formData.get("notes") ?? "") || null,
    };

    startTransition(async () => {
      const res = await addManualHotel(payload);
      if (res.ok) {
        setSuccess(`Added · hotel_id: ${res.hotel_id}`);
        // small delay so operator sees confirmation, then refresh + close
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
          <Plus size={12} aria-hidden /> Add hotel
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
            // Mobile · bottom sheet
            "inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl border-t",
            // Desktop · centred modal
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[85vh] sm:w-[36rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border",
          )}
        >
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
            <div>
              <DialogPrimitive.Title className="font-headline text-[15px] font-extrabold tracking-tight text-forest-900">
                Add hotel manually
              </DialogPrimitive.Title>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Seed a property the CoStar pipeline hasn&apos;t yet caught.
                Tagged <code className="rounded bg-slate-100 px-1 font-mono text-[10px]">NEW</code> in the inventory.
              </p>
            </div>
            <DialogPrimitive.Close
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </header>

          <form action={handleSubmit} className="space-y-3 overflow-y-auto px-5 py-4">
            <Field label="Name" required>
              <input
                name="name"
                required
                maxLength={140}
                placeholder="e.g. Boutique Hotel Madrid Centro"
                className={fieldCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Country (ISO-2)" required>
                <input
                  name="country"
                  required
                  maxLength={2}
                  defaultValue="ES"
                  placeholder="ES"
                  className={fieldCls}
                />
              </Field>
              <Field label="Market" required>
                <input
                  name="market_name"
                  required
                  placeholder="e.g. Madrid"
                  className={fieldCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Submarket">
                <input
                  name="submarket_name"
                  placeholder="e.g. Madrid Centre"
                  className={fieldCls}
                />
              </Field>
              <Field label="Class">
                <select name="chain_scale" defaultValue="" className={fieldCls}>
                  <option value="">— unspecified —</option>
                  <option value="luxury">Luxury</option>
                  <option value="upper_upscale">Upper Upscale</option>
                  <option value="upscale">Upscale</option>
                  <option value="upper_midscale">Upper Midscale</option>
                  <option value="midscale">Midscale</option>
                  <option value="economy">Economy</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Rooms">
                <input
                  name="rooms_count"
                  type="number"
                  min={1}
                  max={5000}
                  placeholder="e.g. 120"
                  className={fieldCls}
                />
              </Field>
              <Field label="Year opened">
                <input
                  name="year_opened"
                  type="number"
                  min={1800}
                  max={2100}
                  placeholder="e.g. 2024"
                  className={fieldCls}
                />
              </Field>
              <Field label="Postal code">
                <input name="postal_code" maxLength={20} placeholder="28004" className={fieldCls} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Brand">
                <input name="brand" placeholder="e.g. NH, Marriott" className={fieldCls} />
              </Field>
              <Field label="Operator">
                <input name="operator" placeholder="Management company" className={fieldCls} />
              </Field>
            </div>

            <Field label="Owner">
              <input name="owner" placeholder="Ownership entity (optional)" className={fieldCls} />
            </Field>

            <Field label="Address">
              <input name="address_line" placeholder="Street + number" className={fieldCls} />
            </Field>

            <Field label="Notes">
              <textarea
                name="notes"
                rows={2}
                placeholder="Anything the institutional pipeline should know (optional)"
                className={cn(fieldCls, "min-h-[60px] resize-none")}
              />
            </Field>

            {error && (
              <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-[12px] text-rose-900">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-[12px] text-emerald-900">
                {success}
              </p>
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
                {pending ? "Adding…" : "Add hotel"}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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
