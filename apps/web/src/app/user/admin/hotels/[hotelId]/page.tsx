import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Building2, AlertTriangle, ArrowUpRight } from "lucide-react";
import {
  findHotelById,
  findCompsetsForHotel,
  findTransactionsForHotel,
  findCorrectionsForHotel,
  findSyntheticCompsetForHotel,
  findMarketSnapshotForHotel,
  findMarketTimeseriesForHotel,
  findTransactionComparables,
  type HotelRecord,
} from "@/lib/admin/hotels/snapshot-reader";
import { CorrectionForm } from "@/components/admin/hotels/correction-form";
import { EnrichmentModal } from "@/components/admin/hotels/enrichment-modal";
import { BookingEnrichButton } from "@/components/admin/hotels/booking-enrich-button";
import {
  CANONICAL_FACILITIES,
  summariseCanonicalFacilities,
} from "@/lib/admin/hotels/canonical-facilities";
import { computeProfileCompleteness } from "@/lib/admin/hotels/profile-completeness";
import { computeHotelVALORAScore } from "@/lib/admin/hotels/hotelvalora-score";
import { summariseRoomMix } from "@/lib/admin/hotels/room-mix";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { hotelId: string } }): Promise<Metadata> {
  const hotel = await findHotelById(decodeURIComponent(params.hotelId));
  return {
    title: hotel ? `${hotel.name} · Hotel Registry · Admin` : "Hotel · Admin",
    description: hotel ? `Reference profile · ${hotel.country} · ${hotel.market_name}` : undefined,
  };
}

export default async function HotelDetailPage({ params }: { params: { hotelId: string } }) {
  const hotelId = decodeURIComponent(params.hotelId);
  const hotel = await findHotelById(hotelId);
  if (!hotel) notFound();

  const [
    compsets,
    transactions,
    correctionHistory,
    syntheticCompset,
    marketContext,
    marketTimeseries,
    txComparables,
  ] = await Promise.all([
    findCompsetsForHotel(hotelId),
    findTransactionsForHotel(hotelId),
    findCorrectionsForHotel(hotelId),
    findSyntheticCompsetForHotel(hotelId),
    findMarketSnapshotForHotel(hotelId),
    findMarketTimeseriesForHotel(hotelId, 12),
    findTransactionComparables(hotelId, 8),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/user/admin/hotels"
        className="inline-flex items-center gap-1.5 font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 hover:text-forest-900"
      >
        <ArrowLeft size={12} /> Hotel Registry
      </Link>

      {/* Header */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {hotel._meta?.source === "manual_entry" && hotel._meta?.review_status === "new" ? (
            <span
              title={`Manually added · ${hotel._meta?.submitted_by ?? "operator"} · ${hotel._meta?.submitted_at ?? ""}`}
              className="rounded-md bg-emerald-600 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-white"
            >
              NEW · manual entry
            </span>
          ) : (
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-emerald-800 ring-1 ring-inset ring-emerald-200">
              Reference hotel
            </span>
          )}
          {hotel.hotel_id_synthetic && (
            <span
              title="No CoStar PROPERTY ID in source — hotel_id was computed deterministically"
              className="rounded-md bg-amber-100 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-amber-800 ring-1 ring-inset ring-amber-200"
            >
              ID synthetic
            </span>
          )}
          <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] text-slate-700 ring-1 ring-slate-200">
            {hotel.hotel_id}
          </code>
        </div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-[34px]">
          {hotel.name}
        </h1>
        <p className="text-[13.5px] leading-relaxed text-slate-600">
          {hotel.brand ? `${hotel.brand} · ` : ""}
          {hotel.operator ? `operated by ${hotel.operator} · ` : ""}
          {hotel.country} · {hotel.market_name}
          {hotel.submarket_name ? ` · ${hotel.submarket_name}` : ""}
        </p>
      </header>

      {/* Confidence + review banner */}
      {hotel._meta && hotel._meta.needs_review.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600" aria-hidden />
            <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.22em] text-amber-900">
              Needs review · confidence {(hotel._meta.confidence * 100).toFixed(0)}%
            </p>
          </div>
          <ul className="mt-2 space-y-0.5 text-[12px] text-amber-900">
            {hotel._meta.needs_review.map((reason) => (
              <li key={reason} className="font-mono text-[11.5px]">
                · {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Profile (2/3) */}
        <div className="space-y-5 lg:col-span-2">
          <Section title="Identification" icon={<Building2 size={14} />}>
            <Pair label="Name" value={hotel.name} />
            <Pair label="Brand" value={hotel.brand ?? "—"} />
            <Pair label="Operator" value={hotel.operator ?? "—"} />
            <Pair label="Owner" value={hotel.owner ?? "—"} />
            <Pair label="CoStar Hotel ID" value={hotel.hotel_id} mono />
            <Pair
              label="Booking Hotel ID"
              value={
                hotel._enrichment_meta?.booking_hotel_id != null
                  ? String(hotel._enrichment_meta.booking_hotel_id)
                  : "—"
              }
              mono
            />
            <Pair label="Catastro ID" value={hotel.catastro_id ?? "—"} mono />
          </Section>

          <Section title="Property characteristics">
            <Pair label="Chain scale" value={hotel.chain_scale?.replace(/_/g, " ") ?? "—"} />
            <Pair label="Category" value={fmtCategory(hotel.category)} />
            <Pair label="Segment" value={fmtSegment(hotel.segment_type)} />
            <Pair label="Rooms" value={fmtNum(hotel.rooms_count)} />
            <Pair
              label="Floors"
              value={fmtFloors(hotel.total_floors, hotel.floors_above_ground, hotel.floors_below_ground)}
            />
            <Pair label="Year opened" value={fmtNum(hotel.year_opened)} />
            <Pair label="Year last renovated" value={fmtNum(hotel.year_last_renovated)} />
            <Pair label="Gross building (m²)" value={fmtSqm(hotel.gross_building_sqm)} />
            <Pair label="Lot size (m²)" value={fmtSqm(hotel.lot_size_sqm)} />
            <Pair label="Typical floor (m²)" value={fmtSqm(hotel.typical_floor_sqm)} />
          </Section>

          <Section title="Location" icon={<MapPin size={14} />}>
            <Pair label="Address" value={hotel.address_line ?? "—"} />
            <Pair label="Postal code" value={hotel.postal_code ?? "—"} />
            <Pair label="Submarket" value={hotel.submarket_name ?? "—"} />
            {(() => {
              // Coordinate resolution priority:
              //   1. CoStar canonical (hotel.latitude/longitude)
              //   2. Booking enrichment (hotel.profile.latitude/longitude)
              //   3. Google Maps search fallback (operator finds + submits)
              const lat = hotel.latitude ?? hotel.profile?.latitude ?? null;
              const lng = hotel.longitude ?? hotel.profile?.longitude ?? null;
              const source =
                hotel.latitude != null
                  ? "CoStar"
                  : hotel.profile?.latitude != null
                    ? "Booking"
                    : null;
              if (lat !== null && lng !== null) {
                return (
                  <Pair
                    label="Coordinates"
                    value={
                      <a
                        href={`https://www.google.com/maps?q=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[12px] text-forest-900 hover:underline"
                      >
                        {lat.toFixed(5)}, {lng.toFixed(5)} ↗
                        {source && (
                          <span className="ml-2 rounded bg-slate-100 px-1 py-0.5 text-[9.5px] font-normal text-slate-500 ring-1 ring-slate-200">
                            {source}
                          </span>
                        )}
                      </a>
                    }
                  />
                );
              }
              return (
                <Pair
                  label="Coordinates"
                  value={
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(
                        `${hotel.name} ${hotel.address_line ?? ""} ${hotel.market_name} ${hotel.country}`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[11.5px] text-amber-800 hover:underline"
                      title="Open Google Maps to find coordinates, then submit them via Correction form"
                    >
                      — · find on Google Maps ↗
                    </a>
                  }
                />
              );
            })()}
          </Section>

          <Section title="Facilities & amenities">
            {hotel.facilities.length === 0 ? (
              <p className="text-[12px] text-slate-500">No facilities recorded.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {hotel.facilities.map((f) => (
                  <li
                    key={f}
                    className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] text-slate-700 ring-1 ring-slate-200"
                  >
                    {f.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Pair label="Meeting space (sqm)" value={fmtNum(hotel.meeting_space_sqm)} />
              <Pair label="Parking spaces" value={fmtNum(hotel.parking_spaces)} />
            </div>
          </Section>

          {/* Phase 3.e · Hotel profile enrichment (Booking-style fields) */}
          <ProfileEnrichmentSection hotel={hotel} />

          {/* Market context (Phase 3 · 2026-05-14) */}
          <Section title="Market context">
            {marketContext.market || marketContext.submarket ? (
              <div className="space-y-4">
                {marketContext.market && (
                  <MarketKpiBlock label={`${marketContext.market.market_name} · market`} ms={marketContext.market} />
                )}
                {marketContext.submarket && (
                  <MarketKpiBlock label={`${marketContext.submarket.submarket_name} · submarket`} ms={marketContext.submarket} />
                )}
              </div>
            ) : (
              <p className="text-[12px] text-slate-500">
                No market snapshot found for {hotel.market_name}. Run{" "}
                <code className="rounded bg-slate-100 px-1 font-mono text-[10.5px]">
                  python services/costar/scripts/ingest.py
                </code>{" "}
                after dropping the PAIS/MERCADO/SUBMERCADO xlsx exports.
              </p>
            )}

            {marketTimeseries.length > 0 && (
              <div className="mt-4 border-t border-slate-200 pt-3">
                <p className="mb-2 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
                  Last {marketTimeseries.length} periods · Madrid time-series
                </p>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <MarketTrendCell
                    label="Occupancy"
                    series={marketTimeseries.map((r) => r.occupancy_12m)}
                    format={(v) => `${(v * 100).toFixed(1)}%`}
                  />
                  <MarketTrendCell
                    label="ADR"
                    series={marketTimeseries.map((r) => r.adr_12m)}
                    format={(v) => `€${v.toFixed(0)}`}
                  />
                  <MarketTrendCell
                    label="RevPAR"
                    series={marketTimeseries.map((r) => r.revpar_12m)}
                    format={(v) => `€${v.toFixed(0)}`}
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Transaction comparables (Phase 3 · 2026-05-14) */}
          <Section title="Transaction comparables">
            {txComparables.length === 0 ? (
              <p className="text-[12px] text-slate-500">
                No comparable transactions found. The matcher looks for: same
                hotel · same submarket · same market.
              </p>
            ) : (
              <ul className="space-y-2">
                {txComparables.map((t) => (
                  <li key={t.transaction_id} className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.18em] ring-1 ${matchToneCls(t.matched_via)}`}>
                        {t.matched_via.replace(/_/g, " ")}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-slate-700 ring-1 ring-slate-200">
                        {t.source}
                      </span>
                      <code className="font-mono text-[10.5px] text-slate-500">{t.transaction_id}</code>
                      {t.closed_at && (
                        <span className="font-mono text-[10.5px] text-slate-500">closed {t.closed_at}</span>
                      )}
                      <span className="ml-auto flex items-center gap-3">
                        {t.price_eur !== null && (
                          <span className="font-headline text-[13px] font-extrabold text-forest-900">
                            €{(t.price_eur / 1_000_000).toFixed(1)}M
                          </span>
                        )}
                        {t.price_per_key_eur !== null && (
                          <span className="font-mono text-[10.5px] text-slate-600">
                            €{t.price_per_key_eur.toLocaleString()}/key
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-slate-700">{t.asset_name}</p>
                    {(t.buyer || t.seller) && (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {t.buyer ? `${t.buyer} ← ` : ""}
                        {t.seller ?? "—"}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Compsets */}
          <Section title="Compset relationships">
            {compsets.asTarget.length === 0 && compsets.asMember.length === 0 ? (
              <p className="text-[12px] text-slate-500">No compset memberships recorded.</p>
            ) : (
              <div className="space-y-3">
                {compsets.asTarget.length > 0 && (
                  <div>
                    <p className="mb-1 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
                      As target ({compsets.asTarget.length})
                    </p>
                    <ul className="space-y-1.5">
                      {compsets.asTarget.map((c) => (
                        <li key={c.compset_id} className="rounded-md bg-slate-50 p-2 font-mono text-[11px]">
                          <span className="text-slate-500">{c.compset_id}</span>
                          <span className="ml-2 text-slate-700">
                            {c.member_hotel_ids.length} member{c.member_hotel_ids.length === 1 ? "" : "s"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {compsets.asMember.length > 0 && (
                  <div>
                    <p className="mb-1 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
                      As member of ({compsets.asMember.length})
                    </p>
                    <ul className="space-y-1.5">
                      {compsets.asMember.map((c) => (
                        <li key={c.compset_id} className="rounded-md bg-slate-50 p-2 font-mono text-[11px]">
                          <Link
                            href={`/user/admin/hotels/${encodeURIComponent(c.target_hotel_id)}`}
                            className="text-forest-900 hover:underline"
                          >
                            target → {c.target_hotel_id}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Synthetic compset (Phase 2.3.d.6c · pending operator confirmation) */}
          <Section title="Competitive set">
            {syntheticCompset ? (
              <>
                <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5">
                  <AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                  <div className="text-[11.5px] leading-snug text-amber-900">
                    <strong>Synthetic inference</strong> · pending operator confirmation. Generated by the v{syntheticCompset.algorithm.version} similarity algorithm from the {syntheticCompset.member_hotel_ids.length}-hotel pool in {syntheticCompset.market_name}. Real membership will replace this when the 3.1 PDF source is parsed.
                  </div>
                </div>
                <ul className="space-y-2">
                  {syntheticCompset.members.map((m) => (
                    <li
                      key={m.hotel_id}
                      className="rounded-lg border border-slate-200 bg-slate-50/40 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/user/admin/hotels/${encodeURIComponent(m.hotel_id)}`}
                          className="font-headline text-[12px] font-extrabold tracking-tight text-forest-900 hover:underline"
                        >
                          {m.name ?? m.hotel_id}
                        </Link>
                        {m.chain_scale && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-slate-700 ring-1 ring-slate-200">
                            {m.chain_scale.replace(/_/g, " ")}
                          </span>
                        )}
                        <span className="ml-auto font-mono text-[10.5px] text-slate-500">
                          score {m.similarity_score.toFixed(3)}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-[10.5px] text-slate-500">
                        {m.rooms_count ? `${m.rooms_count} rooms · ` : ""}
                        {m.submarket_name ?? "—"}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-mono text-[10px] text-slate-500">
                  weights: submarket={syntheticCompset.algorithm.weights.submarket} · chain_scale={syntheticCompset.algorithm.weights.chain_scale} · rooms={syntheticCompset.algorithm.weights.rooms} · segment={syntheticCompset.algorithm.weights.segment} · geo={syntheticCompset.algorithm.weights.geo}
                </p>
              </>
            ) : (
              <p className="text-[12px] text-slate-500">
                No synthetic competitor set generated (likely the only hotel in its
                market in the current inventory). Awaiting 3.1 PDF membership parser.
              </p>
            )}
          </Section>

          {/* Transactions */}
          <Section title="Transaction history">
            {transactions.length === 0 ? (
              <p className="text-[12px] text-slate-500">No matched transactions in the master.</p>
            ) : (
              <ul className="space-y-2">
                {transactions.map((t) => (
                  <li key={t.transaction_id} className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-slate-700 ring-1 ring-slate-200">
                        {t.source}
                      </span>
                      <code className="font-mono text-[10.5px] text-slate-500">{t.transaction_id}</code>
                      {t.closed_at && (
                        <span className="font-mono text-[10.5px] text-slate-500">closed {t.closed_at}</span>
                      )}
                      {t.price_eur !== null && (
                        <span className="ml-auto font-headline text-[12px] font-extrabold text-forest-900">
                          €{(t.price_eur / 1_000_000).toFixed(1)}M
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] text-slate-700">
                      {t.buyer ? `${t.buyer} ← ` : ""}{t.seller ?? "—"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Sidebar (1/3) */}
        <aside className="space-y-5">
          {/* Phase 3.b · jump to the dedicated underwriting screen */}
          <Link
            href={`/user/admin/hotels/${encodeURIComponent(hotelId)}/underwriting`}
            className="flex items-center justify-between gap-2 rounded-xl border border-forest-900 bg-forest-900 px-4 py-3 font-headline text-[11px] font-extrabold uppercase tracking-[0.22em] text-lime-300 hover:opacity-90"
          >
            Open underwriting view
            <span className="text-lime-300">→</span>
          </Link>

          <Section title="Provenance">
            <Pair
              label="Ingestion batch"
              value={hotel._meta?.ingestion_batch_id ?? "—"}
              mono
            />
            <Pair
              label="Source file"
              value={hotel._meta?.source_path ?? "—"}
              mono
              wrap
            />
            <Pair
              label="ID kind"
              value={hotel.hotel_id_synthetic ? "synthetic (sha256)" : "costar PROPERTY ID"}
            />
            <Pair
              label="Confidence"
              value={hotel._meta ? `${(hotel._meta.confidence * 100).toFixed(0)}%` : "—"}
            />
          </Section>

          <Section title="Correction history">
            {correctionHistory.length === 0 ? (
              <p className="text-[12px] leading-relaxed text-slate-500">
                No corrections applied yet. Queue one below.
              </p>
            ) : (
              <ul className="space-y-2">
                {correctionHistory.map((c) => (
                  <li
                    key={c.correction_id}
                    className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-800 ring-1 ring-emerald-200">
                        {c.field}
                      </span>
                      <code className="font-mono text-[10.5px] text-slate-500">
                        {c.correction_id}
                      </code>
                    </div>
                    <p className="mt-1 text-[11.5px] text-slate-700">
                      <span className="text-slate-500 line-through">{fmtVal(c.original_value)}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span className="font-semibold">{fmtVal(c.corrected_value)}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-600">{c.reason}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                      {c.submitted_by} · applied {formatRel(c.applied_at)}
                      {c.confidence_before !== null && c.confidence_before !== undefined
                        ? ` · conf ${(c.confidence_before * 100).toFixed(0)}% → ✓`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Submit correction">
            <p className="mb-3 text-[12px] leading-relaxed text-slate-600">
              When an attribute is wrong or stale, queue a correction. The next
              <code className="mx-1 rounded bg-slate-100 px-1 font-mono text-[10.5px]">ingest.py</code>
              run picks it up and applies a supersede row in the master.
            </p>
            <CorrectionForm hotelId={hotel.hotel_id} fields={CORRECTABLE_FIELDS} />
          </Section>
        </aside>
      </div>
    </div>
  );
}

const CORRECTABLE_FIELDS = [
  "name",
  "brand",
  "operator",
  "owner",
  "chain_scale",
  "category",
  "segment_type",
  "rooms_count",
  "year_opened",
  "year_last_renovated",
  "address_line",
  "neighborhood",
  "score_costar",
] as const;

// ── Phase 3.e · Hotel profile enrichment section ────────────────────────────

function ProfileEnrichmentSection({ hotel }: { hotel: HotelRecord }) {
  const profile = hotel.profile;
  const meta = hotel._enrichment_meta;
  const completeness = computeProfileCompleteness(profile);
  const isEnriched = !!profile;
  const hvScore = computeHotelVALORAScore(hotel);
  const headerHint = isEnriched
    ? `Last updated ${meta?.submitted_at ? formatRel(meta.submitted_at) : "—"} by ${meta?.submitted_by ?? "operator"}`
    : "Not yet enriched · CoStar fields above are institutional · this layer adds operational depth";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
            Hotel profile · enrichment
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">{headerHint}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <BookingEnrichButton hotelId={hotel.hotel_id} />
            <EnrichmentModal hotelId={hotel.hotel_id} initialProfile={profile ?? undefined} />
          </div>
        </div>
      </div>

      {/* Completeness bar · summary line only, no missing-fields warning */}
      <div className="mb-4">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
            Profile completeness
          </span>
          <span className="font-headline text-base font-extrabold tabular-nums text-forest-900">
            {completeness.score}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all ${
              completeness.score >= 80
                ? "bg-emerald-500"
                : completeness.score >= 50
                  ? "bg-amber-500"
                  : "bg-rose-500"
            }`}
            style={{ width: `${completeness.score}%` }}
            aria-hidden
          />
        </div>
        <p className="mt-1 font-mono text-[10.5px] text-slate-500">
          {completeness.populated_fields.length} of {completeness.populated_fields.length + completeness.missing_fields.length} institutional fields populated
        </p>
      </div>

      {/* Score cards · Location · Confort · HotelVALORA · matches the
            asset-analysis report's metric panel. Each card colors by
            score bucket (≥9 emerald · ≥8 forest · ≥7 amber · else rose). */}
      {profile && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ScoreCard
            label="Location score"
            score={profile.location_score ?? null}
            hint={profile.review_count ? `${profile.review_count.toLocaleString()} reviews · Booking` : "Booking"}
          />
          <ScoreCard
            label="Confort score"
            score={profile.comfort_score ?? null}
            hint={profile.cleanliness_score != null ? `cleanliness ${profile.cleanliness_score.toFixed(1)}` : undefined}
          />
          <ScoreCard
            label="HotelVALORA score"
            score={hvScore.score}
            hint={
              hvScore.score !== null
                ? `${Math.round(hvScore.weight_coverage * 100)}% signal coverage`
                : "needs Booking sub-scores"
            }
            highlight
          />
          {(profile.room_types?.length ?? 0) > 0 && (
            <ProfileCard label="Room types">
              <p className="font-headline text-xl font-extrabold tabular-nums text-forest-900">
                {profile.room_types?.length}
              </p>
              <p className="font-mono text-[10.5px] text-slate-500">
                {profile.room_types?.slice(0, 2).map((r) => `${r.name}${r.count ? ` (${r.count})` : ""}`).join(" · ")}
                {(profile.room_types?.length ?? 0) > 2 ? ` · +${(profile.room_types?.length ?? 0) - 2}` : ""}
              </p>
            </ProfileCard>
          )}
          {profile.fnb && (
            <ProfileCard label="F&B">
              <p className="font-headline text-xl font-extrabold tabular-nums text-forest-900">
                {(profile.fnb.restaurants_count ?? 0)}R · {(profile.fnb.bars_count ?? 0)}B
              </p>
              <p className="font-mono text-[10.5px] text-slate-500">
                {profile.fnb.breakfast_included ? "breakfast incl. · " : ""}
                {profile.fnb.michelin_stars ? `${profile.fnb.michelin_stars}★ Michelin` : ""}
              </p>
            </ProfileCard>
          )}
          {profile.meeting_rooms && (profile.meeting_rooms.count ?? 0) > 0 && (
            <ProfileCard label="Meeting rooms">
              <p className="font-headline text-xl font-extrabold tabular-nums text-forest-900">
                {profile.meeting_rooms.count}
              </p>
              <p className="font-mono text-[10.5px] text-slate-500">
                {profile.meeting_rooms.total_sqm ? `${profile.meeting_rooms.total_sqm} sqm` : ""}
                {profile.meeting_rooms.max_capacity ? ` · max ${profile.meeting_rooms.max_capacity}` : ""}
              </p>
            </ProfileCard>
          )}
          {(profile.sustainability?.length ?? 0) > 0 && (
            <ProfileCard label="Sustainability">
              <p className="font-headline text-[12px] font-extrabold text-emerald-700">
                {profile.sustainability?.slice(0, 2).join(" · ")}
                {(profile.sustainability?.length ?? 0) > 2 ? ` +${(profile.sustainability?.length ?? 0) - 2}` : ""}
              </p>
            </ProfileCard>
          )}
        </div>
      )}

      {/* Room mix · canonical 7-bucket institutional distribution.
            Always rendered (operator may need to manually edit even
            when Booking returned nothing). Source resolution:
              - Booking room_types[] when present
              - 5/90/5 institutional default × rooms_count when empty
              - all-zero when neither (still all 7 buckets visible) */}
      {(() => {
        const mix = summariseRoomMix(hotel.profile, hotel.rooms_count);
        const sourceLabel =
          mix.source === "booking"
            ? `${mix.type_count_total} Booking room type${mix.type_count_total === 1 ? "" : "s"} classified`
            : mix.source === "estimated"
              ? `Estimated · 5/90/5 default × ${hotel.rooms_count ?? "?"} rooms`
              : mix.source === "manual"
                ? "Manual override"
                : "No data";
        const sourceBadge =
          mix.source === "booking"
            ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
            : mix.source === "estimated"
              ? "bg-amber-100 text-amber-800 ring-amber-200"
              : "bg-slate-100 text-slate-600 ring-slate-200";
        return (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/40 p-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
                Room mix
              </p>
              <div className="flex items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.18em] ring-1 ${sourceBadge}`}>
                  {mix.source}
                </span>
                <p className="font-mono text-[10.5px] tabular-nums text-slate-500">
                  {sourceLabel}
                  {mix.total_units != null ? ` · ${mix.total_units} units` : ""}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              {/* Headline · weighted average sqm · the institutional
                  "Superficie media" metric · always first card */}
              <div className="flex items-baseline justify-between gap-2 rounded border border-emerald-300 bg-emerald-50/40 px-2 py-1.5 ring-1 ring-emerald-200">
                <div className="min-w-0">
                  <p className="truncate font-headline text-[11px] font-bold uppercase tracking-[0.18em] text-forest-900">
                    Superficie media
                  </p>
                  <p className="font-mono text-[9.5px] text-slate-500">
                    {mix.total_units != null ? `${mix.total_units}u total` : "weighted avg"}
                  </p>
                </div>
                <p className="font-headline text-[13px] font-extrabold tabular-nums text-emerald-700">
                  {mix.hotel_avg_sqm != null ? mix.hotel_avg_sqm : "—"}
                  <span className="ml-0.5 font-mono text-[9px] font-normal text-slate-400">m²</span>
                </p>
              </div>
              {mix.rows.map((row) => {
                const present = (row.total_units ?? 0) > 0 || row.type_count > 0;
                return (
                  <div
                    key={row.bucket}
                    className={`flex items-baseline justify-between gap-2 rounded border px-2 py-1.5 ${
                      present
                        ? "border-slate-200 bg-white"
                        : "border-slate-100 bg-slate-50/40"
                    }`}
                    title={row.example ?? row.label}
                  >
                    <div className="min-w-0">
                      <p className={`truncate font-headline text-[11px] font-bold uppercase tracking-[0.18em] ${present ? "text-forest-900" : "text-slate-400"}`}>
                        {row.label}
                      </p>
                      <p className={`font-mono text-[9.5px] ${present ? "text-slate-500" : "text-slate-300"}`}>
                        {row.total_units != null && row.total_units > 0
                          ? `${row.total_units}u`
                          : row.type_count > 0
                            ? `${row.type_count} type${row.type_count === 1 ? "" : "s"}`
                            : "—"}
                      </p>
                    </div>
                    <p className={`font-headline text-[13px] font-extrabold tabular-nums ${present ? "text-forest-900" : "text-slate-300"}`}>
                      {row.avg_sqm != null ? `${row.avg_sqm}` : "—"}
                      <span className="ml-0.5 font-mono text-[9px] font-normal text-slate-400">m²</span>
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 font-mono text-[10px] text-slate-400">
              {mix.source === "booking"
                ? "avg m² sourced from Booking room_surface_in_m2 · per-bucket means"
                : mix.source === "estimated"
                  ? "5% individuales · 90% doble · 5% suite · institutional default · sqm: 18/25/45"
                  : "no data yet · use Run enrichment or Fetch from Booking to populate"}
            </p>
          </div>
        );
      })()}

      {/* Canonical 10-facility grid · institutional view · matches the
            asset-analysis report's facility checklist. The raw Booking
            facility strings are evidence (see <details> below); these
            icons are what the report consumes. */}
      {profile && (() => {
        const fac = summariseCanonicalFacilities(profile);
        return (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/40 p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
                Facilities
              </p>
              <p className="font-mono text-[10.5px] tabular-nums text-slate-500">
                {fac.present} / {fac.total} present
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-5">
              {CANONICAL_FACILITIES.map((f) => {
                const present = fac.resolved[f.key];
                const Icon = f.icon;
                return (
                  <div
                    key={f.key}
                    className={`flex items-center gap-2 text-[12.5px] ${
                      present ? "text-forest-900" : "text-slate-400"
                    }`}
                    title={`${f.label} · ${present ? "available" : "not available"}`}
                  >
                    <Icon
                      size={15}
                      className={present ? "text-emerald-600" : "text-slate-300"}
                      strokeWidth={present ? 2.4 : 1.8}
                    />
                    <span className={present ? "" : "line-through"}>{f.label}</span>
                  </div>
                );
              })}
            </div>
            {(profile.facilities_detailed?.length ?? 0) > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer font-mono text-[10.5px] text-slate-500 hover:text-forest-900">
                  Raw evidence · {profile.facilities_detailed?.length} Booking facility strings
                </summary>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {(profile.facilities_detailed ?? []).map((it) => (
                    <li
                      key={it}
                      className="rounded bg-white px-2 py-0.5 font-mono text-[10px] text-slate-600 ring-1 ring-slate-200"
                    >
                      {it}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        );
      })()}

      {/* Policies + check-in/out · separate block, kept compact */}
      {profile && (profile.check_in_time || profile.check_out_time || profile.cancellation_policy || profile.pet_policy) && (
        <div className="mt-4 space-y-3">
          {(profile.check_in_time || profile.check_out_time) && (
            <div className="grid grid-cols-2 gap-3 text-[11.5px]">
              <Pair label="Check-in" value={profile.check_in_time ?? "—"} />
              <Pair label="Check-out" value={profile.check_out_time ?? "—"} />
            </div>
          )}
          {profile.cancellation_policy && (
            <div>
              <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Cancellation</p>
              <p className="mt-0.5 text-[11.5px] text-slate-700">{profile.cancellation_policy}</p>
            </div>
          )}
          {profile.pet_policy && (
            <div>
              <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Pet policy</p>
              <p className="mt-0.5 text-[11.5px] text-slate-700">{profile.pet_policy}</p>
            </div>
          )}
        </div>
      )}

      {/* Provenance footer */}
      {meta && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3 font-mono text-[10.5px] text-slate-500">
          <span>sources:</span>
          {(meta.enrichment_sources ?? []).map((s) => (
            <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5">{s}</span>
          ))}
          {meta.enrichment_confidence !== null && meta.enrichment_confidence !== undefined && (
            <span>confidence {(meta.enrichment_confidence * 100).toFixed(0)}%</span>
          )}
        </div>
      )}
    </section>
  );
}

function ProfileCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

/**
 * Score card · 0-10 scale · color-coded by bucket.
 *   ≥9   emerald  · "excellent"
 *   ≥8   forest   · "strong"
 *   ≥7   amber    · "average"
 *   ≥6   orange   · "below average"
 *   else rose     · "weak"
 *   null grey     · "—"
 * `highlight` puts an emerald ring around the card · used to flag the
 * institutional composite (HotelVALORA score) as the load-bearing
 * headline.
 */
function ScoreCard({
  label,
  score,
  hint,
  highlight,
}: {
  label: string;
  score: number | null;
  hint?: string;
  highlight?: boolean;
}) {
  const tone =
    score === null
      ? "text-slate-400"
      : score >= 9
        ? "text-emerald-700"
        : score >= 8
          ? "text-forest-900"
          : score >= 7
            ? "text-amber-700"
            : score >= 6
              ? "text-orange-700"
              : "text-rose-700";
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight
          ? "border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-200"
          : "border-slate-200 bg-slate-50/40"
      }`}
    >
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className={`mt-0.5 font-headline text-xl font-extrabold tabular-nums ${tone}`}>
        {score !== null ? score.toFixed(1) : "—"}
        <span className="ml-1 font-mono text-[10px] font-normal text-slate-400">/ 10</span>
      </p>
      {hint && (
        <p className="mt-0.5 font-mono text-[10px] leading-snug text-slate-500">{hint}</p>
      )}
    </div>
  );
}


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
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Pair({
  label,
  value,
  mono,
  wrap,
}: {
  label: string;
  value: string | React.ReactNode;
  mono?: boolean;
  wrap?: boolean;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 text-[12px]">
      <dt className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </dt>
      <dd className={`${mono ? "font-mono text-[11.5px]" : ""} ${wrap ? "break-all" : "truncate"} text-slate-800`}>
        {value}
      </dd>
    </div>
  );
}

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return String(n);
}

function fmtSqm(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  // Thousand-separator with Spanish locale to match the institutional
  // asset-analysis report (e.g. "102.851 m²")
  return n.toLocaleString("es-ES");
}

function fmtCategory(c: string | null | undefined): string {
  if (!c) return "—";
  const trimmed = c.trim();
  // Numeric (e.g. "5", "5.0") → "5 ★"
  const n = Number(trimmed);
  if (Number.isFinite(n) && n > 0 && n <= 7) {
    return `${n} ★`;
  }
  // Already formatted (e.g. "5 stars", "GL", "Lujo") — pass through
  return trimmed;
}

function fmtSegment(s: string | null | undefined): string {
  if (!s) return "—";
  const map: Record<string, string> = {
    hotel: "Hotel",
    hotel_project: "Hotel project",
    tourist_apartments: "Tourist apartments",
    // Legacy values may still be in older records · render gracefully
    business: "Hotel (business · legacy)",
    leisure: "Hotel (leisure · legacy)",
    extended_stay: "Extended stay (legacy)",
    resort: "Resort (legacy)",
    convention: "Convention (legacy)",
  };
  return map[s] ?? s;
}

function fmtFloors(
  total: number | null | undefined,
  above: number | null | undefined,
  below: number | null | undefined,
): string {
  // Prefer the "above / total" institutional format when both are
  // present (matches the asset-analysis "Nº Stories" pattern · e.g.
  // "33 / 58" = above-ground / total). Fall back to plain total
  // when only one signal exists.
  if (above !== null && above !== undefined && total !== null && total !== undefined) {
    return `${above} / ${total}${below ? ` · ${below} below` : ""}`;
  }
  if (total !== null && total !== undefined) return String(total);
  if (above !== null && above !== undefined) return String(above);
  return "—";
}

// ── Phase 3 helpers ─────────────────────────────────────────────────────────

interface MarketSnap {
  occupancy_12m: number | null;
  occupancy_yoy_12m: number | null;
  adr_12m: number | null;
  adr_yoy_12m: number | null;
  revpar_12m: number | null;
  revpar_yoy_12m: number | null;
  rooms_inventory: number | null;
  rooms_under_construction: number | null;
}

function MarketKpiBlock({ label, ms }: { label: string; ms: MarketSnap }) {
  return (
    <div>
      <p className="mb-2 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MarketKpi
          label="Occupancy 12m"
          value={ms.occupancy_12m !== null ? `${(ms.occupancy_12m * 100).toFixed(1)}%` : "—"}
          yoy={ms.occupancy_yoy_12m}
          yoyFormat={(v) => `${(v * 100).toFixed(1)}pp`}
        />
        <MarketKpi
          label="ADR 12m"
          value={ms.adr_12m !== null ? `€${ms.adr_12m.toFixed(0)}` : "—"}
          yoy={ms.adr_yoy_12m}
          yoyFormat={(v) => `${(v * 100).toFixed(1)}%`}
        />
        <MarketKpi
          label="RevPAR 12m"
          value={ms.revpar_12m !== null ? `€${ms.revpar_12m.toFixed(0)}` : "—"}
          yoy={ms.revpar_yoy_12m}
          yoyFormat={(v) => `${(v * 100).toFixed(1)}%`}
        />
        <MarketKpi
          label="Inventory"
          value={ms.rooms_inventory !== null ? ms.rooms_inventory.toLocaleString() : "—"}
          hint={ms.rooms_under_construction ? `+${ms.rooms_under_construction.toLocaleString()} in construction` : undefined}
        />
      </div>
    </div>
  );
}

function MarketKpi({
  label,
  value,
  yoy,
  yoyFormat,
  hint,
}: {
  label: string;
  value: string;
  yoy?: number | null;
  yoyFormat?: (v: number) => string;
  hint?: string;
}) {
  const yoyTone =
    yoy === null || yoy === undefined ? "" : yoy > 0 ? "text-emerald-700" : yoy < 0 ? "text-rose-700" : "text-slate-500";
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-2.5">
      <p className="font-headline text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 font-headline text-base font-extrabold tabular-nums text-forest-900">{value}</p>
      {yoy !== null && yoy !== undefined && yoyFormat && (
        <p className={`mt-0.5 font-mono text-[10.5px] ${yoyTone}`}>
          {yoy > 0 ? "▲" : yoy < 0 ? "▼" : "·"} {yoyFormat(Math.abs(yoy))} YoY
        </p>
      )}
      {hint && <p className="mt-0.5 font-mono text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function MarketTrendCell({
  label,
  series,
  format,
}: {
  label: string;
  series: (number | null)[];
  format: (v: number) => string;
}) {
  const nums = series.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) {
    return (
      <div className="rounded bg-slate-50 p-2">
        <p className="font-headline text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="font-mono text-[10.5px] text-slate-400">—</p>
      </div>
    );
  }
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const first = nums[0];
  const last = nums[nums.length - 1];
  const delta = first === 0 ? 0 : (last - first) / first;
  const deltaTone = delta > 0 ? "text-emerald-700" : delta < 0 ? "text-rose-700" : "text-slate-500";
  return (
    <div className="rounded bg-slate-50 p-2">
      <p className="font-headline text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-0.5 font-headline text-[13px] font-extrabold tabular-nums text-forest-900">{format(last)}</p>
      <p className={`mt-0.5 font-mono text-[10px] ${deltaTone}`}>
        {delta > 0 ? "▲" : delta < 0 ? "▼" : "·"} {(Math.abs(delta) * 100).toFixed(1)}% vs {nums.length}p ago
      </p>
      <p className="mt-0.5 font-mono text-[9.5px] text-slate-400">
        {format(min)} – {format(max)}
      </p>
    </div>
  );
}

function matchToneCls(matched: string): string {
  if (matched === "same_hotel") return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  if (matched === "same_submarket") return "bg-sky-100 text-sky-800 ring-sky-200";
  if (matched === "same_market") return "bg-slate-100 text-slate-700 ring-slate-200";
  return "bg-slate-100 text-slate-500 ring-slate-200";
}

function fmtVal(v: string | number | null): string {
  if (v === null || v === undefined || v === "") return "(empty)";
  return String(v);
}

function formatRel(iso: string): string {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.round(diff / 3600_000)}h ago`;
  return `${Math.round(diff / 86400_000)}d ago`;
}
