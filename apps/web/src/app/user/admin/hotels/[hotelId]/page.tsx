import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Building2, AlertTriangle, ArrowUpRight } from "lucide-react";
import {
  findHotelById,
  findCompsetsForHotel,
  findTransactionsForHotel,
  type HotelRecord,
} from "@/lib/admin/hotels/snapshot-reader";
import { CorrectionForm } from "@/components/admin/hotels/correction-form";

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

  const [compsets, transactions] = await Promise.all([
    findCompsetsForHotel(hotelId),
    findTransactionsForHotel(hotelId),
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
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-emerald-800 ring-1 ring-inset ring-emerald-200">
            Reference hotel
          </span>
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
          </Section>

          <Section title="Property characteristics">
            <Pair label="Chain scale" value={hotel.chain_scale?.replace(/_/g, " ") ?? "—"} />
            <Pair label="Category" value={hotel.category ?? "—"} />
            <Pair label="Segment" value={hotel.segment_type ?? "—"} />
            <Pair label="Rooms" value={fmtNum(hotel.rooms_count)} />
            <Pair label="Floors" value={fmtNum(hotel.total_floors)} />
            <Pair label="Year opened" value={fmtNum(hotel.year_opened)} />
            <Pair label="Year last renovated" value={fmtNum(hotel.year_last_renovated)} />
            <Pair label="CoStar score" value={hotel.score_costar !== null ? hotel.score_costar.toFixed(2) : "—"} />
          </Section>

          <Section title="Location" icon={<MapPin size={14} />}>
            <Pair label="Address" value={hotel.address_line ?? "—"} />
            <Pair label="Postal code" value={hotel.postal_code ?? "—"} />
            <Pair label="Neighborhood" value={hotel.neighborhood ?? "—"} />
            <Pair
              label="Coordinates"
              value={
                hotel.latitude !== null && hotel.longitude !== null
                  ? `${hotel.latitude.toFixed(5)}, ${hotel.longitude.toFixed(5)}`
                  : "—"
              }
              mono
            />
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

function Pair({ label, value, mono, wrap }: { label: string; value: string; mono?: boolean; wrap?: boolean }) {
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
