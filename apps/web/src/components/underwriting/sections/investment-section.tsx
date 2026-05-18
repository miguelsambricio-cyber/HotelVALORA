import { SectionShell } from "../primitives/section-shell";
import { ReconciliationBadge } from "../primitives/reconciliation-badge";
import type {
  BreakdownLine,
  CapexPhase,
  DynamicCapRateResult,
  UnderwritingBundle,
} from "@/lib/underwriting/types";

/**
 * Section 06 · Investment · CAPEX · D&A.
 *
 * Hosts the CORE IP of HotelVALORA:
 *   · Dynamic Cap Rate engine with explicit adjustment stack
 *   · Site Acquisition → Acquisition costs → CAPEX breakdown → Total
 *     Investment memorandum view (institutional, not spreadsheet)
 *   · CAPEX phases (future-proof: multi-wave · operator contribution ·
 *     tenant improvement · ESG retrofit · expansion)
 *   · Stabilised yield progression Y1..Y5+
 *   · D&A schedule (building / MEP) inside its own block
 *
 * Print-ready: edit controls hidden under `print:hidden`, all rationale
 * + outputs render landscape committee-grade.
 */
export function InvestmentSection({ bundle }: { bundle: UnderwritingBundle }) {
  const { cap_rate, investment, periods } = bundle.computed;
  const asset = bundle.inputs.asset;
  const stabilised = investment.stabilized_yield_progression;
  const stabilisedY1ToY5 = stabilised.slice(1, 6);

  return (
    <SectionShell
      number={6}
      anchorId="investment"
      title="Investment · CAPEX · D&A"
      subtitle="Acquisition rationale · pricing justification · institutional underwriting narrative"
      status={{ label: "Memorandum view · Block 3 wires CAPEX phasing", tone: "info" }}
      summary={
        <div className="space-y-3">
          <HeadlineStack
            asset={asset}
            siteAcquisition={investment.site_acquisition_total}
            capexTotal={investment.capex_total}
            totalInvestment={investment.total_building_cost}
          />
          <div className="flex flex-wrap gap-2">
            <ReconciliationBadge status="info" label="Cap Rate engine · placeholder rationale" detail="Block 6 wires MarketEvidence" />
            <ReconciliationBadge status="info" label="CAPEX phasing · single phase MVP" detail="Block 3 phases drawdowns" />
          </div>
        </div>
      }
      detail={
        <div className="space-y-7 print:space-y-5">
          <MemorandumBlock number="A" title="Site Acquisition" subtitle="Pricing · cap-rate rationale · acquisition costs">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
              <AcquisitionSummary
                askingPrice={investment.asking_price}
                hotelValue={investment.hotel_value}
                capRateEntry={cap_rate.entry.used_pct}
                rooms={asset.rooms}
                totalSqm={asset.total_sqm}
              />
              <CapRateRationale dynamic={cap_rate.entry.dynamic} finalPct={cap_rate.entry.used_pct} />
            </div>
            <AcquisitionCostsItemized lines={investment.acquisition} acqCostsTotal={investment.acquisition_fees_taxes} />
          </MemorandumBlock>

          <MemorandumBlock number="B" title="CAPEX Breakdown" subtitle="Hard cost · soft cost · project costs · per-key / per-m² traceability">
            <CapexCategoryTable
              title="Hard Cost"
              lines={investment.capex_hard_cost}
              groupTotal={sumLines(investment.capex_hard_cost)}
            />
            <CapexCategoryTable
              title="Soft Cost"
              lines={investment.capex_soft_cost}
              groupTotal={sumLines(investment.capex_soft_cost)}
            />
            <CapexCategoryTable
              title="Project Costs"
              lines={investment.capex_project}
              groupTotal={sumLines(investment.capex_project)}
            />
            <CapexPhasesBanner phases={investment.capex_phases} />
          </MemorandumBlock>

          <MemorandumBlock number="C" title="Total Investment" subtitle="Composition · stabilised yield progression">
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
          </MemorandumBlock>

          <MemorandumBlock number="D" title="Depreciation & Amortization" subtitle="Building · MEP · straight-line per useful life">
            <DASchedule bundle={bundle} />
          </MemorandumBlock>
        </div>
      }
    />
  );
}

// ─── Memorandum primitives ────────────────────────────────────────────

function MemorandumBlock({
  number,
  title,
  subtitle,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-800/60 bg-slate-950/40 p-5 print:break-inside-avoid print:border-slate-300 print:bg-white">
      <header className="mb-4 flex items-baseline gap-3 border-b border-slate-800/60 pb-3 print:border-slate-300">
        <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.32em] text-lime-300/80 print:text-emerald-700">
          Block {number}
        </span>
        <h3 className="font-headline text-[16px] font-extrabold text-slate-100 print:text-slate-900">
          {title}
        </h3>
        <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500 sm:inline">
          {subtitle}
        </span>
      </header>
      <div className="space-y-5 print:space-y-3">{children}</div>
    </section>
  );
}

function HeadlineStack({
  asset,
  siteAcquisition,
  capexTotal,
  totalInvestment,
}: {
  asset: UnderwritingBundle["inputs"]["asset"];
  siteAcquisition: number;
  capexTotal: number;
  totalInvestment: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <HeadlineTile label="Site Acquisition" value={fmtEUR(siteAcquisition)} sub={`${pct(siteAcquisition, totalInvestment)} of total`} />
      <HeadlineTile label="CAPEX" value={fmtEUR(capexTotal)} sub={`${pct(capexTotal, totalInvestment)} of total`} />
      <HeadlineTile label="Total Investment" value={fmtEUR(totalInvestment)} highlight />
      <HeadlineTile label="€ / key" value={fmtEUR(div(totalInvestment, asset.rooms))} sub={`${asset.rooms} keys`} />
      <HeadlineTile label="€ / m²" value={fmtEUR(div(totalInvestment, asset.total_sqm))} sub={`${fmtInt(asset.total_sqm)} m²`} />
    </div>
  );
}

function HeadlineTile({ label, value, sub, highlight = false }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div
      className={
        highlight
          ? "rounded-md border-2 border-lime-300/40 bg-lime-300/5 p-3 print:border-emerald-500 print:bg-emerald-50"
          : "rounded-md border border-slate-800/60 bg-slate-900/40 p-3 print:border-slate-300 print:bg-white"
      }
    >
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 print:text-slate-600">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-[16px] font-extrabold tabular-nums ${
          highlight ? "text-lime-200 print:text-emerald-700" : "text-slate-100 print:text-slate-900"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 font-mono text-[9.5px] text-slate-500 print:text-slate-600">{sub}</p>}
    </div>
  );
}

// ─── Block A · Site Acquisition ──────────────────────────────────────

function AcquisitionSummary({
  askingPrice,
  hotelValue,
  capRateEntry,
  rooms,
  totalSqm,
}: {
  askingPrice: number;
  hotelValue: number;
  capRateEntry: number;
  rooms: number;
  totalSqm: number;
}) {
  return (
    <div className="rounded-md border border-slate-800/40 bg-slate-900/30 p-4 print:border-slate-300 print:bg-white">
      <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 print:text-slate-700">
        Pricing
      </p>
      <dl className="mt-3 space-y-2 text-[12px]">
        <PriceRow label="Asking Price" value={fmtEUR(askingPrice)} sub={`${fmtEUR(div(askingPrice, rooms))} / key · ${fmtEUR(div(askingPrice, totalSqm))} / m²`} />
        <PriceRow label="Hotel Value (appraised)" value={fmtEUR(hotelValue)} sub={`${fmtEUR(div(hotelValue, rooms))} / key · ${fmtEUR(div(hotelValue, totalSqm))} / m²`} muted />
        <div className="mt-3 rounded-md border border-lime-300/40 bg-lime-300/10 p-3 print:border-emerald-500 print:bg-emerald-50">
          <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-lime-300/80 print:text-emerald-700">
            Dynamic Cap Rate · entry
          </p>
          <p className="mt-1 font-mono text-[28px] font-extrabold tabular-nums text-lime-200 print:text-emerald-700">
            {capRateEntry.toFixed(2).replace(".", ",")}%
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-slate-400 print:text-slate-600">
            HotelVALORA-recommended · operator-confirmable
          </p>
        </div>
      </dl>
    </div>
  );
}

function PriceRow({ label, value, sub, muted = false }: { label: string; value: string; sub: string; muted?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between">
        <span className={`font-headline text-[10.5px] uppercase tracking-[0.16em] ${muted ? "text-slate-500" : "text-slate-300"} print:text-slate-700`}>
          {label}
        </span>
        <span className={`font-mono text-[14px] font-bold tabular-nums ${muted ? "text-slate-400" : "text-slate-100"} print:text-slate-900`}>
          {value}
        </span>
      </div>
      <span className="font-mono text-[9.5px] text-slate-500 print:text-slate-600">{sub}</span>
    </div>
  );
}

function CapRateRationale({ dynamic, finalPct }: { dynamic: DynamicCapRateResult; finalPct: number }) {
  return (
    <div className="rounded-md border border-slate-800/40 bg-slate-900/30 p-4 print:border-slate-300 print:bg-white">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 print:text-slate-700">
          Cap-rate rationale
        </p>
        <span className="font-mono text-[9.5px] text-slate-500 print:text-slate-600">
          Confidence · {dynamic.confidence.level}
        </span>
      </div>
      <ol className="space-y-1.5">
        {dynamic.adjustments.map((adj, idx) => (
          <li
            key={idx}
            className="grid grid-cols-[24px_1fr_64px] items-start gap-2 border-b border-slate-800/40 pb-1.5 last:border-b-0 print:border-slate-200"
          >
            <span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-sm bg-slate-800/80 font-mono text-[9px] font-bold text-slate-300 print:bg-slate-200 print:text-slate-700">
              {idx + 1}
            </span>
            <div>
              <p className="font-headline text-[11px] font-bold text-slate-100 print:text-slate-900">{adj.label}</p>
              <p className="font-mono text-[9.5px] text-slate-500 print:text-slate-600">{adj.rationale}</p>
            </div>
            <span
              className={`text-right font-mono text-[12px] font-bold tabular-nums ${
                idx === 0 ? "text-slate-100 print:text-slate-900" : adj.delta_pct >= 0 ? "text-amber-200 print:text-amber-700" : "text-emerald-200 print:text-emerald-700"
              }`}
            >
              {idx === 0 ? fmtPct(adj.delta_pct) : fmtPctDelta(adj.delta_pct)}
            </span>
          </li>
        ))}
        <li className="grid grid-cols-[24px_1fr_64px] items-baseline gap-2 rounded-md bg-lime-300/10 px-2 py-2 print:bg-emerald-50">
          <span />
          <p className="font-headline text-[11px] font-extrabold uppercase tracking-[0.18em] text-lime-300 print:text-emerald-700">
            Recommended
          </p>
          <span className="text-right font-mono text-[14px] font-extrabold tabular-nums text-lime-200 print:text-emerald-700">
            {finalPct.toFixed(2).replace(".", ",")}%
          </span>
        </li>
      </ol>
    </div>
  );
}

function AcquisitionCostsItemized({ lines, acqCostsTotal }: { lines: BreakdownLine[]; acqCostsTotal: number }) {
  return (
    <div className="rounded-md border border-slate-800/40 bg-slate-900/30 p-4 print:border-slate-300 print:bg-white">
      <p className="mb-3 font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 print:text-slate-700">
        Acquisition costs · itemised
      </p>
      <ItemTable lines={lines} groupTotal={acqCostsTotal} columns={["assumption", "total", "perKey", "perSqm"]} />
    </div>
  );
}

// ─── Block B · CAPEX ─────────────────────────────────────────────────

function CapexCategoryTable({ title, lines, groupTotal }: { title: string; lines: BreakdownLine[]; groupTotal: number }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="font-headline text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-slate-300 print:text-slate-800">
          {title}
        </p>
        <span className="font-mono text-[11px] font-bold text-slate-200 print:text-slate-800">{fmtEUR(groupTotal)}</span>
      </div>
      <ItemTable
        lines={lines}
        groupTotal={groupTotal}
        columns={["assumption", "total", "pct", "perKey", "perSqm"]}
      />
    </div>
  );
}

function CapexPhasesBanner({ phases }: { phases: CapexPhase[] }) {
  return (
    <div className="rounded-md border border-dashed border-slate-700/60 bg-slate-900/20 p-3 print:border-slate-300 print:bg-slate-50">
      <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.24em] text-slate-500 print:text-slate-700">
        CAPEX phases ({phases.length} · expandable)
      </p>
      <ul className="mt-2 space-y-1">
        {phases.map((p) => (
          <li key={p.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px]">
            <span className="font-headline text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-200 print:text-slate-900">
              {p.label}
            </span>
            <span className="font-mono text-[10px] text-slate-400 print:text-slate-600">
              · {p.kind.replaceAll("_", " ")} · funded by {p.funded_by.replaceAll("_", " ")}
            </span>
            <span className="ml-auto font-mono text-[11px] font-bold tabular-nums text-slate-100 print:text-slate-900">
              {fmtEUR(p.total_eur)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 font-mono text-[9.5px] text-slate-500 print:text-slate-600">
        Structure ready for refurbishment waves · operator contribution · tenant improvements · ESG retrofit · expansion CAPEX. Block 3 wires multi-phase drawdowns into the Cash Flow statement.
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
    <div className="rounded-md border-2 border-lime-300/40 bg-lime-300/5 p-5 print:border-emerald-500 print:bg-emerald-50">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.28em] text-lime-300/80 print:text-emerald-700">
            Total Investment
          </p>
          <p className="mt-1 font-mono text-[34px] font-extrabold tabular-nums leading-tight text-lime-200 print:text-emerald-700">
            {fmtEUR(totalInvestment)}
          </p>
          <p className="mt-1 font-mono text-[11.5px] text-slate-300 print:text-slate-700">
            {fmtEUR(div(totalInvestment, rooms))} / key · {fmtEUR(div(totalInvestment, totalSqm))} / m²
          </p>
        </div>
        <ul className="space-y-1.5">
          {composition.map((c) => (
            <li key={c.label} className="flex items-baseline justify-between border-b border-lime-300/20 pb-1 last:border-b-0 print:border-emerald-200">
              <span className="font-headline text-[10px] uppercase tracking-[0.18em] text-slate-300 print:text-slate-700">
                {c.label}
              </span>
              <span className="font-mono text-[12.5px] font-bold tabular-nums text-slate-100 print:text-slate-900">
                {fmtEUR(c.value)} <span className="ml-1.5 text-slate-500 print:text-slate-600">{pct(c.value, totalInvestment)}</span>
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
    <div className="rounded-md border border-slate-800/40 bg-slate-900/30 p-4 print:border-slate-300 print:bg-white">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 print:text-slate-700">
          Stabilised yield progression
        </p>
        <span className="font-mono text-[10px] text-slate-500 print:text-slate-600">
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
                  className="w-full rounded-t-sm bg-gradient-to-t from-lime-300/30 to-lime-300/70 print:from-emerald-200 print:to-emerald-500"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="font-mono text-[12px] font-extrabold tabular-nums text-lime-200 print:text-emerald-700">
                {fmtPct(v)}
              </span>
              <span className="font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 print:text-slate-600">
                Year {yr}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-[10.5px] text-slate-400 print:text-slate-600">
        Stabilised at <span className="font-bold text-slate-100 print:text-slate-900">{fmtPct(stabilised)}</span> by Year {fullSeries.length - 1}.
      </p>
    </div>
  );
}

// ─── Block D · D&A schedule ──────────────────────────────────────────

function DASchedule({ bundle }: { bundle: UnderwritingBundle }) {
  const periods = bundle.computed.periods;
  const da = bundle.computed.pnl.da;
  const buildingYears = bundle.inputs.depreciation.building_years;
  const mepYears = bundle.inputs.depreciation.mep_years;

  return (
    <div className="rounded-md border border-slate-800/40 bg-slate-900/30 p-4 print:border-slate-300 print:bg-white">
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <DASummary label="Building · useful life" years={buildingYears} note="Straight-line · Block 3 wires basis from CAPEX hard cost ex-MEP" />
        <DASummary label="MEP · useful life" years={mepYears} note="Straight-line · Block 3 wires basis from MEP per-key × rooms" />
      </div>
      <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500 print:text-slate-700">
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
                <td key={i} className="px-2 py-1.5 text-right font-mono text-[10.5px] tabular-nums text-slate-300 print:text-slate-800">
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
    <div className="rounded-md border border-slate-800/40 bg-slate-950/40 p-2.5 print:border-slate-200 print:bg-slate-50">
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 print:text-slate-700">{label}</p>
      <p className="mt-0.5 font-mono text-[14px] font-extrabold tabular-nums text-slate-100 print:text-slate-900">
        {years} years
      </p>
      <p className="mt-0.5 font-mono text-[9.5px] text-slate-500 print:text-slate-600">{note}</p>
    </div>
  );
}

// ─── Shared item table primitive ─────────────────────────────────────
//
// `table-fixed` + explicit per-column widths so the Assump / Total /
// %Total / €/key / €/m² columns line up *exactly* across all CAPEX
// subtables (Hard cost · Soft cost · Project costs) regardless of how
// long the line labels are. The Acquisition costs table uses a
// different column set and its own width allocation.

type ItemColumn = "assumption" | "total" | "pct" | "perKey" | "perSqm";

function ItemTable({
  lines,
  groupTotal,
  columns,
}: {
  lines: BreakdownLine[];
  groupTotal: number;
  columns: ItemColumn[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-[11px]">
        <colgroup>
          <col style={{ width: `${LABEL_WIDTH_PCT[columns.length]}%` }} />
          {columns.map((c) => (
            <col key={c} style={{ width: `${valueColWidthPct(columns.length)}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="text-left text-slate-500 print:text-slate-600">
            <th className="py-1.5 pr-2 font-headline text-[9px] font-bold uppercase tracking-[0.18em]">Line</th>
            {columns.map((c) => (
              <th key={c} className="px-2 py-1.5 text-right font-headline text-[9px] font-bold uppercase tracking-[0.18em]">
                {HEADER_BY_COL[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-t border-slate-800/40 print:border-slate-200">
              <td className="truncate py-1.5 pr-2 font-headline text-[11px] text-slate-200 print:text-slate-900">{line.label}</td>
              {columns.map((c) => (
                <td key={c} className="px-2 py-1.5 text-right font-mono text-[10.5px] tabular-nums text-slate-300 print:text-slate-800">
                  {cellFor(c, line, groupTotal)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-slate-700/60 bg-slate-900/40 print:border-slate-300 print:bg-slate-100">
            <td className="py-1.5 pr-2 font-headline text-[11px] font-extrabold text-slate-100 print:text-slate-900">Subtotal</td>
            {columns.map((c) => (
              <td key={c} className="px-2 py-1.5 text-right font-mono text-[11px] font-extrabold tabular-nums text-slate-100 print:text-slate-900">
                {c === "total" ? fmtEUR(groupTotal) : c === "pct" ? "100%" : ""}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const HEADER_BY_COL: Record<ItemColumn, string> = {
  assumption: "Assump.",
  total: "Total €",
  pct: "% Total",
  perKey: "€ / key",
  perSqm: "€ / m²",
};

/** Label column gets a bit more room when there are fewer value columns. */
const LABEL_WIDTH_PCT: Record<number, number> = {
  3: 46, // acquisition table (assumption · total · perKey · perSqm = 4 value cols)? — see below
  4: 40, // acquisition costs (assumption · total · perKey · perSqm)
  5: 38, // CAPEX (assumption · total · pct · perKey · perSqm)
};

function valueColWidthPct(valueColCount: number): number {
  const labelPct = LABEL_WIDTH_PCT[valueColCount] ?? 40;
  return (100 - labelPct) / valueColCount;
}

function cellFor(col: ItemColumn, line: BreakdownLine, groupTotal: number): string {
  switch (col) {
    case "assumption":
      return line.assumption ?? "—";
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

function fmtPctDelta(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2).replace(".", ",")}%`;
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
