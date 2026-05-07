import type {
  ReportSection,
  ReportSectionGroupConfig,
  ReportSectionId,
} from "@/types/report";

// ── Section registry ─────────────────────────────────────────────────────────
// Add new sections here. Component wiring happens in section-registry.ts.

export const REPORT_SECTIONS: ReportSection[] = [
  // ── Overview ──────────────────────────────────────────────────────────────
  {
    id: "executive-summary",
    number: 1,
    group: "overview",
    label: "Resumen Ejecutivo",
    shortLabel: "Resumen",
    description: "Portada, highlights clave y tesis de inversión",
    printPageBreak: false,
  },
  {
    id: "property-overview",
    number: 2,
    group: "overview",
    label: "Descripción del Activo",
    shortLabel: "Activo",
    description: "Ficha técnica, ubicación y características del hotel",
    printPageBreak: true,
  },

  // ── Performance ───────────────────────────────────────────────────────────
  {
    id: "revenue-metrics",
    number: 3,
    group: "performance",
    label: "Métricas de Ingresos",
    shortLabel: "Ingresos",
    description: "ADR, RevPAR, ocupación y evolución histórica",
    printPageBreak: true,
  },
  {
    id: "operational-performance",
    number: 4,
    group: "performance",
    label: "Performance Operacional",
    shortLabel: "Operaciones",
    description: "GOP, EBITDA, NOI y márgenes operativos",
    printPageBreak: true,
  },
  {
    id: "revenue-streams",
    number: 5,
    group: "performance",
    label: "Fuentes de Ingreso",
    shortLabel: "Mix Ingresos",
    description: "Desglose por habitaciones, F&B, eventos y otros",
    printPageBreak: true,
  },
  {
    id: "cost-structure",
    number: 6,
    group: "performance",
    label: "Estructura de Costes",
    shortLabel: "Costes",
    description: "Desglose de departamentos y gastos fijos/variables",
    printPageBreak: true,
  },

  // ── Valuation ─────────────────────────────────────────────────────────────
  {
    id: "dcf-valuation",
    number: 7,
    group: "valuation",
    label: "Modelo DCF",
    shortLabel: "DCF",
    description: "Proyecciones de flujo de caja y valoración por descuento",
    printPageBreak: true,
  },
  {
    id: "sensitivity-analysis",
    number: 8,
    group: "valuation",
    label: "Análisis de Sensibilidad",
    shortLabel: "Sensibilidad",
    description: "Matrices de escenarios: RevPAR × cap rate × WACC",
    printPageBreak: true,
  },
  {
    id: "comparable-transactions",
    number: 9,
    group: "valuation",
    label: "Transacciones Comparables",
    shortLabel: "Comps",
    description: "Benchmark de ventas recientes por RevPAR/habitación",
    printPageBreak: true,
  },

  // ── Market ────────────────────────────────────────────────────────────────
  {
    id: "market-position",
    number: 10,
    group: "market",
    label: "Posicionamiento de Mercado",
    shortLabel: "Mercado",
    description: "Análisis competitivo, STR share index y penetración",
    printPageBreak: true,
  },
  {
    id: "market-trends",
    number: 11,
    group: "market",
    label: "Tendencias del Mercado",
    shortLabel: "Tendencias",
    description: "Demanda turística, ADR de mercado y proyecciones",
    printPageBreak: true,
  },
  {
    id: "supply-pipeline",
    number: 12,
    group: "market",
    label: "Pipeline de Oferta",
    shortLabel: "Pipeline",
    description: "Nuevas aperturas, conversiones y presión competitiva",
    printPageBreak: true,
  },

  // ── Financials ────────────────────────────────────────────────────────────
  {
    id: "capex-plan",
    number: 13,
    group: "financials",
    label: "Plan de CapEx",
    shortLabel: "CapEx",
    description: "Inversiones en mejora, mantenimiento y reposicionamiento",
    printPageBreak: true,
  },
  {
    id: "financing-structure",
    number: 14,
    group: "financials",
    label: "Estructura de Financiación",
    shortLabel: "Financiación",
    description: "Deuda, LTV, covenants y estructura de capital",
    printPageBreak: true,
  },

  // ── Summary ───────────────────────────────────────────────────────────────
  {
    id: "investment-summary",
    number: 15,
    group: "summary",
    label: "Resumen de Inversión",
    shortLabel: "Inversión",
    description: "TIR, equity multiple, horizonte y recomendación final",
    printPageBreak: true,
  },
];

export const SECTION_GROUPS: ReportSectionGroupConfig[] = [
  {
    id: "overview",
    label: "Vista General",
    sections: ["executive-summary", "property-overview"],
  },
  {
    id: "performance",
    label: "Rendimiento",
    sections: [
      "revenue-metrics",
      "operational-performance",
      "revenue-streams",
      "cost-structure",
    ],
  },
  {
    id: "valuation",
    label: "Valoración",
    sections: ["dcf-valuation", "sensitivity-analysis", "comparable-transactions"],
  },
  {
    id: "market",
    label: "Mercado",
    sections: ["market-position", "market-trends", "supply-pipeline"],
  },
  {
    id: "financials",
    label: "Finanzas",
    sections: ["capex-plan", "financing-structure"],
  },
  {
    id: "summary",
    label: "Conclusiones",
    sections: ["investment-summary"],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

export function getSectionHref(reportId: string, sectionId: ReportSectionId): string {
  return `/report/${reportId}/${sectionId}`;
}
