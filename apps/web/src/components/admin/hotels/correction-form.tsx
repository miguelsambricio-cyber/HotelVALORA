"use client";

import { useEffect, useState, useTransition } from "react";
import { submitHotelCorrection } from "@/lib/admin/hotels/corrections";

/**
 * Operator-facing correction form.
 *
 * Submits to `submitHotelCorrection()` which appends a JSONL row to
 * `services/costar/corrections/<YYYY-MM>.jsonl`. The next ingest.py
 * run is the consumer.
 *
 * UX:
 *  - Field dropdown · selecting a field auto-loads its current value
 *    into the proposed input so the operator can edit in-place rather
 *    than retyping from scratch.
 *  - Current value is rendered above the input (read-only) so the
 *    operator confirms what they're replacing.
 *  - Reason required (≥ 8 chars · enforced both client + server).
 *  - On success, status banner + the proposed input refreshes to the
 *    new (just-submitted) value so the operator sees the next baseline.
 */
export function CorrectionForm({
  hotelId,
  fields,
  currentValues,
}: {
  hotelId: string;
  fields: readonly string[];
  currentValues?: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const [field, setField] = useState<string>(fields[0] ?? "");
  const [proposed, setProposed] = useState<string>("");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const currentValue = (currentValues?.[field] ?? "").toString();

  // Auto-prefill proposed input with the current value whenever the
  // operator switches fields. This is the in-place edit pattern —
  // operator nudges existing value instead of retyping it.
  useEffect(() => {
    setProposed(currentValue);
  }, [currentValue]);

  async function handleSubmit(formData: FormData) {
    const f = String(formData.get("field") ?? "");
    const p = String(formData.get("proposed") ?? "");
    const r = String(formData.get("reason") ?? "");
    startTransition(async () => {
      const res = await submitHotelCorrection({
        hotel_id: hotelId,
        field: f,
        current_value: currentValue || null,
        proposed_value: p || null,
        reason: r,
      });
      if (res.ok) {
        setResult({ ok: true, message: `Queued at ${res.queued_at}` });
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
      <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
        <span className="mb-0.5 block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Current value
        </span>
        <p className="break-words font-mono text-[11px] text-slate-700">
          {currentValue || <span className="italic text-slate-400">(empty)</span>}
        </p>
      </div>
      <label className="block">
        <span className="mb-1 block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Proposed value
        </span>
        <input
          name="proposed"
          value={proposed}
          onChange={(e) => setProposed(e.target.value)}
          placeholder={currentValue ? "Edit the current value above" : "e.g. luxury · 4-star · 220"}
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
        disabled={pending || proposed === currentValue}
        className="w-full rounded-md bg-forest-900 px-3 py-2 font-headline text-[11px] font-extrabold uppercase tracking-[0.22em] text-lime-300 disabled:opacity-50"
        title={proposed === currentValue ? "Edit the proposed value before submitting" : undefined}
      >
        {pending ? "Submitting…" : proposed === currentValue ? "Edit value to enable" : "Queue correction"}
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
