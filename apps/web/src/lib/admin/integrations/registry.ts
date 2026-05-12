import type { IntegrationDescriptor } from "./types";

/**
 * Mock integrations registry. Phase 3 swaps this for a Supabase read
 * across public.sources × public.intelligence_source_sessions ×
 * public.news_ingestion_runs (7d rollup).
 *
 * Shapes mirror migration 0006 + 0009 1:1 so the swap is mechanical.
 *
 * As of 2026-05-12:
 *   - Hosteltur          → freemium_premium · awaiting_credentials
 *   - Alimarket          → paid_subscription · not_configured (Phase 2.6)
 *   - Public RSS sources → operational (already wired via fetchRss)
 */

export const INTEGRATIONS_REGISTRY: IntegrationDescriptor[] = [
  // ───────────────────────────────────────────────────────────────────────
  // Authenticated · Spain market intelligence
  // ───────────────────────────────────────────────────────────────────────
  {
    id: "hosteltur",
    name: "Hosteltur",
    region: "ES",
    language: "es",
    baseUrl: "https://www.hosteltur.com",
    rssUrl: "https://www.hosteltur.com/feed",
    ingestionKind: "rss",
    authStrategy: "cookie_session",
    reliabilityScore: 0.85,
    enabled: true,
    requiresAuth: true,
    tier: "freemium_premium",
    tagline: "Spanish hospitality daily · institutional-grade ES market coverage. Free RSS for headlines, Premium subscription unlocks reports, interviews, rankings, digital magazine.",
    category: "spain_market",
    connection: "awaiting_credentials",
    signal: "warn",
    session: {
      status: "not_provisioned",
      encKeyId: null,
      refreshedAt: null,
      expiresAt: null,
      hoursToExpiry: null,
      refreshCount: 0,
      lastRefreshError: null,
      placeholder: null,
      cookiesCount: null,
      originsCount: null,
      postLoginUrl: null,
      validationReport: [],
      lastAuthedFetchAt: null,
      lastAuthedFetchStatus: null,
    },
    health: {
      lastRunAt: null,
      lastRunStatus: "unknown",
      runsSuccess7d: 0,
      runsFailed7d: 0,
      articlesToday: 0,
      articles7d: 0,
      articles30d: 0,
      meanItemsPerRun7d: 0,
    },
    notes: [
      "Validation source for the three-tier credential model (T1 env · T2 encrypted Supabase · T3 article content)",
      "Free RSS path always-on; Premium body enrichment opt-in per article",
      "Premium content scope: in-depth reports, interviews, rankings, digital magazine PDF, premium newsletter HTML",
      "Subscription: €6/month or €60/year (per Hosteltur public pricing)",
    ],
    externalLinks: [
      { label: "Login portal", href: "https://www.hosteltur.com/login" },
      { label: "Premium signup", href: "https://www.hosteltur.com/premium" },
      { label: "Public RSS hub", href: "https://www.hosteltur.com/rss-hosteltur" },
      { label: "Integration dossier", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/integrations/hosteltur.md" },
    ],
  },

  {
    id: "alimarket",
    name: "Alimarket",
    region: "ES",
    language: "es",
    baseUrl: "https://www.alimarket.es",
    rssUrl: null,
    ingestionKind: "scrape",
    authStrategy: "cookie_session",
    reliabilityScore: 0.85,
    enabled: true,
    requiresAuth: true,
    tier: "paid_subscription",
    tagline: "Spanish B2B business intelligence · paywalled hospitality coverage. Mostly behind subscription gate; browser-session ingestion required.",
    category: "spain_market",
    connection: "not_configured",
    signal: "neutral",
    session: {
      status: "not_provisioned",
      encKeyId: null,
      refreshedAt: null,
      expiresAt: null,
      hoursToExpiry: null,
      refreshCount: 0,
      lastRefreshError: null,
      placeholder: null,
      cookiesCount: null,
      originsCount: null,
      postLoginUrl: null,
      validationReport: [],
      lastAuthedFetchAt: null,
      lastAuthedFetchStatus: null,
    },
    health: {
      lastRunAt: null,
      lastRunStatus: "unknown",
      runsSuccess7d: 0,
      runsFailed7d: 0,
      articlesToday: 0,
      articles7d: 0,
      articles30d: 0,
      meanItemsPerRun7d: 0,
    },
    notes: [
      "Phase 2.6 — onboarded after Hosteltur validation closes successfully",
      "No public RSS · all content gated behind login",
      "Subscriber discovery via HTML scrape with cookie-jar session (same architecture as Hosteltur)",
    ],
    externalLinks: [
      { label: "Login portal", href: "https://www.alimarket.es/" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  // Public · European hospitality
  // ───────────────────────────────────────────────────────────────────────
  {
    id: "hospitalitynet",
    name: "HospitalityNet",
    region: "EU",
    language: "en",
    baseUrl: "https://www.hospitalitynet.org",
    rssUrl: "https://www.hospitalitynet.org/rss/news.xml",
    ingestionKind: "rss",
    authStrategy: "none",
    reliabilityScore: 0.85,
    enabled: true,
    requiresAuth: false,
    tier: "free_public",
    tagline: "European hospitality news aggregator · transaction + appointment coverage across EMEA.",
    category: "european_market",
    connection: "operational",
    signal: "ok",
    session: null,
    health: {
      lastRunAt: "2026-05-12T06:48:00Z",
      lastRunStatus: "success",
      runsSuccess7d: 7,
      runsFailed7d: 0,
      articlesToday: 18,
      articles7d: 132,
      articles30d: 561,
      meanItemsPerRun7d: 18.9,
    },
    notes: ["Wired via fetchRss in lib/intelligence/fetchers.ts since Phase 2"],
    externalLinks: [{ label: "Source", href: "https://www.hospitalitynet.org" }],
  },

  // CoStar News occupies the Public · EU+Spain slot previously held by
  // Expansión. CoStar Group is global but the hospitality desk runs
  // institutional-grade transaction + analyst coverage that fits the
  // EU/Spain operational view alongside HospitalityNet. API integration
  // remains a Phase 5 deliverable; the dashboard surfaces it as a
  // monitored source while ingestion wiring lands.
  {
    id: "costar-news",
    name: "CoStar News",
    region: "GLOBAL",
    language: "en",
    baseUrl: "https://www.costar.com/news/hotels",
    rssUrl: null,
    ingestionKind: "scrape",
    authStrategy: "none",
    reliabilityScore: 0.90,
    enabled: true,
    requiresAuth: false,
    tier: "free_public",
    tagline: "CoStar hospitality desk · institutional-grade transactions, analyst coverage and US/EU deal wire.",
    category: "european_market",
    connection: "operational",
    signal: "ok",
    session: null,
    health: {
      lastRunAt: null,
      lastRunStatus: "unknown",
      runsSuccess7d: 0,
      runsFailed7d: 0,
      articlesToday: 0,
      articles7d: 0,
      articles30d: 0,
      meanItemsPerRun7d: 0,
    },
    notes: [
      "Promoted from Deferred · positioned alongside HospitalityNet on the EU/Spain row",
      "Public-preview scrape from /news/hotels until Phase 5 bearer-token API contract lands",
    ],
    externalLinks: [{ label: "Source", href: "https://www.costar.com/news/hotels" }],
  },

  {
    id: "hvs",
    name: "HVS",
    region: "GLOBAL",
    language: "en",
    baseUrl: "https://www.hvs.com",
    rssUrl: "https://www.hvs.com/Blog/Rss",
    ingestionKind: "rss",
    authStrategy: "none",
    reliabilityScore: 0.85,
    enabled: true,
    requiresAuth: false,
    tier: "free_public",
    tagline: "Research house · analyst briefings, transaction commentary, valuation perspectives.",
    category: "research_house",
    connection: "operational",
    signal: "ok",
    session: null,
    health: {
      lastRunAt: "2026-05-12T06:48:00Z",
      lastRunStatus: "success",
      runsSuccess7d: 7,
      runsFailed7d: 0,
      articlesToday: 3,
      articles7d: 22,
      articles30d: 96,
      meanItemsPerRun7d: 3.1,
    },
    notes: [],
    externalLinks: [{ label: "Source", href: "https://www.hvs.com" }],
  },

  {
    id: "reuters-hospitality",
    name: "Reuters Hospitality",
    region: "GLOBAL",
    language: "en",
    baseUrl: "https://www.reuters.com",
    rssUrl: "https://www.reuters.com/business/lifestyle/feed/",
    ingestionKind: "rss",
    authStrategy: "none",
    reliabilityScore: 0.95,
    enabled: true,
    requiresAuth: false,
    tier: "free_public",
    tagline: "Top-tier wire service · first-mover on major transactions and corporate events.",
    category: "wire_service",
    connection: "operational",
    signal: "ok",
    session: null,
    health: {
      lastRunAt: "2026-05-12T06:48:00Z",
      lastRunStatus: "success",
      runsSuccess7d: 6,
      runsFailed7d: 1,
      articlesToday: 4,
      articles7d: 28,
      articles30d: 121,
      meanItemsPerRun7d: 4.0,
    },
    notes: ["One 5xx failure 2026-05-09 — recovered next run"],
    externalLinks: [{ label: "Source", href: "https://www.reuters.com" }],
  },
];

export function getIntegrationById(id: string): IntegrationDescriptor | undefined {
  return INTEGRATIONS_REGISTRY.find((row) => row.id === id);
}

export const INTEGRATION_IDS = INTEGRATIONS_REGISTRY.map((r) => r.id);
