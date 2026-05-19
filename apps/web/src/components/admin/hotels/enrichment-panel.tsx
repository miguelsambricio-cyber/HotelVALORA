import { Database, ShieldCheck, AlertTriangle, Info, EyeOff } from "lucide-react";
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

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header + legacy-spec badge (slate · not amber) */}
      <div className="flex flex-wrap items-center gap-2">
        <Database size={14} className="text-slate-400" aria-hidden />
        <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
          {snapshot.city} enrichment · Phase D
        </h2>
        <span
          title="T2 v1 equal-weight spec is deprecated per strategic-model-audit-v1. v2 readiness (underwriting_ready / library_ready / premium_report_ready) pending operator decision."
          className="rounded px-1.5 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.22em] ring-1 bg-slate-100 text-slate-600 ring-slate-200"
        >
          T2 v1 spec · LEGACY · v2 readiness pending
        </span>
        {snapshot.lastEnrichedAt && (
          <span className="ml-auto font-mono text-[10.5px] text-slate-500">
            last enriched · {new Date(snapshot.lastEnrichedAt).toISOString().slice(0, 10)}
          </span>
        )}
      </div>

      {/* Transition / audit banner */}
      <div className="rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-[11.5px] leading-snug text-slate-700">
        <Info size={11} className="-mt-0.5 mr-1 inline text-slate-500" aria-hidden />
        T2 equal-weight metric under audit (2026-05-20). v2 readiness scores
        (<code className="font-mono">underwriting_ready</code> ·{" "}
        <code className="font-mono">library_ready</code> ·{" "}
        <code className="font-mono">premium_report_ready</code>) pending operator decision per{" "}
        <a
          href="https://github.com/miguelsambricio-cyber/HotelVALORA/blob/feature/hotel-enrichment-pipeline/docs/hotel-intelligence/strategic-model-audit-v1.md"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-900"
        >
          strategic-model-audit-v1
        </a>
        . Numbers below are factual; T2 v1 stats are kept for traceability but should not drive decisions.
      </div>

      {/* Scope indicator */}
      <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-[11.5px] leading-snug text-slate-600">
        <EyeOff size={11} className="-mt-0.5 mr-1 inline text-slate-400" aria-hidden />
        Scope · core hotels only ·{" "}
        <span className="font-mono font-semibold text-slate-900">{snapshot.scope.core_n}</span> visible ·{" "}
        <span className="font-mono">{snapshot.scope.hidden_non_core_n}</span> hidden (hostels / apartments / flex-living
        / serviced-apartments — retained in DB · re-included once v2 cohort split lands)
        {snapshot.scope.hidden_names_sample.length > 0 && (
          <span className="block pl-4 text-[10.5px] text-slate-500">
            e.g. {snapshot.scope.hidden_names_sample.join(" · ")}
          </span>
        )}
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

      {/* Cohort split — branded vs indie · operator_id by-design clarification */}
      <div>
        <p className="mb-1.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
          Cohort · branded vs independent
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Branded · with operator"
            value={snapshot.cohort.branded_with_operator}
            tone="emerald"
            hint={`100% of ${snapshot.cohort.branded_n} branded`}
          />
          <Stat
            label="Branded · without operator"
            value={snapshot.cohort.branded_n - snapshot.cohort.branded_with_operator}
            tone={snapshot.cohort.branded_n - snapshot.cohort.branded_with_operator > 0 ? "amber" : "slate"}
            hint="registry gap"
          />
          <Stat
            label="Indie · no parent operator"
            value={snapshot.cohort.indie_no_parent_operator}
            tone="slate"
            hint="by design"
          />
          <Stat
            label="Total core"
            value={total}
            tone="slate"
            hint={`${snapshot.cohort.branded_n} branded · ${snapshot.cohort.indie_n} indie`}
          />
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
          <FieldBar
            label="operator_id (branded denom)"
            filled={p.operator_id_branded}
            total={snapshot.cohort.branded_n}
            hint="branded-only · indies excluded by design"
          />
          <FieldBar label="wikidata_qid" filled={p.wikidata_qid} total={total} />
          <FieldBar label="total_rooms" filled={p.total_rooms} total={total} tone="blocker" />
          <FieldBar label="year_opened" filled={p.year_opened} total={total} tone="blocker" />
        </div>
      </div>

      {/* T1 + v2-oriented underwriting fields preview + provenance/audit */}
      <div>
        <p className="mb-1.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
          Underwriting coverage · core-fields fill + audit trail
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="T1 passing"
            value={t.t1_passing}
            tone={t.t1_passing > total * 0.7 ? "emerald" : "amber"}
            hint={`avg ${(t.avg_t1_pct * 100).toFixed(0)}%`}
          />
          <Stat
            label="Core underwriting fields"
            value={Number(t.avg_underwriting_fields_filled.toFixed(1))}
            tone={t.avg_underwriting_fields_filled >= 6 ? "emerald" : t.avg_underwriting_fields_filled >= 4 ? "amber" : "slate"}
            hint={`avg / ${t.underwriting_fields_total} · cap-rate inputs`}
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
      </div>

      {/* Legacy T2 v1 stats kept for traceability, clearly deprecated */}
      <details className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
        <summary className="cursor-pointer font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
          T2 v1 spec (deprecated · for traceability)
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat
            label="T2 v1 (deprecated)"
            value={t.t2_v1_passing_deprecated}
            tone="slate"
            hint="see audit · do not gate on this"
          />
          <Stat
            label="v1 passing rate (deprecated)"
            value={Math.round(t.institutional_passing_rate_deprecated * 100)}
            tone="slate"
            hint="% · do not interpret as goal"
          />
          <Stat
            label="T1 avg (kept)"
            value={Math.round(t.avg_t1_pct * 100)}
            tone="slate"
            hint="% · T1 floor not deprecated"
          />
        </div>
        <p className="mt-2 font-mono text-[10.5px] text-slate-500">
          T2 v1 averaged cosmetic + underwriting-critical fields with equal weight. Replaced by core-fields fill + cohort-split readiness scores in v2.
        </p>
      </details>

      {/* Provenance by source + Dedup queue */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <p className="mb-1.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
            <ShieldCheck size={11} className="-mt-px mr-1 inline text-slate-400" aria-hidden />
            Provenance by source · core scope
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
            Dedup queue · entire corpus
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

      {/* Structural blockers · root cause noted per field */}
      {snapshot.structuralBlockers.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <p className="mb-1.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-amber-900">
            Structural data gaps · root cause + path forward
          </p>
          <ul className="space-y-1.5">
            {snapshot.structuralBlockers.slice(0, 6).map((f) => (
              <li key={f.field} className="text-[11px] leading-snug text-amber-900">
                <span className="inline-block min-w-[180px] font-mono">{f.field}</span>
                <span className="font-mono tabular-nums">−{f.missing} hotels</span>
                <span className="block pl-[180px] font-mono text-[10.5px] text-amber-800/80">{f.note}</span>
              </li>
            ))}
          </ul>
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
