import { SectionShell } from "../primitives/section-shell";
import { MemorandumBlock } from "../primitives/memorandum-block";
import { KpiHero } from "../primitives/kpi-hero";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 08 · Exit Strategy · the strongest narrative piece.
 *
 *   A · Returns headline (Project + Equity IRR + MOIC)
 *   B · Entry vs Exit valuation (institutional value creation bridge)
 *   C · Cap rate rationale (consumed from Dynamic Cap Rate Engine)
 *   D · Equity waterfall (cash flow timeline · ready for Block 9 split)
 *   E · Detail schedule (full Project + Equity CF series)
 */
export function ExitSection({ bundle }: { bundle: UnderwritingBundle }) {
  const e = bundle.computed.exit;
  const inv = bundle.computed.investment;
  const fin = bundle.computed.financing;
  const periods = bundle.computed.periods;
  const cols = 1 + periods.length;
  const asset = bundle.inputs.asset;
  const capEntry = bundle.computed.cap_rate.entry;
  const capExit = bundle.computed.cap_rate.exit;

  const exitPriceNetOfFees = e.exit_price * (1 - bundle.inputs.exit.fee_pct);
  const debtBalanceAfterScheduled = fin.total_eofy_balance[e.exit_year] ?? 0;
  const netEquityProceeds = exitPriceNetOfFees - debtBalanceAfterScheduled;
  const exitPriceSeries = periods.map((_, i) => (i === e.exit_year ? e.exit_price : 0));

  // Value creation bridge components
  const entryValue = inv.total_building_cost;
  const yieldCompressionValue = capEntry.used_pct !== capExit.used_pct
    ? (e.exit_price - (e.exit_price * (capEntry.used_pct / capExit.used_pct)))
    : 0;
  const noiGrowth = e.exit_price - entryValue - yieldCompressionValue;

  return (
    <SectionShell
      number={8}
      anchorId="exit"
      title="Exit Strategy"
      subtitle={`Y${e.exit_year} disposition · institutional cap rate ${fmtPct(capExit.used_pct)} · ${asset.submarket}`}
      status={{ label: "IC narrative · disposition committee", tone: "info" }}
      summary={
        <div className="space-y-6 print:space-y-4">
          {/* Block A · Returns headline */}
          <MemorandumBlock number="A" title="Returns" subtitle="Project · equity · multiple · cash on cash">
            <KpiHero
              tiles={[
                { label: "Project IRR", value: fmtPct(e.project_irr_pct), sub: "unlevered · pre-tax", tone: irrTone(e.project_irr_pct, 8) },
                { label: "Equity IRR", value: fmtPct(e.equity_irr_pct), sub: "levered · post-tax", highlight: true, tone: irrTone(e.equity_irr_pct, 12) },
                { label: "MOIC", value: `${e.moic.toFixed(2)}×`, sub: "equity multiple", tone: moicTone(e.moic) },
                { label: "Profit share", value: fmtEUR(e.profit_share), sub: "equity gain", tone: e.profit_share > 0 ? "ok" : "warn" },
              ]}
            />
          </MemorandumBlock>

          {/* Block B · Entry vs Exit valuation */}
          <MemorandumBlock number="B" title="Entry vs exit valuation" subtitle="Pricing arc · value creation bridge">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
              <ValuationCard
                label="Entry"
                year="Y0"
                value={entryValue}
                capRate={capEntry.used_pct}
                rooms={asset.rooms}
                totalSqm={asset.total_sqm}
                tone="neutral"
              />
              <div className="flex flex-col items-center justify-center px-3 print:py-3">
                <span className="font-headline text-[9px] font-extrabold uppercase tracking-[0.28em] text-lime-300/80 print:text-emerald-700">
                  Hold
                </span>
                <span className="font-mono text-[24px] font-extrabold text-lime-200 print:text-emerald-700">
                  {e.exit_year}y
                </span>
                <span className="font-headline text-[9px] uppercase tracking-[0.18em] text-slate-500 print:text-slate-600">
                  →
                </span>
              </div>
              <ValuationCard
                label="Exit"
                year={`Y${e.exit_year}`}
                value={e.exit_price}
                capRate={capExit.used_pct}
                rooms={asset.rooms}
                totalSqm={asset.total_sqm}
                tone="highlight"
              />
            </div>
            <ValueCreationBridge
              entryValue={entryValue}
              exitValue={e.exit_price}
              noiGrowth={noiGrowth}
              yieldCompression={yieldCompressionValue}
              capRateEntry={capEntry.used_pct}
              capRateExit={capExit.used_pct}
            />
          </MemorandumBlock>

          {/* Block C · Cap rate rationale */}
          <MemorandumBlock number="C" title="Cap rate rationale" subtitle="HotelVALORA Dynamic Cap Rate · exit yield">
            <CapRateRationaleStrip dynamic={capExit.dynamic} usedPct={capExit.used_pct} />
          </MemorandumBlock>

          {/* Block D · Equity waterfall (cash timeline) */}
          <MemorandumBlock number="D" title="Equity cash flow timeline" subtitle="Ready for LP/GP waterfall split · Block 9">
            <EquityTimeline equityCf={e.equity_cash_flow} exitYear={e.exit_year} />
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryStat label="Equity contributed" value={fmtEUR(e.equity_investment)} />
              <SummaryStat label="Net exit proceeds" value={fmtEUR(netEquityProceeds)} tone="ok" />
              <SummaryStat label="Total distributions (cum.)" value={fmtEUR(e.profit_share + e.equity_investment)} tone="ok" />
            </div>
          </MemorandumBlock>

          {/* Block E · Detail schedule */}
          <MemorandumBlock number="E" title="Detail schedule" subtitle="Project + Equity Cash Flows per period">
            <YearGrid periods={periods} caption="Exit Strategy · Project + Equity Cash Flows">
              <DivisionRow label="Project Cash Flow" columnCount={cols} />
              <YearRow label="Operating Cash Flow" values={bundle.computed.cash_flow.operating_cash_flow} indent={1} />
              <YearRow label="Exit Price (net of fees)" values={exitPriceSeries} indent={1} kind="positive" />
              <SubtotalRow label="Project Cash Flow" values={e.project_cash_flow} tone="result" />
              <DivisionRow label="Equity Cash Flow" columnCount={cols} />
              <YearRow label="Debt Cash Flows" values={e.debt_cash_flow} indent={1} />
              <SubtotalRow label="Equity Cash Flow" values={e.equity_cash_flow} tone="result" />
            </YearGrid>
          </MemorandumBlock>
        </div>
      }
    />
  );
}

// ─── Sub-primitives ──────────────────────────────────────────────────

function ValuationCard({
  label,
  year,
  value,
  capRate,
  rooms,
  totalSqm,
  tone,
}: {
  label: string;
  year: string;
  value: number;
  capRate: number;
  rooms: number;
  totalSqm: number;
  tone: "neutral" | "highlight";
}) {
  const isHighlight = tone === "highlight";
  return (
    <div
      className={
        isHighlight
          ? "rounded-md border-2 border-lime-300/40 bg-lime-300/5 p-4 print:border-emerald-500 print:bg-emerald-50"
          : "rounded-md border border-slate-800/60 bg-slate-900/40 p-4 print:border-slate-300 print:bg-white"
      }
    >
      <div className="flex items-baseline justify-between">
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-400 print:text-slate-600">
          {label}
        </p>
        <span className="font-mono text-[10px] text-slate-500 print:text-slate-600">{year}</span>
      </div>
      <p className={`mt-2 font-mono text-[24px] font-extrabold tabular-nums ${isHighlight ? "text-lime-200 print:text-emerald-700" : "text-slate-100 print:text-slate-900"}`}>
        {fmtEUR(value)}
      </p>
      <ul className="mt-2 space-y-0.5 font-mono text-[10px] text-slate-400 print:text-slate-600">
        <li>{fmtEUR(value / rooms)} / key</li>
        <li>{fmtEUR(value / totalSqm)} / m²</li>
        <li>Cap rate · {fmtPct(capRate)}</li>
      </ul>
    </div>
  );
}

function ValueCreationBridge({
  entryValue,
  exitValue,
  noiGrowth,
  yieldCompression,
  capRateEntry,
  capRateExit,
}: {
  entryValue: number;
  exitValue: number;
  noiGrowth: number;
  yieldCompression: number;
  capRateEntry: number;
  capRateExit: number;
}) {
  const totalDelta = exitValue - entryValue;
  return (
    <div className="rounded-md border border-slate-800/40 bg-slate-900/30 p-4 print:border-slate-300 print:bg-white">
      <p className="mb-3 font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 print:text-slate-700">
        Value creation bridge
      </p>
      <ol className="space-y-2">
        <BridgeRow label="Entry valuation" value={entryValue} kind="anchor" sub="Total Investment basis" />
        <BridgeRow label="NOI growth contribution" value={noiGrowth} kind="delta" sub="EBITDA stabilisation through hold" />
        <BridgeRow
          label="Yield compression / expansion"
          value={yieldCompression}
          kind="delta"
          sub={capRateExit > capRateEntry ? `Exit ${fmtPct(capRateExit)} > Entry ${fmtPct(capRateEntry)} · expansion drag` : `Exit ${fmtPct(capRateExit)} ≤ Entry ${fmtPct(capRateEntry)} · compression lift`}
        />
        <BridgeRow label="Exit valuation" value={exitValue} kind="result" sub={`Total Δ ${signed(totalDelta)}${fmtEUR(Math.abs(totalDelta))}`} />
      </ol>
    </div>
  );
}

function BridgeRow({
  label,
  value,
  kind,
  sub,
}: {
  label: string;
  value: number;
  kind: "anchor" | "delta" | "result";
  sub?: string;
}) {
  const valueClass =
    kind === "result" ? "text-lime-200 font-extrabold print:text-emerald-700"
    : kind === "anchor" ? "text-slate-100 font-bold print:text-slate-900"
    : value >= 0 ? "text-emerald-200 print:text-emerald-700"
    : "text-rose-200 print:text-rose-700";
  return (
    <li className="grid grid-cols-[1fr_auto] items-baseline gap-3 border-b border-slate-800/40 pb-1.5 last:border-b-0 print:border-slate-200">
      <div>
        <p className="font-headline text-[11px] font-bold text-slate-200 print:text-slate-900">{label}</p>
        {sub && <p className="font-mono text-[9.5px] text-slate-500 print:text-slate-600">{sub}</p>}
      </div>
      <span className={`font-mono text-[13.5px] tabular-nums ${valueClass}`}>
        {kind !== "anchor" && value !== 0 ? signed(value) : ""}
        {fmtEUR(Math.abs(value))}
      </span>
    </li>
  );
}

function CapRateRationaleStrip({
  dynamic,
  usedPct,
}: {
  dynamic: UnderwritingBundle["computed"]["cap_rate"]["exit"]["dynamic"];
  usedPct: number;
}) {
  const confidence = dynamic.confidence;
  return (
    <div className="rounded-md border border-slate-800/40 bg-slate-900/30 p-4 print:border-slate-300 print:bg-white">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 print:text-slate-700">
          Adjustment stack
        </p>
        <span className="font-mono text-[10px] text-slate-500 print:text-slate-600">
          Confidence {confidence.score_0_100.toFixed(0)}/100 · {confidence.band.replace("_", " ")}
        </span>
      </div>
      <ol className="space-y-1">
        {dynamic.adjustments.map((a, idx) => (
          <li key={a.id} className="grid grid-cols-[24px_1fr_72px] items-baseline gap-2 border-b border-slate-800/40 pb-1 last:border-b-0 print:border-slate-200">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-slate-800/80 font-mono text-[9px] font-bold text-slate-300 print:bg-slate-200 print:text-slate-700">
              {idx + 1}
            </span>
            <div>
              <p className="font-headline text-[10.5px] font-bold text-slate-100 print:text-slate-900">{a.label}</p>
              <p className="font-mono text-[9px] text-slate-500 print:text-slate-600">{a.rationale}</p>
            </div>
            <span className={`text-right font-mono text-[11px] font-bold tabular-nums ${a.category === "base" ? "text-slate-100 print:text-slate-900" : a.delta_pct >= 0 ? "text-amber-200 print:text-amber-700" : "text-emerald-200 print:text-emerald-700"}`}>
              {a.category === "base" ? `${a.delta_pct.toFixed(2)}%` : `${a.delta_pct >= 0 ? "+" : ""}${a.delta_pct.toFixed(2)}%`}
            </span>
          </li>
        ))}
        <li className="grid grid-cols-[24px_1fr_72px] items-baseline gap-2 rounded-md bg-lime-300/10 px-1 py-1.5 print:bg-emerald-50">
          <span />
          <p className="font-headline text-[11px] font-extrabold uppercase tracking-[0.18em] text-lime-300 print:text-emerald-700">
            Used at exit
          </p>
          <span className="text-right font-mono text-[13px] font-extrabold tabular-nums text-lime-200 print:text-emerald-700">
            {fmtPct(usedPct)}
          </span>
        </li>
      </ol>
    </div>
  );
}

function EquityTimeline({ equityCf, exitYear }: { equityCf: number[]; exitYear: number }) {
  const years = Array.from({ length: Math.min(equityCf.length, exitYear + 1) }, (_, i) => i);
  const maxAbs = Math.max(...equityCf.map(Math.abs), 1);
  return (
    <div className="rounded-md border border-slate-800/40 bg-slate-900/30 p-4 print:border-slate-300 print:bg-white">
      <p className="mb-3 font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 print:text-slate-700">
        Equity cash flow timeline · Y0 → Y{exitYear}
      </p>
      <div className="flex items-end justify-around gap-1" style={{ height: 96 }}>
        {years.map((y) => {
          const v = equityCf[y] ?? 0;
          const isPositive = v > 0;
          const heightPct = Math.max(4, (Math.abs(v) / maxAbs) * 80);
          return (
            <div key={y} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div
                className={isPositive ? "w-full rounded-t-sm bg-emerald-300/80 print:bg-emerald-500" : "w-full rounded-b-sm bg-rose-300/70 print:bg-rose-400"}
                style={{ height: `${heightPct}%` }}
                title={`Y${y} · ${fmtEUR(v)}`}
              />
              <span className="font-mono text-[8.5px] text-slate-500 print:text-slate-600">Y{y}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryStat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "ok" | "warn" | "neutral" }) {
  const colour = tone === "ok" ? "text-emerald-200 print:text-emerald-700"
    : tone === "warn" ? "text-amber-200 print:text-amber-700"
    : "text-slate-100 print:text-slate-900";
  return (
    <div className="rounded-md border border-slate-800/60 bg-slate-900/40 p-3 print:border-slate-300 print:bg-white">
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 print:text-slate-600">{label}</p>
      <p className={`mt-1 font-mono text-[14px] font-extrabold tabular-nums ${colour}`}>{value}</p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function irrTone(irr: number, target: number): "ok" | "warn" | "negative" {
  return irr >= target ? "ok" : irr >= target * 0.7 ? "warn" : "negative";
}

function moicTone(moic: number): "ok" | "warn" | "negative" {
  return moic >= 1.8 ? "ok" : moic >= 1.3 ? "warn" : "negative";
}

function signed(n: number): string {
  if (n === 0) return "";
  return n > 0 ? "+" : "−";
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
