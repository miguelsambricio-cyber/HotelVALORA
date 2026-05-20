"use client";

import { useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import { applyDirectHotelEditAction } from "@/lib/admin/hotels/direct-edit";

interface EditableField {
  key: string;
  label: string;
  section: string;
  kind?: "text" | "number" | "textarea";
  options?: readonly string[];
}

const FIELDS: EditableField[] = [
  // Identification
  { key: "name", label: "Hotel name", section: "Identification" },
  { key: "brand", label: "Brand", section: "Identification" },
  { key: "operator", label: "Operator", section: "Identification" },
  { key: "owner", label: "Owner", section: "Identification" },
  // Classification
  {
    key: "chain_scale",
    label: "Chain scale",
    section: "Classification",
    options: [
      "",
      "luxury",
      "upper_upscale",
      "upscale",
      "upper_midscale",
      "midscale",
      "economy",
      "lifestyle",
      "boutique",
    ],
  },
  { key: "category", label: "Category (stars)", section: "Classification" },
  {
    key: "segment_type",
    label: "Segment type",
    section: "Classification",
    options: ["", "hotel", "hotel_project", "tourist_apartments"],
  },
  // Property
  { key: "rooms_count", label: "Rooms", section: "Property", kind: "number" },
  { key: "year_opened", label: "Year opened", section: "Property", kind: "number" },
  { key: "year_last_renovated", label: "Year last renovated", section: "Property", kind: "number" },
  { key: "total_floors", label: "Total floors", section: "Property", kind: "number" },
  { key: "gross_building_sqm", label: "Gross building m²", section: "Property", kind: "number" },
  // Location
  { key: "address_line", label: "Address line", section: "Location" },
  { key: "postal_code", label: "Postal code", section: "Location" },
  { key: "neighborhood", label: "Neighborhood", section: "Location" },
  { key: "latitude", label: "Latitude", section: "Location", kind: "number" },
  { key: "longitude", label: "Longitude", section: "Location", kind: "number" },
  // Facilities
  { key: "meeting_rooms_count", label: "Meeting rooms (count)", section: "Facilities", kind: "number" },
  { key: "meeting_space_sqm", label: "Meeting space m²", section: "Facilities", kind: "number" },
  { key: "parking_spaces", label: "Parking spaces", section: "Facilities", kind: "number" },
  { key: "score_costar", label: "CoStar score", section: "Facilities", kind: "number" },
  // Contact
  { key: "phone", label: "Phone", section: "Contact" },
  { key: "website_url", label: "Website URL", section: "Contact" },
  // External IDs
  { key: "google_place_id", label: "Google place id", section: "External IDs" },
  { key: "wikidata_qid", label: "Wikidata QID", section: "External IDs" },
  // Quality / governance
  {
    key: "data_quality_tier",
    label: "Data quality tier",
    section: "Quality",
    options: ["", "gold", "silver", "bronze", "quarantined"],
  },
  { key: "notes", label: "Notes", section: "Quality", kind: "textarea" },
];

export function EditHotelDrawer({
  hotelId,
  canonicalIdSupabase,
  currentValues,
}: {
  hotelId: string;
  canonicalIdSupabase: string | null;
  currentValues: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function update(key: string, value: string) {
    setEdits((e) => ({ ...e, [key]: value }));
  }

  function effectiveValue(key: string): string {
    return edits[key] !== undefined ? edits[key] : currentValues[key] ?? "";
  }

  function isDirty(key: string): boolean {
    return edits[key] !== undefined && edits[key] !== (currentValues[key] ?? "");
  }

  const dirtyKeys = Object.keys(edits).filter(isDirty);

  async function submit() {
    if (dirtyKeys.length === 0) return;
    if (!canonicalIdSupabase) {
      setResult({
        ok: false,
        message:
          "Hotel not linked to Supabase canonical layer. Use the correction queue (Submit correction section) instead.",
      });
      return;
    }
    const payload: Record<string, string | null> = {};
    for (const k of dirtyKeys) {
      payload[k] = edits[k] === "" ? null : edits[k];
    }
    startTransition(async () => {
      const res = await applyDirectHotelEditAction({
        canonical_id_supabase: canonicalIdSupabase,
        edits: payload,
        reason: "Admin direct edit",
        hotel_id: hotelId,
      });
      if (res.ok) {
        const skippedTail = res.skipped_fields.length > 0
          ? ` · ${res.skipped_fields.length} field${res.skipped_fields.length === 1 ? "" : "s"} skipped (no Supabase mapping)`
          : "";
        setResult({
          ok: true,
          message: `Applied ${res.field_count} field${res.field_count === 1 ? "" : "s"}${skippedTail}`,
        });
        setEdits({});
        setTimeout(() => {
          setOpen(false);
          setResult(null);
        }, 1500);
      } else {
        setResult({ ok: false, message: res.error ?? "Apply failed" });
      }
    });
  }

  // If the hotel isn't linked to Supabase canonical, the direct-edit
  // path isn't available. The button is rendered but disabled with a
  // tooltip pointing to the correction queue.
  const linked = Boolean(canonicalIdSupabase);

  // Group fields by section for the layout
  const sections = FIELDS.reduce<Record<string, EditableField[]>>((acc, f) => {
    (acc[f.section] = acc[f.section] ?? []).push(f);
    return acc;
  }, {});

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!linked}
        title={linked ? "Open direct-edit drawer (writes to Supabase canonical)" : "Hotel not linked to Supabase canonical layer — use the Submit correction form below"}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-headline text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-700 hover:border-forest-900 hover:text-forest-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:text-slate-700"
      >
        <span className="flex items-center gap-2">
          <Pencil size={12} aria-hidden />
          Edit hotel
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          {linked ? "direct" : "not linked"}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-hotel-title"
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <h2 id="edit-hotel-title" className="font-headline text-[15px] font-extrabold tracking-tight text-forest-900">
                  Edit hotel
                </h2>
                <p className="font-mono text-[10.5px] text-slate-500">
                  Direct admin edit · applies immediately to snapshot · audited in operator-overrides/{new Date().toISOString().slice(0, 7)}.jsonl
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {Object.entries(sections).map(([section, items]) => (
                <fieldset key={section}>
                  <legend className="mb-2 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
                    {section}
                  </legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {items.map((f) => {
                      const val = effectiveValue(f.key);
                      const dirty = isDirty(f.key);
                      const baseCls = `w-full rounded-md border px-2 py-1.5 font-mono text-[11px] text-slate-900 placeholder:text-slate-400 focus:outline-none ${
                        dirty
                          ? "border-amber-400 bg-amber-50 focus:border-amber-600"
                          : "border-slate-200 bg-white focus:border-forest-900"
                      }`;
                      return (
                        <label key={f.key} className="block">
                          <span className="mb-0.5 flex items-baseline justify-between gap-2 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
                            <span>{f.label}</span>
                            {dirty && <span className="font-mono text-[9px] text-amber-700">modified</span>}
                          </span>
                          {f.options ? (
                            <select
                              value={val}
                              onChange={(e) => update(f.key, e.target.value)}
                              className={baseCls}
                            >
                              {f.options.map((o) => (
                                <option key={o} value={o}>
                                  {o === "" ? "(empty)" : o}
                                </option>
                              ))}
                            </select>
                          ) : f.kind === "textarea" ? (
                            <textarea
                              value={val}
                              onChange={(e) => update(f.key, e.target.value)}
                              rows={3}
                              className={baseCls}
                            />
                          ) : (
                            <input
                              type={f.kind === "number" ? "text" : "text"}
                              inputMode={f.kind === "number" ? "decimal" : undefined}
                              value={val}
                              onChange={(e) => update(f.key, e.target.value)}
                              className={baseCls}
                            />
                          )}
                          {currentValues[f.key] !== undefined && (
                            <span className="mt-0.5 block truncate font-mono text-[9.5px] text-slate-400">
                              was: {currentValues[f.key] || "(empty)"}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <p className="font-mono text-[10.5px] text-slate-600">
                {dirtyKeys.length === 0 ? (
                  <span className="text-slate-400">No changes</span>
                ) : (
                  <span>
                    <span className="font-bold text-amber-700">{dirtyKeys.length}</span> field
                    {dirtyKeys.length === 1 ? "" : "s"} modified
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                {result && (
                  <span
                    className={`rounded px-2 py-1 font-mono text-[10.5px] ${
                      result.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {result.message}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending || dirtyKeys.length === 0}
                  className="rounded-md bg-forest-900 px-4 py-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.22em] text-lime-300 hover:opacity-90 disabled:opacity-50"
                >
                  {pending ? "Applying…" : "Apply changes"}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
