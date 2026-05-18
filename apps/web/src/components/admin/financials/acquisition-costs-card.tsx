"use client";

import { useMemo, useState } from "react";
import { Coins, HelpCircle } from "lucide-react";
import {
  ACQUISITION_COST_POLICY_DEFAULTS,
  ACQ_COST_UNITS,
  ACQ_GRID_CELLS,
  SIZE_TIERS,
  computeAcquisitionCostsForCell,
  type AcquisitionCostPolicy,
  type AcquisitionCostUnitId,
  type SizeTierId,
} from "@/lib/admin/financials/acquisition-cost-policy";
import type { StarCategoryId } from "@/lib/admin/financials/defaults";
import { useDraftedOverrides } from "@/lib/admin/financials/use-overrides";
import { SaveBar } from "./save-bar";

/**
 * Acquisition Costs · institutional admin panel.
 *
 * Top section of /user/admin/financials. NOT a settings panel · IS the
 * acquisition policy layer that the underwriting engine consumes via
 * `investment.compute`. Operator-tunable transaction-friction matrix
 * with per-line unit awareness, country / VAT / SPV future hooks, and
 * IC-defensible tooltips.
 *
 * Layout (matches dynamic-cap-rate-card visual aesthetic):
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ HERO · live total · % of asking · split per line             │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ PREVIEW CONTROLS · category + size to drive hero math        │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ MATRIX · 9 columns × 5 lines · unit dropdown per line        │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ POLICY META · country · VAT regime · SPV type                │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Visual hierarchy chosen by the operator (per docs):
 *   1. Acquisition Costs  (this card)
 *   2. Dynamic Cap Rate
 *   3. Financial Structure
 *   4. CAPEX
 *
 * Engine integration · Block 7 wires the live policy → underwriting
 * inputs. Today the underwriting engine carries its own defaults that
 * match this card's defaults · operator editing the admin panel is
 * persisted but does not yet flow to the engine.
 */

const PREVIEW_DEFAULTS = {
  category: "4star" as StarCategoryId,
  size: "large" as SizeTierId,
  asking_price_eur: 82_300_000,
  rooms: 256,
  total_sqm: 15_450,
};

export function AcquisitionCostsCard() {
  const ov = useDraftedOverrides<AcquisitionCostPolicy>(
    "admin.financials.acquisition-cost-policy.v1",
    ACQUISITION_COST_POLICY_DEFAULTS,
  );
  const policy = ov.draft;

  const [previewCategory, setPreviewCategory] = useState<StarCategoryId>(PREVIEW_DEFAULTS.category);
  const [previewSize, setPreviewSize] = useState<SizeTierId>(PREVIEW_DEFAULTS.size);

  const result = useMemo(
    () =>
      computeAcquisitionCostsForCell(policy, previewCategory, previewSize, {
        asking_price_eur: PREVIEW_DEFAULTS.asking_price_eur,
        rooms: PREVIEW_DEFAULTS.rooms,
        total_sqm: PREVIEW_DEFAULTS.total_sqm,
      }),
    [policy, previewCategory, previewSize],
  );

  function setMatrixCell(lineId: string, cat: StarCategoryId, size: SizeTierId, v: number) {
    ov.setDraft((p) => ({
      ...p,
      lines: p.lines.map((line) =>
        line.id === lineId
          ? { ...line, matrix: { ...line.matrix, [cat]: { ...line.matrix[cat], [size]: round2(v) } } }
          : line,
      ),
    }));
  }

  function setLineUnit(lineId: string, unit: AcquisitionCostUnitId) {
    ov.setDraft((p) => ({
      ...p,
      lines: p.lines.map((line) => (line.id === lineId ? { ...line, unit } : line)),
    }));
  }

  function setMeta<K extends "country" | "vat_regime" | "spv_type">(key: K, value: AcquisitionCostPolicy[K]) {
    ov.setDraft((p) => ({ ...p, [key]: value }));
  }

  return (
    <section className="rounded-2xl border border-lime-300/30 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
            <Coins size={11} />
            Acquisition Costs
          </p>
          <h2 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-white">
            Institutional transaction assumptions · acquisition friction · legal & tax structure
          </h2>
          <p className="mt-1 max-w-3xl font-mono text-[11px] text-slate-400">
            Per-line, per-(category × size) matrix · unit-aware (%/€·key/€·total/€·m²) · feeds
            <code className="mx-1 text-slate-300">investment.compute</code> → acquisition cost schedule
            → total investment stack → yield calculations.
          </p>
        </div>
        <SaveBar
          isDirty={ov.isDirty}
          hydrated={ov.hydrated}
          lastSavedAt={ov.lastSavedAt}
          onSave={ov.save}
          onDiscard={ov.discard}
          onReset={ov.reset}
          resetConfirmText="Reset ALL Acquisition Cost policy overrides and clear local storage?"
        />
      </header>

      {/* ─── Hero · live preview ────────────────────────────────────── */}
      <HeroBlock
        result={result}
        previewCategory={previewCategory}
        previewSize={previewSize}
        askingPrice={PREVIEW_DEFAULTS.asking_price_eur}
        rooms={PREVIEW_DEFAULTS.rooms}
      />

      {/* ─── Preview controls ───────────────────────────────────────── */}
      <div className="mb-5 mt-4 grid gap-3 rounded-md border border-slate-800/60 bg-slate-950/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <PreviewMeta label="Sample asking" value={fmtEUR(PREVIEW_DEFAULTS.asking_price_eur)} />
        <PreviewMeta label="Sample rooms" value={`${PREVIEW_DEFAULTS.rooms} keys · ${PREVIEW_DEFAULTS.total_sqm.toLocaleString("es-ES")} m²`} />
      </div>

      {/* ─── Matrix table ───────────────────────────────────────────── */}
      <PolicyMatrix
        policy={policy}
        previewCategory={previewCategory}
        previewSize={previewSize}
        onMatrixCellChange={setMatrixCell}
        onLineUnitChange={setLineUnit}
        result={result}
      />

      {/* ─── Meta panel · country / VAT / SPV ──────────────────────── */}
      <MetaPanel policy={policy} onChange={setMeta} />
    </section>
  );
}

// ─── Hero · live preview ─────────────────────────────────────────────

function HeroBlock({
  result,
  previewCategory,
  previewSize,
  askingPrice,
  rooms,
}: {
  result: ReturnType<typeof computeAcquisitionCostsForCell>;
  previewCategory: StarCategoryId;
  previewSize: SizeTierId;
  askingPrice: number;
  rooms: number;
}) {
  const sizeLabel = SIZE_TIERS.find((s) => s.id === previewSize)?.label ?? previewSize;
  return (
    <div className="grid gap-4 rounded-xl border border-lime-300/30 bg-lime-300/5 p-4 lg:grid-cols-[1.1fr_1.4fr]">
      <div>
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-lime-300/80">
          Total acquisition friction · live
        </p>
        <p className="mt-1 font-mono text-[34px] font-extrabold leading-none tabular-nums text-lime-200">
          {fmtEUR(result.total_eur)}
        </p>
        <p className="mt-2 font-mono text-[11px] text-slate-300">
          {fmtPct(result.total_pct_of_asking * 100)} of asking ·{" "}
          {fmtEUR(rooms > 0 ? result.total_eur / rooms : 0)} / key
        </p>
        <p className="mt-1 font-mono text-[10.5px] text-slate-400">
          {previewCategory.replace("star", "*")} · {sizeLabel} keys · sample {fmtEUR(askingPrice)} asking
        </p>
      </div>
      <div>
        <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Per-line breakdown
        </p>
        <ul className="mt-1 space-y-1">
          {result.per_line.map((l) => (
            <li
              key={l.id}
              className="flex items-baseline justify-between gap-2 border-b border-slate-800/40 pb-1 last:border-b-0"
            >
              <span className="font-mono text-[11px] text-slate-300">{l.label}</span>
              <span className="text-right font-mono text-[11px] font-bold tabular-nums text-slate-100">
                {fmtEUR(l.absolute_eur)}
                <span className="ml-2 font-normal text-slate-500">
                  {fmtUnitInline(l.unit, l.raw_value)}
                </span>
              </span>
            </li>
          ))}
          <li className="mt-1.5 flex items-baseline justify-between gap-2 border-t border-lime-300/30 pt-1.5">
            <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.22em] text-lime-300">
              Total
            </span>
            <span className="font-mono text-[14px] font-extrabold tabular-nums text-lime-200">
              {fmtEUR(result.total_eur)}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

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

function PreviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </span>
      <span className="rounded-md border border-slate-800/60 bg-slate-900/40 px-2 py-1.5 font-mono text-[11px] text-slate-300">
        {value}
      </span>
    </div>
  );
}

// ─── Matrix table ────────────────────────────────────────────────────

function PolicyMatrix({
  policy,
  previewCategory,
  previewSize,
  onMatrixCellChange,
  onLineUnitChange,
  result,
}: {
  policy: AcquisitionCostPolicy;
  previewCategory: StarCategoryId;
  previewSize: SizeTierId;
  onMatrixCellChange: (lineId: string, cat: StarCategoryId, size: SizeTierId, v: number) => void;
  onLineUnitChange: (lineId: string, u: AcquisitionCostUnitId) => void;
  result: ReturnType<typeof computeAcquisitionCostsForCell>;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-800/60">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-slate-900/60 text-left text-slate-400">
            <th className="sticky left-0 z-10 bg-slate-900/60 px-3 py-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]">
              Acquisition line
            </th>
            {ACQ_GRID_CELLS.map((c) => (
              <th
                key={`${c.category}-${c.size}`}
                className={`px-2 py-2 text-right font-headline text-[9px] font-bold uppercase tracking-[0.16em] ${
                  c.category === previewCategory && c.size === previewSize ? "bg-lime-300/10 text-lime-300" : ""
                }`}
              >
                {c.label}
              </th>
            ))}
            <th className="px-2 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]">
              Unit
            </th>
            <th className="px-2 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-lime-300/80">
              Selected
            </th>
          </tr>
        </thead>
        <tbody>
          {policy.lines.map((line) => {
            const selectedRaw = line.matrix[previewCategory][previewSize];
            const selectedAbs = result.per_line.find((r) => r.id === line.id)?.absolute_eur ?? 0;
            return (
              <tr key={line.id} className="border-t border-slate-800/60">
                <td className="sticky left-0 z-[1] bg-slate-950 px-3 py-2.5 align-top">
                  <div className="flex items-center gap-1.5">
                    <span className="font-headline text-[11px] font-bold text-slate-100">{line.label}</span>
                    <Tooltip text={line.description} />
                  </div>
                </td>
                {ACQ_GRID_CELLS.map((c) => {
                  const v = line.matrix[c.category][c.size];
                  const isPreview = c.category === previewCategory && c.size === previewSize;
                  return (
                    <td
                      key={`${c.category}-${c.size}`}
                      className={`px-1 py-1.5 text-right ${isPreview ? "bg-lime-300/10" : ""}`}
                    >
                      <NumericCell
                        value={v}
                        unit={line.unit}
                        onChange={(nv) => onMatrixCellChange(line.id, c.category, c.size, nv)}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-right">
                  <select
                    value={line.unit}
                    onChange={(e) => onLineUnitChange(line.id, e.target.value as AcquisitionCostUnitId)}
                    className="rounded-md border border-slate-700/60 bg-slate-900/40 px-1.5 py-1 font-mono text-[10px] text-slate-200 focus:border-lime-300/60 focus:outline-none"
                  >
                    {ACQ_COST_UNITS.filter((u) => line.allowed_units.includes(u.id)).map((u) => (
                      <option key={u.id} value={u.id} className="bg-slate-900">
                        {u.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5 text-right">
                  <div className="font-mono text-[11.5px] font-extrabold tabular-nums text-lime-200">
                    {fmtEUR(selectedAbs)}
                  </div>
                  <div className="font-mono text-[9.5px] text-slate-500">
                    {fmtUnitInline(line.unit, selectedRaw)}
                  </div>
                </td>
              </tr>
            );
          })}
          {/* Total row */}
          <tr className="border-t-2 border-lime-300/40 bg-lime-300/5">
            <td className="sticky left-0 z-[1] bg-lime-300/5 px-3 py-2.5 font-headline text-[12px] font-extrabold uppercase tracking-[0.18em] text-lime-300">
              Acquisition friction · total
            </td>
            <td className="px-2 py-2.5 text-right font-mono text-[10px] text-slate-400" colSpan={10}>
              {fmtPct(result.total_pct_of_asking * 100)} of asking
            </td>
            <td className="px-2 py-2.5 text-right font-mono text-[14px] font-extrabold tabular-nums text-lime-200">
              {fmtEUR(result.total_eur)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function NumericCell({
  value,
  unit,
  onChange,
}: {
  value: number;
  unit: AcquisitionCostUnitId;
  onChange: (v: number) => void;
}) {
  const display = formatRaw(value, unit);
  const colourClass = value === 0 ? "text-slate-500" : "text-slate-100";
  return (
    <input
      type="text"
      key={display}
      defaultValue={display}
      onBlur={(e) => {
        const parsed = parseRaw(e.target.value, unit);
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
      aria-label="Acquisition cost value"
    />
  );
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <HelpCircle size={11} className="text-slate-500 hover:text-lime-300" />
      <span className="pointer-events-none absolute left-4 top-1/2 z-20 hidden w-64 -translate-y-1/2 rounded-md border border-slate-700/60 bg-slate-950 p-2 font-mono text-[9.5px] leading-relaxed text-slate-300 shadow-xl group-hover:block">
        {text}
      </span>
    </span>
  );
}

// ─── Meta panel · country / VAT / SPV ────────────────────────────────

function MetaPanel({
  policy,
  onChange,
}: {
  policy: AcquisitionCostPolicy;
  onChange: <K extends "country" | "vat_regime" | "spv_type">(key: K, value: AcquisitionCostPolicy[K]) => void;
}) {
  return (
    <div className="mt-5 grid gap-3 rounded-md border border-slate-800/60 bg-slate-950/40 p-3 sm:grid-cols-3">
      <MetaField
        label="Country"
        value={policy.country}
        onChange={(v) => onChange("country", v)}
        options={["España", "Portugal", "France", "Italy", "United Kingdom", "Germany"]}
      />
      <MetaField
        label="VAT regime"
        value={policy.vat_regime}
        onChange={(v) => onChange("vat_regime", v as AcquisitionCostPolicy["vat_regime"])}
        options={[
          { id: "spanish_iva", label: "Spanish IVA" },
          { id: "exempt", label: "Exempt" },
          { id: "operator_passes_through", label: "Operator passes through" },
        ]}
      />
      <MetaField
        label="SPV type"
        value={policy.spv_type}
        onChange={(v) => onChange("spv_type", v as AcquisitionCostPolicy["spv_type"])}
        options={[
          { id: "sociedad_limitada", label: "Sociedad Limitada" },
          { id: "socimi", label: "SOCIMI" },
          { id: "fondo_inmobiliario", label: "Fondo Inmobiliario" },
          { id: "branch", label: "Branch" },
        ]}
      />
    </div>
  );
}

function MetaField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<string | { id: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-700/60 bg-slate-900/40 px-2 py-1.5 font-mono text-[11px] text-slate-100 focus:border-lime-300/60 focus:outline-none"
      >
        {options.map((o) =>
          typeof o === "string" ? (
            <option key={o} value={o} className="bg-slate-900">
              {o}
            </option>
          ) : (
            <option key={o.id} value={o.id} className="bg-slate-900">
              {o.label}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

// ─── Format / parse helpers ──────────────────────────────────────────

function formatRaw(value: number, unit: AcquisitionCostUnitId): string {
  switch (unit) {
    case "pct_total":
      return value === 0 ? "0%" : `${value.toFixed(2).replace(".", ",")}%`;
    case "eur_per_room":
    case "eur_total":
    case "eur_per_sqm":
      return value === 0 ? "0" : new Intl.NumberFormat("es-ES").format(value);
  }
}

function parseRaw(raw: string, unit: AcquisitionCostUnitId): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace("%", "")
    .replace(/\s/g, "")
    .replace("€", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  if (!cleaned) return 0;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  return unit === "pct_total" ? n : Math.round(n);
}

function fmtEUR(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(Math.round((n / 1_000_000) * 10) / 10).toString().replace(".", ",")}M €`;
  if (abs >= 1_000) return `${(Math.round((n / 1_000) * 10) / 10).toString().replace(".", ",")}k €`;
  return `${new Intl.NumberFormat("es-ES").format(Math.round(n))} €`;
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  return `${n.toFixed(2).replace(".", ",")}%`;
}

function fmtUnitInline(unit: AcquisitionCostUnitId, raw: number): string {
  if (raw === 0) return "0";
  switch (unit) {
    case "pct_total":
      return `${raw.toFixed(2).replace(".", ",")}%`;
    case "eur_per_room":
      return `${new Intl.NumberFormat("es-ES").format(raw)} €/key`;
    case "eur_total":
      return `${new Intl.NumberFormat("es-ES").format(raw)} € total`;
    case "eur_per_sqm":
      return `${new Intl.NumberFormat("es-ES").format(raw)} €/m²`;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
