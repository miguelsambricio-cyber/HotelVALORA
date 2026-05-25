import type { Metadata } from "next";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { HotelToggle } from "../../asset-analysis/hotel-toggle";
import {
  TransactionHotelCard,
  TransactionsKpiCard,
  TransactionsTable,
} from "@/components/report/market-overview/transactions";
import { getMockTransactions } from "@/lib/report/transactions-data";
import {
  getCanonicalHotelById,
  resolveCanonicalIdAny,
} from "@/lib/report/canonical-reader";

export const metadata: Metadata = {
  title: "Transactions — HotelVALORA",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { canonical_id?: string; hotel_id?: string; ref?: string };
}

/**
 * Transactions · MARKET-LEVEL scope per operator directive (2026-05-25 §3).
 * Past transactions are inherently market-wide · the hotel context only
 * drives the header label. Future: filter by hotel.market_id when
 * transactions-data carries market segmentation.
 */
async function loadTransactionsData(searchParams: PageProps["searchParams"]) {
  const mock = getMockTransactions();
  const candidate = searchParams?.canonical_id || searchParams?.hotel_id || searchParams?.ref;
  const canonicalId = candidate ? await resolveCanonicalIdAny(candidate) : null;
  if (!canonicalId) return mock;
  const hotel = await getCanonicalHotelById(canonicalId);
  if (!hotel) return mock;
  return { ...mock, hotelLabel: hotel.canonical_name ?? mock.hotelLabel };
}

export default async function TransactionsPage({ searchParams = {} }: PageProps) {
  const data = await loadTransactionsData(searchParams);

  const headerActions = (
    <div className="flex items-center gap-4">
      <span className="text-xl font-bold text-slate-700 font-headline">
        {data.hotelLabel}
      </span>
      <HotelToggle />
    </div>
  );

  return (
    <ReportShell>
      <div className="space-y-6 print:space-y-3">
        <ReportPaper
          sectionLabel="hotel valuation"
          title="Hotel Transactions"
          titleSize="4xl"
          headerLayout="stacked"
          closed
          actions={headerActions}
        >
          <div className="px-8 py-6 print:px-3 print:py-2 space-y-8 print:space-y-4">
            {/* TOP KPI ROW — 2 cards (market context + class context).
                Mobile collapses to a single column for readable stacking. */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-4">
              {data.kpiCards.map((card) => (
                <TransactionsKpiCard key={card.scope} data={card} />
              ))}
            </div>

            {/* INSTITUTIONAL COMP-SET TABLE
                18 columns; horizontal scroll on narrow widths.
                Print compaction (column subset, font size) is the next pass. */}
            <TransactionsTable
              title={data.tableTitle}
              rows={data.rows}
            />

            {/* INTERACTIVE GALLERY
                4-up at lg+, 2-up at sm, 1-up on mobile. */}
            <section>
              <div className="flex justify-between items-center mb-6 print:mb-3">
                <h3 className="text-lg font-extrabold text-forest-900 font-headline uppercase tracking-tight">
                  Interactive Gallery
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.gallery.map((item) => (
                  <TransactionHotelCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          </div>
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
