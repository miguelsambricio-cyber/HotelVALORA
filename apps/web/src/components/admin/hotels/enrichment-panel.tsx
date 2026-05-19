import { Database, ShieldCheck, AlertTriangle, ArrowUpRight } from "lucide-react";
import type { EnrichmentSnapshot } from "@/lib/admin/hotels/enrichment-stats";

interface Props {
  snapshot: EnrichmentSnapshot | null;
}

export function EnrichmentPanel({ snapshot }: Props) {
  if (!snapshot) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Database size={14} className="text-slate-400" aria-hidden />
          <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
            Madrid enrichment · Phase D
          </h2>
        </div>
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-900">
          No Phase D snapshot available — Supabase <code className="font-mono">hotel_canonical</code> empty for Madrid or
          coverage views not applied.
        </p>
      </section>
    );
  }

  const t = snapshot.totals;
  const p = snapshot.priorityFields;
  const total = t.hotels;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  const goalTone = t.goal_reached ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-amber-100 text-amber-800 ring-amber-200";

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Database size={14} className="text-slate-400" aria-hidden />
        <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
          {snapshot.city} enrichment · Phase D
        </h2>
        <span className={`rounded px-1.5 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.22em] ring-1 ${goalTone}`}>
          T2 goal · {t.goal_reached ? "reached" : `${(t.institutional_passing_rate * 100).toFixed(0)}% / 70%`}
        </span>
        {snapshot.lastEnrichedAt && (
          <span className="ml-auto font-mono text-[10.5px] text-slate-500">
            last enriched · {new Date(snapshot.lastEnrichedAt).toISOString().slice(0, 10)}
          </span>
        )}
      </div>

      {/* Tier distribution */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Gold" value={t.gold} tone="emerald" hint={`${pct(t.gold)}%`} />
        <Stat label="Silver" value={t.silver} tone="slate" hint={`${pct(t.silver)}%`} />
        <Stat label="Bronze" value={t.bronze} tone="amber" hint={`${pct(t.bronze)}%`} />
        <Stat label="Quarantined" value={t.quarantined} tone={t.quarantined > 0 ? "rose" : "slate"} hint={`${pct(t.quarantined)}%`} />
      </div>

      {/* Operator-priority field coverage */}
      <div>
        <p className="mb-1.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
          Operator-priority field coverage · {total} hotels
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FieldBar label="phone" filled={p.phone} total={total} />
          <FieldBar label="website_url" filled={p.website_url} total={total} />
          <FieldBar label="google_place_id" filled={p.google_place_id} total={total} />
          <FieldBar label="address_line1" filled={p.address_line1} total={total} />
          <FieldBar label="operator_id" filled={p.operator_id} total={total} hint={`${pct(p.operator_id)}% (branded only)`} />
          <FieldBar label="wikidata_qid" filled={p.wikidata_qid} total={total} />
          <FieldBar label="total_rooms" filled={p.total_rooms} total={total} tone="blocker" />
          <FieldBar label="year_opened" filled={p.year_opened} total={total} tone="blocker" />
        </div>
      </div>

      {/* T1 / T2 passing */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="T1 passing"
          value={t.t1_passing}
          tone={t.t1_passing > total * 0.7 ? "emerald" : "amber"}
          hint={`avg ${(t.avg_t1_pct * 100).toFixed(0)}%`}
        />
        <Stat
          label="T2 passing"
          value={t.t2_passing}
          tone={t.t2_passing > 0 ? "emerald" : "amber"}
          hint={`avg ${(t.avg_t2_pct * 100).toFixed(0)}%`}
        />
        <Stat
          label="Source records"
          value={snapshot.provenance.source_records}
          tone="slate"
          hint={`${snapshot.provenance.by_source.length} sources`}
        />
        <Stat
          label="Field provenance"
          value={snapshot.provenance.field_provenance_rows}
          tone="slate"
          hint="audit rows"
        />
      </div>

      {/* By source + Dedup */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <p className="mb-1.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
            <ShieldCheck size={11} className="-mt-px mr-1 inline text-slate-400" aria-hidden />
            Provenance by source
          </p>
          <ul className="space-y-1">
            {snapshot.provenance.by_source.map((s) => (
              <li key={s.source} className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[11px] text-slate-700">{s.source}</span>
                <span className="font-mono text-[11px] tabular-nums text-slate-600">{s.n}</span>
              </li>
            ))}
            {snapshot.provenance.by_source.length === 0 && (
              <li className="font-mono text-[11px] text-slate-400">no sources</li>
            )}
          </ul>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <p className="mb-1.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
            <AlertTriangle size={11} className="-mt-px mr-1 inline text-amber-400" aria-hidden />
            Dedup queue
          </p>
          <ul className="space-y-1">
            <li className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[11px] text-slate-700">pending_review</span>
              <span className="font-mono text-[11px] tabular-nums text-slate-600">{snapshot.dedup.pending_review}</span>
            </li>
            <li className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[11px] text-slate-700">auto_merge</span>
              <span className="font-mono text-[11px] tabular-nums text-slate-600">{snapshot.dedup.auto_merge}</span>
            </li>
            <li className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[11px] text-slate-700">sibling_listing</span>
              <span className="font-mono text-[11px] tabular-nums text-slate-600">{snapshot.dedup.sibling_listing}</span>
            </li>
            <li className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[11px] text-slate-700">dismissed</span>
              <span className="font-mono text-[11px] tabular-nums text-slate-600">{snapshot.dedup.dismissed}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Top missing */}
      {snapshot.topMissingFields.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <p className="mb-1.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-amber-900">
            Most-missing priority fields (gap to 100%)
          </p>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {snapshot.topMissingFields.slice(0, 6).map((f) => (
              <li key={f.field} className="flex items-baseline justify-between gap-2 font-mono text-[11px] text-amber-900">
                <span>{f.field}</span>
                <span className="tabular-nums">−{f.missing} hotels</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-amber-900">
            <code className="font-mono">total_rooms</code> + <code className="font-mono">year_opened</code> are blocked by source
            absence (Booking E2 doesn&apos;t expose them; Wikidata P571/P1106 sparse for ES). Path forward documented in{" "}
            <a
              href="https://github.com/miguelsambricio-cyber/HotelVALORA/blob/feature/hotel-enrichment-pipeline/docs/hotel-intelligence/phase-d8-hotel-website-design-v1.md"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-700"
            >
              phase-d8-hotel-website-design-v1.md <ArrowUpRight size={10} className="-mt-0.5 inline" aria-hidden />
            </a>
            .
          </p>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone = "slate",
  hint,
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "amber" | "rose";
  hint?: string;
}) {
  const cls =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
        ? "text-amber-700"
        : tone === "rose"
          ? "text-rose-700"
          : "text-forest-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className={`mt-1 font-headline text-xl font-extrabold tabular-nums ${cls}`}>{value}</p>
      {hint && <p className="mt-0.5 font-mono text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function FieldBar({
  label,
  filled,
  total,
  tone,
  hint,
}: {
  label: string;
  filled: number;
  total: number;
  tone?: "blocker";
  hint?: string;
}) {
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
  const isBlocker = tone === "blocker";
  const barCls = isBlocker
    ? "bg-rose-500"
    : pct >= 90
      ? "bg-emerald-500"
      : pct >= 50
        ? "bg-amber-500"
        : "bg-slate-400";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10.5px] text-slate-700">{label}</span>
        <span className="font-mono text-[10.5px] tabular-nums text-slate-600">
          {filled}/{total}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 font-mono text-[9.5px] text-slate-500">{hint ?? `${pct}%`}</p>
    </div>
  );
}
