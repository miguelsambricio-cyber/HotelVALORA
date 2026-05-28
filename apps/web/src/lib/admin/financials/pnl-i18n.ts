/**
 * Display-time i18n for the P&L admin panel.
 *
 * Principle (operator-firmed 2026-05-28):
 *   - BD canonical strings = English CoStar nomenclature (industry standard).
 *     Writes ALWAYS go back to BD using these canonicals · never display strings.
 *   - Panel displays Spanish where institutionally agreed:
 *       Countries: full ES translation (España, Francia, Italia, ...)
 *       Submarkets: ES with diacritics (Argüelles & Chamberí, ...)
 *       Classes: only extremes translated (Lujo, Económico) · mid-range
 *         (Upper Upscale, Upscale, Upper Midscale, Midscale) stays English
 *         because that's the STR nomenclature analysts expect.
 *       Segmentation: simple ES (Hotel, Apartahotel, Hostel).
 *
 * If a canonical has no translation, fallback to the canonical itself (NOT
 * crash · NOT empty string).
 */

// ── Countries (ISO alpha-2 → ES display) ──────────────────────────────

export const COUNTRY_DISPLAY_ES: Readonly<Record<string, string>> = {
  ES: "España",
  PT: "Portugal",
  FR: "Francia",
  IT: "Italia",
  DE: "Alemania",
  GB: "Reino Unido",
  AT: "Austria",
  BE: "Bélgica",
  BG: "Bulgaria",
  CH: "Suiza",
  CY: "Chipre",
  CZ: "República Checa",
  DK: "Dinamarca",
  EE: "Estonia",
  FI: "Finlandia",
  GR: "Grecia",
  HR: "Croacia",
  HU: "Hungría",
  IE: "Irlanda",
  IS: "Islandia",
  LT: "Lituania",
  LU: "Luxemburgo",
  LV: "Letonia",
  MT: "Malta",
  NL: "Países Bajos",
  NO: "Noruega",
  PL: "Polonia",
  RO: "Rumanía",
  SE: "Suecia",
  SI: "Eslovenia",
  SK: "Eslovaquia",
  // Americas
  US: "Estados Unidos",
  CA: "Canadá",
  MX: "México",
  BR: "Brasil",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PE: "Perú",
  // APAC + MEA
  AE: "Emiratos Árabes Unidos",
  AU: "Australia",
  CN: "China",
  HK: "Hong Kong",
  IN: "India",
  JP: "Japón",
  KR: "Corea del Sur",
  SG: "Singapur",
  TH: "Tailandia",
  TR: "Turquía",
  ZA: "Sudáfrica",
} as const;

// ── Markets (CoStar EN → ES display) ──────────────────────────────────

/**
 * Most markets stay verbatim (Madrid, Barcelona, Paris, Roma, Lisboa already
 * read correctly in Spanish). Only edge cases get translated.
 */
export const MARKET_DISPLAY_ES: Readonly<Record<string, string>> = {
  London: "Londres",
  Paris: "París",
  Munich: "Múnich",
  Vienna: "Viena",
  Geneva: "Ginebra",
  Zurich: "Zúrich",
  Brussels: "Bruselas",
  Athens: "Atenas",
  Stockholm: "Estocolmo",
  Copenhagen: "Copenhague",
  // Spanish markets pass through (Madrid, Barcelona, Sevilla, Mallorca, ...)
} as const;

// ── Submarkets (Madrid only · CoStar EN → ES display) ─────────────────

/**
 * Only Madrid submarkets are CoStar-canonical English today. As we ingest
 * other markets the table grows.
 */
export const SUBMARKET_DISPLAY_ES: Readonly<Record<string, string>> = {
  "Madrid Centre": "Madrid Centro",
  "Madrid Surrounding": "Madrid Periferia",
  Salamanca: "Salamanca",
  Retiro: "Retiro",
  "Arguelles & Chamberi": "Argüelles & Chamberí",
  "Chamartin & Plaza de Castilla": "Chamartín & Plaza de Castilla",
} as const;

// ── Classes (CoStar STR scale) ────────────────────────────────────────

/**
 * Operator-firmed: only Luxury + Economy translate. Mid-range stays English
 * because that's the institutional convention STR analysts expect to read.
 */
export const CLASS_DISPLAY_ES: Readonly<Record<string, string>> = {
  Luxury: "Lujo",
  "Upper Upscale": "Upper Upscale",
  Upscale: "Upscale",
  "Upper Midscale": "Upper Midscale",
  Midscale: "Midscale",
  Economy: "Económico",
} as const;

// ── Segmentation type (BD enum → ES display) ──────────────────────────

export const SEGMENTATION_DISPLAY_ES: Readonly<Record<string, string>> = {
  hotel: "Hotel",
  apartahotel: "Apartahotel",
  hostel: "Hostel",
} as const;

// ── Data source badge (drives panel honesty UX) ───────────────────────

/**
 * Each `data_source` value in `pnl_template` maps to a visible badge.
 * `tone` matches the existing forest/lime/amber/rose palette used elsewhere
 * in the admin panel (see tokens in defaults.ts).
 */
export type DataSourceTone = "lime" | "amber" | "rose";

export const DATA_SOURCE_BADGE: Readonly<
  Record<string, { label: string; tone: DataSourceTone; description: string }>
> = {
  costar_submarket_aggregate: {
    label: "CoStar real · agregado submercado",
    tone: "lime",
    description:
      "Datos CoStar STR cargados a nivel de submercado · máxima precisión",
  },
  costar_national: {
    label: "CoStar real · fallback nacional",
    tone: "lime",
    description:
      "Datos CoStar STR a nivel nacional · usado cuando el submercado no tiene cobertura propia",
  },
  derived_mvp_rule: {
    label: "Derivado · regla MVP",
    tone: "amber",
    description:
      "Perfil derivado de la regla MVP (apartahotel/hostel) sobre base CoStar · no es dato directo CoStar",
  },
  pending_costar: {
    label: "Sin datos · pendiente suscripción CoStar",
    tone: "rose",
    description:
      "País sin datos CoStar cargados. Selecciona un país con datos disponibles o solicita la suscripción CoStar para esta jurisdicción.",
  },
} as const;

// ── Safe display lookups (never crash, never empty) ───────────────────

export function displayCountry(code: string | null | undefined): string {
  if (!code) return "—";
  return COUNTRY_DISPLAY_ES[code] ?? code;
}

export function displayMarket(canonical: string | null | undefined): string {
  if (!canonical) return "—";
  return MARKET_DISPLAY_ES[canonical] ?? canonical;
}

export function displaySubmarket(canonical: string | null | undefined): string {
  if (!canonical) return "—";
  return SUBMARKET_DISPLAY_ES[canonical] ?? canonical;
}

export function displayClass(canonical: string | null | undefined): string {
  if (!canonical) return "—";
  return CLASS_DISPLAY_ES[canonical] ?? canonical;
}

export function displaySegmentation(canonical: string | null | undefined): string {
  if (!canonical) return "—";
  return SEGMENTATION_DISPLAY_ES[canonical] ?? canonical;
}

/** Build the badge object for a `data_source` value · returns null if unknown. */
export function dataSourceBadge(
  ds: string | null | undefined,
): { label: string; tone: DataSourceTone; description: string } | null {
  if (!ds) return null;
  return DATA_SOURCE_BADGE[ds] ?? null;
}
