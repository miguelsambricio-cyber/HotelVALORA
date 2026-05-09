// CAPEX & Renders data contract.
//
// Designed to be replaced by the future financial engine without touching the
// page or the components. Every renderable list is array-driven; no labels or
// counts are hardcoded inside the JSX.

// ── CAPEX Breakdown ──────────────────────────────────────────────────────────

export type CapexUnit = "total" | "perRoom";
export type CapexMode = "basic" | "custom";

export interface CapexLineItem {
  /** Stable id (used as React key + future engine reference) */
  id: string;
  /** Display label, e.g. "Structure" */
  label: string;
  /** Monetary amount in `unit` */
  amount: number;
  /** Unit basis — defaults to the parent category unit */
  unit?: CapexUnit;
  /** Free-form metadata for engine integration (cost code, vendor, etc.) */
  meta?: Record<string, unknown>;
}

export interface CapexCategoryData {
  id: string;
  label: string;
  /** Category-level total */
  total: number;
  unit: CapexUnit;
  /** Whether the category is expanded by default */
  defaultOpen?: boolean;
  items: CapexLineItem[];
}

export interface CapexBreakdown {
  mode: CapexMode;
  total: number;
  unit: CapexUnit;
  /** Available unit choices for the dropdown (always at least `total`) */
  unitOptions: { id: CapexUnit; label: string }[];
  categories: CapexCategoryData[];
}

// ── Schedule ─────────────────────────────────────────────────────────────────

export type OperationalMode = "open" | "closed";

export interface CapexSchedule {
  /** Currently selected duration in months */
  durationMonths: number;
  minMonths: number;
  maxMonths: number;
  operationalMode: OperationalMode;
  /**
   * Operational capacity during CAPEX as a percentage 0–100.
   * Drives the future operational-revenue / GOP / EBITDA scaling — the
   * UI stores it locally for now until the financial engine consumes it.
   */
  operationalPercentage: number;
}

// ── Property Gallery (right sidebar) ─────────────────────────────────────────

export interface PropertyGalleryItem {
  id: string;
  src: string;
  alt: string;
  /** Caption rendered over the bottom-left of the tile (e.g. "Lobby", "Spa") */
  caption: string;
  /** Grid span — 1 (half) or 2 (full width across the 2-col gallery) */
  span?: 1 | 2;
}

export interface PropertyGalleryData {
  /** Number shown in the "N items" badge — may exceed `items.length` if
   *  more photos exist behind the "View All Photos" CTA */
  totalCount: number;
  items: PropertyGalleryItem[];
}

// ── Render configuration (AI render section) ─────────────────────────────────

export interface RenderTagOption {
  id: string;
  label: string;
}

export interface RenderTagGroupData {
  /** Group key, e.g. "area", "style", "view", "imagesPerPage" */
  id: string;
  /** Group display label, e.g. "Area" */
  label: string;
  /** Currently selected option id */
  selectedId: string;
  options: RenderTagOption[];
}

export interface RenderPreview {
  src: string;
  /** Caption rendered over the bottom gradient overlay */
  caption: string;
}

export interface RenderConfigState {
  preview: RenderPreview;
  groups: RenderTagGroupData[];
  /** Pre-checked state of the "Incluir esta vista en el reporte final" box */
  includeInReport: boolean;
}

// ── Top-level page data ──────────────────────────────────────────────────────

export interface CapexRendersData {
  /** Hotel-side toggle label rendered in the page header (e.g. "Prime") */
  hotelLabel: string;
  /** Tab selection between basic and custom CAPEX flows */
  capexMode: CapexMode;
  /** Available tabs at the top of the CAPEX panel */
  capexModes: { id: CapexMode; label: string }[];
  capex: CapexBreakdown;
  schedule: CapexSchedule;
  gallery: PropertyGalleryData;
  renderConfig: RenderConfigState;
}

// ── Mock data (matches Stitch reference) ─────────────────────────────────────

const RENDER_PLACEHOLDER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAISSHDg-2_5fCTmL2wb1sriSeWK_wWtrD5PxYl5tWFNTheF9C25hMS2RVc2mr8Q35cqq-mpLsqDziP6v91IV6Q33vtje03xTaAshcgW6IZLa778eQut9TIuOrADEO0XrOvyPpgqcQTWMgNfNLPJeknEgxk5vjRLdcOhfE_QOKkvw94jMGVH3ccA8__E5KtBAyErI84UWeWk_1wjMMKiV89Ds7u7lhE3qO4ZJ_TGoH3LTvpD5isROwHoph6pnBdjG2o1PY6YT4oEBi5";

export function getMockCapexRenders(): CapexRendersData {
  return {
    hotelLabel: "Prime",
    capexMode: "basic",
    capexModes: [
      { id: "basic", label: "CAPEX BÁSICO" },
      { id: "custom", label: "CAPEX PERSONALIZADO" },
    ],
    capex: {
      mode: "basic",
      total: 12_500_000,
      unit: "total",
      unitOptions: [
        { id: "total", label: "€ total" },
        { id: "perRoom", label: "€ / room" },
      ],
      categories: [
        {
          id: "hard-cost",
          label: "Hard Cost",
          total: 8_000_000,
          unit: "total",
          defaultOpen: true,
          items: [
            { id: "structure", label: "Structure", amount: 3_500_000 },
            { id: "asset-content", label: "Asset content", amount: 2_000_000 },
            { id: "mep", label: "MEP", amount: 1_500_000 },
            { id: "exterior", label: "Exterior", amount: 1_000_000 },
          ],
        },
        {
          id: "soft-cost",
          label: "Soft Cost",
          total: 3_500_000,
          unit: "total",
          defaultOpen: true,
          items: [
            { id: "licensing", label: "Licensing", amount: 200_000 },
            { id: "technical", label: "Technical", amount: 400_000 },
            { id: "development", label: "Development", amount: 300_000 },
            { id: "pre-opening", label: "Pre-Opening", amount: 500_000 },
            { id: "ff-e", label: "FF&E", amount: 1_500_000 },
            { id: "os-e", label: "OS&E", amount: 600_000 },
          ],
        },
        {
          id: "project-costs",
          label: "Project Costs",
          total: 1_000_000,
          unit: "total",
          defaultOpen: true,
          items: [
            { id: "contingency", label: "Contingency", amount: 800_000 },
            { id: "insurance", label: "Insurance", amount: 200_000 },
          ],
        },
      ],
    },
    schedule: {
      durationMonths: 18,
      minMonths: 0,
      maxMonths: 36,
      operationalMode: "open",
      operationalPercentage: 100,
    },
    gallery: {
      totalCount: 8,
      items: [
        { id: "lobby", src: RENDER_PLACEHOLDER, alt: "Lobby render", caption: "Lobby", span: 1 },
        { id: "room", src: RENDER_PLACEHOLDER, alt: "Room render", caption: "Room", span: 1 },
        { id: "bar", src: RENDER_PLACEHOLDER, alt: "Bar render", caption: "Bar", span: 1 },
        { id: "restaurant", src: RENDER_PLACEHOLDER, alt: "Restaurant render", caption: "Restaurant", span: 1 },
        { id: "exterior", src: RENDER_PLACEHOLDER, alt: "Exterior render", caption: "Exterior", span: 1 },
        { id: "meeting-room", src: RENDER_PLACEHOLDER, alt: "Meeting room render", caption: "Meeting Room", span: 1 },
        { id: "pool", src: RENDER_PLACEHOLDER, alt: "Pool render", caption: "Pool", span: 1 },
        { id: "spa", src: RENDER_PLACEHOLDER, alt: "Spa render", caption: "Spa", span: 1 },
      ],
    },
    renderConfig: {
      preview: {
        src: RENDER_PLACEHOLDER,
        caption: "Vista Actual: Lobby Principal",
      },
      includeInReport: true,
      groups: [
        {
          id: "area",
          label: "Area",
          selectedId: "lobby",
          options: [
            { id: "fachada", label: "Fachada" },
            { id: "habitaciones", label: "Habitaciones" },
            { id: "banos", label: "Baños" },
            { id: "lobby", label: "Lobby" },
            { id: "meeting-room", label: "Meeting Room" },
            { id: "gym", label: "Gym" },
            { id: "pool", label: "Pool" },
            { id: "spa", label: "SPA" },
            { id: "bar", label: "Bar" },
            { id: "restaurant", label: "Restaurant" },
            { id: "rooftop", label: "Rooftop" },
          ],
        },
        {
          id: "style",
          label: "Tipo de imagen",
          selectedId: "classic",
          options: [
            { id: "classic", label: "Clásico" },
            { id: "modern", label: "Moderno" },
            { id: "avant-garde", label: "Vanguardista" },
            { id: "3d", label: "3D" },
          ],
        },
        {
          id: "view",
          label: "Vista",
          selectedId: "cover",
          options: [
            { id: "cover", label: "Portada" },
            { id: "report", label: "Informe" },
            { id: "final", label: "Final" },
          ],
        },
        {
          id: "imagesPerPage",
          label: "Imágen por página",
          selectedId: "1",
          options: [
            { id: "1", label: "1 por pág" },
            { id: "2", label: "2 por pág" },
            { id: "4", label: "4 por pág" },
            { id: "8", label: "8 por pág" },
          ],
        },
      ],
    },
  };
}

// ── Format helper ────────────────────────────────────────────────────────────
//
// Stitch uses comma-grouped figures (e.g. "12,500,000"). We re-export a tiny
// helper rather than reaching for `Intl` per call site.

export function formatCapexAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount);
}
