"use client";

import { useMemo, useState } from "react";
import { Target } from "lucide-react";
import {
  DYNAMIC_CAP_RATE_POLICY_DEFAULTS,
  POLICY_GRID_CELLS,
  RENOVATION_OPTIONS,
  SCENARIO_OPTIONS,
  SIZE_TIERS,
  computeForCell,
  type DynamicCapRatePolicy,
  type LiquidityBandId,
  type OperatorOptionId,
  type RenovationOptionId,
  type ScenarioOptionId,
  type SizeTierId,
} from "@/lib/admin/financials/dynamic-cap-rate-policy";

import {
  computeScoreCapAdjustment,
  type ScoreAdjustmentPolicy,
} from "@/lib/admin/financials/score-cap-adjustment";
import {
  resolveSegmentBase,
  priorFromBand,
  SEGMENTS,
  type SegmentId,
} from "@/lib/admin/financials/segment-base-priors";

const SEGMENT_LABELS: Record<SegmentId, string> = {
  luxury: "Luxury",
  upper_upscale: "Upper Upscale",
  upscale: "Upscale",
  upper_midscale: "Upper Midscale",
  midscale: "Midscale",
  economy: "Economy",
};

const OPERATOR_OPTIONS: ReadonlyArray<{ id: OperatorOptionId; label: string }> = [
  { id: "branded_chain", label: "Cadena de marca" },
  { id: "independent", label: "Independiente" },
];

const LIQUIDITY_OPTIONS: ReadonlyArray<{ id: LiquidityBandId; label: string }> = [
  { id: "deep_6plus", label: "Profunda · ≥6/12m" },
  { id: "moderate_3_5", label: "Moderada · 3-5/12m" },
  { id: "thin_below_3", label: "Fina · <3/12m" },
];
import type { StarCategoryId } from "@/lib/admin/financials/defaults";
import { useDraftedOverrides } from "@/lib/admin/financials/use-overrides";
import { SaveBar } from "./save-bar";

/**
 * Dynamic Cap. Rate · admin panel.
 *
 * Lives at the end of the Financial Structure section. NOT a simple
 * input · it IS the admin control surface of the Dynamic Cap Rate
 * Engine (`lib/underwriting/cap-rate-engine/`).
 *
 * Layout (institutional valuation-intelligence panel):
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ HERO · live recommended cap rate + formula                    │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ MATRIX · 9-cell grid · per category × size · each adjustment   │
 *   │   · Base Market Yield (single number · admin-editable)         │
 *   │   · Category adjustment                                        │
 *   │   · Size adjustment                                            │
 *   │   · Renovation adjustment (radio · CAPEX / Non-CAPEX)          │
 *   │   · Scenario adjustment (radio · Conservador / Mercado / Opt.)  │
 *   │   · Macro adjustment (Euribor regime · auto-derived)           │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ RATIONALE · institutional narrative + source breakdown        │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * NO financial logic here. All math lives in
 * `lib/admin/financials/dynamic-cap-rate-policy.ts::computeForCell`
 * which mirrors the runtime engine. The panel reads the policy from
 * localStorage (via useDraftedOverrides), writes operator edits to a
 * draft, and explicit Save commits.
 */

const ADMIN_PREVIEW_SAMPLE = {
  category: "4star" as StarCategoryId,
  size: "large" as SizeTierId,
  renovation: "renovated" as RenovationOptionId,
  scenario: "conservative" as ScenarioOptionId,
  operator: "branded_chain" as OperatorOptionId,
  liquidity: "thin_below_3" as LiquidityBandId,
  market: "Madrid Centro",
  euribor_12m_pct: 2.75,
};

export function DynamicCapRateCard() {
  const ov = useDraftedOverrides<DynamicCapRatePolicy>(
    "admin.financials.dynamic-cap-rate-policy.v1",
    DYNAMIC_CAP_RATE_POLICY_DEFAULTS,
  );

  const policy = ov.draft;

  // Admin preview state · which (category, size, renovation, scenario)
  // do we show as the "live" preview in the hero + rationale panel.
  const [previewCategory, setPreviewCategory] = useState<StarCategoryId>(ADMIN_PREVIEW_SAMPLE.category);
  const [previewSize, setPreviewSize] = useState<SizeTierId>(ADMIN_PREVIEW_SAMPLE.size);
  const [previewReno, setPreviewReno] = useState<RenovationOptionId>(ADMIN_PREVIEW_SAMPLE.renovation);
  const [previewScn, setPreviewScn] = useState<ScenarioOptionId>(ADMIN_PREVIEW_SAMPLE.scenario);
  const [previewOperator, setPreviewOperator] = useState<OperatorOptionId>(ADMIN_PREVIEW_SAMPLE.operator);
  const [previewLiquidity, setPreviewLiquidity] = useState<LiquidityBandId>(ADMIN_PREVIEW_SAMPLE.liquidity);
  const [previewSegment, setPreviewSegment] = useState<SegmentId>("upscale");

  // Base = the SELECTED segment's prior (TRAMO 3b) · falls back to the fixed
  // base_market_yield_pct when no priors. This is what the engine uses, so the
  // panel preview mirrors it exactly.
  const segBase = useMemo(
    () => resolveSegmentBase({
      segment: previewSegment, category: previewCategory,
      priors: policy.segment_base_priors, fallbackPct: policy.base_market_yield_pct,
    }),
    [previewSegment, previewCategory, policy.segment_base_priors, policy.base_market_yield_pct],
  );

  const result = useMemo(
    () => computeForCell(policy, previewCategory, previewSize, previewReno, previewScn, ADMIN_PREVIEW_SAMPLE.euribor_12m_pct, previewOperator, previewLiquidity, segBase.base_pct),
    [policy, previewCategory, previewSize, previewReno, previewScn, previewOperator, previewLiquidity, segBase.base_pct],
  );

  // Update helpers · operator-friendly mutation patterns.
  function setBase(value: number) {
    ov.setDraft((p) => ({ ...p, base_market_yield_pct: round2(value) }));
  }
  function setBaseSource(text: string) {
    ov.setDraft((p) => ({ ...p, base_market_yield_source: text }));
  }
  // Segment yield · edit the market band → prior auto-derives by the rule
  // (midpoint − 0.25), keeping the method uniform (no off-rule overrides).
  function setSegmentBand(seg: SegmentId, patch: { band_low?: number; band_high?: number }) {
    ov.setDraft((p) => {
      const cur = p.segment_base_priors[seg];
      const band_low = patch.band_low ?? cur.band_low;
      const band_high = patch.band_high ?? cur.band_high;
      return {
        ...p,
        segment_base_priors: {
          ...p.segment_base_priors,
          [seg]: { ...cur, band_low, band_high, base_pct: priorFromBand(band_low, band_high) },
        },
      };
    });
  }
  function setMatrixCell(
    field: "category_adjustment" | "size_adjustment",
    cat: StarCategoryId,
    size: SizeTierId,
    value: number,
  ) {
    ov.setDraft((p) => ({
      ...p,
      [field]: {
        ...p[field],
        [cat]: { ...p[field][cat], [size]: round2(value) },
      },
    }));
  }
  function setRenovationCell(option: RenovationOptionId, cat: StarCategoryId, size: SizeTierId, value: number) {
    ov.setDraft((p) => ({
      ...p,
      renovation_adjustment: {
        ...p.renovation_adjustment,
        [option]: {
          ...p.renovation_adjustment[option],
          [cat]: { ...p.renovation_adjustment[option][cat], [size]: round2(value) },
        },
      },
    }));
  }
  function setScenarioCell(option: ScenarioOptionId, cat: StarCategoryId, size: SizeTierId, value: number) {
    ov.setDraft((p) => ({
      ...p,
      scenario_adjustment: {
        ...p.scenario_adjustment,
        [option]: {
          ...p.scenario_adjustment[option],
          [cat]: { ...p.scenario_adjustment[option][cat], [size]: round2(value) },
        },
      },
    }));
  }
  function setOperator(option: OperatorOptionId, value: number) {
    ov.setDraft((p) => ({ ...p, operator_adjustment: { ...p.operator_adjustment, [option]: round2(value) } }));
  }
  function setLiquidity(band: LiquidityBandId, value: number) {
    ov.setDraft((p) => ({ ...p, liquidity_adjustment: { ...p.liquidity_adjustment, [band]: round2(value) } }));
  }
  function setScorePolicy(patch: Partial<ScoreAdjustmentPolicy>) {
    ov.setDraft((p) => ({ ...p, score_adjustment: { ...p.score_adjustment, ...patch } }));
  }
  function setMacroBps(value: number) {
    ov.setDraft((p) => ({ ...p, macro_bps_per_100bps_euribor: round2(value) }));
  }
  function setMacroLtMean(value: number) {
    ov.setDraft((p) => ({ ...p, macro_long_term_mean_pct: round2(value) }));
  }

  return (
    <section className="rounded-2xl border border-lime-300/30 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
            <Target size={11} />
            Dynamic Cap. Rate
          </p>
          <h2 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-white">
            Valuation intelligence configuration
          </h2>
          <p className="mt-1 max-w-3xl font-mono text-[11px] text-slate-400">
            Admin panel for the Dynamic Cap Rate Engine. Every adjustment below is a
            tunable weight · the runtime engine in <code className="text-slate-300">lib/underwriting/cap-rate-engine</code>{" "}
            consumes these to produce the recommended cap rate, confidence and rationale
            on every report.
          </p>
        </div>
        <SaveBar
          isDirty={ov.isDirty}
          hydrated={ov.hydrated}
          lastSavedAt={ov.lastSavedAt}
          onSave={ov.save}
          onDiscard={ov.discard}
          onReset={ov.reset}
          resetConfirmText="Reset ALL Dynamic Cap Rate policy overrides and clear local storage?"
        />
      </header>

      {/* ─── Hero · live preview ─────────────────────────────────────── */}
      <HeroBlock
        result={result}
        previewCategory={previewCategory}
        previewSize={previewSize}
        previewReno={previewReno}
        previewScn={previewScn}
        previewOperator={previewOperator}
        previewLiquidity={previewLiquidity}
        market={ADMIN_PREVIEW_SAMPLE.market}
        euribor={ADMIN_PREVIEW_SAMPLE.euribor_12m_pct}
      />

      {/* ─── Preview controls ───────────────────────────────────────── */}
      <div className="mb-5 mt-4 grid gap-3 rounded-md border border-slate-800/60 bg-slate-950/40 p-3 sm:grid-cols-3">
        <PreviewSelect
          label="Category"
          value={previewCategory}
          onChange={(v) => setPreviewCategory(v as StarCategoryId)}
          options={[
            { id: "3star", label: "3* Midscale" },
            { id: "4star", label: "4* Upscale" },
            { id: "5star", label: "5* Luxury" },
          ]}
        />
        <PreviewSelect
          label="Size"
          value={previewSize}
          onChange={(v) => setPreviewSize(v as SizeTierId)}
          options={SIZE_TIERS.map((s) => ({ id: s.id, label: `${s.label} keys` }))}
        />
        <PreviewSelect
          label="Renovation"
          value={previewReno}
          onChange={(v) => setPreviewReno(v as RenovationOptionId)}
          options={RENOVATION_OPTIONS.map((r) => ({ id: r.id, label: r.label }))}
        />
        <PreviewSelect
          label="Operator"
          value={previewOperator}
          onChange={(v) => setPreviewOperator(v as OperatorOptionId)}
          options={OPERATOR_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
        />
        <PreviewSelect
          label="Liquidity"
          value={previewLiquidity}
          onChange={(v) => setPreviewLiquidity(v as LiquidityBandId)}
          options={LIQUIDITY_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
        />
        <PreviewSelect
          label="Segment (base)"
          value={previewSegment}
          onChange={(v) => setPreviewSegment(v as SegmentId)}
          options={SEGMENTS.map((s) => ({ id: s, label: SEGMENT_LABELS[s] }))}
        />
        <PreviewSelect
          label="Scenario"
          value={previewScn}
          onChange={(v) => setPreviewScn(v as ScenarioOptionId)}
          options={SCENARIO_OPTIONS.map((s) => ({ id: s.id, label: s.label }))}
        />
      </div>

      {/* ─── Segment yield · base por segmento (TRAMO 3b) ───────────── */}
      <SegmentYieldTable
        policy={policy}
        previewSegment={previewSegment}
        onSegmentBandChange={setSegmentBand}
        onPreviewSegmentChange={setPreviewSegment}
      />

      {/* ─── Policy matrix ──────────────────────────────────────────── */}
      <PolicyMatrix
        policy={policy}
        previewCategory={previewCategory}
        previewSize={previewSize}
        previewReno={previewReno}
        previewScn={previewScn}
        result={result}
        onBaseChange={setBase}
        onBaseSourceChange={setBaseSource}
        onMatrixCellChange={setMatrixCell}
        onRenovationCellChange={setRenovationCell}
        onScenarioCellChange={setScenarioCell}
        onPreviewRenoChange={setPreviewReno}
        onPreviewScnChange={setPreviewScn}
        previewOperator={previewOperator}
        previewLiquidity={previewLiquidity}
        onOperatorChange={setOperator}
        onLiquidityChange={setLiquidity}
        onPreviewOperatorChange={setPreviewOperator}
        onPreviewLiquidityChange={setPreviewLiquidity}
        onScoreChange={setScorePolicy}
        onMacroBpsChange={setMacroBps}
        onMacroLtMeanChange={setMacroLtMean}
        euribor={ADMIN_PREVIEW_SAMPLE.euribor_12m_pct}
      />

      {/* ─── Rationale narrative ─────────────────────────────────────── */}
      <RationalePanel
        policy={policy}
        previewCategory={previewCategory}
        previewSize={previewSize}
        previewReno={previewReno}
        previewScn={previewScn}
        previewOperator={previewOperator}
        previewLiquidity={previewLiquidity}
        result={result}
        market={ADMIN_PREVIEW_SAMPLE.market}
        euribor={ADMIN_PREVIEW_SAMPLE.euribor_12m_pct}
      />
    </section>
  );
}

// ─── Hero · live preview block ────────────────────────────────────────

function HeroBlock({
  result,
  previewCategory,
  previewSize,
  previewReno,
  previewScn,
  previewOperator,
  previewLiquidity,
  market,
  euribor,
}: {
  result: ReturnType<typeof computeForCell>;
  previewCategory: StarCategoryId;
  previewSize: SizeTierId;
  previewReno: RenovationOptionId;
  previewScn: ScenarioOptionId;
  previewOperator: OperatorOptionId;
  previewLiquidity: LiquidityBandId;
  market: string;
  euribor: number;
}) {
  const sizeLabel = SIZE_TIERS.find((s) => s.id === previewSize)?.label ?? previewSize;
  const renoLabel = RENOVATION_OPTIONS.find((r) => r.id === previewReno)?.label ?? previewReno;
  const scnLabel = SCENARIO_OPTIONS.find((s) => s.id === previewScn)?.label ?? previewScn;
  const operatorLabel = OPERATOR_OPTIONS.find((o) => o.id === previewOperator)?.label ?? previewOperator;
  const liquidityLabel = LIQUIDITY_OPTIONS.find((o) => o.id === previewLiquidity)?.label ?? previewLiquidity;

  return (
    <div className="grid gap-4 rounded-xl border border-lime-300/30 bg-lime-300/5 p-4 lg:grid-cols-[1.1fr_1.4fr]">
      <div>
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-lime-300/80">
          Recommended cap rate · live preview
        </p>
        <p className="mt-1 font-mono text-[40px] font-extrabold leading-none tabular-nums text-lime-200">
          {fmt(result.total)}%
        </p>
        <p className="mt-2 font-mono text-[11px] text-slate-300">
          {previewCategory.replace("star", "*")} · {sizeLabel} keys · {renoLabel} · {operatorLabel} · {liquidityLabel} · {scnLabel} · {market}
        </p>
      </div>
      <div>
        <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Formula
        </p>
        <FormulaRow label="Base · prior de segmento" value={result.base} sign="+" />
        <FormulaRow label="Category Adjustment" value={result.category} sign={signed(result.category)} />
        <FormulaRow label="Size Adjustment" value={result.size} sign={signed(result.size)} />
        <FormulaRow label="Renovation Adjustment" value={result.renovation} sign={signed(result.renovation)} />
        <FormulaRow label="Operator Adjustment" value={result.operator} sign={signed(result.operator)} />
        <FormulaRow label="Liquidity Adjustment" value={result.liquidity} sign={signed(result.liquidity)} />
        <FormulaRow label="Scenario Adjustment" value={result.scenario} sign={signed(result.scenario)} />
        <FormulaRow label={`Macro · Euribor ${euribor.toFixed(2)}%`} value={result.macro} sign={signed(result.macro)} />
        <div className="mt-1.5 flex items-baseline justify-between border-t border-lime-300/30 pt-1.5">
          <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.22em] text-lime-300">
            Dynamic Cap Rate
          </span>
          <span className="font-mono text-[14px] font-extrabold tabular-nums text-lime-200">
            = {fmt(result.total)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function FormulaRow({ label, value, sign }: { label: string; value: number; sign: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-slate-800/40 py-1 last:border-b-0">
      <span className="font-mono text-[11px] text-slate-300">{label}</span>
      <span className="font-mono text-[11.5px] font-bold tabular-nums text-slate-100">
        {sign}
        {fmt(Math.abs(value))}%
      </span>
    </div>
  );
}

// ─── Preview controls ────────────────────────────────────────────────

function PreviewSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-700/60 bg-slate-900/40 px-2 py-1.5 font-mono text-[11px] text-slate-100 focus:border-lime-300/60 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id} className="bg-slate-900">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ─── Policy matrix table ─────────────────────────────────────────────

function PolicyMatrix({
  policy,
  previewCategory,
  previewSize,
  previewReno,
  previewScn,
  result,
  onBaseChange,
  onBaseSourceChange,
  onMatrixCellChange,
  onRenovationCellChange,
  onScenarioCellChange,
  onPreviewRenoChange,
  onPreviewScnChange,
  previewOperator,
  previewLiquidity,
  onOperatorChange,
  onLiquidityChange,
  onPreviewOperatorChange,
  onPreviewLiquidityChange,
  onScoreChange,
  onMacroBpsChange,
  onMacroLtMeanChange,
  euribor,
}: {
  policy: DynamicCapRatePolicy;
  previewCategory: StarCategoryId;
  previewSize: SizeTierId;
  previewReno: RenovationOptionId;
  previewScn: ScenarioOptionId;
  result: ReturnType<typeof computeForCell>;
  onBaseChange: (v: number) => void;
  onBaseSourceChange: (v: string) => void;
  onMatrixCellChange: (field: "category_adjustment" | "size_adjustment", cat: StarCategoryId, size: SizeTierId, v: number) => void;
  onRenovationCellChange: (option: RenovationOptionId, cat: StarCategoryId, size: SizeTierId, v: number) => void;
  onScenarioCellChange: (option: ScenarioOptionId, cat: StarCategoryId, size: SizeTierId, v: number) => void;
  onPreviewRenoChange: (v: RenovationOptionId) => void;
  onPreviewScnChange: (v: ScenarioOptionId) => void;
  previewOperator: OperatorOptionId;
  previewLiquidity: LiquidityBandId;
  onOperatorChange: (option: OperatorOptionId, v: number) => void;
  onLiquidityChange: (band: LiquidityBandId, v: number) => void;
  onPreviewOperatorChange: (v: OperatorOptionId) => void;
  onPreviewLiquidityChange: (v: LiquidityBandId) => void;
  onScoreChange: (patch: Partial<ScoreAdjustmentPolicy>) => void;
  onMacroBpsChange: (v: number) => void;
  onMacroLtMeanChange: (v: number) => void;
  euribor: number;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-800/60">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-slate-900/60 text-left text-slate-400">
            <th className="sticky left-0 z-10 bg-slate-900/60 px-3 py-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]">
              Adjustment
            </th>
            {POLICY_GRID_CELLS.map((c) => (
              <th
                key={`${c.category}-${c.size}`}
                className={`px-2 py-2 text-right font-headline text-[9px] font-bold uppercase tracking-[0.16em] ${
                  c.category === previewCategory && c.size === previewSize ? "bg-lime-300/10 text-lime-300" : ""
                }`}
              >
                {c.label}
              </th>
            ))}
            <th className="px-2 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-lime-300/80">
              Selected
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Base · fallback (the live base = segment prior · see Segment yield above) */}
          <tr className="border-t border-slate-800/60 bg-slate-900/30">
            <td className="sticky left-0 z-[1] bg-slate-950 px-3 py-2 align-top">
              <div className="font-headline text-[11px] font-bold text-slate-100">Base · fallback</div>
              <input
                type="text"
                key={`base-source-${policy.base_market_yield_source}`}
                defaultValue={policy.base_market_yield_source}
                onBlur={(e) => onBaseSourceChange(e.target.value.trim())}
                className="mt-1 w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 font-mono text-[9.5px] italic text-slate-400 focus:border-lime-300/40 focus:bg-slate-900/60 focus:outline-none hover:border-slate-700/60"
                aria-label="Base market yield source"
              />
            </td>
            <td className="px-2 py-2 text-right font-mono text-[10.5px] text-slate-500" colSpan={9}>
              último recurso · solo si no hay prior de segmento · la base viva = prior de segmento (arriba)
            </td>
            <td className="px-2 py-2 text-right">
              <NumericCell value={policy.base_market_yield_pct} onChange={onBaseChange} tone="value" />
            </td>
          </tr>

          {/* Category adjustment */}
          <MatrixRow
            label="Category adjustment"
            policyMatrix={policy.category_adjustment}
            previewCategory={previewCategory}
            previewSize={previewSize}
            onCellChange={(cat, size, v) => onMatrixCellChange("category_adjustment", cat, size, v)}
            selectedValue={result.category}
          />

          {/* Size adjustment */}
          <MatrixRow
            label="Size adjustment"
            policyMatrix={policy.size_adjustment}
            previewCategory={previewCategory}
            previewSize={previewSize}
            onCellChange={(cat, size, v) => onMatrixCellChange("size_adjustment", cat, size, v)}
            selectedValue={result.size}
          />

          {/* Renovation · group header + 2 radio sub-rows */}
          <GroupHeaderRow label="Renovation adjustment" hint="Radio select · CAPEX vs Non-CAPEX" />
          {RENOVATION_OPTIONS.map((opt) => (
            <MatrixRadioRow
              key={opt.id}
              label={opt.label}
              policyMatrix={policy.renovation_adjustment[opt.id]}
              previewCategory={previewCategory}
              previewSize={previewSize}
              selected={previewReno === opt.id}
              onSelect={() => onPreviewRenoChange(opt.id)}
              onCellChange={(cat, size, v) => onRenovationCellChange(opt.id, cat, size, v)}
              selectedValue={previewReno === opt.id ? result.renovation : null}
            />
          ))}

          {/* Operator · group header + flat radio sub-rows (single value per brand) */}
          <GroupHeaderRow label="Operator adjustment" hint="Radio select · branded chain vs independent" />
          {OPERATOR_OPTIONS.map((opt) => (
            <FlatRadioRow
              key={opt.id}
              label={opt.label}
              value={policy.operator_adjustment[opt.id]}
              selected={previewOperator === opt.id}
              onSelect={() => onPreviewOperatorChange(opt.id)}
              onValueChange={(v) => onOperatorChange(opt.id, v)}
              selectedValue={previewOperator === opt.id ? result.operator : null}
            />
          ))}

          {/* Liquidity · group header + flat radio sub-rows (single value per band) */}
          <GroupHeaderRow label="Liquidity adjustment" hint="Radio select · trailing-12m transaction depth" />
          {LIQUIDITY_OPTIONS.map((opt) => (
            <FlatRadioRow
              key={opt.id}
              label={opt.label}
              value={policy.liquidity_adjustment[opt.id]}
              selected={previewLiquidity === opt.id}
              onSelect={() => onPreviewLiquidityChange(opt.id)}
              onValueChange={(v) => onLiquidityChange(opt.id, v)}
              selectedValue={previewLiquidity === opt.id ? result.liquidity : null}
            />
          ))}

          {/* HotelVALORA Score · single row (not a grid · computed per hotel vs compset) */}
          <GroupHeaderRow label="HotelVALORA Score adjustment" hint="vs compset · relativo · premio −0,30 / castigo +0,15 pp" />
          <ScoreMatrixRow policy={policy.score_adjustment} onChange={onScoreChange} />

          {/* Scenario · group header + radio sub-rows */}
          <GroupHeaderRow label="Scenario adjustment" hint="Radio select · operator scenario overlay" />
          {SCENARIO_OPTIONS.map((opt) => (
            <MatrixRadioRow
              key={opt.id}
              label={opt.label}
              policyMatrix={policy.scenario_adjustment[opt.id]}
              previewCategory={previewCategory}
              previewSize={previewSize}
              selected={previewScn === opt.id}
              onSelect={() => onPreviewScnChange(opt.id)}
              onCellChange={(cat, size, v) => onScenarioCellChange(opt.id, cat, size, v)}
              selectedValue={previewScn === opt.id ? result.scenario : null}
            />
          ))}

          {/* Macro · derived from Euribor · 2 admin-tunable knobs */}
          <GroupHeaderRow label="Macro adjustment" hint="Δ = (Euribor − long-term mean) × bps-per-100bps" />
          <tr className="border-t border-slate-800/60">
            <td className="sticky left-0 z-[1] bg-slate-950 px-3 py-2 pl-6 font-headline text-[10.5px] text-slate-300">
              Δ per 100 bps Euribor above mean
            </td>
            <td className="px-2 py-2 text-right font-mono text-[10.5px] text-slate-500" colSpan={9}>
              tunable basis points
            </td>
            <td className="px-2 py-2 text-right">
              <NumericCell
                value={policy.macro_bps_per_100bps_euribor}
                onChange={onMacroBpsChange}
                tone="value"
                suffix="bps"
              />
            </td>
          </tr>
          <tr className="border-t border-slate-800/60">
            <td className="sticky left-0 z-[1] bg-slate-950 px-3 py-2 pl-6 font-headline text-[10.5px] text-slate-300">
              Euribor 12m long-term mean
            </td>
            <td className="px-2 py-2 text-right font-mono text-[10.5px] text-slate-500" colSpan={9}>
              reference rate · live rate {euribor.toFixed(2)}%
            </td>
            <td className="px-2 py-2 text-right">
              <NumericCell value={policy.macro_long_term_mean_pct} onChange={onMacroLtMeanChange} tone="value" />
            </td>
          </tr>
          <tr className="border-t border-slate-700/60 bg-slate-900/40">
            <td className="sticky left-0 z-[1] bg-slate-900/60 px-3 py-2 font-headline text-[11px] font-extrabold uppercase tracking-[0.18em] text-lime-300/80">
              Macro Δ applied
            </td>
            <td className="px-2 py-2 text-right font-mono text-[10.5px] text-slate-500" colSpan={9}>
              ({euribor.toFixed(2)} − {policy.macro_long_term_mean_pct.toFixed(2)}) × {policy.macro_bps_per_100bps_euribor.toFixed(0)} bps
            </td>
            <td className="px-2 py-2 text-right font-mono text-[12px] font-extrabold tabular-nums text-lime-200">
              {signed(result.macro)}
              {fmt(Math.abs(result.macro))}%
            </td>
          </tr>

          {/* Total · final row */}
          <tr className="border-t-2 border-lime-300/40 bg-lime-300/5">
            <td className="sticky left-0 z-[1] bg-lime-300/5 px-3 py-2.5 font-headline text-[12px] font-extrabold uppercase tracking-[0.18em] text-lime-300">
              Dynamic Cap Rate · selected
            </td>
            <td className="px-2 py-2.5 text-right font-mono text-[10px] text-slate-400" colSpan={9}>
              base + Σ adjustments
            </td>
            <td className="px-2 py-2.5 text-right font-mono text-[14px] font-extrabold tabular-nums text-lime-200">
              = {fmt(result.total)}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function MatrixRow({
  label,
  policyMatrix,
  previewCategory,
  previewSize,
  onCellChange,
  selectedValue,
}: {
  label: string;
  policyMatrix: Record<StarCategoryId, Record<SizeTierId, number>>;
  previewCategory: StarCategoryId;
  previewSize: SizeTierId;
  onCellChange: (cat: StarCategoryId, size: SizeTierId, v: number) => void;
  selectedValue: number;
}) {
  return (
    <tr className="border-t border-slate-800/60">
      <td className="sticky left-0 z-[1] bg-slate-950 px-3 py-2 font-headline text-[11px] font-bold text-slate-100">
        {label}
      </td>
      {POLICY_GRID_CELLS.map((c) => {
        const v = policyMatrix[c.category][c.size];
        const isPreview = c.category === previewCategory && c.size === previewSize;
        return (
          <td
            key={`${c.category}-${c.size}`}
            className={`px-1 py-1.5 text-right ${isPreview ? "bg-lime-300/10" : ""}`}
          >
            <NumericCell value={v} onChange={(nv) => onCellChange(c.category, c.size, nv)} tone="adj" />
          </td>
        );
      })}
      <td className="px-2 py-2 text-right font-mono text-[12px] font-extrabold tabular-nums text-lime-200">
        {signed(selectedValue)}
        {fmt(Math.abs(selectedValue))}%
      </td>
    </tr>
  );
}

function MatrixRadioRow({
  label,
  policyMatrix,
  previewCategory,
  previewSize,
  selected,
  onSelect,
  onCellChange,
  selectedValue,
}: {
  label: string;
  policyMatrix: Record<StarCategoryId, Record<SizeTierId, number>>;
  previewCategory: StarCategoryId;
  previewSize: SizeTierId;
  selected: boolean;
  onSelect: () => void;
  onCellChange: (cat: StarCategoryId, size: SizeTierId, v: number) => void;
  selectedValue: number | null;
}) {
  return (
    <tr className="border-t border-slate-800/40">
      <td className="sticky left-0 z-[1] bg-slate-950 px-3 py-1.5 pl-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            checked={selected}
            onChange={onSelect}
            className="h-3 w-3 accent-lime-300"
          />
          <span className={`font-mono text-[11px] ${selected ? "font-bold text-lime-200" : "text-slate-300"}`}>
            {label}
          </span>
        </label>
      </td>
      {POLICY_GRID_CELLS.map((c) => {
        const v = policyMatrix[c.category][c.size];
        const isPreview = c.category === previewCategory && c.size === previewSize;
        return (
          <td
            key={`${c.category}-${c.size}`}
            className={`px-1 py-1.5 text-right ${isPreview && selected ? "bg-lime-300/10" : ""}`}
          >
            <NumericCell value={v} onChange={(nv) => onCellChange(c.category, c.size, nv)} tone="adj-sub" />
          </td>
        );
      })}
      <td className="px-2 py-1.5 text-right">
        {selectedValue !== null ? (
          <span className="font-mono text-[12px] font-extrabold tabular-nums text-lime-200">
            {signed(selectedValue)}
            {fmt(Math.abs(selectedValue))}%
          </span>
        ) : (
          <span className="font-mono text-[10px] text-slate-600">—</span>
        )}
      </td>
    </tr>
  );
}

function FlatRadioRow({
  label,
  value,
  selected,
  onSelect,
  onValueChange,
  selectedValue,
}: {
  label: string;
  value: number;
  selected: boolean;
  onSelect: () => void;
  onValueChange: (v: number) => void;
  selectedValue: number | null;
}) {
  return (
    <tr className="border-t border-slate-800/40">
      <td className="sticky left-0 z-[1] bg-slate-950 px-3 py-1.5 pl-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="radio" checked={selected} onChange={onSelect} className="h-3 w-3 accent-lime-300" />
          <span className={`font-mono text-[11px] ${selected ? "font-bold text-lime-200" : "text-slate-300"}`}>
            {label}
          </span>
        </label>
      </td>
      <td className="px-2 py-1.5 text-right" colSpan={9}>
        <div className="flex justify-end">
          <div className="w-20">
            <NumericCell value={value} onChange={onValueChange} tone="adj-sub" />
          </div>
        </div>
      </td>
      <td className="px-2 py-1.5 text-right">
        {selectedValue !== null ? (
          <span className="font-mono text-[12px] font-extrabold tabular-nums text-lime-200">
            {signed(selectedValue)}
            {fmt(Math.abs(selectedValue))}%
          </span>
        ) : (
          <span className="font-mono text-[10px] text-slate-600">—</span>
        )}
      </td>
    </tr>
  );
}

function GroupHeaderRow({ label, hint }: { label: string; hint: string }) {
  return (
    <tr className="border-t border-slate-700/60 bg-slate-900/40">
      <td
        colSpan={11}
        className="sticky left-0 z-[1] bg-slate-900/40 px-3 py-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-200"
      >
        {label} <span className="ml-2 font-mono text-[9.5px] text-slate-500">· {hint}</span>
      </td>
    </tr>
  );
}

function NumericCell({
  value,
  onChange,
  tone,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  tone: "value" | "adj" | "adj-sub";
  suffix?: string;
}) {
  const display = suffix ? `${value.toFixed(0)}${suffix}` : value === 0 ? "0%" : `${fmtSigned(value)}%`;
  const colourClass =
    tone === "value"
      ? "text-lime-200 font-extrabold text-[12px]"
      : value === 0
        ? "text-slate-500"
        : value > 0
          ? "text-amber-200"
          : "text-emerald-200";

  return (
    <input
      type="text"
      key={`${display}`}
      defaultValue={display}
      onBlur={(e) => {
        const parsed = parsePct(e.target.value);
        if (parsed !== null) onChange(parsed);
        else e.target.value = display;
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          (e.target as HTMLInputElement).value = display;
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={`w-full rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-right font-mono text-[10.5px] tabular-nums hover:border-slate-700/60 focus:border-lime-300/50 focus:bg-slate-900/60 focus:outline-none ${colourClass}`}
      aria-label="Adjustment value (%)"
    />
  );
}

// ─── Segment yield · base por segmento (TRAMO 3b) ────────────────────

function SegmentYieldTable({
  policy,
  previewSegment,
  onSegmentBandChange,
  onPreviewSegmentChange,
}: {
  policy: DynamicCapRatePolicy;
  previewSegment: SegmentId;
  onSegmentBandChange: (seg: SegmentId, patch: { band_low?: number; band_high?: number }) => void;
  onPreviewSegmentChange: (seg: SegmentId) => void;
}) {
  return (
    <section className="mb-5 rounded-md border border-lime-300/20 bg-slate-950/40 p-4">
      <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.22em] text-lime-300/80">
        Base por segmento · Segment yield
      </p>
      <p className="mt-1 max-w-3xl font-mono text-[10.5px] leading-relaxed text-slate-400">
        La base del cap rate es el PRIOR institucional por segmento (no una media de comps · las
        transacciones reales no traen cap rate). Regla uniforme: <span className="text-slate-200">prior = punto medio de la banda − 0,25pp</span>.
        Edita la banda de mercado → el prior se recalcula. €/llave + n = respaldo real (CoStar);
        procedencia <code className="text-slate-300">expert_prior</code> hasta anclar con ADR por segmento.
      </p>
      <div className="mt-3 overflow-x-auto rounded-md border border-slate-800/60">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-900/60 text-left text-slate-400">
              {["Segmento", "Banda baja", "Banda alta", "Prior (regla)", "€/llave", "n tx", "Procedencia"].map((h) => (
                <th key={h} className="px-3 py-2 font-headline text-[9px] font-bold uppercase tracking-[0.16em]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEGMENTS.map((seg) => {
              const p = policy.segment_base_priors[seg];
              const sel = seg === previewSegment;
              return (
                <tr
                  key={seg}
                  onClick={() => onPreviewSegmentChange(seg)}
                  className={`cursor-pointer border-t border-slate-800/60 ${sel ? "bg-lime-300/10" : "hover:bg-slate-900/40"}`}
                >
                  <td className="px-3 py-1.5 font-headline text-[11px] font-bold text-slate-100">{SEGMENT_LABELS[seg]}</td>
                  <td className="px-2 py-1 text-right"><div className="w-16"><ScoreKnob label="" value={p.band_low} onChange={(v) => onSegmentBandChange(seg, { band_low: v })} /></div></td>
                  <td className="px-2 py-1 text-right"><div className="w-16"><ScoreKnob label="" value={p.band_high} onChange={(v) => onSegmentBandChange(seg, { band_high: v })} /></div></td>
                  <td className="px-3 py-1.5 text-right font-mono text-[12px] font-extrabold tabular-nums text-lime-200">{fmt(p.base_pct)}%</td>
                  <td className="px-3 py-1.5 text-right font-mono text-[10.5px] text-slate-300">{p.eur_per_key ? `€${(p.eur_per_key / 1000).toFixed(0)}k` : "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-[10.5px] text-slate-400">{p.n_tx}</td>
                  <td className="px-3 py-1.5 font-mono text-[9.5px] text-slate-500">{p.provenance}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── HotelVALORA Score factor · single matrix row (compset-relative) ──

function ScoreMatrixRow({
  policy,
  onChange,
}: {
  policy: ScoreAdjustmentPolicy;
  onChange: (patch: Partial<ScoreAdjustmentPolicy>) => void;
}) {
  // Preview · synthesize a compset from mean + σ so the SELECTED cell shows a
  // live adjustment (the engine computes the real one per hotel vs its compset).
  const [subj, setSubj] = useState(8.6);
  const [mean, setMean] = useState(8.0);
  const [std, setStd] = useState(0.5);
  const peers = [mean - std, mean - std, mean + std, mean + std]; // mean=mean · pop σ=std · n=4
  const result = useMemo(
    () => computeScoreCapAdjustment({ hotel_quality: subj, compset_qualities: peers }, policy),
    [subj, mean, std, policy],
  );

  return (
    <tr className="border-t border-slate-800/60 bg-slate-900/20">
      <td className="sticky left-0 z-[1] bg-slate-950 px-3 py-2 align-top">
        <div className="font-headline text-[11px] font-bold text-slate-100">HotelVALORA Score</div>
        <div className="mt-0.5 font-mono text-[9px] italic text-slate-500">calidad sin Class · vs compset</div>
      </td>
      <td className="px-2 py-2" colSpan={9}>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <ScoreKnob label="Tope premio (−pp)" value={policy.max_premium_pp} onChange={(v) => onChange({ max_premium_pp: Math.abs(v) })} />
          <ScoreKnob label="Tope castigo (+pp)" value={policy.max_penalty_pp} onChange={(v) => onChange({ max_penalty_pp: Math.abs(v) })} />
          <ScoreKnob label="Paso premio" value={policy.premium_step_pp} onChange={(v) => onChange({ premium_step_pp: Math.abs(v) })} />
          <ScoreKnob label="Paso castigo" value={policy.penalty_step_pp} onChange={(v) => onChange({ penalty_step_pp: Math.abs(v) })} />
          {policy.sigma_cuts.map((c, i) => (
            <ScoreKnob
              key={i}
              label={`σ-corte ${i + 1}`}
              value={c}
              onChange={(v) => {
                const next = [...policy.sigma_cuts];
                next[i] = v;
                onChange({ sigma_cuts: next });
              }}
            />
          ))}
          <ScoreKnob label="Mín. compset N" value={policy.min_compset_n} onChange={(v) => onChange({ min_compset_n: Math.round(v) })} step={1} />
          <span className="font-mono text-[9px] text-slate-600">vs compset · escalones −0,30 / +0,15pp</span>
          <span className="mx-1 h-6 w-px bg-slate-700/60" />
          <ScoreKnob label="prev · score" value={subj} onChange={setSubj} />
          <ScoreKnob label="prev · media" value={mean} onChange={setMean} />
          <ScoreKnob label="prev · σ" value={std} onChange={setStd} />
          <span className="font-mono text-[9px] text-slate-600">{result.label}</span>
        </div>
      </td>
      <td className="px-2 py-2 text-right align-middle">
        <span className={`font-mono text-[12px] font-extrabold tabular-nums ${result.adjustment_pp < 0 ? "text-emerald-200" : result.adjustment_pp > 0 ? "text-amber-200" : "text-slate-500"}`}>
          {result.adjustment_pp > 0 ? "+" : ""}{fmt(result.adjustment_pp)}%
        </span>
      </td>
    </tr>
  );
}

function ScoreKnob({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="font-headline text-[8px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input
        type="number"
        step={step ?? 0.05}
        defaultValue={value}
        key={`${label}-${value}`}
        onBlur={(e) => {
          const n = Number.parseFloat(e.target.value.replace(",", "."));
          if (Number.isFinite(n)) onChange(n);
          else e.target.value = String(value);
        }}
        className="w-20 rounded-sm border border-slate-700/60 bg-slate-900/40 px-1.5 py-1 text-right font-mono text-[10.5px] tabular-nums text-slate-100 focus:border-lime-300/60 focus:outline-none"
      />
    </label>
  );
}

// ─── Rationale narrative panel ───────────────────────────────────────

function RationalePanel({
  policy,
  previewCategory,
  previewSize,
  previewReno,
  previewScn,
  previewOperator,
  previewLiquidity,
  result,
  market,
  euribor,
}: {
  policy: DynamicCapRatePolicy;
  previewCategory: StarCategoryId;
  previewSize: SizeTierId;
  previewReno: RenovationOptionId;
  previewScn: ScenarioOptionId;
  previewOperator: OperatorOptionId;
  previewLiquidity: LiquidityBandId;
  result: ReturnType<typeof computeForCell>;
  market: string;
  euribor: number;
}) {
  const sizeLabel = SIZE_TIERS.find((s) => s.id === previewSize)?.label ?? previewSize;
  const renoLabel = RENOVATION_OPTIONS.find((r) => r.id === previewReno)?.label ?? previewReno;
  const scnLabel = SCENARIO_OPTIONS.find((s) => s.id === previewScn)?.label ?? previewScn;
  const operatorLabel = OPERATOR_OPTIONS.find((o) => o.id === previewOperator)?.label ?? previewOperator;
  const liquidityLabel = LIQUIDITY_OPTIONS.find((o) => o.id === previewLiquidity)?.label ?? previewLiquidity;

  const lines: Array<{ label: string; value: string; tag?: string }> = [
    { label: "Base Market Yield", value: `${fmt(policy.base_market_yield_pct)}%`, tag: `${market} · comps (fallback)` },
    { label: "Category", value: `${previewCategory.replace("star", "*")} · ${categoryTier(previewCategory)}` },
    { label: "Size", value: `${sizeLabel} keys` },
    { label: "Renovation", value: renoLabel },
    { label: "Operator", value: operatorLabel },
    { label: "Liquidity", value: liquidityLabel },
    { label: "Scenario", value: scnLabel },
    { label: "Macro", value: `Euribor 12M ${euribor.toFixed(2)}% (LT mean ${policy.macro_long_term_mean_pct.toFixed(2)}%)` },
  ];

  return (
    <div className="mt-5 grid gap-4 rounded-md border border-slate-800/60 bg-slate-950/40 p-4 sm:grid-cols-[1fr_1fr]">
      <div>
        <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Rationale · source breakdown
        </p>
        <ul className="mt-2 space-y-1.5">
          {lines.map((l) => (
            <li
              key={l.label}
              className="flex items-baseline justify-between gap-3 border-b border-slate-800/40 pb-1.5 last:border-b-0"
            >
              <span className="font-mono text-[10.5px] text-slate-400">{l.label}</span>
              <span className="text-right font-mono text-[11px] font-bold text-slate-100">
                {l.value}
                {l.tag && <span className="ml-2 font-normal text-slate-500">· {l.tag}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Narrative · for IC defence
        </p>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-300">
          {policy.base_market_yield_source}. Tras aplicar los ajustes por categoría
          ({signed(result.category)}{fmt(Math.abs(result.category))}%),{" "}
          tamaño ({signed(result.size)}{fmt(Math.abs(result.size))}%),{" "}
          estado de renovación ({signed(result.renovation)}{fmt(Math.abs(result.renovation))}%),{" "}
          operador ({signed(result.operator)}{fmt(Math.abs(result.operator))}%),{" "}
          liquidez ({signed(result.liquidity)}{fmt(Math.abs(result.liquidity))}%),{" "}
          escenario {scnLabel.toLowerCase()} ({signed(result.scenario)}{fmt(Math.abs(result.scenario))}%) y{" "}
          régimen macro ({signed(result.macro)}{fmt(Math.abs(result.macro))}%), el cap rate dinámico
          recomendado para el activo seleccionado es{" "}
          <span className="font-extrabold text-lime-200">{fmt(result.total)}%</span>.
        </p>
        <p className="mt-3 font-mono text-[9.5px] text-slate-500">
          Esta lógica vive en <code className="text-slate-400">lib/underwriting/cap-rate-engine/</code> · cada
          underwriting consume estos valores y re-genera la trazabilidad institucional automáticamente.
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function categoryTier(c: StarCategoryId): string {
  return c === "5star" ? "Luxury" : c === "4star" ? "Upscale" : "Midscale";
}

function fmt(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function fmtSigned(n: number): string {
  if (n === 0) return "0";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2).replace(".", ",")}`;
}

function signed(n: number): string {
  if (n === 0) return "";
  return n > 0 ? "+" : "−";
}

function parsePct(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace("%", "").replace(",", ".").replace("bps", "").trim();
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
