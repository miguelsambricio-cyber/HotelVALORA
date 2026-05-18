"use client";

import { useState } from "react";
import { SectionShell } from "../primitives/section-shell";
import { RiskIndicator, parseReconciliationWarning } from "../primitives/risk-indicator";
import type { UnderwritingBundle, UnderwritingInputs } from "@/lib/underwriting/types";
import type { ScenarioCatalogEntry } from "@/lib/underwriting/defaults";
import { cn } from "@/lib/utils";

/**
 * Section 01 · Executive Summary · institutional underwriting control layer.
 *
 * 3 blocks · drivers → results → risk · NO narrative · NO accordion chrome.
 *
 *   A · Headline Metrics (DRIVERS)
 *       N° Keys (editable) · Total Investment · Equity · % LTC ·
 *       Dynamic Cap Rate · Hold Period
 *
 *   B · Returns (RESULTS · with inline scenario picker)
 *       Project IRR · Equity IRR · MOIC · Cap Rate Scenario picker ·
 *       Stabilized Yield · Exit Price
 *
 *   C · Risk Indicators
 *       Reconciliation + covenant warnings in wrap-friendly cards
 *
 * All content lives in `summary` slot · no detail accordion · no
 * "Detail schedule" gray bar. The page reads as a single editorial
 * institutional layer.
 */
export function ExecutiveSummarySection({
  bundle,
  scenarioId,
  scenarioCatalog,
  onScenarioChange,
  onAssetChange,
}: {
  bundle: UnderwritingBundle;
  scenarioId: string;
  scenarioCatalog: ScenarioCatalogEntry[];
  onScenarioChange: (id: string) => void;
  onAssetChange: (patch: Partial<UnderwritingInputs["asset"]>) => void;
}) {
  const asset = bundle.inputs.asset;
  const c = bundle.computed;
  const exit = c.exit;
  const inv = c.investment;
  const capEntry = c.cap_rate.entry;
  const capExit = c.cap_rate.exit;
  const stabilisedYield = inv.stabilized_yield_progression[exit.exit_year] ?? 0;
  const ltcPct = inv.total_building_cost > 0
    ? (c.financing.total_principal / inv.total_building_cost) * 100
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
          {/* Drivers · editable N° Keys + investment + LTC + cap + hold */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <EditableKeysTile
              value={asset.rooms}
              onChange={(rooms) => onAssetChange({ rooms })}
            />
            <DriverTile label="Total Investment" value={fmtEUR(inv.total_building_cost)} sub={`${fmtEUR(div(inv.total_building_cost, asset.rooms))} / key`} highlight />
            <DriverTile label="Equity Investment" value={fmtEUR(exit.equity_investment)} sub={`${fmtPct((exit.equity_investment / Math.max(inv.total_building_cost, 1)) * 100)} of total`} />
            <DriverTile label="% LTC" value={fmtPct(ltcPct)} sub={fmtEUR(c.financing.total_principal)} />
            <DriverTile label="Dynamic Cap Rate" value={fmtPct(capEntry.used_pct)} sub={capEntry.source === "dynamic" ? "Dynamic · entry" : "Manual override"} />
            <DriverTile label="Hold Period" value={`${exit.exit_year}y`} sub={`Exit Y${exit.exit_year}`} />
          </div>

          {/* Scenario picker · drives the engine re-price */}
          <ScenarioStrip
            catalog={scenarioCatalog}
            activeId={scenarioId}
            onChange={onScenarioChange}
          />

          {/* Returns · scenario-sensitive */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <ResultTile label="Project IRR" value={fmtPct(exit.project_irr_pct)} sub="unlevered · pre-tax" tone={irrTone(exit.project_irr_pct, 8)} />
            <ResultTile label="Equity IRR" value={fmtPct(exit.equity_irr_pct)} sub="levered · post-tax" tone={irrTone(exit.equity_irr_pct, 12)} highlight />
            <ResultTile label="MOIC" value={`${exit.moic.toFixed(2).replace(".", ",")}×`} sub="equity multiple" tone={moicTone(exit.moic)} />
            <ResultTile label="Stabilised Yield" value={fmtPct(stabilisedYield * 100)} sub={`Year ${exit.exit_year}`} />
            <ResultTile label="Exit Price" value={fmtEUR(exit.exit_price)} sub={`${fmtPct(capExit.used_pct)} exit cap · ${fmtEUR(exit.exit_price_per_room)} / key`} />
          </div>

          {/* Risk indicators · reconciliation + covenant signals */}
          <RiskIndicatorsPanel warnings={c.reconciliation.warnings} />
        </div>
      }
    />
  );
}

// ─── Driver tile (Block A · neutral institutional) ───────────────────

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
          ? "border-lime-300/40 bg-lime-300/5 print:border-emerald-500 print:bg-emerald-50"
          : "border-slate-800/60 bg-slate-900/40 print:border-slate-300 print:bg-white",
      )}
    >
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 print:text-slate-600">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-[17px] font-extrabold tabular-nums",
          highlight ? "text-lime-200 print:text-emerald-700" : "text-white print:text-slate-900",
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 truncate font-mono text-[9.5px] text-slate-500 print:text-slate-600">
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Editable N° Keys tile · drives engine re-run ────────────────────

function EditableKeysTile({
  value,
  onChange,
}: {
  value: number;
  onChange: (rooms: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    const parsed = parseInt(draft.replace(/[^0-9]/g, ""), 10);
    if (Number.isFinite(parsed) && parsed > 0 && parsed !== value) {
      onChange(parsed);
    } else {
      setDraft(String(value));
    }
  };
  return (
    <div className="rounded-md border border-lime-300/40 bg-lime-300/5 p-3 print:break-inside-avoid print:border-emerald-500 print:bg-emerald-50">
      <p className="flex items-center justify-between font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 print:text-slate-600">
        <span>N° Keys</span>
        <span className="rounded bg-lime-300/15 px-1 font-mono text-[8.5px] text-lime-200 ring-1 ring-lime-300/30 print:hidden">
          Edit
        </span>
      </p>
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(String(value));
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="mt-1 w-full rounded-sm border border-transparent bg-transparent px-0 py-0 font-mono text-[17px] font-extrabold tabular-nums text-lime-200 focus:border-lime-300/40 focus:bg-slate-900/60 focus:outline-none print:text-emerald-700"
        aria-label="Number of keys"
      />
      <p className="mt-0.5 font-mono text-[9.5px] text-slate-500 print:text-slate-600">
        re-prices the underwriting
      </p>
    </div>
  );
}

// ─── Result tile (Block B · tone-aware) ──────────────────────────────

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
    tone === "ok" ? "text-emerald-300 print:text-emerald-700"
    : tone === "warn" ? "text-amber-300 print:text-amber-700"
    : tone === "negative" ? "text-rose-300 print:text-rose-700"
    : highlight ? "text-lime-200 print:text-emerald-700"
    : "text-white print:text-slate-900";
  return (
    <div
      className={cn(
        "rounded-md border p-3 print:break-inside-avoid",
        highlight
          ? "border-lime-300/40 bg-lime-300/5 print:border-emerald-500 print:bg-emerald-50"
          : "border-slate-800/60 bg-slate-900/40 print:border-slate-300 print:bg-white",
      )}
    >
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 print:text-slate-600">
        {label}
      </p>
      <p className={cn("mt-1 font-mono text-[17px] font-extrabold tabular-nums", valueTone)}>{value}</p>
      {sub && (
        <p className="mt-0.5 truncate font-mono text-[9.5px] text-slate-500 print:text-slate-600">{sub}</p>
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
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-800/60 bg-slate-950/60 p-3 print:break-inside-avoid print:border-slate-300 print:bg-white">
      <div className="min-w-0">
        <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 print:text-slate-600">
          Cap Rate Scenario
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-slate-400 print:text-slate-600">
          {active?.hint ?? "scenario adjustment applied"}
        </p>
      </div>
      <div
        role="radiogroup"
        aria-label="Cap rate scenario"
        className="ml-auto inline-flex rounded-md border border-slate-700/60 bg-slate-900/60 p-0.5 print:hidden"
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
                  ? "bg-lime-300 text-forest-900 shadow-sm"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white",
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

// ─── Risk indicators panel · grid layout · wrap-friendly ─────────────

function RiskIndicatorsPanel({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <RiskIndicator
          severity="ok"
          label="All institutional invariants pass"
          detail="BS balanced · cash bridge OK · DSCR ≥ 1.0 · DTA ≥ 0 · drawdown ≡ principal · reserves continuous"
        />
      </div>
    );
  }
  const parsed = warnings.map(parseReconciliationWarning);
  const grouped = [...parsed].sort((a, b) => sevOrder(a.severity) - sevOrder(b.severity));
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {grouped.map((p, i) => (
        <RiskIndicator key={i} {...p} />
      ))}
    </div>
  );
}

function sevOrder(s: "ok" | "watch" | "stress" | "info"): number {
  return s === "stress" ? 0 : s === "watch" ? 1 : s === "info" ? 2 : 3;
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
