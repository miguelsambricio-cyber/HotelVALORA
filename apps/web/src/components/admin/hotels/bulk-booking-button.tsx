"use client";

import { useState, useTransition } from "react";
import { Cloud, AlertTriangle, Check, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  runBookingEnrichmentBatch,
  type BulkBookingResult,
} from "@/lib/admin/hotels/booking-enrich";

/**
 * Phase 3.f.next 1 · operator trigger for bulk RapidAPI booking-com15
 * enrichment over a pre-filtered list of hotel_ids.
 *
 * Operator-facing pattern:
 *   - Caller (the hotels page) builds `targetHotelIds` from the current
 *     filter context (typically `enrichment=empty&sort=completeness_asc`)
 *   - This button shows N = min(targetHotelIds.length, 25) as the click
 *     count · "Fetch from Booking · next 25 hotels"
 *   - Click → server action loops with concurrency 3 · returns aggregated
 *     summary (succeeded · failed · needs_disambiguation · skipped)
 *   - Result panel shows the breakdown · operator can click again to
 *     continue with the next batch
 *
 * Why 25 / click instead of "all 364":
 *   - Vercel Fluid Compute timeout = 300s default · 25 hotels × ~1.5s
 *     each = ~37s · comfortable margin
 *   - Lower batch lets operator stop mid-run if RapidAPI quota gets tight
 *   - Server action enforces the cap server-side even if operator passes
 *     more IDs
 */
export function BulkBookingButton({
  targetHotelIds,
  totalEmpty,
}: {
  targetHotelIds: string[];
  totalEmpty: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BulkBookingResult | null>(null);
  const batchSize = Math.min(targetHotelIds.length, 25);
  const remaining = Math.max(0, totalEmpty - batchSize);

  function run() {
    setResult(null);
    startTransition(async () => {
      const r = await runBookingEnrichmentBatch(targetHotelIds.slice(0, 25));
      setResult(r);
      // Refresh so the new chip colors + completeness scores reflect
      setTimeout(() => router.refresh(), 1500);
    });
  }

  if (batchSize === 0) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        title={`Run RapidAPI booking-com15 over the next ${batchSize} hotels in the current filter (priority = empty profiles first). ${remaining > 0 ? `${remaining} more after this batch.` : ""}`}
        className="inline-flex items-center gap-1.5 rounded-md bg-sky-700 px-3 py-1.5 font-headline text-[11px] font-extrabold uppercase tracking-[0.22em] text-white hover:bg-sky-800 disabled:opacity-60"
      >
        <Zap size={12} />
        {pending
          ? `Fetching ${batchSize}…`
          : `Bulk fetch · next ${batchSize}`}
      </button>

      {result && (
        <div
          className={`rounded-md border p-2.5 text-[11.5px] ${
            result.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.22em]">
            {result.ok ? <Check size={11} /> : <AlertTriangle size={11} />}
            Bulk Booking · {result.total} processed · {Math.round(result.elapsed_ms / 1000)}s
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-1 font-mono text-[10.5px] sm:grid-cols-4">
            <span>
              ✓ ok · <strong>{result.succeeded}</strong>
            </span>
            <span>
              ? ambig · <strong>{result.needs_disambiguation}</strong>
            </span>
            <span>
              ⊘ skipped · <strong>{result.skipped_manual_operator}</strong>
            </span>
            <span>
              ✗ failed · <strong>{result.failed}</strong>
            </span>
          </div>
          {result.rate_limited_stop && (
            <p className="mt-2 rounded bg-amber-100 px-2 py-1 font-mono text-[10.5px] text-amber-900">
              <Cloud size={10} className="mr-1 inline" />
              RapidAPI rate-limited · stopped early. Try again later.
            </p>
          )}
          {result.per_hotel.some((h) => h.status === "error" || h.status === "needs_disambiguation") && (
            <details className="mt-2">
              <summary className="cursor-pointer font-mono text-[10.5px] text-slate-700">
                Show per-hotel breakdown
              </summary>
              <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto rounded bg-white/70 p-2 font-mono text-[10px] leading-tight">
                {result.per_hotel.map((h) => (
                  <li key={h.hotel_id} className="truncate">
                    <span
                      className={
                        h.status === "ok"
                          ? "text-emerald-700"
                          : h.status === "needs_disambiguation"
                            ? "text-amber-700"
                            : h.status === "skipped"
                              ? "text-slate-600"
                              : "text-rose-700"
                      }
                    >
                      [{h.status}]
                    </span>{" "}
                    {h.hotel_id}
                    {h.booking_name ? ` · ${h.booking_name}` : ""}
                    {h.match_confidence !== undefined
                      ? ` · ${(h.match_confidence * 100).toFixed(0)}%`
                      : ""}
                    {h.completeness_score !== undefined
                      ? ` · profile ${h.completeness_score}%`
                      : ""}
                    {h.error ? ` · ${h.error.slice(0, 80)}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
