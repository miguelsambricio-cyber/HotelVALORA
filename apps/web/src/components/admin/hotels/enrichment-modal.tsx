"use client";

import { useState, useTransition } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitManualEnrichment } from "@/lib/admin/hotels/manual-enrichment";
import type { HotelProfile } from "@/lib/admin/hotels/types";
import { cn } from "@/lib/utils";

/**
 * Phase 3.e · operator-facing enrichment form.
 *
 * Until the automated Booking pipeline ships, this is the manual
 * bootstrap path for canonical hotel profiles. Operator types in the
 * Booking-derived fields (facilities · amenities · room mix · review
 * score · policies) and the snapshot reader merges them onto the
 * canonical CoStar record.
 *
 * Idempotent (upsert on hotel_id) · operator can re-open and edit ·
 * each submission overrides the previous one.
 */

export function EnrichmentModal({
  hotelId,
  initialProfile,
}: {
  hotelId: string;
  initialProfile?: HotelProfile;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    const csvList = (v: FormDataEntryValue | null) =>
      String(v ?? "")
        .split(/[,\n]/)
        .map((x) => x.trim())
        .filter(Boolean);
    const numOrNull = (v: FormDataEntryValue | null) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const boolToggle = (v: FormDataEntryValue | null) => v === "on";

    const profile: HotelProfile = {
      facilities_detailed: csvList(formData.get("facilities_detailed")),
      amenities: csvList(formData.get("amenities")),
      services: csvList(formData.get("services")),
      sustainability: csvList(formData.get("sustainability")),
      accessibility: csvList(formData.get("accessibility")),
      family_features: csvList(formData.get("family_features")),
      // Room types · one per line · format "Name | count | sqm | occupancy"
      room_types: String(formData.get("room_types") ?? "")
        .split(/\n/)
        .map((line) => {
          const parts = line.split("|").map((s) => s.trim());
          if (!parts[0]) return null;
          return {
            name: parts[0],
            count: parts[1] ? Number(parts[1]) || null : null,
            sqm: parts[2] ? Number(parts[2]) || null : null,
            max_occupancy: parts[3] ? Number(parts[3]) || null : null,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null),
      fnb: {
        restaurants_count: numOrNull(formData.get("fnb_restaurants_count")),
        bars_count: numOrNull(formData.get("fnb_bars_count")),
        breakfast_included: boolToggle(formData.get("fnb_breakfast_included")),
        michelin_stars: numOrNull(formData.get("fnb_michelin_stars")),
      },
      spa: {
        has_spa: boolToggle(formData.get("spa_has_spa")),
        sqm: numOrNull(formData.get("spa_sqm")),
      },
      gym: {
        has_gym: boolToggle(formData.get("gym_has_gym")),
        open_24h: boolToggle(formData.get("gym_open_24h")),
      },
      pool: {
        has_pool: boolToggle(formData.get("pool_has_pool")),
        indoor: boolToggle(formData.get("pool_indoor")),
        outdoor: boolToggle(formData.get("pool_outdoor")),
      },
      parking: {
        has_parking: boolToggle(formData.get("parking_has_parking")),
        spaces: numOrNull(formData.get("parking_spaces")),
        price_eur: numOrNull(formData.get("parking_price_eur")),
        valet: boolToggle(formData.get("parking_valet")),
        ev_charging: boolToggle(formData.get("parking_ev")),
      },
      meeting_rooms: {
        count: numOrNull(formData.get("mr_count")),
        total_sqm: numOrNull(formData.get("mr_total_sqm")),
        max_capacity: numOrNull(formData.get("mr_max_capacity")),
      },
      rooftop: {
        has_rooftop: boolToggle(formData.get("rooftop_has_rooftop")),
      },
      coworking: {
        has_coworking: boolToggle(formData.get("coworking_has")),
        seats: numOrNull(formData.get("coworking_seats")),
      },
      review_score: numOrNull(formData.get("review_score")),
      review_count: numOrNull(formData.get("review_count")),
      review_source: (String(formData.get("review_source") ?? "") || undefined) as HotelProfile["review_source"],
      booking_url: String(formData.get("booking_url") ?? "") || null,
      website_url: String(formData.get("website_url") ?? "") || null,
      check_in_time: String(formData.get("check_in_time") ?? "") || null,
      check_out_time: String(formData.get("check_out_time") ?? "") || null,
      pet_policy: String(formData.get("pet_policy") ?? "") || null,
      cancellation_policy: String(formData.get("cancellation_policy") ?? "") || null,
      smoking_policy: String(formData.get("smoking_policy") ?? "") || null,
    };

    startTransition(async () => {
      const res = await submitManualEnrichment(hotelId, profile);
      if (res.ok) {
        setSuccess(`Profile saved · completeness ${res.completeness_score ?? 0}%`);
        setTimeout(() => {
          router.refresh();
          setOpen(false);
          setSuccess(null);
        }, 1500);
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
          className="inline-flex items-center gap-1.5 rounded-md bg-forest-900 px-3 py-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.22em] text-lime-300 hover:opacity-90"
        >
          <Sparkles size={12} aria-hidden /> Run enrichment
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        )} />
        <DialogPrimitive.Content className={cn(
          "fixed z-50 flex flex-col border-slate-200 bg-white shadow-2xl outline-none",
          "inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl border-t",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90vh] sm:w-[44rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border",
        )}>
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
            <div>
              <DialogPrimitive.Title className="font-headline text-[15px] font-extrabold tracking-tight text-forest-900">
                Hotel profile enrichment
              </DialogPrimitive.Title>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Fill the Booking-style fields by hand · the canonical CoStar data above is preserved.
                Operator entries always win over future automated re-scrapes (priority 100).
              </p>
            </div>
            <DialogPrimitive.Close className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </header>

          <form action={handleSubmit} className="space-y-3 overflow-y-auto px-5 py-4">
            <Group label="Operational facilities">
              <Field label="Facilities (comma-separated)">
                <input name="facilities_detailed" defaultValue={(initialProfile?.facilities_detailed ?? []).join(", ")} placeholder="meeting_space, spa, fitness, rooftop_bar, kosher_kitchen" className={fieldCls} />
              </Field>
              <Field label="Amenities (comma-separated)">
                <input name="amenities" defaultValue={(initialProfile?.amenities ?? []).join(", ")} placeholder="free wifi, minibar, in-room safe" className={fieldCls} />
              </Field>
              <Field label="Services (comma-separated)">
                <input name="services" defaultValue={(initialProfile?.services ?? []).join(", ")} placeholder="concierge, 24h reception, laundry, room service" className={fieldCls} />
              </Field>
            </Group>

            <Group label="Room mix">
              <Field label="Room types · one per line · Name | count | sqm | max occupancy">
                <textarea
                  name="room_types"
                  rows={4}
                  defaultValue={(initialProfile?.room_types ?? []).map((r) => [r.name, r.count, r.sqm, r.max_occupancy].filter(Boolean).join(" | ")).join("\n")}
                  placeholder={"Deluxe King | 24 | 32 | 2\nJunior Suite | 8 | 48 | 3"}
                  className={cn(fieldCls, "min-h-[80px] resize-none font-mono text-[11px]")}
                />
              </Field>
            </Group>

            <Group label="F&B">
              <div className="grid grid-cols-4 gap-3">
                <Field label="Restaurants">
                  <input name="fnb_restaurants_count" type="number" min={0} defaultValue={initialProfile?.fnb?.restaurants_count ?? ""} className={fieldCls} />
                </Field>
                <Field label="Bars">
                  <input name="fnb_bars_count" type="number" min={0} defaultValue={initialProfile?.fnb?.bars_count ?? ""} className={fieldCls} />
                </Field>
                <Field label="Michelin ★">
                  <input name="fnb_michelin_stars" type="number" min={0} max={3} defaultValue={initialProfile?.fnb?.michelin_stars ?? ""} className={fieldCls} />
                </Field>
                <Field label="Breakfast incl.">
                  <Toggle name="fnb_breakfast_included" defaultChecked={initialProfile?.fnb?.breakfast_included ?? false} />
                </Field>
              </div>
            </Group>

            <Group label="Wellness · Sports">
              <div className="grid grid-cols-4 gap-3">
                <Field label="Spa">
                  <Toggle name="spa_has_spa" defaultChecked={initialProfile?.spa?.has_spa ?? false} />
                </Field>
                <Field label="Spa sqm">
                  <input name="spa_sqm" type="number" min={0} defaultValue={initialProfile?.spa?.sqm ?? ""} className={fieldCls} />
                </Field>
                <Field label="Gym">
                  <Toggle name="gym_has_gym" defaultChecked={initialProfile?.gym?.has_gym ?? false} />
                </Field>
                <Field label="Gym 24h">
                  <Toggle name="gym_open_24h" defaultChecked={initialProfile?.gym?.open_24h ?? false} />
                </Field>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <Field label="Pool">
                  <Toggle name="pool_has_pool" defaultChecked={initialProfile?.pool?.has_pool ?? false} />
                </Field>
                <Field label="Indoor">
                  <Toggle name="pool_indoor" defaultChecked={initialProfile?.pool?.indoor ?? false} />
                </Field>
                <Field label="Outdoor">
                  <Toggle name="pool_outdoor" defaultChecked={initialProfile?.pool?.outdoor ?? false} />
                </Field>
                <Field label="Rooftop">
                  <Toggle name="rooftop_has_rooftop" defaultChecked={initialProfile?.rooftop?.has_rooftop ?? false} />
                </Field>
              </div>
            </Group>

            <Group label="Parking · Meeting · Coworking">
              <div className="grid grid-cols-4 gap-3">
                <Field label="Parking">
                  <Toggle name="parking_has_parking" defaultChecked={initialProfile?.parking?.has_parking ?? false} />
                </Field>
                <Field label="Spaces">
                  <input name="parking_spaces" type="number" min={0} defaultValue={initialProfile?.parking?.spaces ?? ""} className={fieldCls} />
                </Field>
                <Field label="€/night">
                  <input name="parking_price_eur" type="number" min={0} defaultValue={initialProfile?.parking?.price_eur ?? ""} className={fieldCls} />
                </Field>
                <Field label="Valet">
                  <Toggle name="parking_valet" defaultChecked={initialProfile?.parking?.valet ?? false} />
                </Field>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <Field label="EV charging">
                  <Toggle name="parking_ev" defaultChecked={initialProfile?.parking?.ev_charging ?? false} />
                </Field>
                <Field label="Meeting rooms #">
                  <input name="mr_count" type="number" min={0} defaultValue={initialProfile?.meeting_rooms?.count ?? ""} className={fieldCls} />
                </Field>
                <Field label="MR total sqm">
                  <input name="mr_total_sqm" type="number" min={0} defaultValue={initialProfile?.meeting_rooms?.total_sqm ?? ""} className={fieldCls} />
                </Field>
                <Field label="Max capacity">
                  <input name="mr_max_capacity" type="number" min={0} defaultValue={initialProfile?.meeting_rooms?.max_capacity ?? ""} className={fieldCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Coworking">
                  <Toggle name="coworking_has" defaultChecked={initialProfile?.coworking?.has_coworking ?? false} />
                </Field>
                <Field label="Coworking seats">
                  <input name="coworking_seats" type="number" min={0} defaultValue={initialProfile?.coworking?.seats ?? ""} className={fieldCls} />
                </Field>
              </div>
            </Group>

            <Group label="Compliance">
              <Field label="Sustainability (comma-separated certifications)">
                <input name="sustainability" defaultValue={(initialProfile?.sustainability ?? []).join(", ")} placeholder="BREEAM Very Good, Green Key, EarthCheck Silver" className={fieldCls} />
              </Field>
              <Field label="Accessibility (comma-separated features)">
                <input name="accessibility" defaultValue={(initialProfile?.accessibility ?? []).join(", ")} placeholder="wheelchair access, hearing-impaired rooms, accessible bathrooms" className={fieldCls} />
              </Field>
              <Field label="Family features (comma-separated)">
                <input name="family_features" defaultValue={(initialProfile?.family_features ?? []).join(", ")} placeholder="kids club, family rooms, cribs, kids menu" className={fieldCls} />
              </Field>
            </Group>

            <Group label="Guest experience">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Review score (0-10)">
                  <input name="review_score" type="number" min={0} max={10} step={0.1} defaultValue={initialProfile?.review_score ?? ""} className={fieldCls} />
                </Field>
                <Field label="Review count">
                  <input name="review_count" type="number" min={0} defaultValue={initialProfile?.review_count ?? ""} className={fieldCls} />
                </Field>
                <Field label="Source">
                  <select name="review_source" defaultValue={initialProfile?.review_source ?? "booking"} className={fieldCls}>
                    <option value="booking">Booking</option>
                    <option value="tripadvisor">Tripadvisor</option>
                    <option value="google">Google</option>
                    <option value="aggregated">Aggregated</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Booking URL">
                  <input name="booking_url" defaultValue={initialProfile?.booking_url ?? ""} placeholder="https://booking.com/hotel/..." className={fieldCls} />
                </Field>
                <Field label="Website">
                  <input name="website_url" defaultValue={initialProfile?.website_url ?? ""} placeholder="https://..." className={fieldCls} />
                </Field>
              </div>
            </Group>

            <Group label="Policies">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Check-in time">
                  <input name="check_in_time" defaultValue={initialProfile?.check_in_time ?? ""} placeholder="15:00" className={fieldCls} />
                </Field>
                <Field label="Check-out time">
                  <input name="check_out_time" defaultValue={initialProfile?.check_out_time ?? ""} placeholder="12:00" className={fieldCls} />
                </Field>
              </div>
              <Field label="Pet policy">
                <textarea name="pet_policy" rows={2} defaultValue={initialProfile?.pet_policy ?? ""} placeholder="Free-text pet policy" className={cn(fieldCls, "min-h-[50px] resize-none")} />
              </Field>
              <Field label="Cancellation policy">
                <textarea name="cancellation_policy" rows={2} defaultValue={initialProfile?.cancellation_policy ?? ""} placeholder="Free until 48h before check-in" className={cn(fieldCls, "min-h-[50px] resize-none")} />
              </Field>
              <Field label="Smoking policy">
                <input name="smoking_policy" defaultValue={initialProfile?.smoking_policy ?? ""} placeholder="Non-smoking property" className={fieldCls} />
              </Field>
            </Group>

            {error && <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-[12px] text-rose-900">{error}</p>}
            {success && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-[12px] text-emerald-900">{success}</p>}

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <DialogPrimitive.Close className="rounded-md border border-slate-200 px-3 py-2 font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600 hover:bg-slate-50">
                Cancel
              </DialogPrimitive.Close>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-forest-900 px-3 py-2 font-headline text-[11px] font-extrabold uppercase tracking-[0.22em] text-lime-300 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save enrichment"}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/30 p-3">
      <legend className="px-1 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-headline text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({ name, defaultChecked }: { name: string; defaultChecked: boolean }) {
  return (
    <input
      type="checkbox"
      name={name}
      defaultChecked={defaultChecked}
      className="h-5 w-5 rounded border-slate-300 text-forest-900 focus:ring-forest-900"
    />
  );
}

const fieldCls =
  "w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-[11.5px] text-slate-900 placeholder:text-slate-400 focus:border-forest-900 focus:outline-none";
