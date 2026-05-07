// Master navigation structure for all report pages.
// Order here is the canonical report order — do not rearrange.

export interface ReportNavSubItem {
  label: string;
  href: string;
}

export interface ReportNavItem {
  number: number;
  label: string;
  href: string;
  subItems?: ReportNavSubItem[];
}

export const REPORT_NAV_ITEMS: ReportNavItem[] = [
  {
    number: 1,
    label: "Executive Summary",
    href: "/report/executive-summary",
  },
  {
    number: 2,
    label: "Asset Analysis",
    href: "/report/asset-analysis",
    subItems: [
      { label: "Hotel personalizado", href: "/report/asset-analysis#personalizado" },
      { label: "CAPEX",              href: "/report/asset-analysis#capex"          },
      { label: "Renders",            href: "/report/asset-analysis#renders"        },
    ],
  },
  {
    number: 3,
    label: "CompSET",
    href: "/report/competitive-set",
  },
  {
    number: 4,
    label: "Market Overview",
    href: "/report/market-overview",
    subItems: [
      { label: "Market overview",  href: "/report/market-overview#overview"      },
      { label: "Transactions",     href: "/report/market-overview#transactions"  },
      { label: "Projects",         href: "/report/market-overview#projects"      },
      { label: "Market dynamics",  href: "/report/market-overview#dynamics"      },
    ],
  },
  {
    number: 5,
    label: "Financials",
    href: "/report/financials",
    subItems: [
      { label: "Finance structure",   href: "/report/financials#structure" },
      { label: "P&L",                 href: "/report/financials#pl"        },
      { label: "Underwriting IRR",    href: "/report/financials#irr"       },
    ],
  },
  {
    number: 6,
    label: "Methodology",
    href: "/report/methodology",
  },
];
