"use client";

import { useState, useTransition } from "react";
import { Cloud, AlertTriangle, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  runBookingEnrichment,
  type BookingEnrichResult,
} from "@/lib/admin/hotels/booking-enrich";

/**
 * Phase 3.f.real-booking · operator trigger for the RapidAPI booking-com15
 * enrichment pipeline.
 *
 * Click → server action runs · returns either:
 *   - ok=true · success panel with match-confidence + completeness%
 *   - needs_disambiguation=true · candidate list (top 5 matches) so the
 *     operator can pick the right Booking record
 *   - ok=false · error message
 *
 * Does NOT overwrite manual_operator enrichment (server action enforces).
 */
export function BookingEnrichButton({ hotelId }: { hotelId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BookingEnrichResult | null>(null);

  function run() {
    setResult(null);
    startTransition(async () => {
      const r = await runBookingEnrichment(hotelId);
      setResult(r);
      if (r.ok) {
        // refresh after a brief delay so the operator sees the success
        // banner before the page re-fetches
        setTimeout(() => router.refresh(), 1200);
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md bg-sky-700 px-3 py-1.5 font-headline text-[11px] font-extrabold uppercase tracking-[0.22em] text-white hover:bg-sky-800 disabled:opacity-60"
      >
        <Cloud size={12} />
        {pending ? "Fetching from Booking…" : "Fetch from Booking"}
      </button>

      {result && result.ok && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-[11.5px] text-emerald-900">
          <div className="flex items-center gap-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.22em]">
            <Check size={11} />
            Booking matched
          </div>
          <div className="mt-1 font-mono text-[10.5px] leading-relaxed">
            {result.booking_name ?? "—"} · booking_id {result.booking_hotel_id} ·
            confidence {((result.match_confidence ?? 0) * 100).toFixed(0)}% · profile
            now {result.completeness_score}% complete
          </div>
        </div>
      )}

      {result && !result.ok && !result.needs_disambiguation && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-[11.5px] text-rose-900">
          <div className="flex items-center gap-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.22em]">
            <AlertTriangle size={11} />
            Booking fetch failed
          </div>
          <p className="mt-1 font-mono text-[10.5px] leading-relaxed">
            {result.error ?? "unknown error"}
          </p>
        </div>
      )}

      {result?.needs_disambiguation && result.candidates && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11.5px] text-amber-900">
          <div className="flex items-center gap-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.22em]">
            <AlertTriangle size={11} />
            Ambiguous match · top {result.candidates.length} candidates
          </div>
          <p className="mt-1 font-mono text-[10.5px] leading-relaxed">
            Top auto-match was only{" "}
            {((result.match_confidence ?? 0) * 100).toFixed(0)}% · expected ≥80%.
            Verify name + market on the hotel record · run again once
            disambiguated, or use manual enrichment.
          </p>
          <ul className="mt-2 space-y-1 font-mono text-[10.5px]">
            {result.candidates.map((c) => (
              <li
                key={c.booking_hotel_id}
                className="rounded bg-white/60 px-2 py-1 ring-1 ring-amber-200"
              >
                <span className="font-extrabold">{c.name}</span> · id{" "}
                {c.booking_hotel_id} · {(c.match_confidence * 100).toFixed(0)}%
                {c.review_score !== undefined &&
                  ` · ★ ${c.review_score.toFixed(1)} (${c.review_count ?? 0})`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
