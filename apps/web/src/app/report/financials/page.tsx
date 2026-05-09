import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Layers, TrendingUp } from "lucide-react";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Financials — HotelVALORA",
};

interface FinancialsSubPage {
  href: string;
  title: string;
  blurb: string;
  icon: React.ReactNode;
  status: "live" | "soon";
}

const SUB_PAGES: FinancialsSubPage[] = [
  {
    href: "#structure",
    title: "Finance Structure",
    blurb:
      "Capital stack, debt service, and equity contribution overview. Coming soon.",
    icon: <Layers size={22} className="text-forest-900" strokeWidth={2.2} />,
    status: "soon",
  },
  {
    href: "/report/financials/pl",
    title: "P&L 5 Years",
    blurb:
      "USALI 5-year operating P&L with editable assumptions, departmental detail, GOP and EBITDA.",
    icon: <FileText size={22} className="text-forest-900" strokeWidth={2.2} />,
    status: "live",
  },
  {
    href: "#irr",
    title: "Underwriting IRR",
    blurb:
      "Equity IRR, levered/unlevered cash flows, sensitivity grid. Coming soon.",
    icon: <TrendingUp size={22} className="text-forest-900" strokeWidth={2.2} />,
    status: "soon",
  },
];

export default function FinancialsLandingPage() {
  return (
    <ReportShell>
      <div className="space-y-6 print:space-y-3">
        <ReportPaper
          sectionLabel="hotel valuation"
          title="Financials"
          titleSize="4xl"
          headerLayout="stacked"
          closed
        >
          <div className="px-8 py-6 print:px-3 print:py-2">
            <p className="mb-6 max-w-2xl text-sm text-slate-600 print:text-xs">
              Operating P&amp;L, capital structure, and underwriting return
              analysis for the asset. Each sub-section opens an institutional
              view tied to the same assumption store.
            </p>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3 print:grid-cols-3 print:gap-3">
              {SUB_PAGES.map((page) => (
                <SubPageCard key={page.title} page={page} />
              ))}
            </div>
          </div>
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}

function SubPageCard({ page }: { page: FinancialsSubPage }) {
  const isLive = page.status === "live";
  const Inner = (
    <div
      className={cn(
        "group flex h-full flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm transition-all print:p-3 print:shadow-none print:rounded-md",
        isLive
          ? "border-slate-200 hover:border-forest-900 hover:shadow-md"
          : "border-slate-200 opacity-60",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
          {page.icon}
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
            isLive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500",
          )}
        >
          {isLive ? "Live" : "Soon"}
        </span>
      </div>

      <div className="flex-1">
        <h3 className="font-headline text-base font-extrabold uppercase tracking-tight text-forest-900">
          {page.title}
        </h3>
        <p className="mt-1 text-xs text-slate-600">{page.blurb}</p>
      </div>

      {isLive && (
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-forest-900 transition-transform group-hover:translate-x-0.5">
          Open <ArrowRight size={14} strokeWidth={2.5} />
        </div>
      )}
    </div>
  );

  if (!isLive) return Inner;
  return <Link href={page.href}>{Inner}</Link>;
}
