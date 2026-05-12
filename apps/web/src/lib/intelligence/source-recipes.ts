import "server-only";

/**
 * Server-side per-source operational recipes. Shared by the cron
 * ingestion pipeline and the admin UI · keeps health-check targets,
 * paywall markers, and body-extraction selectors in a single canonical
 * place (the operator-side `playwright-refresh.mjs` has its own copy
 * because Node ESM scripts can't import server-only TS modules).
 *
 * Used by
 *   - lib/intelligence/session-fetch.ts · validateSessionHealth
 *   - lib/intelligence/body-fetch.ts    · extractBody
 *   - lib/intelligence/ingest.ts        · per-source orchestration
 *
 * Recipe shape
 *   - canonicalHealthTarget · the ONE URL the cron fetches anon + authed
 *     each run to verify the cookie jar still unlocks paywalled content.
 *     Pick a subscriber-only landing page so the differential is binary
 *     (anon = login redirect, authed = real content).
 *   - paywallCtaPatterns / authedOnlyPatterns · same semantics as the
 *     refresh script · matched case-insensitively against body text.
 *   - bodySelector · CSS-style heuristic ("article" tag · plus optional
 *     fallback selectors) used to pull clean article body from raw HTML.
 *     When null, the body-fetch path stores the full HTML truncated.
 */

export interface SourceRecipe {
  slug: string;
  domain: string;
  /** Whether the source needs T2 cookies to fetch premium bodies. */
  requiresAuth: boolean;
  /**
   * One URL per source whose body differential between anon and authed
   * is the canonical "session is still valid" signal. Cron validates
   * this once per source per run · cheap (2 HTTP fetches).
   */
  canonicalHealthTarget: string | null;
  paywallCtaPatterns: string[];
  authedOnlyPatterns: string[];
  /**
   * Minimum |body_size_delta| (bytes) to count as a passing differential
   * when the marker-based signals are inconclusive. Tuned per source
   * because Alimarket's UI delivers tiny text deltas in HTML.
   */
  minSizeDeltaBytes: number;
  /**
   * Article-body extractor hint. The cron tries each selector in order;
   * the first match wins. When all miss, the raw HTML body (truncated)
   * lands in market_news.body so nothing is lost.
   */
  bodySelectors: string[];
}

export const SOURCE_RECIPES: Record<string, SourceRecipe> = {
  hosteltur: {
    slug: "hosteltur",
    domain: "hosteltur.com",
    requiresAuth: true,
    canonicalHealthTarget: "https://www.hosteltur.com/premium",
    paywallCtaPatterns: ["Hazte Premium", "Suscríbete por", "Sólo para Premium", "Para seguir leyendo"],
    authedOnlyPatterns: ["Cerrar sesión", "Mi suscripción", "Mi perfil"],
    minSizeDeltaBytes: 5000,
    bodySelectors: ["article", "main .article-content", "[class*='article-body']", "[class*='post-content']"],
  },
  alimarket: {
    slug: "alimarket",
    domain: "alimarket.es",
    requiresAuth: true,
    // /mi_cuenta is subscriber-only · anon visitors hit a hard redirect to
    // /acceso/login so the differential is enormous (anon ≈ 80kB login
    // form · authed ≈ 115kB real account page).
    canonicalHealthTarget: "https://www.alimarket.es/mi_cuenta",
    paywallCtaPatterns: ["Suscríbete", "Hazte suscriptor", "Sólo para suscriptores", "Iniciar sesión", "Recordar contraseña"],
    authedOnlyPatterns: ["Cerrar sesión", "Mi cuenta", "Mi perfil", "Mi suscripción"],
    minSizeDeltaBytes: 5000,
    bodySelectors: ["article", "main", "[class*='noticia']", "[class*='article']"],
  },
  // Public RSS sources · cron treats them like authed sources minus the
  // cookie jar. Body fetch is still useful for full-text categorisation.
  "hospitality-net": {
    slug: "hospitality-net",
    domain: "hospitalitynet.org",
    requiresAuth: false,
    canonicalHealthTarget: null,
    paywallCtaPatterns: [],
    authedOnlyPatterns: [],
    minSizeDeltaBytes: 0,
    bodySelectors: ["article", "[class*='article-content']", "main"],
  },
  "costar-news": {
    slug: "costar-news",
    domain: "costar.com",
    requiresAuth: false,
    canonicalHealthTarget: null,
    paywallCtaPatterns: [],
    authedOnlyPatterns: [],
    minSizeDeltaBytes: 0,
    bodySelectors: ["article", "main"],
  },
  hvs: {
    slug: "hvs",
    domain: "hvs.com",
    requiresAuth: false,
    canonicalHealthTarget: null,
    paywallCtaPatterns: [],
    authedOnlyPatterns: [],
    minSizeDeltaBytes: 0,
    bodySelectors: ["article", ".post-content", "main"],
  },
  reuters: {
    slug: "reuters",
    domain: "reuters.com",
    requiresAuth: false,
    canonicalHealthTarget: null,
    paywallCtaPatterns: [],
    authedOnlyPatterns: [],
    minSizeDeltaBytes: 0,
    bodySelectors: ["article", "[class*='article-body']", "main"],
  },
};

export function getRecipe(slug: string): SourceRecipe | null {
  return SOURCE_RECIPES[slug] ?? null;
}
