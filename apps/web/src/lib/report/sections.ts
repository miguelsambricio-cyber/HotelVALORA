import type {
  ReportSection,
  ReportSectionGroupConfig,
  ReportSectionId,
} from "@/types/report";

// One canonical registry for the report.
//
// Conventions:
// - `id` is the URL slug under /report/<id>.
// - Sub-items are visual hash anchors only — they do not create routes.
// - `implemented: false` sections render an "in development" placeholder;
//   the sidebar still links to them for navigation continuity.
// - When a new section ships, flip `implemented: true` and add the page file
//   at apps/web/src/app/report/<id>/page.tsx. Nothing else needs to change.

export const REPORT_ROUTE_PREFIX = "/report";

export const REPORT_SECTIONS: ReportSection[] = [
  {
    id: "executive-summary",
    number: 1,
    group: "overview",
    label: "Executive Summary",
    shortLabel: "Resumen",
    description: "Portada, highlights y tesis de inversión",
    printPageBreak: false,
    implemented: true,
  },
  {
    id: "asset-analysis",
    number: 2,
    group: "asset",
    label: "Asset Analysis",
    shortLabel: "Activo",
    description: "Ficha técnica, CAPEX y renders del hotel",
    printPageBreak: true,
    implemented: true,
    subItems: [
      { href: "/report/asset-analysis", label: "Hotel personalizado" },
      { href: "/report/asset-analysis/capex", label: "CAPEX" },
      { href: "/report/asset-analysis/capex#renders", label: "Renders" },
    ],
  },
  {
    id: "competitive-set",
    number: 3,
    group: "compset",
    label: "CompSET",
    shortLabel: "CompSET",
    description: "Tabla comparativa y galería del set competitivo",
    printPageBreak: true,
    implemented: true,
  },
  {
    id: "market-overview",
    number: 4,
    group: "market",
    label: "Market Overview",
    shortLabel: "Mercado",
    description: "Country / Market / Submarket / Class insights + demand generators",
    printPageBreak: true,
    implemented: true,
    subItems: [
      { href: "/report/market-overview", label: "Market overview" },
      { href: "/report/market-overview/transactions", label: "Transactions" },
      { href: "/report/market-overview/projects", label: "Projects" },
      { href: "/report/market-overview/dynamics", label: "Market dynamics" },
    ],
  },
  {
    id: "financials",
    number: 5,
    group: "financials",
    label: "Financials",
    shortLabel: "Financials",
    description: "Estructura financiera, P&L y underwriting IRR",
    printPageBreak: true,
    implemented: true,
    subItems: [
      { href: "#structure", label: "Finance structure" },
      { href: "/report/financials/pl", label: "5-Year P&L" },
      { href: "/report/financials/underwriting", label: "Underwriting" },
      { href: "#irr", label: "Underwriting IRR" },
    ],
  },
  {
    id: "methodology",
    number: 6,
    group: "methodology",
    label: "Methodology",
    shortLabel: "Methodology",
    description: "Metodología de valoración y supuestos",
    printPageBreak: true,
    implemented: false,
  },
];

export const SECTION_GROUPS: ReportSectionGroupConfig[] = [
  { id: "overview", label: "Overview", sections: ["executive-summary"] },
  { id: "asset", label: "Asset", sections: ["asset-analysis"] },
  { id: "compset", label: "CompSET", sections: ["competitive-set"] },
  { id: "market", label: "Market", sections: ["market-overview"] },
  { id: "financials", label: "Financials", sections: ["financials"] },
  { id: "methodology", label: "Methodology", sections: ["methodology"] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build the URL for a section.
 *
 * Two layouts coexist during the URL-pass-through → persistence migration:
 *   - Canonical: `/report/<reportId>/<sectionId>` (used by sidebar nav
 *     and any link inside the report shell once a hotel_report row is
 *     bootstrapped).
 *   - Legacy: `/report/<sectionId>` (only the legacy bridge files at
 *     `app/report/<section>/page.tsx`, which 308-redirect into the
 *     canonical route when input is present).
 *
 * Pass `reportId` to get the canonical URL · omit it for the legacy form.
 */
export function getSectionHref(sectionId: ReportSectionId, reportId?: string | null): string {
  return reportId
    ? `${REPORT_ROUTE_PREFIX}/${reportId}/${sectionId}`
    : `${REPORT_ROUTE_PREFIX}/${sectionId}`;
}

/**
 * Extract the active reportId from a pathname. Returns null when the
 * pathname is a flat legacy `/report/<section>` URL or anything outside
 * the report tree.
 *
 * Implementation note: we can't UUID-regex the segment because we also
 * want to accept the `legacy-mock` sentinel that the legacy bridges
 * redirect to when no input resolves. Any second segment that isn't a
 * known section name is treated as a reportId.
 */
const SECTION_SLUGS: ReadonlySet<string> = new Set([
  "executive-summary",
  "asset-analysis",
  "competitive-set",
  "market-overview",
  "financials",
  "methodology",
]);

export function extractReportIdFromPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/report\/([^/]+)(\/|$)/);
  if (!match) return null;
  const candidate = match[1];
  if (SECTION_SLUGS.has(candidate)) return null;
  return candidate;
}

export function getSectionById(id: string): ReportSection | undefined {
  return REPORT_SECTIONS.find((s) => s.id === id);
}

export function getAdjacentSections(currentId: ReportSectionId): {
  prev: ReportSection | undefined;
  next: ReportSection | undefined;
} {
  const idx = REPORT_SECTIONS.findIndex((s) => s.id === currentId);
  return {
    prev: idx > 0 ? REPORT_SECTIONS[idx - 1] : undefined,
    next: idx < REPORT_SECTIONS.length - 1 ? REPORT_SECTIONS[idx + 1] : undefined,
  };
}

export function getImplementedSections(): ReportSection[] {
  return REPORT_SECTIONS.filter((s) => s.implemented);
}
