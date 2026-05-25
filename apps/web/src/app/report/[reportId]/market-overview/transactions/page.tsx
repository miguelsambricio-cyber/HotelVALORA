import type { Metadata } from "next";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { HotelToggle } from "../../../asset-analysis/hotel-toggle";
import {
  TransactionHotelCard,
  TransactionsKpiCard,
  TransactionsTable,
} from "@/components/report/market-overview/transactions";
import { getMockTransactions } from "@/lib/report/transactions-data";
import { getCanonicalHotelById } from "@/lib/report/canonical-reader";
import { getReportById } from "@/lib/report/report-session";

export const metadata: Metadata = {
  title: "Transactions — HotelVALORA",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: { reportId: string };
}

async function loadTransactionsData(reportId: string) {
  const mock = getMockTransactions();
  const session = await getReportById(reportId);
  if (!session) return mock;
  const hotel = await getCanonicalHotelById(session.canonical_id);
  if (!hotel) return mock;
  return { ...mock, hotelLabel: hotel.canonical_name ?? mock.hotelLabel };
}

export default async function TransactionsPage({ params }: PageProps) {
  const data = await loadTransactionsData(params.reportId);

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-4">
              {data.kpiCards.map((card) => (
                <TransactionsKpiCard key={card.scope} data={card} />
              ))}
            </div>

            <TransactionsTable title={data.tableTitle} rows={data.rows} />

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
