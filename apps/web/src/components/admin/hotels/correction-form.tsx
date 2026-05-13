"use client";

import { useState, useTransition } from "react";
import { submitHotelCorrection } from "@/lib/admin/hotels/corrections";

/**
 * Operator-facing correction form.
 *
 * Submits to `submitHotelCorrection()` which appends a JSONL row to
 * `services/costar/corrections/<YYYY-MM>.jsonl`. The next ingest.py
 * run is the consumer.
 *
 * Kept intentionally simple — one field at a time, plain textarea for
 * proposed value, required reason. No optimistic UI, no inline
 * validation: the server action enforces both. The page revalidates on
 * success so the operator sees their correction reflected in the
 * audit trail next refresh.
 */
export function CorrectionForm({
  hotelId,
  fields,
}: {
  hotelId: string;
  fields: readonly string[];
}) {
  const [pending, startTransition] = useTransition();
  const [field, setField] = useState(fields[0]);
  const [proposed, setProposed] = useState("");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    const f = String(formData.get("field") ?? "");
    const p = String(formData.get("proposed") ?? "");
    const r = String(formData.get("reason") ?? "");
    startTransition(async () => {
      const res = await submitHotelCorrection({
        hotel_id: hotelId,
        field: f,
        current_value: null,
        proposed_value: p || null,
        reason: r,
      });
      if (res.ok) {
        setResult({ ok: true, message: `Queued at ${res.queued_at}` });
        setProposed("");
        setReason("");
      } else {
        setResult({ ok: false, message: res.error ?? "Submission failed" });
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-2.5">
      <label className="block">
        <span className="mb-1 block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Field
        </span>
        <select
          name="field"
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-[11px] text-slate-900 focus:border-forest-900 focus:outline-none"
        >
          {fields.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Proposed value
        </span>
        <input
          name="proposed"
          value={proposed}
          onChange={(e) => setProposed(e.target.value)}
          placeholder="e.g. luxury · 4-star · 220"
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-[11px] text-slate-900 placeholder:text-slate-400 focus:border-forest-900 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Reason (min 8 chars)
        </span>
        <textarea
          name="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          minLength={8}
          rows={3}
          placeholder="Why is the current value wrong?"
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-forest-900 focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-forest-900 px-3 py-2 font-headline text-[11px] font-extrabold uppercase tracking-[0.22em] text-lime-300 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Queue correction"}
      </button>
      {result && (
        <p
          className={`rounded-md p-2 text-[11.5px] ${
            result.ok ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"
          }`}
        >
          {result.message}
        </p>
      )}
    </form>
  );
}
