import { Database, ShieldCheck, AlertTriangle, Info, EyeOff, Layers } from "lucide-react";
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
  const r = snapshot.readiness;
  const p = snapshot.priorityFields;
  const total = t.hotels;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Database size={14} className="text-slate-400" aria-hidden />
        <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
          {snapshot.city} enrichment · Phase D + readiness v2
        </h2>
        <span className="rounded px-1.5 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.22em] ring-1 bg-emerald-100 text-emerald-800 ring-emerald-200">
          readiness v2 · ACTIVE
        </span>
        <span
          title="Equal-weight T2 deprecated. Three readiness scores active: underwriting_ready (8 cap-rate inputs), library_ready (+ hero/amenities/review), premium_report_ready (+ brand or documented_independent + room_mix + MICE)."
          className="rounded px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.22em] ring-1 bg-slate-100 text-slate-600 ring-slate-200"
        >
          T2 v1 spec · LEGACY
        </span>
        {snapshot.lastEnrichedAt && (
          <span className="ml-auto font-mono text-[10.5px] text-slate-500">
            last enriched · {new Date(snapshot.lastEnrichedAt).toISOString().slice(0, 10)}
          </span>
        )}
      </div>

      {/* Scope */}
      <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-[11.5px] leading-snug text-slate-600">
        <EyeOff size={11} className="-mt-0.5 mr-1 inline text-slate-400" aria-hidden />
        Scope · core hotels only ·{" "}
        <span className="font-mono font-semibold text-slate-900">{snapshot.scope.core_n}</span> visible ·{" "}
        <span className="font-mono">{snapshot.scope.hidden_non_core_n}</span> hidden (hostels / apartments / flex / serviced — retained in DB)
        {snapshot.scope.hidden_names_sample.length > 0 && (
          <span className="block pl-4 text-[10.5px] text-slate-500">
            e.g. {snapshot.scope.hidden_names_sample.join(" · ")}
          </span>
        )}
      </div>

      {/* v2 READINESS — primary KPI block (above-the-fold) */}
      <div>
        <p className="mb-1.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
          Underwriting readiness · v2 active · {total} core hotels
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Underwriting ready · 8/8"
            value={r.underwriting_ready_n}
            tone={r.underwriting_ready_n > 0 ? "emerald" : "slate"}
            hint={`full · ${Math.round(r.underwriting_ready_rate * 100)}%`}
          />
          <Stat
            label="Underwriting partial · 6/8"
            value={r.underwriting_partial_n}
            tone={r.underwriting_partial_n > total * 0.4 ? "emerald" : "amber"}
            hint={`stub-report eligible · ${Math.round(r.underwriting_partial_rate * 100)}%`}
          />
          <Stat
            label="Library partial"
            value={r.library_partial_n}
            tone={r.library_partial_n > total * 0.3 ? "emerald" : "amber"}
            hint={`+ hero / amenities / review · ${Math.round(r.library_partial_rate * 100)}%`}
          />
          <Stat
            label="Premium report ready"
            value={r.premium_report_ready_n}
            tone={r.premium_report_ready_n > 0 ? "emerald" : "slate"}
            hint={`+ brand or documented indie + mix · ${Math.round(r.premium_report_ready_rate * 100)}%`}
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Core fields avg"
            value={Number(r.avg_core_fields_filled.toFixed(1))}
            tone={r.avg_core_fields_filled >= 6 ? "emerald" : r.avg_core_fields_filled >= 4 ? "amber" : "slate"}
            hint={`/ ${r.underwriting_fields_total} cap-rate inputs`}
          />
          <Stat
            label="Branded · partial"
            value={r.branded_underwriting_partial_n}
            tone="emerald"
            hint={`of ${snapshot.cohort.branded_n} branded`}
          />
          <Stat
            label="Indie · partial"
            value={r.indie_underwriting_partial_n}
            tone={r.indie_underwriting_partial_n > 0 ? "emerald" : "slate"}
            hint={`of ${snapshot.cohort.indie_n} indie · ops_type unknown blocker`}
          />
          <Stat
            label="Documented indies"
            value={snapshot.cohort.documented_indie_n}
            tone="slate"
            hint="operator-flagged premium indies"
          />
        </div>
      </div>

      {/* Transition banner with link to audit */}
      <div className="rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-[11.5px] leading-snug text-slate-700">
        <Info size={11} className="-mt-0.5 mr-1 inline text-slate-500" aria-hidden />
        Readiness v2 scores live from Supabase views{" "}
        <code className="font-mono">hotel_underwriting_ready_v</code> ·{" "}
        <code className="font-mono">hotel_library_ready_v</code> ·{" "}
        <code className="font-mono">hotel_premium_report_ready_v</code> per{" "}
        <a
          href="https://github.com/miguelsambricio-cyber/HotelVALORA/blob/feature/hotel-enrichment-pipeline/docs/hotel-intelligence/strategic-model-audit-v1.md"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-900"
        >
          strategic-model-audit-v1
        </a>
        . Full 8/8 underwriting_ready blocked by total_rooms + year_opened — both require D-8 hotel-website fallback (gated).
      </div>

      {/* Data-quality tier distribution */}
      <div>
        <p className="mb-1.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
          Data-quality tier (canonical row) · core scope
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Gold" value={t.gold} tone="emerald" hint={`${pct(t.gold)}%`} />
          <Stat label="Silver" value={t.silver} tone="slate" hint={`${pct(t.silver)}%`} />
          <Stat label="Bronze" value={t.bronze} tone="amber" hint={`${pct(t.bronze)}%`} />
          <Stat label="Quarantined" value={t.quarantined} tone={t.quarantined > 0 ? "rose" : "slate"} hint={`${pct(t.quarantined)}%`} />
        </div>
      </div>

      {/* Submarket distribution — institutional tier */}
      {snapshot.submarketDistribution.length > 0 && (
        <div>
          <p className="mb-1.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
            <Layers size={11} className="-mt-0.5 mr-1 inline text-slate-400" aria-hidden />
            Submarket distribution · institutional tier 1 / 2 / 3
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {snapshot.submarketDistribution.map((s) => {
              const tierTone =
                s.tier === 1 ? "bg-emerald-100 text-emerald-800" : s.tier === 2 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700";
              return (
                <div key={s.name} className="rounded-lg border border-slate-200 bg-white p-2 text-[11px]">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-headline font-bold text-slate-900">{s.name}</span>
                    <span className={`rounded px-1 py-0.5 font-mono text-[9.5px] tabular-nums ring-1 ring-slate-200 ${tierTone}`}>T{s.tier}</span>
                  </div>
                  <p className="mt-0.5 font-mono text-[10.5px] tabular-nums text-slate-600">{s.n} hotels</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cohort split */}
      <div>
        <p className="mb-1.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
          Cohort · branded vs independent
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Branded · with operator" value={snapshot.cohort.branded_with_operator} tone="emerald" hint={`100% of ${snapshot.cohort.branded_n} branded`} />
          <Stat label="Branded · without operator" value={snapshot.cohort.branded_n - snapshot.cohort.branded_with_operator} tone={snapshot.cohort.branded_n - snapshot.cohort.branded_with_operator > 0 ? "amber" : "slate"} hint="registry gap" />
          <Stat label="Indie · no parent operator" value={snapshot.cohort.indie_no_parent_operator} tone="slate" hint="by design" />
          <Stat label="Total core" value={total} tone="slate" hint={`${snapshot.cohort.branded_n} branded · ${snapshot.cohort.indie_n} indie`} />
        </div>
      </div>

      {/* Operator-priority data completeness · field bars */}
      <div>
        <p className="mb-1.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
          Data completeness · operator-priority fields · {total} core hotels
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FieldBar label="phone" filled={p.phone} total={total} />
          <FieldBar label="website_url" filled={p.website_url} total={total} />
          <FieldBar label="google_place_id" filled={p.google_place_id} total={total} />
          <FieldBar label="address_line1" filled={p.address_line1} total={total} />
          <FieldBar label="market_id" filled={p.market_id} total={total} />
          <FieldBar label="submarket_id" filled={p.submarket_id} total={total} />
          <FieldBar label="operator_id (branded)" filled={p.operator_id_branded} total={snapshot.cohort.branded_n} hint="branded-only denom" />
          <FieldBar label="wikidata_qid" filled={p.wikidata_qid} total={total} />
          <FieldBar label="total_rooms" filled={p.total_rooms} total={total} tone="blocker" />
          <FieldBar label="year_opened" filled={p.year_opened} total={total} tone="blocker" />
        </div>
      </div>

      {/* Provenance + Dedup */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <p className="mb-1.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
            <ShieldCheck size={11} className="-mt-px mr-1 inline text-slate-400" aria-hidden />
            Provenance by source · {snapshot.provenance.source_records} records · {snapshot.provenance.field_provenance_rows} field rows
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
            <li className="flex items-baseline justify-between gap-2"><span className="font-mono text-[11px] text-slate-700">pending_review</span><span className="font-mono text-[11px] tabular-nums text-slate-600">{snapshot.dedup.pending_review}</span></li>
            <li className="flex items-baseline justify-between gap-2"><span className="font-mono text-[11px] text-slate-700">auto_merge</span><span className="font-mono text-[11px] tabular-nums text-slate-600">{snapshot.dedup.auto_merge}</span></li>
            <li className="flex items-baseline justify-between gap-2"><span className="font-mono text-[11px] text-slate-700">sibling_listing</span><span className="font-mono text-[11px] tabular-nums text-slate-600">{snapshot.dedup.sibling_listing}</span></li>
            <li className="flex items-baseline justify-between gap-2"><span className="font-mono text-[11px] text-slate-700">dismissed</span><span className="font-mono text-[11px] tabular-nums text-slate-600">{snapshot.dedup.dismissed}</span></li>
          </ul>
        </div>
      </div>

      {/* Legacy T2 v1 — collapsed for traceability */}
      <details className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
        <summary className="cursor-pointer font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
          T2 v1 spec (deprecated · for traceability)
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="T2 v1 (deprecated)" value={t.t2_v1_passing_deprecated} tone="slate" hint="see audit · do not gate on this" />
          <Stat label="v1 passing rate (deprecated)" value={Math.round(t.institutional_passing_rate_deprecated * 100)} tone="slate" hint="% · do not interpret as goal" />
          <Stat label="T1 avg (kept)" value={Math.round(t.avg_t1_pct * 100)} tone="slate" hint="% · T1 floor not deprecated" />
        </div>
        <p className="mt-2 font-mono text-[10.5px] text-slate-500">
          T2 v1 averaged cosmetic + underwriting-critical fields with equal weight. Superseded by the readiness v2 scores above.
        </p>
      </details>

      {/* Structural blockers */}
      {snapshot.structuralBlockers.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <p className="mb-1.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-amber-900">
            Structural data gaps · root cause + path forward
          </p>
          <ul className="space-y-1.5">
            {snapshot.structuralBlockers.slice(0, 6).map((f) => (
              <li key={f.field} className="text-[11px] leading-snug text-amber-900">
                <span className="inline-block min-w-[200px] font-mono">{f.field}</span>
                <span className="font-mono tabular-nums">−{f.missing} hotels</span>
                <span className="block pl-[200px] font-mono text-[10.5px] text-amber-800/80">{f.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, tone = "slate", hint }: { label: string; value: number; tone?: "slate" | "emerald" | "amber" | "rose"; hint?: string }) {
  const cls = tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : tone === "rose" ? "text-rose-700" : "text-forest-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className={`mt-1 font-headline text-xl font-extrabold tabular-nums ${cls}`}>{value}</p>
      {hint && <p className="mt-0.5 font-mono text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function FieldBar({ label, filled, total, tone, hint }: { label: string; filled: number; total: number; tone?: "blocker"; hint?: string }) {
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
  const isBlocker = tone === "blocker";
  const barCls = isBlocker ? "bg-rose-500" : pct >= 90 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-slate-400";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10.5px] text-slate-700">{label}</span>
        <span className="font-mono text-[10.5px] tabular-nums text-slate-600">{filled}/{total}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 font-mono text-[9.5px] text-slate-500">{hint ?? `${pct}%`}</p>
    </div>
  );
}
