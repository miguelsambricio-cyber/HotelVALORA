"use client";

import { SectionShell } from "../primitives/section-shell";
import { EditableTile } from "../primitives/editable-tile";
import { SortableGrid } from "../edit/sortable-grid";
import type { UnderwritingBundle } from "@/lib/underwriting/types";
import type { ScenarioCatalogEntry, UnderwritingInputOverrides } from "@/lib/underwriting/defaults";
import { cn } from "@/lib/utils";

/**
 * Section 01 · Executive Summary · institutional underwriting control layer.
 *
 * Flat flow · no nested boxes · no risk panel:
 *   1. Editable drivers (blue) + computed outputs (slate) in one grid
 *   2. Scenario picker strip (full-width segmented control)
 *   3. Returns KPI grid (scenario-sensitive results)
 *
 * Live editable drivers (re-prices the engine on commit):
 *   · N° Keys · Asking Price · Exit Year · LTV %
 */
export function ExecutiveSummarySection({
  bundle,
  scenarioId,
  scenarioCatalog,
  onScenarioChange,
  onOverrideChange,
}: {
  bundle: UnderwritingBundle;
  scenarioId: string;
  scenarioCatalog: ScenarioCatalogEntry[];
  onScenarioChange: (id: string) => void;
  onOverrideChange: (patch: UnderwritingInputOverrides) => void;
}) {
  const asset = bundle.inputs.asset;
  const acq = bundle.inputs.acquisition;
  const c = bundle.computed;
  const exit = c.exit;
  const inv = c.investment;
  const capExit = c.cap_rate.exit;
  // Stabilized yield · operator wants Y5 explicitly (independent of exit year)
  const stabilisedYieldY5 = inv.stabilized_yield_progression[5] ?? 0;
  // % LTV combined · displays the AGGREGATE LTV (total senior + CAPEX debt
  // divided by hotel value) · institutional convention. On edit, sets both
  // tranches to the entered percentage so they stay in lock-step.
  const aggregateLtvPct = inv.hotel_value > 0
    ? (c.financing.total_principal / inv.hotel_value) * 100
    : 0;

  return (
    <SectionShell
      number={1}
      anchorId="executive-summary"
      title="Executive Summary"
      subtitle={`${asset.hotel_name ?? "Unnamed asset"} · ${asset.submarket} · ${asset.rooms} keys · ${asset.category.replace("star", "*")} ${tierLabel(asset.category)}`}
      status={{ label: "Investment committee draft", tone: "info" }}
      summary={
        <div className="space-y-6 print:space-y-4">
          {/* Drivers · 4 editable (blue) + 4 computed · reorderable in edit mode */}
          <SortableGrid
            gridId="exec-summary.drivers"
            className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4"
            items={[
              { id: "keys", content: (
                <EditableTile label="N° Keys" value={asset.rooms} format="integer" min={1}
                  onCommit={(rooms) => onOverrideChange({ rooms })} sub="re-prices the underwriting" />
              ) },
              { id: "asking-price", content: (
                <EditableTile label="Asking Price" value={acq.asking_price} format="currency" min={0}
                  onCommit={(asking_price) => onOverrideChange({ asking_price })} sub="hotel value scales proportionally" />
              ) },
              { id: "exit-year", content: (
                <EditableTile label="Exit Year" value={exit.exit_year} format="years" min={1} max={10}
                  onCommit={(exit_year) => onOverrideChange({ exit_year })} sub="hold period · 1-10y" />
              ) },
              { id: "ltv-pct", content: (
                <EditableTile label="% LTV" value={aggregateLtvPct} format="percent" min={0} max={100}
                  onCommit={(v) => onOverrideChange({ ltv_pct: v, ltc_pct: v })}
                  sub="aggregate · senior + CAPEX / hotel value" />
              ) },
              { id: "total-investment", content: (
                <DriverTile label="Total Investment" value={fmtEUR(inv.total_building_cost)} sub={`${fmtEUR(div(inv.total_building_cost, asset.rooms))} / key`} highlight />
              ) },
              { id: "equity-investment", content: (
                <DriverTile label="Equity Investment" value={fmtEUR(exit.equity_investment)} sub={`${fmtPct((exit.equity_investment / Math.max(inv.total_building_cost, 1)) * 100)} of total`} />
              ) },
              { id: "dynamic-cap-rate", content: (
                <EditableTile
                  label="Dynamic Cap Rate"
                  value={capExit.used_pct}
                  format="percent"
                  min={0}
                  max={30}
                  onCommit={(exit_cap_rate_pct) => onOverrideChange({ exit_cap_rate_pct })}
                  sub={capExit.source === "dynamic" ? "Dynamic · exit yield" : "Manual override"}
                />
              ) },
              { id: "exit-price", content: (
                <DriverTile label="Exit Price" value={fmtEUR(exit.exit_price)} sub={`${fmtEUR(exit.exit_price_per_room)} / key · Y${exit.exit_year}`} />
              ) },
            ]}
          />

          {/* Scenario picker · drives the engine re-price */}
          <ScenarioStrip
            catalog={scenarioCatalog}
            activeId={scenarioId}
            onChange={onScenarioChange}
          />

          {/* Returns · scenario-sensitive · reorderable in edit mode */}
          <SortableGrid
            gridId="exec-summary.returns"
            className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            items={[
              { id: "project-irr", content: (
                <ResultTile label="Project IRR" value={fmtPct(exit.project_irr_pct)} sub="Unlevered · pre-tax" tone={irrTone(exit.project_irr_pct, 8)} />
              ) },
              { id: "equity-irr", content: (
                <ResultTile label="Equity IRR" value={fmtPct(exit.equity_irr_pct)} sub="Levered · post-tax" tone={irrTone(exit.equity_irr_pct, 12)} highlight />
              ) },
              { id: "moic", content: (
                <ResultTile label="MOIC" value={`${exit.moic.toFixed(2).replace(".", ",")}×`} sub="equity multiple" tone={moicTone(exit.moic)} />
              ) },
              { id: "stabilised-yield-y5", content: (
                <ResultTile label="Stabilized Yield" value={fmtPct(stabilisedYieldY5 * 100)} sub="Year 5" />
              ) },
            ]}
          />
        </div>
      }
    />
  );
}

// ─── Driver tile (computed · neutral or highlight) ───────────────────

function DriverTile({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 print:break-inside-avoid",
        highlight
          ? "border-forest-900/30 bg-forest-50"
          : "border-slate-200 bg-white",
      )}
    >
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-[16px] font-extrabold tabular-nums sm:text-[17px]",
          highlight ? "text-forest-900" : "text-slate-900",
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 truncate font-mono text-[9.5px] text-slate-500">
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Result tile (Returns · tone-aware) ──────────────────────────────

function ResultTile({
  label,
  value,
  sub,
  tone = "neutral",
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "ok" | "warn" | "negative";
  highlight?: boolean;
}) {
  const valueTone =
    tone === "ok" ? "text-emerald-700"
    : tone === "warn" ? "text-amber-700"
    : tone === "negative" ? "text-rose-700"
    : highlight ? "text-forest-900"
    : "text-slate-900";
  return (
    <div
      className={cn(
        "rounded-md border p-3 print:break-inside-avoid",
        highlight
          ? "border-forest-900/30 bg-forest-50"
          : "border-slate-200 bg-white",
      )}
    >
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className={cn("mt-1 font-mono text-[16px] font-extrabold tabular-nums sm:text-[17px]", valueTone)}>{value}</p>
      {sub && (
        <p className="mt-0.5 truncate font-mono text-[9.5px] text-slate-500">{sub}</p>
      )}
    </div>
  );
}

// ─── Scenario strip · own row above the Returns KPI grid ────────────

function ScenarioStrip({
  catalog,
  activeId,
  onChange,
}: {
  catalog: ScenarioCatalogEntry[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  const active = catalog.find((s) => s.id === activeId);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50/60 p-3 print:break-inside-avoid print:bg-white">
      <div className="min-w-0">
        <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Cap Rate Scenario
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-slate-500">
          {active?.hint ?? "scenario adjustment applied"}
        </p>
      </div>
      <div
        role="radiogroup"
        aria-label="Cap rate scenario"
        className="ml-auto inline-flex rounded-md border border-slate-200 bg-white p-0.5 print:hidden"
      >
        {catalog.map((s) => {
          const isActive = s.id === activeId;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(s.id)}
              title={s.hint}
              className={cn(
                "rounded-sm px-4 py-1.5 font-headline text-[10.5px] font-extrabold uppercase tracking-[0.18em] transition-colors",
                isActive
                  ? "bg-forest-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      {/* Print-only: render active scenario as a plain badge */}
      <span className="hidden rounded-md bg-emerald-50 px-3 py-1 font-headline text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700 ring-1 ring-emerald-500 print:inline-flex">
        {active?.label ?? activeId}
      </span>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function tierLabel(c: "3star" | "4star" | "5star"): string {
  return c === "5star" ? "Luxury" : c === "4star" ? "Upscale" : "Midscale";
}

function irrTone(irr: number, target: number): "ok" | "warn" | "negative" {
  return irr >= target ? "ok" : irr >= target * 0.7 ? "warn" : "negative";
}

function moicTone(moic: number): "ok" | "warn" | "negative" {
  return moic >= 1.8 ? "ok" : moic >= 1.3 ? "warn" : "negative";
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  return `${n.toFixed(2).replace(".", ",")}%`;
}

function fmtEUR(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(Math.round((n / 1_000_000) * 10) / 10).toString().replace(".", ",")}M €`;
  if (abs >= 1_000) return `${(Math.round((n / 1_000) * 10) / 10).toString().replace(".", ",")}k €`;
  return `${new Intl.NumberFormat("es-ES").format(Math.round(n))} €`;
}

function div(a: number, b: number): number {
  return b > 0 ? a / b : 0;
}
