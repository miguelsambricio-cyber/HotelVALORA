import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, Calculator } from "lucide-react";
import {
  findHotelById,
  findMarketSnapshotForHotel,
  findTransactionComparables,
} from "@/lib/admin/hotels/snapshot-reader";
import {
  marketBasedValuation,
  peerBasedValuation,
  marketPositioning,
  fmtEurM,
  fmtEurPerKey,
} from "@/lib/admin/hotels/underwriting";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { hotelId: string };
}): Promise<Metadata> {
  const hotel = await findHotelById(decodeURIComponent(params.hotelId));
  return {
    title: hotel ? `${hotel.name} · Underwriting · Admin` : "Underwriting · Admin",
    description: hotel
      ? `Institutional underwriting screen · ${hotel.country} · ${hotel.market_name}`
      : undefined,
  };
}

export default async function UnderwritingPage({ params }: { params: { hotelId: string } }) {
  const hotelId = decodeURIComponent(params.hotelId);
  const [hotel, marketCtx, comparables] = await Promise.all([
    findHotelById(hotelId),
    findMarketSnapshotForHotel(hotelId),
    findTransactionComparables(hotelId, 20),
  ]);
  if (!hotel) notFound();

  const mbv = marketBasedValuation(hotel, marketCtx);
  const pbv = peerBasedValuation(hotel, comparables);
  const pos = marketPositioning(hotel, marketCtx);

  return (
    <div className="space-y-6">
      <Link
        href={`/user/admin/hotels/${encodeURIComponent(hotelId)}`}
        className="inline-flex items-center gap-1.5 font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 hover:text-forest-900"
      >
        <ArrowLeft size={12} /> Hotel detail
      </Link>

      {/* Header */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-forest-900 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-lime-300">
            Underwriting · v1
          </span>
          <span className="rounded-md bg-amber-100 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-amber-800 ring-1 ring-inset ring-amber-200">
            Back-of-envelope · operator override pending
          </span>
        </div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-[34px]">
          {hotel.name}
        </h1>
        <p className="text-[13.5px] leading-relaxed text-slate-600">
          {hotel.country} · {hotel.market_name}
          {hotel.submarket_name ? ` · ${hotel.submarket_name}` : ""}
          {hotel.chain_scale ? ` · ${hotel.chain_scale.replace(/_/g, " ")}` : ""}
          {hotel.rooms_count ? ` · ${hotel.rooms_count} rooms` : ""}
        </p>
      </header>

      {/* Asset overview */}
      <Section title="Asset overview">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Pair label="Rooms" value={hotel.rooms_count !== null ? String(hotel.rooms_count) : "—"} />
          <Pair label="Year opened" value={hotel.year_opened !== null ? String(hotel.year_opened) : "—"} />
          <Pair label="Year renovated" value={hotel.year_last_renovated !== null ? String(hotel.year_last_renovated) : "—"} />
          <Pair label="Class" value={hotel.chain_scale ? hotel.chain_scale.replace(/_/g, " ") : "—"} />
          <Pair label="Brand" value={hotel.brand ?? "—"} />
          <Pair label="Operator" value={hotel.operator ?? "—"} />
          <Pair label="Owner" value={hotel.owner ?? "—"} />
          <Pair
            label="Affiliation"
            value={hotel.affiliation_type ? hotel.affiliation_type : "—"}
          />
        </dl>
      </Section>

      {/* Market-based valuation */}
      <Section title="Market-based valuation" icon={<Calculator size={14} />}>
        {!mbv.ok ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">
            Can&apos;t compute · {mbv.reason}
          </p>
        ) : (
          <>
            <p className="mb-3 text-[12px] leading-relaxed text-slate-600">
              <strong>Method:</strong> RevPAR<sub>12m</sub> × {mbv.assumptions.stabilised_days} days × {hotel.rooms_count} rooms ×
              multiple. RevPAR pulled from{" "}
              <span className="font-mono text-[11px] text-forest-900">{mbv.revpar_source}</span> ·{" "}
              €{mbv.revpar_eur?.toFixed(0)}. Annual revenue ≈{" "}
              <strong>{fmtEurM(mbv.annual_revenue_eur)}</strong>.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <ValuationCard
                label={`Low · ${mbv.assumptions.multiple_low}× revenue`}
                value_total={mbv.value_low_eur}
                value_per_key={mbv.value_per_key_low_eur}
                tone="slate"
              />
              <ValuationCard
                label={`Mid · ${mbv.assumptions.multiple_mid}× revenue`}
                value_total={mbv.value_mid_eur}
                value_per_key={mbv.value_per_key_mid_eur}
                tone="emerald"
              />
              <ValuationCard
                label={`High · ${mbv.assumptions.multiple_high}× revenue`}
                value_total={mbv.value_high_eur}
                value_per_key={mbv.value_per_key_high_eur}
                tone="slate"
              />
            </div>
          </>
        )}
      </Section>

      {/* Peer-comparable valuation */}
      <Section title="Comparable-based valuation" icon={<Calculator size={14} />}>
        {!pbv.ok ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">
            Can&apos;t compute · {pbv.reason}.
            {pbv.n_peers_used > 0 && (
              <>
                {" "}
                Same-market / same-submarket peers with €/key found: {pbv.n_peers_used}.
              </>
            )}
          </p>
        ) : (
          <>
            <p className="mb-3 text-[12px] leading-relaxed text-slate-600">
              <strong>Method:</strong> peer €/key distribution (P25 · median · P75) from{" "}
              <strong>{pbv.n_peers_used}</strong> same-market and same-submarket transactions ·
              applied to {hotel.rooms_count} rooms.
            </p>
            <div className="mb-3 grid grid-cols-3 gap-3 text-[11.5px]">
              <Pair label="P25 €/key" value={fmtEurPerKey(pbv.peer_price_per_key_p25_eur)} mono />
              <Pair label="Median €/key" value={fmtEurPerKey(pbv.peer_price_per_key_median_eur)} mono />
              <Pair label="P75 €/key" value={fmtEurPerKey(pbv.peer_price_per_key_p75_eur)} mono />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <ValuationCard label="Low · P25 peer" value_total={pbv.value_low_eur} value_per_key={pbv.peer_price_per_key_p25_eur} tone="slate" />
              <ValuationCard label="Mid · median peer" value_total={pbv.value_mid_eur} value_per_key={pbv.peer_price_per_key_median_eur} tone="emerald" />
              <ValuationCard label="High · P75 peer" value_total={pbv.value_high_eur} value_per_key={pbv.peer_price_per_key_p75_eur} tone="slate" />
            </div>
          </>
        )}
      </Section>

      {/* Market positioning */}
      <Section title="Market positioning">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Pair
            label="Class tier"
            value={
              pos.chain_scale_label
                ? `${pos.chain_scale_label} (${(pos.chain_scale_tier_rank ?? 0) + 1} of 6)`
                : "—"
            }
          />
          <Pair
            label="Submarket vs market RevPAR"
            value={
              pos.submarket_revpar_vs_market_pct !== null
                ? `${(pos.submarket_revpar_vs_market_pct * 100).toFixed(0)}%`
                : "—"
            }
          />
          <Pair
            label="Premium submarket"
            value={
              pos.hotel_in_premium_submarket === null
                ? "—"
                : pos.hotel_in_premium_submarket
                  ? "yes (> +5% vs market)"
                  : "no"
            }
          />
        </dl>
      </Section>

      {/* Comparable transactions */}
      <Section title={`Comparable transactions · ${comparables.length}`}>
        {comparables.length === 0 ? (
          <p className="text-[12px] text-slate-500">
            No comparable transactions found in the same market.
          </p>
        ) : (
          <div className="max-h-[360px] overflow-y-auto rounded-lg border border-slate-200 ring-1 ring-inset ring-slate-100">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b border-slate-200">
                  <Th>Match</Th>
                  <Th>Asset</Th>
                  <Th>Closed</Th>
                  <Th align="right">Price</Th>
                  <Th align="right">€/key</Th>
                  <Th>Buyer ← Seller</Th>
                </tr>
              </thead>
              <tbody>
                {comparables.map((t) => (
                  <tr key={t.transaction_id} className="border-b border-slate-100 last:border-b-0">
                    <Td>
                      <span
                        className={`rounded px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.18em] ring-1 ${matchToneCls(t.matched_via)}`}
                      >
                        {t.matched_via.replace(/_/g, " ")}
                      </span>
                    </Td>
                    <Td>{t.asset_name}</Td>
                    <Td>{t.closed_at ?? "—"}</Td>
                    <Td align="right">{t.price_eur !== null ? fmtEurM(t.price_eur) : "—"}</Td>
                    <Td align="right" mono>
                      {t.price_per_key_eur !== null ? fmtEurPerKey(t.price_per_key_eur) : "—"}
                    </Td>
                    <Td>
                      <span className="text-slate-700">{t.buyer ?? "—"}</span>
                      <span className="mx-1 text-slate-400">←</span>
                      <span className="text-slate-500">{t.seller ?? "—"}</span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Assumptions / gaps · honest framing */}
      <Section title="Assumptions & known gaps" icon={<AlertTriangle size={14} />}>
        <ul className="space-y-1.5 text-[12px] text-slate-700">
          <li>
            <strong>Annualisation:</strong> {STABILISED_DAYS_NOTE}
          </li>
          <li>
            <strong>Revenue multiple range:</strong> 8× — 12× annual revenue. Industry rule of
            thumb for stabilised hotels · not chain-scale specific yet (luxury typically commands
            higher · economy lower). Operator-tunable in a future iteration.
          </li>
          <li>
            <strong>NOI / cap-rate output:</strong> intentionally not computed · we don&apos;t
            have GOP-margin data in the snapshot. Once operator-supplied or derived from a real
            financial model, we&apos;ll add an implied cap-rate range.
          </li>
          <li>
            <strong>Peer match:</strong> only same-market and same-submarket transactions count
            in the comparable-based valuation. Cross-market peers would distort €/key.
          </li>
          <li>
            <strong>RevPAR source:</strong> we prefer submarket RevPAR over market RevPAR when
            available. Today only Madrid has both; other geographies will fall back to market.
          </li>
        </ul>
      </Section>
    </div>
  );
}

const STABILISED_DAYS_NOTE =
  "365 stabilised days. Renovation periods / soft-opening years not adjusted yet. For a brand-new opening, dampen with a stabilisation curve in a future iteration.";

// ── UI atoms ────────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        {icon && <span className="text-slate-400">{icon}</span>}
        <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
          {title}
        </h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Pair({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 ${mono ? "font-mono text-[12px]" : "font-headline text-base font-extrabold"} text-forest-900`}>
        {value}
      </p>
    </div>
  );
}

function ValuationCard({
  label,
  value_total,
  value_per_key,
  tone,
}: {
  label: string;
  value_total: number | null;
  value_per_key: number | null;
  tone: "slate" | "emerald";
}) {
  const cls =
    tone === "emerald"
      ? "border-emerald-300 bg-emerald-50/50"
      : "border-slate-200 bg-slate-50/40";
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-headline text-2xl font-extrabold tabular-nums text-forest-900">
        {fmtEurM(value_total)}
      </p>
      <p className="mt-0.5 font-mono text-[10.5px] text-slate-600">
        {value_per_key !== null ? fmtEurPerKey(value_per_key) : "—"}
      </p>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`px-3 py-2 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  mono,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2 ${align === "right" ? "text-right" : ""} ${mono ? "font-mono text-[11.5px]" : ""}`}
    >
      {children}
    </td>
  );
}

function matchToneCls(matched: string): string {
  if (matched === "same_hotel") return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  if (matched === "same_submarket") return "bg-sky-100 text-sky-800 ring-sky-200";
  if (matched === "same_market") return "bg-slate-100 text-slate-700 ring-slate-200";
  return "bg-slate-100 text-slate-500 ring-slate-200";
}
