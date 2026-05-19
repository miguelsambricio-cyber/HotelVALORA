"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { SectionShell } from "../primitives/section-shell";
import { ReconciliationBadge } from "../primitives/reconciliation-badge";
import { EditableTile } from "../primitives/editable-tile";
import { KpiTile } from "../primitives/kpi-hero";
import { SortableGrid } from "../edit/sortable-grid";
import { EditableText } from "../edit/editable-text";
import { useEditModeStore } from "@/lib/underwriting/edit-mode/store";
import { cn } from "@/lib/utils";
import type {
  BreakdownLine,
  CapexPhase,
  DynamicCapRateResult,
  UnderwritingBundle,
} from "@/lib/underwriting/types";
import type { UnderwritingInputOverrides } from "@/lib/underwriting/defaults";
import { SCENARIO_CATALOG } from "@/lib/underwriting/defaults";

/**
 * Section 06 · Investment · CAPEX · D&A.
 *
 * Hosts the CORE IP of HotelVALORA · institutional memorandum view of
 * the Dynamic Cap Rate engine, Site Acquisition, CAPEX breakdown, Total
 * Investment, Stabilised Yield progression and D&A schedule.
 *
 * Corporate light theme · all editable surfaces use the blue (#005db7)
 * EditableTile contract; computed highlights use the forest accent
 * (matching Executive Summary's "Total Investment" hero).
 */
export function InvestmentSection({
  bundle,
  onOverrideChange,
}: {
  bundle: UnderwritingBundle;
  onOverrideChange: (patch: UnderwritingInputOverrides) => void;
}) {
  const { cap_rate, investment, periods } = bundle.computed;
  const asset = bundle.inputs.asset;
  const depreciation = bundle.inputs.depreciation;
  const stabilised = investment.stabilized_yield_progression;
  const stabilisedY1ToY5 = stabilised.slice(1, 6);

  return (
    <SectionShell
      number={6}
      anchorId="investment"
      title="Investment · CAPEX · D&A"
      subtitle="Acquisition rationale · pricing justification · institutional underwriting narrative"
      status={{ label: "Memorandum view · 4 logical groups", tone: "info" }}
      summary={
        <div className="space-y-7 print:space-y-5">
          <HeadlineStack
            asset={asset}
            siteAcquisition={investment.site_acquisition_total}
            capexTotal={investment.capex_total}
            totalInvestment={investment.total_building_cost}
            buildingYears={depreciation.building_years}
            mepYears={depreciation.mep_years}
            onOverride={onOverrideChange}
          />
          <div className="flex flex-wrap gap-2">
            <ReconciliationBadge status="info" label="Cap Rate engine · placeholder rationale" detail="Block 6 wires MarketEvidence" />
            <ReconciliationBadge status="info" label="CAPEX phasing · single phase MVP" detail="Block 3 phases drawdowns" />
          </div>

          {/* 1 · Cap Rate Engine ──────────────────────────────────── */}
          <GroupHeader number="1" title="Cap Rate Engine" subtitle="Institutional valuation intelligence" />
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-4">
              <AcquisitionSummary
                askingPrice={investment.asking_price}
                hotelValue={investment.hotel_value}
                rooms={asset.rooms}
                totalSqm={asset.total_sqm}
              />
              <DynamicCapRateEntryCard
                capRateEntry={cap_rate.entry.used_pct}
                source={cap_rate.entry.source}
                dynamic={cap_rate.entry.dynamic}
                asset={asset}
                scenarioId={bundle.inputs.scenario_id}
                onOverride={onOverrideChange}
              />
            </div>
            <MarketContextCard dynamic={cap_rate.entry.dynamic} />
          </div>

          {/* 2 · Acquisition Cost ───────────────────────────────── */}
          <GroupHeader number="2" title="Acquisition Cost" subtitle="Notary · ITP / AJD · acquisition fees · key money · itemised" />
          <AcquisitionCostsItemized
            lines={investment.acquisition}
            acqCostsTotal={investment.acquisition_fees_taxes}
            onOverride={onOverrideChange}
          />

          {/* 3 · CAPEX ────────────────────────────────────────────── */}
          <GroupHeader number="3" title="CAPEX" subtitle="Hard cost · soft cost · project cost · institutional breakdown" />
          <CapexCategoryTable
            title="Hard Cost"
            lines={investment.capex_hard_cost}
            groupTotal={sumLines(investment.capex_hard_cost)}
            onOverride={onOverrideChange}
          />
          <CapexCategoryTable
            title="Soft Cost"
            lines={investment.capex_soft_cost}
            groupTotal={sumLines(investment.capex_soft_cost)}
            onOverride={onOverrideChange}
          />
          <CapexCategoryTable
            title="Project Cost"
            lines={investment.capex_project}
            groupTotal={sumLines(investment.capex_project)}
            onOverride={onOverrideChange}
          />
          <CapexPhasesBanner phases={investment.capex_phases} />

          {/* 4 · Investment ──────────────────────────────────────── */}
          <GroupHeader number="4" title="Investment" subtitle="Total stack · stabilised yield progression" />
          <TotalInvestmentHero
            siteAcquisition={investment.site_acquisition_total}
            capexTotal={investment.capex_total}
            contingencyInsurance={investment.contingency_insurance}
            acquisitionFeesTaxes={investment.acquisition_fees_taxes}
            totalInvestment={investment.total_building_cost}
            rooms={asset.rooms}
            totalSqm={asset.total_sqm}
          />
          <StabilisedYieldProgression series={stabilisedY1ToY5} fullSeries={stabilised} />

          {/* 5 · D&A ─────────────────────────────────────────────── */}
          <GroupHeader number="5" title="Depreciation & Amortization" subtitle="Building · MEP · straight-line per useful life" />
          <DASchedule bundle={bundle} />
        </div>
      }
    />
  );
}

// ─── Group header · subtle eyebrow + divider · NOT a box ──────────────

function GroupHeader({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  const baseId = `sec06.group-${number}`;
  return (
    <div className="flex items-baseline gap-3 border-t border-slate-200 pt-4">
      <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.32em] text-[#005db7]">
        {number}
      </span>
      <EditableText
        as="h3"
        textId={`${baseId}.title`}
        defaultText={title}
        className="font-headline text-[15px] font-extrabold text-slate-900"
      />
      {subtitle && (
        <EditableText
          as="span"
          textId={`${baseId}.subtitle`}
          defaultText={subtitle}
          className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500 sm:inline"
        />
      )}
    </div>
  );
}

// ─── Internal primitives ─────────────────────────────────────────────

function HeadlineStack({
  asset,
  siteAcquisition,
  capexTotal,
  totalInvestment,
  buildingYears,
  mepYears,
  onOverride,
}: {
  asset: UnderwritingBundle["inputs"]["asset"];
  siteAcquisition: number;
  capexTotal: number;
  totalInvestment: number;
  buildingYears: number;
  mepYears: number;
  onOverride: (patch: UnderwritingInputOverrides) => void;
}) {
  return (
    <SortableGrid
      gridId="investment.headline"
      className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4"
      items={[
        { id: "site-acquisition", content: (
          <EditableTile
            label="Site Acquisition"
            value={siteAcquisition}
            format="currency"
            min={0}
            onCommit={(site_acquisition_eur) => onOverride({ site_acquisition_eur })}
            sub={`${pct(siteAcquisition, totalInvestment)} of total`}
          />
        ) },
        { id: "capex", content: (
          <EditableTile
            label="CAPEX"
            value={capexTotal}
            format="currency"
            min={0}
            onCommit={(capex_total_eur) => onOverride({ capex_total_eur })}
            sub={`${pct(capexTotal, totalInvestment)} of total`}
          />
        ) },
        { id: "building-years", content: (
          <EditableTile
            label="Building"
            value={buildingYears}
            format="years"
            min={1}
            max={100}
            onCommit={(building_years) => onOverride({ building_years })}
            sub="useful life · straight-line"
          />
        ) },
        { id: "mep-years", content: (
          <EditableTile
            label="Installations (MEP)"
            value={mepYears}
            format="years"
            min={1}
            max={50}
            onCommit={(mep_years) => onOverride({ mep_years })}
            sub="useful life · straight-line"
          />
        ) },
        { id: "per-key", content: (
          <KpiTile label="€ / key" value={fmtEUR(div(totalInvestment, asset.rooms))} sub={`${asset.rooms} keys`} />
        ) },
        { id: "per-sqm", content: (
          <KpiTile label="€ / m²" value={fmtEUR(div(totalInvestment, asset.total_sqm))} sub={`${fmtInt(asset.total_sqm)} m²`} />
        ) },
      ]}
    />
  );
}

// ─── Block A · Cap Rate Engine ───────────────────────────────────────
//
// 2026-05-19 refactor · institutional valuation intelligence direction.
// The previous "analyst worksheet" look (visible numeric deltas per
// adjustment) is replaced with a premium "explainable but protected"
// surface:
//
//   LEFT column
//     · AcquisitionSummary — pricing rows only · Asking + Hotel Value
//     · DynamicCapRateEntryCard — core institutional component · big
//       cap rate · always-visible signal chips · expandable methodology
//       disclosure (conceptual factors, no numeric deltas exposed)
//
//   RIGHT column
//     · MarketEvidencePanel — confidence header with decomposition,
//       market evidence stats, comparables overview, drill-down slot
//
// The HotelVALORA cap-rate methodology is treated as proprietary IP.
// Numeric adjustments are computed in the engine and consumed by the UI,
// but they are NOT exposed in the default committee view. Operators who
// need the full audit trail open the methodology disclosure.

function AcquisitionSummary({
  askingPrice,
  hotelValue,
  rooms,
  totalSqm,
}: {
  askingPrice: number;
  hotelValue: number;
  rooms: number;
  totalSqm: number;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <EditableText
        as="p"
        textId="sec06.pricing.eyebrow"
        defaultText="Pricing"
        className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-700"
      />
      <dl className="mt-3 space-y-3">
        <PriceRow
          label="Asking Price"
          value={fmtEUR(askingPrice)}
          sub={`${fmtEUR(div(askingPrice, rooms))} / key · ${fmtEUR(div(askingPrice, totalSqm))} / m²`}
        />
        <PriceRow
          label="Hotel Value (appraised)"
          value={fmtEUR(hotelValue)}
          sub={`${fmtEUR(div(hotelValue, rooms))} / key · ${fmtEUR(div(hotelValue, totalSqm))} / m²`}
          muted
        />
      </dl>
    </div>
  );
}

function PriceRow({ label, value, sub, muted = false }: { label: string; value: string; sub: string; muted?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between">
        <span className={`font-headline text-[10.5px] uppercase tracking-[0.16em] ${muted ? "text-slate-500" : "text-slate-700"}`}>
          {label}
        </span>
        <span className={`font-mono text-[14px] font-bold tabular-nums ${muted ? "text-slate-500" : "text-slate-900"}`}>
          {value}
        </span>
      </div>
      <span className="font-mono text-[9.5px] text-slate-500">{sub}</span>
    </div>
  );
}

// ─── DynamicCapRateEntryCard · institutional valuation surface ───────

/**
 * The headline cap rate component. Renders the recommended entry yield
 * + a single institutional context sentence (market · category · size ·
 * state · scenario) + an expandable methodology disclosure that
 * describes which HotelVALORA institutional adjustments are ACTIVE in
 * the current valuation — without exposing numeric deltas.
 *
 * Architectural separation:
 *   · Policy layer (admin/financials) — defines the cap rate methodology,
 *     adjustment registry, market yield assumptions, scenario overlays.
 *   · Consumption layer (underwriting, this card) — applies the policy
 *     elegantly. Reports the result. Does NOT expose the spread matrix.
 *
 * The card is positioned as institutional valuation intelligence, not as
 * an analyst worksheet. The IP stays protected; the operator sees the
 * factors that drove the recommendation, not the coefficients applied.
 *
 * Future-proof slots:
 *   · AI commentary on the recommendation
 *   · per-comparable drill-down trigger
 *   · cap rate sensitivity scenarios
 *   · override audit trail (operator-confirmation history)
 */
function DynamicCapRateEntryCard({
  capRateEntry,
  source,
  dynamic,
  asset,
  scenarioId,
  onOverride,
}: {
  capRateEntry: number;
  source: "dynamic" | "override";
  dynamic: DynamicCapRateResult;
  asset: UnderwritingBundle["inputs"]["asset"];
  scenarioId: string;
  onOverride: (patch: UnderwritingInputOverrides) => void;
}) {
  const [open, setOpen] = useState(false);

  const scenarioEntry = SCENARIO_CATALOG.find((s) => s.id === scenarioId);
  const scenarioLabel = scenarioEntry?.label ?? scenarioId;
  const contextLine = buildContextSentence(asset, scenarioLabel);
  const activeFactors = buildActiveFactors(asset, scenarioId, dynamic);

  return (
    <div className="rounded-md border-2 border-forest-900/30 bg-forest-50 p-5">
      <EditableText
        as="p"
        textId="sec06.dynamic-cap-rate.eyebrow"
        defaultText="Dynamic Cap Rate · Entry"
        className="font-headline text-[10px] font-bold uppercase tracking-[0.28em] text-[#005db7]"
      />
      <CapRateInlineEdit
        value={capRateEntry}
        onCommit={(v) => onOverride({ cap_rate_entry_pct: v })}
      />
      <p className="mt-2 font-mono text-[11px] text-slate-600">
        {source === "dynamic"
          ? "Calculated using HotelVALORA valuation methodology"
          : "Operator override · methodology suspended"}
      </p>

      <p className="mt-3 border-t border-forest-900/15 pt-3 font-mono text-[11.5px] leading-relaxed text-slate-800">
        {contextLine}
      </p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 inline-flex items-center gap-1.5 font-headline text-[10.5px] font-bold uppercase tracking-[0.22em] text-[#005db7] transition-colors hover:text-forest-900"
      >
        {open ? <ChevronUp size={12} strokeWidth={2.5} /> : <ChevronDown size={12} strokeWidth={2.5} />}
        {open ? "Hide methodology" : "View methodology"}
      </button>

      {open && <MethodologyDisclosure activeFactors={activeFactors} />}
    </div>
  );
}

/**
 * CapRateInlineEdit · large inline-editable percentage input that
 * preserves the institutional memo aesthetic. Big mono number that
 * doubles as an editable input — click / tap to override, blur or
 * Enter to commit. Operator override route into the engine via
 * `cap_rate_entry_pct`.
 */
function CapRateInlineEdit({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (next: number) => void;
}) {
  const [draft, setDraft] = useState(formatCapRate(value));
  const [editing, setEditing] = useState(false);

  // Keep draft synced when engine recomputes the cap rate from upstream changes.
  useEffect(() => {
    if (!editing) setDraft(formatCapRate(value));
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const parsed = parseCapRate(draft);
    if (parsed === null || parsed === value || parsed <= 0 || parsed > 30) {
      setDraft(formatCapRate(value));
      return;
    }
    onCommit(parsed);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      onFocus={() => setEditing(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(formatCapRate(value));
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="mt-2 w-full rounded-sm border border-transparent bg-transparent px-0 py-0 font-mono text-[36px] font-extrabold tabular-nums leading-none text-forest-900 sm:text-[40px] focus:border-[#005db7]/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#005db7]/40"
      aria-label="Dynamic Cap Rate · Entry · operator override"
    />
  );
}

function formatCapRate(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2).replace(".", ",")}%`;
}

function parseCapRate(raw: string): number | null {
  const stripped = raw.replace(/%/g, "").replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(stripped);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

/**
 * One-sentence institutional context line · "Calculated for Madrid Centro
 * · 4★ Upscale · 256 keys · Renovated · Mercado scenario."
 */
function buildContextSentence(
  asset: UnderwritingBundle["inputs"]["asset"],
  scenarioLabel: string,
): string {
  const parts: string[] = [];
  const market = asset.submarket ?? asset.market;
  if (market) parts.push(market);
  parts.push(categoryLabel(asset.category));
  parts.push(`${asset.rooms} keys`);
  if (asset.state) parts.push(stateLabel(asset.state));
  parts.push(`${scenarioLabel} scenario`);
  return `Applied to ${parts.join(" · ")}.`;
}

function categoryLabel(c: "3star" | "4star" | "5star"): string {
  return c === "5star" ? "5★ Luxury" : c === "4star" ? "4★ Upscale" : "3★ Midscale";
}

function stateLabel(s: string): string {
  if (s === "renovated") return "Renovated";
  if (s === "new") return "Newly built";
  if (s === "needs_work") return "Value-add";
  return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

/**
 * Contextual narrative · only describes the institutional adjustments
 * that are ACTIVE in the current valuation (not a generic enumeration of
 * the 8 possible factors). Returns one line per active factor; the
 * sentence is institutional, conceptual, and number-free.
 */
function buildActiveFactors(
  asset: UnderwritingBundle["inputs"]["asset"],
  scenarioId: string,
  dynamic: DynamicCapRateResult,
): string[] {
  const items: string[] = [];

  items.push(
    `Base market yield sourced from ${dynamic.evidence.comp_count} recent comparable transactions in ${asset.submarket ?? asset.market ?? "this market"}.`,
  );

  if (asset.category === "5star") {
    items.push("5-star luxury positioning premium applied against the market median.");
  } else if (asset.category === "3star") {
    items.push("Midscale positioning adjustment applied.");
  }
  // 4-star = market median → no specific line

  if (asset.rooms >= 200) {
    items.push("Institutional scale premium applied for 200+ keys.");
  } else if (asset.rooms < 80) {
    items.push("Sub-scale liquidity discount applied for boutique format.");
  }

  if (asset.state === "renovated") {
    items.push("Renovated-asset discount adjustment applied · lower execution risk.");
  } else if (asset.state === "new") {
    items.push("Newly built asset · institutional yield premium applied.");
  } else if (asset.state === "needs_work") {
    items.push("Value-add repositioning risk premium applied.");
  }

  if (scenarioId === "downside") {
    items.push("Conservative market overlay active · downside stress applied.");
  } else if (scenarioId === "upside") {
    items.push("Optimistic market overlay active · upside compression applied.");
  }

  items.push("Macro regime calibrated to current Euribor environment.");

  return items;
}

/**
 * MethodologyDisclosure · contextual narrative of institutional
 * adjustments active in the current valuation. The HotelVALORA cap-rate
 * policy lives in admin/financials; this disclosure consumes the policy
 * and reports which factors are moving the recommendation — without
 * exposing the basis-point coefficients.
 */
function MethodologyDisclosure({ activeFactors }: { activeFactors: string[] }) {
  return (
    <div className="mt-4 rounded-md border border-forest-900/15 bg-white p-4 print:break-inside-avoid">
      <EditableText
        as="p"
        textId="sec06.methodology.intro"
        defaultText="HotelVALORA applies its institutional cap-rate methodology to derive the recommended entry yield. The adjustments that shape this asset's pricing are:"
        className="font-mono text-[10.5px] leading-relaxed text-slate-700"
        multiline
      />
      <ul className="mt-3 space-y-2">
        {activeFactors.map((line, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 border-b border-slate-100 pb-2 last:border-b-0"
          >
            <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-forest-900/60" />
            <span className="font-mono text-[10.5px] leading-relaxed text-slate-700">{line}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-slate-200 pt-3 font-mono text-[10px] text-slate-500">
        Methodology source ·{" "}
        <a
          href="/user/admin/financials"
          className="font-bold text-[#005db7] hover:underline"
        >
          admin · Dynamic Cap Rate policy
        </a>
      </p>
    </div>
  );
}

// ─── MarketContextCard · right column · institutional summary ────────

/**
 * Single right-column card that surfaces the institutional supporting
 * context: confidence at-a-glance, evidence summary in one line, future
 * comparable drill-down slot.
 *
 * Removed (now lives in admin/financials):
 *   · 4-factor confidence decomposition (sufficiency / volatility /
 *     staleness / coverage). That belongs to the policy layer · the
 *     underwriting memo only shows the composite score.
 *   · Per-comp evidence row breakdown. The memo shows the comp count
 *     + median + IQR · drill-down is a future capability.
 */
function MarketContextCard({ dynamic }: { dynamic: DynamicCapRateResult }) {
  const score = dynamic.confidence.score_0_100;
  const tone = score >= 70 ? "ok" : score >= 50 ? "warn" : "danger";
  const toneText =
    tone === "ok" ? "text-emerald-700"
    : tone === "warn" ? "text-amber-700"
    : "text-rose-700";

  const e = dynamic.evidence;
  const r = dynamic.rationale;
  const excluded = r.evidence_excluded;
  const fmtMmYy = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—";

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <EditableText
        as="p"
        textId="sec06.market-context.eyebrow"
        defaultText="Market Context"
        className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-700"
      />

      {/* Confidence at-a-glance · single composite score, no decomposition */}
      <div className="mt-3 flex items-baseline justify-between border-b border-slate-100 pb-3">
        <div>
          <EditableText
            as="p"
            textId="sec06.market-context.confidence-label"
            defaultText="Confidence"
            className="font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-500"
          />
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {dynamic.confidence.band.replace("_", " ")}
          </p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={cn("font-mono text-[26px] font-extrabold tabular-nums leading-none", toneText)}>
            {score.toFixed(0)}
          </span>
          <span className="font-mono text-[11px] font-bold text-slate-500">/ 100</span>
        </div>
      </div>

      {/* Evidence one-liner · institutional summary */}
      <div className="mt-3">
        <EditableText
          as="p"
          textId="sec06.market-context.evidence-label"
          defaultText="Evidence (in-scope · 36m)"
          className="font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-500"
        />
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-slate-700">
          Based on <span className="font-bold text-slate-900">{e.comp_count} comparable transactions</span> · median{" "}
          <span className="font-bold text-slate-900">
            {e.median_cap_pct.toFixed(2).replace(".", ",")}%
          </span>{" "}
          · IQR {e.p25_cap_pct.toFixed(2).replace(".", ",")}% – {e.p75_cap_pct.toFixed(2).replace(".", ",")}%.
        </p>
        <p className="mt-1 font-mono text-[10px] text-slate-500">
          Window {fmtMmYy(e.oldest_in_scope_date)} → {fmtMmYy(e.most_recent_date)}.
        </p>
      </div>

      {/* Liquidity windows · institutional market depth across horizons */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <EditableText
          as="p"
          textId="sec06.market-context.depth-label"
          defaultText="Market depth · transactions / volume"
          className="font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-500"
        />
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[10.5px]">
          <LiquidityRow label="12 months" deals={e.liquidity_metrics.transactions_last_12m} volumeEur={e.liquidity_metrics.total_volume_last_12m_eur} />
          <LiquidityRow label="24 months" deals={e.liquidity_metrics.transactions_last_24m} volumeEur={e.liquidity_metrics.total_volume_last_24m_eur} />
          <LiquidityRow label="5 years" deals={e.liquidity_metrics.transactions_last_60m} volumeEur={e.liquidity_metrics.total_volume_last_60m_eur} />
          <LiquidityRow label="10 years" deals={e.liquidity_metrics.transactions_last_120m} volumeEur={e.liquidity_metrics.total_volume_last_120m_eur} />
        </ul>
      </div>

      {dynamic.rationale.evidence_excluded.count > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <EditableText
            as="p"
            textId="sec06.market-context.excluded-label"
            defaultText="Excluded · market pool review"
            className="font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-500"
          />
          <ExcludedBreakdown excluded={dynamic.evidence.comparables_excluded} />
        </div>
      )}

      {/* Future · per-comparable drill-down trigger lives here */}
      <p className="mt-4 border-t border-slate-100 pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
        Comparable drill-down · coming soon
      </p>
    </div>
  );
}

function fmtVolume(v: number): string {
  if (!Number.isFinite(v) || v === 0) return "—";
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1).replace(".", ",")}B €`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M €`;
  return `${(v / 1_000).toFixed(0)}k €`;
}

/**
 * ExcludedBreakdown · groups excluded comparables by reason category and
 * shows the market pool the engine considered before scope narrowing. The
 * operator sees how many comps were dropped at each stage of the filter
 * (staleness · category · size · scope) — institutional traceability that
 * the headline `X excluded` number alone doesn't deliver.
 */
function ExcludedBreakdown({ excluded }: { excluded: { reason: string }[] }) {
  // Classify each reason into a high-level bucket.
  const buckets = new Map<string, number>();
  for (const x of excluded) {
    const bucket = classifyExclusionReason(x.reason);
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  const entries = Array.from(buckets.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <ul className="mt-2 space-y-1">
      {entries.map(([bucket, n]) => (
        <li
          key={bucket}
          className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1 last:border-b-0"
        >
          <span className="font-mono text-[10px] leading-relaxed text-slate-700">
            {bucket}
          </span>
          <span className="font-mono text-[10.5px] font-bold tabular-nums text-slate-900">
            {n}
          </span>
        </li>
      ))}
    </ul>
  );
}

function classifyExclusionReason(reason: string): string {
  if (reason.startsWith("stale")) return "Stale · > 36 months";
  if (reason.startsWith("category gap")) return "Category gap";
  if (reason.startsWith("size gap")) return "Size gap";
  if (reason.startsWith("outside scope · submarket")) return "Outside submarket · within market";
  if (reason.startsWith("outside scope · market")) return "Outside market · within country";
  if (reason.startsWith("outside scope")) return "Outside scope";
  return "Other";
}

function LiquidityRow({
  label,
  deals,
  volumeEur,
}: {
  label: string;
  deals: number;
  volumeEur: number;
}) {
  return (
    <li className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-1 last:border-b-0">
      <span className="font-headline text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <span className="font-mono text-[10.5px] tabular-nums text-slate-700">
        <span className="font-bold text-slate-900">{deals}</span>
        <span className="text-slate-400"> · </span>
        <span>{fmtVolume(volumeEur)}</span>
      </span>
    </li>
  );
}

function AcquisitionCostsItemized({
  lines,
  acqCostsTotal,
  onOverride,
}: {
  lines: BreakdownLine[];
  acqCostsTotal: number;
  onOverride: (patch: UnderwritingInputOverrides) => void;
}) {
  const [tableOpen, setTableOpen] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <CategoryHeading
          title="Acquisition Cost"
          tableOpen={tableOpen}
          onToggleTable={() => setTableOpen((v) => !v)}
          assumptionsOpen={assumptionsOpen}
          onToggleAssumptions={() => setAssumptionsOpen((v) => !v)}
        />
        <span className="font-mono text-[11px] font-bold text-slate-900">{fmtEUR(acqCostsTotal)}</span>
      </div>
      {tableOpen && (
        <ItemTable
          lines={lines}
          groupTotal={acqCostsTotal}
          columns={["assumption", "unit", "total", "pct", "perKey", "perSqm"]}
          showAssumptions={assumptionsOpen}
          onAssumptionChange={(lineId, value) => {
            const patch = mapAcquisitionLineToOverride(lineId, value);
            if (patch) onOverride(patch);
          }}
        />
      )}
    </div>
  );
}

function mapAcquisitionLineToOverride(lineId: string, value: number): UnderwritingInputOverrides | null {
  switch (lineId) {
    case "notary_registry": return { acq_notary_registry_pct: value };
    case "ajd": return { acq_ajd_pct: value };
    case "itp": return { acq_itp_pct: value };
    case "acquisition_fee": return { acq_acquisition_fee_pct: value };
    case "key_money": return { acq_key_money_total: value };
    default: return null;
  }
}

// ─── Block B · CAPEX ─────────────────────────────────────────────────

function CapexCategoryTable({
  title,
  lines,
  groupTotal,
  onOverride,
}: {
  title: string;
  lines: BreakdownLine[];
  groupTotal: number;
  onOverride: (patch: UnderwritingInputOverrides) => void;
}) {
  const [tableOpen, setTableOpen] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <CategoryHeading
          title={title}
          tableOpen={tableOpen}
          onToggleTable={() => setTableOpen((v) => !v)}
          assumptionsOpen={assumptionsOpen}
          onToggleAssumptions={() => setAssumptionsOpen((v) => !v)}
        />
        <span className="font-mono text-[11px] font-bold text-slate-900">{fmtEUR(groupTotal)}</span>
      </div>
      {tableOpen && (
        <ItemTable
          lines={lines}
          groupTotal={groupTotal}
          columns={["assumption", "unit", "total", "pct", "perKey", "perSqm"]}
          showAssumptions={assumptionsOpen}
          onAssumptionChange={(lineId, value) => {
            const patch = mapCapexLineToOverride(lineId, value);
            if (patch) onOverride(patch);
          }}
        />
      )}
    </div>
  );
}

/**
 * CategoryHeading · subtitle eyebrow with a Premium-only +/- toggle that
 * reveals the editable Assumptions block (Assump. + Unit columns).
 *
 * The toggle is print:hidden — institutional PDF memos never expose the
 * edit chrome. The Assumptions columns themselves carry print:hidden too,
 * so closing the section before printing is not required.
 */
function CategoryHeading({
  title,
  tableOpen,
  onToggleTable,
  assumptionsOpen,
  onToggleAssumptions,
}: {
  title: string;
  tableOpen: boolean;
  onToggleTable: () => void;
  assumptionsOpen: boolean;
  onToggleAssumptions: () => void;
}) {
  const editMode = useEditModeStore((s) => s.editMode);
  const PlusOrMinus = assumptionsOpen ? Minus : Plus;
  const ChevronIcon = tableOpen ? ChevronUp : ChevronDown;
  const textId = `sec06.category-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={editMode ? undefined : onToggleTable}
        disabled={editMode}
        aria-expanded={tableOpen}
        aria-label={tableOpen ? `Collapse ${title}` : `Expand ${title}`}
        className="inline-flex items-baseline gap-1.5 transition-colors disabled:cursor-text"
      >
        <EditableText
          as="span"
          textId={textId}
          defaultText={title}
          className={cn(
            "font-headline text-[10.5px] font-extrabold uppercase tracking-[0.24em] transition-colors",
            tableOpen ? "text-[#005db7]" : "text-slate-800",
            !editMode && !tableOpen && "hover:text-[#005db7]",
          )}
        />
        {!editMode && (
          <ChevronIcon
            size={11}
            strokeWidth={2.5}
            className={tableOpen ? "text-[#005db7]" : "text-slate-500"}
          />
        )}
      </button>
      {tableOpen && (
        <button
          type="button"
          onClick={onToggleAssumptions}
          aria-expanded={assumptionsOpen}
          aria-label={assumptionsOpen ? `Hide ${title} assumptions` : `Show ${title} assumptions`}
          title={assumptionsOpen ? "Hide assumptions" : "Edit assumptions (Premium)"}
          className={cn(
            "inline-flex h-4 w-4 items-center justify-center rounded-sm border transition-colors print:hidden",
            assumptionsOpen
              ? "border-[#005db7] bg-[#005db7] text-white"
              : "border-slate-300 bg-white text-slate-500 hover:border-[#005db7] hover:text-[#005db7]",
          )}
        >
          <PlusOrMinus size={10} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

function mapCapexLineToOverride(lineId: string, value: number): UnderwritingInputOverrides | null {
  switch (lineId) {
    case "structure": return { capex_structure_pct: value };
    case "asset_content": return { capex_asset_content_pct: value };
    case "mep": return { capex_mep_per_room: value };
    case "exterior": return { capex_exterior_pct: value };
    case "licensing": return { capex_licensing_pct: value };
    case "technical_consultant": return { capex_technical_consultant_pct: value };
    case "development_fee": return { capex_development_fee_pct: value };
    case "preopening": return { capex_preopening_total: value };
    case "ffe": return { capex_ffe_per_room: value };
    case "ose": return { capex_ose_per_room: value };
    case "contingency": return { capex_contingency_pct: value };
    case "insurance_dev": return { capex_insurance_pct: value };
    default: return null;
  }
}

function CapexPhasesBanner({ phases }: { phases: CapexPhase[] }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
      <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.24em] text-slate-700">
        CAPEX phases ({phases.length} · expandable)
      </p>
      <ul className="mt-2 space-y-1">
        {phases.map((p) => (
          <li key={p.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px]">
            <span className="font-headline text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-900">
              {p.label}
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              · {p.kind.replaceAll("_", " ")} · funded by {p.funded_by.replaceAll("_", " ")}
            </span>
            <span className="ml-auto font-mono text-[11px] font-bold tabular-nums text-slate-900">
              {fmtEUR(p.total_eur)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 font-mono text-[9.5px] text-slate-500">
        Structure ready for refurbishment waves · operator contribution · tenant improvements · ESG retrofit · expansion CAPEX.
      </p>
    </div>
  );
}

// ─── Block C · Total Investment ──────────────────────────────────────

function TotalInvestmentHero({
  siteAcquisition,
  capexTotal,
  contingencyInsurance,
  acquisitionFeesTaxes,
  totalInvestment,
  rooms,
  totalSqm,
}: {
  siteAcquisition: number;
  capexTotal: number;
  contingencyInsurance: number;
  acquisitionFeesTaxes: number;
  totalInvestment: number;
  rooms: number;
  totalSqm: number;
}) {
  const composition = [
    { label: "Site Acquisition", value: siteAcquisition },
    { label: "CAPEX", value: capexTotal - contingencyInsurance },
    { label: "Contingency + Insurance", value: contingencyInsurance },
    { label: "Acquisition Fees + Taxes", value: acquisitionFeesTaxes },
  ];
  return (
    <div className="rounded-md border-2 border-forest-900/30 bg-forest-50 p-5">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.28em] text-[#005db7]">
            Initial Investment
          </p>
          <p className="mt-1 font-headline text-[12px] font-bold uppercase tracking-[0.2em] text-forest-900">
            Total Investment
          </p>
          <p className="mt-1 font-mono text-[28px] font-extrabold tabular-nums leading-tight text-forest-900 sm:text-[34px]">
            {fmtEUR(totalInvestment)}
          </p>
          <p className="mt-1 font-mono text-[11.5px] text-slate-700">
            {fmtEUR(div(totalInvestment, rooms))} / key · {fmtEUR(div(totalInvestment, totalSqm))} / m²
          </p>
        </div>
        <ul className="space-y-1.5">
          {composition.map((c) => (
            <li key={c.label} className="flex items-baseline justify-between border-b border-forest-900/15 pb-1 last:border-b-0">
              <span className="font-headline text-[10px] uppercase tracking-[0.18em] text-slate-700">
                {c.label}
              </span>
              <span className="font-mono text-[12.5px] font-bold tabular-nums text-slate-900">
                {fmtEUR(c.value)} <span className="ml-1.5 text-slate-500">{pct(c.value, totalInvestment)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StabilisedYieldProgression({ series, fullSeries }: { series: number[]; fullSeries: number[] }) {
  const max = Math.max(...fullSeries, 0.001);
  const stabilised = fullSeries[fullSeries.length - 1] ?? 0;
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-700">
          Stabilised yield progression
        </p>
        <span className="font-mono text-[10px] text-slate-500">
          NOI ÷ Total Investment · Block 3 wires to live PnL
        </span>
      </div>
      <div className="grid grid-cols-5 gap-3 print:gap-2">
        {series.map((v, i) => {
          const yr = i + 1;
          const heightPct = max > 0 ? Math.max(8, (v / max) * 100) : 8;
          return (
            <div key={yr} className="flex flex-col items-center gap-1.5">
              <div className="relative flex h-20 w-full items-end justify-center print:h-12">
                <div
                  className="w-full rounded-t-sm bg-gradient-to-t from-forest-900/20 to-forest-900/60"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="font-mono text-[12px] font-extrabold tabular-nums text-forest-900">
                {fmtPct(v)}
              </span>
              <span className="font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Year {yr}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-[10.5px] text-slate-600">
        Stabilised at <span className="font-bold text-slate-900">{fmtPct(stabilised)}</span> by Year {fullSeries.length - 1}.
      </p>
    </div>
  );
}

// ─── Block D · D&A schedule ──────────────────────────────────────────

function DASchedule({ bundle }: { bundle: UnderwritingBundle }) {
  const exitYear = bundle.computed.exit.exit_year;
  // Operating schedule · acquisition phase hidden · same convention as YearGrid.
  const visibleIndices: number[] = [];
  for (let i = 0; i <= exitYear; i++) {
    const phase = bundle.computed.periods[i]?.phase ?? "operating";
    if (phase !== "acquisition") visibleIndices.push(i);
  }
  const periods = visibleIndices.map((idx) => bundle.computed.periods[idx]);
  const da = visibleIndices.map((idx) => bundle.computed.pnl.da[idx] ?? 0);
  const buildingYears = bundle.inputs.depreciation.building_years;
  const mepYears = bundle.inputs.depreciation.mep_years;

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <DASummary label="Building · useful life" years={buildingYears} note="Straight-line · Block 3 wires basis from CAPEX hard cost ex-MEP" />
        <DASummary label="MEP · useful life" years={mepYears} note="Straight-line · Block 3 wires basis from MEP per-key × rooms" />
      </div>
      <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-700">
        Combined D&A per period (€)
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="text-left text-slate-500">
              {periods.map((p) => (
                <th key={p.id} className="px-2 py-1 text-right font-headline text-[9px] font-bold uppercase tracking-[0.16em]">
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {da.map((v, i) => (
                <td key={i} className="px-2 py-1.5 text-right font-mono text-[10.5px] tabular-nums text-slate-800">
                  {v === 0 ? "·" : fmtEURCompact(v)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DASummary({ label, years, note }: { label: string; years: number; note: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-700">{label}</p>
      <p className="mt-0.5 font-mono text-[14px] font-extrabold tabular-nums text-slate-900">
        {years} years
      </p>
      <p className="mt-0.5 font-mono text-[9.5px] text-slate-500">{note}</p>
    </div>
  );
}

// ─── Shared item table primitive ─────────────────────────────────────

type ItemColumn = "assumption" | "unit" | "total" | "pct" | "perKey" | "perSqm";

/**
 * Per-line display unit. Decoupled from the engine's `assumption_kind`:
 *   · `assumption_kind` is the canonical input format (% of asking, €/key, etc.)
 *   · `DisplayUnit` is the operator's preferred display lens
 * When the two match, the cell is editable; otherwise read-only (derived view).
 */
type DisplayUnit = "percent_total" | "total" | "per_key" | "per_m2";

const UNIT_LABEL: Record<DisplayUnit, string> = {
  percent_total: "% total",
  total: "€ total",
  per_key: "€ / key",
  per_m2: "€ / m²",
};

const UNIT_SYMBOL: Record<DisplayUnit, string> = {
  percent_total: "%",
  total: "€",
  per_key: "€",
  per_m2: "€",
};

/** Canonical display unit for a given engine kind · drives the editable branch. */
function canonicalUnitFor(kind: NonNullable<BreakdownLine["assumption_kind"]>): DisplayUnit {
  switch (kind) {
    case "percent_asking":
    case "percent_subtotal":
      return "percent_total";
    case "currency_per_key":
      return "per_key";
    case "currency_total":
      return "total";
  }
}

function ItemTable({
  lines,
  groupTotal,
  columns,
  showAssumptions = false,
  onAssumptionChange,
}: {
  lines: BreakdownLine[];
  groupTotal: number;
  columns: ItemColumn[];
  /**
   * When true, the "Assump." and "Unit" columns are visible ON SCREEN.
   * When false (default), they are hidden on screen entirely.
   * Both columns are ALWAYS hidden in print regardless of this flag —
   * the institutional PDF memo never exposes Premium-only edit surfaces.
   */
  showAssumptions?: boolean;
  /** When provided, the "Assump." column renders inline-editable inputs
   *  that commit via this callback (only when the displayed unit matches
   *  the line's canonical engine kind). */
  onAssumptionChange?: (lineId: string, nextRaw: number) => void;
}) {
  // Per-line display unit · seeded from canonical kind · operator can override.
  const [lineUnits, setLineUnits] = useState<Record<string, DisplayUnit>>(() => {
    const out: Record<string, DisplayUnit> = {};
    for (const l of lines) {
      if (l.assumption_kind) out[l.id] = canonicalUnitFor(l.assumption_kind);
    }
    return out;
  });

  const setUnit = (lineId: string, unit: DisplayUnit) => {
    setLineUnits((prev) => ({ ...prev, [lineId]: unit }));
  };

  // Hide assumption/unit columns on screen when the section is collapsed.
  const visibleColumns = showAssumptions
    ? columns
    : columns.filter((c) => c !== "assumption" && c !== "unit");

  // Helper · returns the print:hidden flag for the assumption/unit cells.
  const isPremiumOnly = (c: ItemColumn) => c === "assumption" || c === "unit";

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-[11px]">
        <colgroup>
          <col style={{ width: `${LABEL_WIDTH_PCT[visibleColumns.length]}%` }} />
          {visibleColumns.map((c) => (
            <col
              key={c}
              style={{ width: `${valueColWidthPct(visibleColumns.length, c, visibleColumns)}%` }}
            />
          ))}
        </colgroup>
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-1.5 pr-2 font-headline text-[9px] font-bold uppercase tracking-[0.18em]">Line</th>
            {visibleColumns.map((c) => (
              <th
                key={c}
                className={cn(
                  "px-2 py-1.5 text-right font-headline text-[9px] font-bold uppercase tracking-[0.18em]",
                  isPremiumOnly(c) && "print:hidden",
                )}
              >
                {HEADER_BY_COL[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const unit = lineUnits[line.id] ?? (line.assumption_kind ? canonicalUnitFor(line.assumption_kind) : "total");
            const canEdit = onAssumptionChange !== undefined
              && line.assumption_raw !== undefined
              && line.assumption_kind !== undefined
              && unit === canonicalUnitFor(line.assumption_kind);
            return (
              <tr key={line.id} className="border-t border-slate-100">
                <td className="truncate py-1.5 pr-2 font-headline text-[11px] text-slate-900">{line.label}</td>
                {visibleColumns.map((c) => (
                  <td
                    key={c}
                    className={cn(
                      "py-1.5 font-mono text-[10.5px] tabular-nums",
                      c === "unit" ? "px-0 text-center" : "px-2 text-right",
                      c === "assumption" ? "text-[#005db7] font-semibold" : c !== "unit" ? "text-slate-800" : "",
                      isPremiumOnly(c) && "print:hidden",
                    )}
                  >
                    {c === "assumption" ? (
                      canEdit ? (
                        <AssumptionInlineEdit
                          lineId={line.id}
                          value={line.assumption_raw!}
                          kind={line.assumption_kind!}
                          onCommit={onAssumptionChange!}
                        />
                      ) : (
                        renderAssumptionForUnit(line, unit, groupTotal)
                      )
                    ) : c === "unit" ? (
                      line.assumption_kind ? (
                        <UnitDropdown current={unit} onSelect={(u) => setUnit(line.id, u)} />
                      ) : null
                    ) : (
                      cellFor(c, line, groupTotal)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
          <tr className="border-t border-slate-200 bg-slate-100">
            <td className="py-1.5 pr-2 font-headline text-[11px] font-extrabold text-slate-900">Subtotal</td>
            {visibleColumns.map((c) => (
              <td
                key={c}
                className={cn(
                  "py-1.5 font-mono text-[11px] font-extrabold tabular-nums text-slate-900",
                  c === "unit" ? "px-0 text-center" : "px-2 text-right",
                  isPremiumOnly(c) && "print:hidden",
                )}
              >
                {c === "total" ? fmtEUR(groupTotal) : c === "pct" ? "100%" : ""}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * UnitDropdown · small symbol button (% or €) that opens a 4-option menu.
 * Operator picks one of the canonical display lenses; the Assump cell
 * re-renders accordingly. Stateless · open/close managed locally.
 */
function UnitDropdown({
  current,
  onSelect,
}: {
  current: DisplayUnit;
  onSelect: (unit: DisplayUnit) => void;
}) {
  const [open, setOpen] = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-unit-dropdown]")) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative inline-block" data-unit-dropdown>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Unit · ${UNIT_LABEL[current]}`}
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-sm border font-mono text-[10px] font-bold transition-colors",
          open
            ? "border-[#005db7] bg-[#005db7] text-white"
            : "border-slate-300 bg-white text-slate-600 hover:border-[#005db7] hover:text-[#005db7]",
        )}
      >
        {UNIT_SYMBOL[current]}
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-1 w-28 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg ring-1 ring-black/5"
        >
          {(Object.keys(UNIT_LABEL) as DisplayUnit[]).map((u) => (
            <li key={u}>
              <button
                type="button"
                role="option"
                aria-selected={u === current}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(u);
                  setOpen(false);
                }}
                className={cn(
                  "block w-full px-3 py-1.5 text-left font-mono text-[10.5px] transition-colors",
                  u === current
                    ? "bg-blue-50 text-[#005db7] font-bold"
                    : "text-slate-700 hover:bg-slate-50",
                )}
              >
                {UNIT_LABEL[u]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Read-only display of the line in the requested unit · used when the
 *  selected unit doesn't match the canonical engine kind (Assump becomes
 *  a derived view, no inline editing). */
function renderAssumptionForUnit(
  line: BreakdownLine,
  unit: DisplayUnit,
  groupTotal: number,
): string {
  switch (unit) {
    case "percent_total":
      return groupTotal > 0 ? fmtPct(line.total_eur / groupTotal) : "—";
    case "total":
      return fmtEUR(line.total_eur);
    case "per_key":
      return fmtEUR(line.per_room_eur);
    case "per_m2":
      return fmtEUR(line.per_sqm_eur);
  }
}

/** Inline editable cell for the "Assump." column. Format-aware: percent
 *  values are stored as decimals (0.02) but displayed as percentages
 *  (2,00%); currency values render compact (11.250 €). */
function AssumptionInlineEdit({
  lineId,
  value,
  kind,
  onCommit,
}: {
  lineId: string;
  value: number;
  kind: NonNullable<BreakdownLine["assumption_kind"]>;
  onCommit: (lineId: string, nextRaw: number) => void;
}) {
  const [draft, setDraft] = useState(formatAssumption(value, kind));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(formatAssumption(value, kind));
  }, [value, kind, editing]);

  const commit = () => {
    setEditing(false);
    const parsed = parseAssumption(draft, kind);
    if (parsed === null || parsed === value || parsed < 0) {
      setDraft(formatAssumption(value, kind));
      return;
    }
    onCommit(lineId, parsed);
  };

  return (
    <input
      type="text"
      inputMode={kind === "percent_asking" || kind === "percent_subtotal" ? "decimal" : "numeric"}
      value={draft}
      onFocus={() => setEditing(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(formatAssumption(value, kind));
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-full rounded-sm border border-transparent bg-transparent px-1 py-0 text-right font-mono text-[10.5px] font-semibold tabular-nums text-[#005db7] focus:border-[#005db7]/40 focus:bg-blue-50/60 focus:outline-none focus:ring-1 focus:ring-[#005db7]/30"
      aria-label={`Assumption for ${lineId}`}
    />
  );
}

function formatAssumption(value: number, kind: NonNullable<BreakdownLine["assumption_kind"]>): string {
  if (!Number.isFinite(value)) return "—";
  // Numeric-only display · the unit context lives in the per-line dropdown
  // and in the right-side breakdown columns (Total € · €/key · €/m²).
  switch (kind) {
    case "percent_asking":
    case "percent_subtotal": {
      const pct = value * 100;
      return Math.abs(pct % 1) < 0.05 ? pct.toFixed(0) : pct.toFixed(2).replace(".", ",");
    }
    case "currency_per_key":
    case "currency_total":
      return value === 0 ? "—" : new Intl.NumberFormat("es-ES").format(Math.round(value));
  }
}

function parseAssumption(raw: string, kind: NonNullable<BreakdownLine["assumption_kind"]>): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let v = trimmed
    .replace(/€/g, "")
    .replace(/\/k/gi, "")
    .replace(/%/g, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return null;
  switch (kind) {
    case "percent_asking":
    case "percent_subtotal":
      return Math.round(n * 100) / 10000;
    case "currency_per_key":
    case "currency_total":
      return Math.round(n);
  }
}

const HEADER_BY_COL: Record<ItemColumn, string> = {
  assumption: "Assump.",
  unit: "",
  total: "Total €",
  pct: "% Total",
  perKey: "€ / key",
  perSqm: "€ / m²",
};

const LABEL_WIDTH_PCT: Record<number, number> = {
  3: 46,
  4: 40,
  5: 38,
  6: 34,
};

const UNIT_COL_WIDTH_PCT = 3.5;

/** Unit column gets a fixed compact width · other value columns share the rest. */
function valueColWidthPct(valueColCount: number, col: ItemColumn, columns: ItemColumn[]): number {
  const labelPct = LABEL_WIDTH_PCT[valueColCount] ?? 40;
  const remaining = 100 - labelPct;
  const hasUnit = columns.includes("unit");
  if (col === "unit") return UNIT_COL_WIDTH_PCT;
  const unitCount = hasUnit ? 1 : 0;
  const nonUnitCount = valueColCount - unitCount;
  return (remaining - UNIT_COL_WIDTH_PCT * unitCount) / Math.max(1, nonUnitCount);
}

function cellFor(col: ItemColumn, line: BreakdownLine, groupTotal: number): string {
  switch (col) {
    case "assumption":
      return line.assumption ?? "—";
    case "unit":
      // Unit column rendering is handled inline in ItemTable · this branch
      // exists only to satisfy the type-checker when cellFor is used as a
      // fallback for non-unit columns.
      return "";
    case "total":
      return fmtEUR(line.total_eur);
    case "pct":
      return groupTotal > 0 ? fmtPct(line.total_eur / groupTotal) : "—";
    case "perKey":
      return fmtEUR(line.per_room_eur);
    case "perSqm":
      return fmtEUR(line.per_sqm_eur);
  }
}

function sumLines(lines: BreakdownLine[]): number {
  return lines.reduce((acc, l) => acc + l.total_eur, 0);
}

// ─── Formatting helpers ──────────────────────────────────────────────

function fmtEUR(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(Math.round((n / 1_000_000) * 10) / 10).toString().replace(".", ",")}M €`;
  if (abs >= 1_000) return `${(Math.round((n / 1_000) * 10) / 10).toString().replace(".", ",")}k €`;
  return `${new Intl.NumberFormat("es-ES").format(Math.round(n))} €`;
}

function fmtEURCompact(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "·";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(Math.round((n / 1_000_000) * 10) / 10).toString().replace(".", ",")}M`;
  if (abs >= 1_000) return `${(Math.round((n / 1_000) * 10) / 10).toString().replace(".", ",")}k`;
  return new Intl.NumberFormat("es-ES").format(Math.round(n));
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  return `${(n * 100).toFixed(1).replace(".", ",")}%`;
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat("es-ES").format(Math.round(n));
}

function div(a: number, b: number): number {
  if (!Number.isFinite(b) || b === 0) return 0;
  return a / b;
}

function pct(part: number, whole: number): string {
  if (!Number.isFinite(whole) || whole === 0) return "—";
  return `${((part / whole) * 100).toFixed(1).replace(".", ",")}%`;
}
