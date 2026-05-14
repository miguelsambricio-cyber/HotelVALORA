/**
 * Platform integrations registry — the layers BEYOND intelligence feeds.
 *
 * The /user/admin/integrations surface renders 9 operational layers:
 *   1. Infrastructure              · this file
 *   2. Auth & Identity             · this file
 *   3. AI                          · this file
 *   4. Analytics & Observability   · this file
 *   5. Communications              · this file
 *   6. Intelligence Sources        · separate · existing rich card · session telemetry
 *   7. Relationship Intelligence   · this file
 *   8. Commercial / Monetization   · this file
 *   9. Developer Infrastructure    · this file
 *
 * Status taxonomy (reconciled 2026-05-13 against operator account inventory):
 *   live                  · operational end-to-end · in production
 *   partial               · some surface uses it, some doesn't (e.g. Sentry on api but not web)
 *   configured_not_wired  · operator account exists + env scaffolded · no code path actually calls
 *   planned               · no account or no env yet
 */

export type PlatformIntegrationStatus =
  | "live"
  | "partial"
  | "configured_not_wired"
  | "planned";

export type PlatformIntegrationLayer =
  | "infrastructure"
  | "auth"
  | "ai"
  | "analytics"
  | "communications"
  | "relationship_intelligence"
  | "external_data"
  | "commercial"
  | "developer_infrastructure";

export type HealthSignal = "ok" | "warn" | "error" | "neutral" | "unknown";

export interface PlatformIntegrationDescriptor {
  id: string;
  name: string;
  provider: string;
  layer: PlatformIntegrationLayer;
  status: PlatformIntegrationStatus;
  purpose: string;
  authMethod: string;
  envVars: string[];
  tables: string[];
  cronDependencies: string[];
  consumedBy: string[];
  operatorManaged: boolean;
  externalLinks?: { label: string; href: string }[];
  notes?: string[];
  nextMilestone?: string;
  signal: HealthSignal;
  /** True when the operator has a provisioned account today */
  accountProvisioned: boolean;
}

const INFRASTRUCTURE: PlatformIntegrationDescriptor[] = [
  {
    id: "supabase-database",
    name: "Supabase Database",
    provider: "Supabase Inc.",
    layer: "infrastructure",
    status: "live",
    purpose:
      "Primary Postgres (PG 17, eu-central, twebgqutuqgonabvhzjk) — 41 tables across contacts, users, campaigns, subscriptions, intelligence, AI Operations.",
    authMethod: "Service-role key (server-only) + anon key + per-table RLS",
    envVars: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
    tables: ["all (41+ public tables)"],
    cronDependencies: [
      "hospitality-intel · 48 7 * * *",
      "market-intelligence · 20 8 * * *",
      "qa-monitoring · 30 9 * * *",
    ],
    consumedBy: ["every admin surface", "/library", "/report", "/invite/[token]"],
    operatorManaged: false,
    signal: "ok",
    accountProvisioned: true,
    notes: [
      "Admin client patched in Phase 2.D.5 to bypass Next.js Data Cache (cache: 'no-store').",
      "All migrations (0001–0022) applied · advisor warnings closed.",
    ],
    externalLinks: [
      { label: "Project dashboard", href: "https://supabase.com/dashboard/project/twebgqutuqgonabvhzjk" },
      { label: "Integration dossier", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/integrations/supabase.md" },
    ],
  },
  {
    id: "supabase-storage",
    name: "Supabase Storage",
    provider: "Supabase Inc.",
    layer: "infrastructure",
    status: "live",
    purpose: "Five buckets — reports · pdfs · excel-uploads · renders · avatars. Per-user-namespace RLS, MIME + size caps.",
    authMethod: "Service-role (server) + signed URLs (browser) · own-namespace RLS",
    envVars: [],
    tables: ["storage.objects (5 buckets)"],
    cronDependencies: [],
    consumedBy: ["library uploads", "report renders", "operator avatar"],
    operatorManaged: false,
    signal: "ok",
    accountProvisioned: true,
    notes: ["19 own-namespace RLS policies · advisor warning on broad-public-read fixed in 0004."],
  },
  {
    id: "vercel-platform",
    name: "Vercel Platform",
    provider: "Vercel Inc.",
    layer: "infrastructure",
    status: "live",
    purpose: "Hosting · GitHub → main auto-deploy · custom domain hotelvalora.com · Edge middleware.",
    authMethod: "Deploy account (Sign in with GitHub)",
    envVars: [],
    tables: [],
    cronDependencies: [],
    consumedBy: ["everything"],
    operatorManaged: false,
    signal: "ok",
    accountProvisioned: true,
    notes: ["Vercel CLI not installed locally — env vars set via web dashboard until `npm i -g vercel`."],
  },
  {
    id: "vercel-cron",
    name: "Vercel Cron",
    provider: "Vercel Inc.",
    layer: "infrastructure",
    status: "live",
    purpose: "Three daily schedules carrying every recurring autonomous workflow.",
    authMethod: "Bearer CRON_SECRET (assertCron) · Vercel runtime-injected",
    envVars: ["CRON_SECRET"],
    tables: ["news_ingestion_runs", "market_news", "ai_agent_runs", "ai_memory", "ai_events"],
    cronDependencies: [
      "hospitality-intel · 48 7 * * *",
      "market-intelligence · 20 8 * * *",
      "qa-monitoring · 30 9 * * *",
    ],
    consumedBy: ["Intelligence Engine", "AI Operations Layer"],
    operatorManaged: false,
    signal: "ok",
    accountProvisioned: true,
    notes: ["Hobby plan caps schedules at daily — all 3 obey that."],
  },
  {
    id: "mapbox",
    name: "Mapbox GL",
    provider: "Mapbox Inc.",
    layer: "infrastructure",
    status: "live",
    purpose: "CompSet map · Library favorites map · Market Overview map.",
    authMethod: "Domain-restricted public token",
    envVars: ["NEXT_PUBLIC_MAPBOX_TOKEN"],
    tables: [],
    cronDependencies: [],
    consumedBy: ["/compset", "/library/favorites-map", "/library/top-map", "/report/market-overview"],
    operatorManaged: false,
    signal: "ok",
    accountProvisioned: true,
  },
  {
    id: "namecheap",
    name: "Namecheap (DNS)",
    provider: "Namecheap Inc.",
    layer: "infrastructure",
    status: "live",
    purpose: "Domain registrar for hotelvalora.com · DKIM + SPF records that underpin Resend deliverability · A/CNAME to Vercel.",
    authMethod: "Namecheap account (operator-managed outside HotelVALORA)",
    envVars: [],
    tables: [],
    cronDependencies: [],
    consumedBy: ["every request to hotelvalora.com", "Resend outbound (DKIM verification)"],
    operatorManaged: true,
    signal: "ok",
    accountProvisioned: true,
    notes: [
      "Not a code dependency — pure DNS/registrar.",
      "Reconciled into the registry 2026-05-13 (operator-confirmed account).",
    ],
  },
];

const AUTH: PlatformIntegrationDescriptor[] = [
  {
    id: "supabase-auth",
    name: "Supabase Auth",
    provider: "Supabase Inc.",
    layer: "auth",
    status: "partial",
    purpose:
      "Active identity engine. OAuth code-exchange via /auth/callback writes HttpOnly session cookie. Operator-guard fail-closed when AUTH_ENABLED=true.",
    authMethod: "Google OAuth (via Google Cloud Console credentials) · HttpOnly cookie session",
    envVars: ["AUTH_ENABLED", "NEXT_PUBLIC_AUTH_ENABLED"],
    tables: ["auth.users (Supabase-managed)", "public.users (handle_new_user trigger)"],
    cronDependencies: [],
    consumedBy: [
      "middleware (session refresh)",
      "/user/admin/* layout (requireOperator gate)",
      "/invite/[token] (accept flow)",
    ],
    operatorManaged: true,
    signal: "warn",
    accountProvisioned: true,
    nextMilestone:
      "Flip AUTH_ENABLED=true on Vercel + validate 3-way curl matrix (anon → 307 /login · non-operator → 404 · operator → 200).",
    notes: [
      "Code paths fail-closed (operator-guard.ts) · enforcement gated on AUTH_ENABLED in Vercel env.",
      "Backed by Google Cloud Console OAuth client credentials.",
    ],
    externalLinks: [
      { label: "Activation runbook", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/auth.md" },
    ],
  },
  {
    id: "google-cloud-oauth",
    name: "Google Cloud Console (OAuth client)",
    provider: "Google",
    layer: "auth",
    status: "live",
    purpose: "OAuth client ID + secret backing the Google Sign-in provider in Supabase Auth. Hospitality of the entire sign-in flow.",
    authMethod: "GCP project + OAuth 2.0 client credentials (lives in Supabase Auth dashboard, not in app env)",
    envVars: [],
    tables: [],
    cronDependencies: [],
    consumedBy: ["Supabase Auth provider configuration"],
    operatorManaged: true,
    signal: "ok",
    accountProvisioned: true,
    notes: [
      "Credentials live in Supabase Auth Dashboard (Authentication → Providers → Google), NOT in Vercel env.",
      "Same GCP project hosts future Gmail / Calendar / Drive OAuth scopes.",
    ],
    externalLinks: [
      { label: "Google Cloud Console", href: "https://console.cloud.google.com" },
    ],
  },
  {
    id: "authjs-scaffold",
    name: "Auth.js (parked scaffold)",
    provider: "Auth.js (NextAuth)",
    layer: "auth",
    status: "configured_not_wired",
    purpose:
      "v5 scaffold parked for future non-OAuth flows (magic links, credentials, SAML). Today INERT — Supabase Auth is the active engine.",
    authMethod: "Auth.js JWT signing (unused) · provider client IDs stubbed",
    envVars: ["AUTH_SECRET", "AUTH_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "APPLE_CLIENT_ID", "APPLE_CLIENT_SECRET"],
    tables: [],
    cronDependencies: [],
    consumedBy: ["(none — parked)"],
    operatorManaged: false,
    signal: "neutral",
    accountProvisioned: false,
    notes: [
      "Code lives at apps/web/src/auth.{config,}.ts but is never imported in production.",
      "Reactivate only if Supabase Auth proves insufficient.",
    ],
  },
];

const AI: PlatformIntegrationDescriptor[] = [
  {
    id: "openai",
    name: "OpenAI API",
    provider: "OpenAI",
    layer: "ai",
    status: "configured_not_wired",
    purpose:
      "LLM provider for the AI Operations Layer — market intelligence categorisation, QA monitoring narratives, future CEO agent reasoning.",
    authMethod: "API key (server-only)",
    envVars: ["OPENAI_API_KEY (not yet added to .env.example)"],
    tables: ["ai_agent_runs.cost_usd (plumbing ready)"],
    cronDependencies: [
      "market-intelligence · 20 8 * * * (currently regex-only · OpenAI fold-in pending)",
    ],
    consumedBy: ["future · marketIntelligenceAgent enrichment · qaMonitoringAgent narratives"],
    operatorManaged: false,
    signal: "neutral",
    accountProvisioned: true,
    nextMilestone:
      "Install `openai` SDK · pick a default model · wire into the agent runtime (ai-agents/core) · keep daily_cost_usd_cap as the safety bound.",
    notes: [
      "Operator account exists. Cost-tracking plumbing (cost_usd field, daily cap) already lives in the agent runtime.",
      "Today: agents run on regex categorisation. LLM enrichment is the next agent-runtime milestone.",
    ],
  },
];

const ANALYTICS: PlatformIntegrationDescriptor[] = [
  {
    id: "vercel-analytics",
    name: "Vercel Analytics",
    provider: "Vercel Inc.",
    layer: "analytics",
    status: "live",
    purpose: "Cookie-free page-view + event tracking. GDPR-compliant. Auto-enabled on production deploys.",
    authMethod: "Account-bound (no app secret)",
    envVars: [],
    tables: [],
    cronDependencies: [],
    consumedBy: ["root layout · <Analytics /> component"],
    operatorManaged: false,
    signal: "ok",
    accountProvisioned: true,
    notes: ["@vercel/analytics 2.0.1 mounted in apps/web/src/app/layout.tsx."],
  },
  {
    id: "vercel-speed-insights",
    name: "Vercel Speed Insights",
    provider: "Vercel Inc.",
    layer: "analytics",
    status: "live",
    purpose: "Real User Monitoring · Core Web Vitals (LCP, FID, CLS, INP, TTFB) per page.",
    authMethod: "Account-bound",
    envVars: [],
    tables: [],
    cronDependencies: [],
    consumedBy: ["root layout · <SpeedInsights /> component"],
    operatorManaged: false,
    signal: "ok",
    accountProvisioned: true,
    notes: ["@vercel/speed-insights 2.0.0."],
  },
  {
    id: "posthog",
    name: "PostHog",
    provider: "PostHog Inc.",
    layer: "analytics",
    status: "configured_not_wired",
    purpose:
      "Product analytics — funnel tracking, feature flags, session replay. Operator-account exists; SDK not installed on web.",
    authMethod: "Project API key + public token",
    envVars: ["NEXT_PUBLIC_POSTHOG_KEY (not yet added)", "NEXT_PUBLIC_POSTHOG_HOST (not yet added)"],
    tables: [],
    cronDependencies: [],
    consumedBy: ["future · /library funnel · /user/admin invitation conversion tracking"],
    operatorManaged: false,
    signal: "neutral",
    accountProvisioned: true,
    nextMilestone:
      "Install `posthog-js` + `posthog-node` · mount the client provider · capture: invite-link-opened, invite-accepted, subscription-assigned, top-promote-clicked.",
    notes: [
      "Vercel Analytics covers page-views; PostHog adds product events + funnel analytics on top.",
      "No app-side code today.",
    ],
    externalLinks: [{ label: "PostHog dashboard", href: "https://app.posthog.com" }],
  },
  {
    id: "sentry",
    name: "Sentry",
    provider: "Sentry",
    layer: "analytics",
    status: "partial",
    purpose: "Error tracking + performance monitoring. Backend (apps/api) installed; web (apps/web) not yet.",
    authMethod: "DSN (per-environment)",
    envVars: ["SENTRY_DSN (api · installed)", "NEXT_PUBLIC_SENTRY_DSN (web · not installed)"],
    tables: [],
    cronDependencies: [],
    consumedBy: ["apps/api (FastAPI · sentry-sdk[fastapi] 2.14.0)"],
    operatorManaged: false,
    signal: "warn",
    accountProvisioned: true,
    nextMilestone:
      "Install `@sentry/nextjs` in apps/web · wrap layout with sentry config · the web app is currently flying blind on frontend errors.",
    notes: [
      "Backend has `sentry-sdk[fastapi]==2.14.0` in requirements.txt.",
      "AI_CONTEXT mentions structlog + Sentry on backend; web side completely absent.",
    ],
  },
];

const COMMUNICATIONS: PlatformIntegrationDescriptor[] = [
  {
    id: "resend",
    name: "Resend (Transactional Email)",
    provider: "Resend",
    layer: "communications",
    status: "live",
    purpose: "Tour requests · bulk invitations · QA escalations · campaign sends.",
    authMethod: "API key (server-only) · verified hotelvalora.com domain (DKIM + SPF via Namecheap)",
    envVars: ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "INTERNAL_ALERT_RECIPIENTS"],
    tables: ["contact_invitations (resend_message_id)"],
    cronDependencies: ["qa-monitoring · 30 9 * * * (escalations only)"],
    consumedBy: ["library 'Schedule a Tour' CTA", "/user/admin/contacts (bulk invite)", "AI Operations escalation"],
    operatorManaged: false,
    signal: "ok",
    accountProvisioned: true,
    notes: [
      "150 ms spacing between bulk-invite sends keeps the loop under the 10/s default cap.",
      "Two templates today: tour-request + contact-invite.",
    ],
    externalLinks: [
      { label: "Resend dashboard", href: "https://resend.com/emails" },
    ],
  },
  {
    id: "gmail-signals",
    name: "Gmail Signals (export-driven)",
    provider: "Google",
    layer: "communications",
    status: "live",
    purpose:
      "Per-email JSONL aggregations powering relationship band derivation (active threads · directionality · bounce detection).",
    authMethod: "Operator-driven Gmail export → JSONL · no in-app OAuth today",
    envVars: [],
    tables: [
      "relationship_contacts (active_threads, last_email_date, email_directionality, ...)",
      "relationship_labels",
      "relationship_health",
    ],
    cronDependencies: [],
    consumedBy: ["/user/admin/contacts (drawer · timeline + lifecycle)"],
    operatorManaged: true,
    signal: "neutral",
    accountProvisioned: true,
    nextMilestone: "Server-side Gmail OAuth (via Google Cloud Console) would autonomize this layer.",
    notes: ["30+ bounce snippet patterns in 4 languages (ES/EN/FR/DE)."],
  },
  {
    id: "slack",
    name: "Slack (real-time operator channel)",
    provider: "Slack Inc.",
    layer: "communications",
    status: "planned",
    purpose: "Real-time operator alerts complementing Resend's 15-min cooldown.",
    authMethod: "Incoming webhook URL",
    envVars: ["SLACK_WEBHOOK_URL (future)"],
    tables: [],
    cronDependencies: [],
    consumedBy: ["future · AI Operations escalation · subscription expiry sweep"],
    operatorManaged: false,
    signal: "neutral",
    accountProvisioned: false,
    nextMilestone: "Provision a single ops webhook + emit alongside Resend in escalation.ts.",
  },
  {
    id: "twilio",
    name: "Twilio (SMS)",
    provider: "Twilio Inc.",
    layer: "communications",
    status: "planned",
    purpose: "SMS for critical-stage notifications.",
    authMethod: "Account SID + auth token",
    envVars: ["TWILIO_ACCOUNT_SID (future)", "TWILIO_AUTH_TOKEN (future)", "TWILIO_FROM_NUMBER (future)"],
    tables: [],
    cronDependencies: [],
    consumedBy: ["future · institutional-priority lifecycle moments only"],
    operatorManaged: false,
    signal: "neutral",
    accountProvisioned: false,
    nextMilestone: "Vendor onboarding + per-contact SMS opt-in flag on relationship_contacts.",
  },
];

const RELATIONSHIP_INTELLIGENCE: PlatformIntegrationDescriptor[] = [
  {
    id: "datasite-outreach",
    name: "Datasite Outreach (export-driven)",
    provider: "Datasite",
    layer: "relationship_intelligence",
    status: "live",
    purpose:
      "Institutional contacts master — 4,547 contacts · 2,990 companies · 2,990 deal timelines.",
    authMethod: "Operator authenticates with Datasite OUTSIDE HotelVALORA · drops `.xlsm` export",
    envVars: [],
    tables: [
      "relationship_companies",
      "relationship_contacts",
      "relationship_interactions",
      "relationship_labels",
      "relationship_health",
    ],
    cronDependencies: [],
    consumedBy: ["/user/admin/contacts", "/user/admin/users (linked contact)"],
    operatorManaged: true,
    signal: "ok",
    accountProvisioned: true,
    notes: [
      "scripts/contactos/ingest.py + promote_to_supabase.py.",
    ],
    externalLinks: [
      { label: "Datasite Outreach", href: "https://www.datasite.com" },
      { label: "Integration dossier", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/integrations/datasite-contacts.md" },
    ],
  },
  {
    id: "google-contacts",
    name: "Google Contacts (cross-reference)",
    provider: "Google",
    layer: "relationship_intelligence",
    status: "live",
    purpose: "Operator's personal/professional address book cross-referenced against the Master. Read-only join.",
    authMethod: "Operator-driven Google Takeout CSV export · no in-app OAuth today",
    envVars: [],
    tables: ["(read-only · writes to local Google enrichment workbook only)"],
    cronDependencies: [],
    consumedBy: ["scripts/contactos/ingest_google.py (operator review surface)"],
    operatorManaged: true,
    signal: "neutral",
    accountProvisioned: true,
    notes: ["9-bucket Google taxonomy (investor / lender / broker / operator / brand / consultant / advisor / personal / unknown)."],
  },
  {
    id: "gmail-relationship-intel",
    name: "Gmail Relationship Intelligence",
    provider: "Google",
    layer: "relationship_intelligence",
    status: "live",
    purpose:
      "Same Gmail signals feed the relationship intelligence drawer — timeline events, bounce detection, inferred relationship stage.",
    authMethod: "Operator-driven export · same source as Communications.gmail-signals",
    envVars: [],
    tables: ["relationship_labels", "relationship_health", "relationship_contacts (rollup)"],
    cronDependencies: [],
    consumedBy: ["/user/admin/contacts drawer (timeline + conversion status)"],
    operatorManaged: true,
    signal: "ok",
    accountProvisioned: true,
    notes: ["Same JSONL export feeds Communications and Relationship Intelligence."],
  },
];

const EXTERNAL_DATA: PlatformIntegrationDescriptor[] = [
  {
    id: "rapidapi-booking-com15",
    name: "RapidAPI · Booking.com (booking-com15)",
    provider: "DataCrawler via RapidAPI",
    layer: "external_data",
    status: "live",
    purpose:
      "Hotel property enrichment · 5-endpoint chain per hotel · searchDestination → getHotelDetails → getHotelFacilities → getRoomList → getHotelPolicies → getHotelReviewScores. Powers the Booking-merged HOTELESperMARKET master + the per-hotel Enrichment card (review scores · room types · facilities · sub-scores).",
    authMethod: "x-rapidapi-host + x-rapidapi-key headers · Pro tier",
    envVars: ["BOOKING_RAPIDAPI_HOST", "BOOKING_RAPIDAPI_KEY"],
    tables: ["(Storage) costar-master/manual_enrichment/<hotel_id>.json"],
    cronDependencies: [],
    consumedBy: [
      "/user/admin/hotels/[hotelId] · Fetch from Booking server action",
      "scripts/enrich-all-hotels.mjs · bulk runner",
      "scripts/patch-enrichment-policies.mjs",
    ],
    operatorManaged: true,
    signal: "ok",
    accountProvisioned: true,
    notes: [
      "Pro tier · 35 000 calls/month · ~$25/month tier",
      "Per-hotel enrichment cost = 5 calls (deep mode) · 364 hotels ≈ 1 820 calls per full refresh",
      "Provenance tag: enrichment_sources=['rapidapi_booking'] · source_priority 80 · manual_operator at 100 always wins",
      "Date window for getRoomList = today + 60 days (some hotels have no availability at 30 days)",
      "MCP server config in .mcp.json (gitignored · per-operator local secret)",
    ],
    externalLinks: [
      { label: "Provider on RapidAPI", href: "https://rapidapi.com/DataCrawler/api/booking-com15" },
      { label: "Operator dashboard", href: "https://rapidapi.com/developer/dashboard" },
    ],
  },
  {
    id: "google-places-v1",
    name: "Google Places API (v1)",
    provider: "Google",
    layer: "external_data",
    status: "configured_not_wired",
    purpose:
      "Geocode + address-component resolution for hotels CoStar doesn't ship lat/lng for. Client + CLI runner are coded; awaiting Google Cloud API-key activation.",
    authMethod: "X-Goog-Api-Key header · field-mask required per call",
    envVars: ["GOOGLE_PLACES_API_KEY"],
    tables: ["(Storage) costar-master/manual_enrichment/<hotel_id>.json (geo_context fields)"],
    cronDependencies: [],
    consumedBy: [
      "scripts/enrich-hotels-coords.mjs · CLI runner (coded, pending key)",
      "future · /user/admin/hotels/[hotelId] · 'Resolve via Google Places' button",
    ],
    operatorManaged: true,
    signal: "neutral",
    accountProvisioned: false,
    nextMilestone:
      "Activate Places API (New) in Google Cloud Console · drop GOOGLE_PLACES_API_KEY into env.local + Vercel · run scripts/enrich-hotels-coords.mjs · ~$12 for all 364 hotels (Atmosphere tier ~$32/1000 calls).",
    notes: [
      "Provenance tag: enrichment_sources=['google_places'] · priority 70 · below rapidapi_booking (80) and manual_operator (100)",
      "Coordinate-only writes · never touches other enrichment fields",
      "Endpoints: /v1/places:searchText (POST) · /v1/places/{id} (GET) · field-mask DEFAULT_FIELD_MASK in google-places.ts",
    ],
    externalLinks: [
      { label: "Google Cloud Console", href: "https://console.cloud.google.com/google/maps-apis" },
      { label: "Places API (New) docs", href: "https://developers.google.com/maps/documentation/places/web-service" },
    ],
  },
];

const COMMERCIAL: PlatformIntegrationDescriptor[] = [
  {
    id: "subscription-engine",
    name: "Subscription Engine (internal)",
    provider: "HotelVALORA",
    layer: "commercial",
    status: "live",
    purpose:
      "Catalogue of subscription products + operator-managed assignment, comp, expiration, revocation. Mobile-first pricing card grid.",
    authMethod: "Operator-only · gated by requireOperator()",
    envVars: [],
    tables: ["subscription_products", "subscriptions", "campaigns"],
    cronDependencies: [],
    consumedBy: ["/user/admin/subscriptions", "/user/admin/users (bulk)"],
    operatorManaged: false,
    signal: "ok",
    accountProvisioned: true,
    notes: ["Catalogue is data, not enum (Phase 2.D.7 + 2.D.7b)."],
  },
  {
    id: "campaign-attribution",
    name: "Campaign Attribution System",
    provider: "HotelVALORA",
    layer: "commercial",
    status: "live",
    purpose:
      "Every invitation + subscription carries source_campaign_id. Per-campaign cards surface conversion funnel.",
    authMethod: "Operator-only · gated by requireOperator()",
    envVars: [],
    tables: ["campaigns", "contact_invitations", "subscriptions (source_campaign_id)"],
    cronDependencies: [],
    consumedBy: ["/user/admin/campaigns", "/user/admin/contacts drawer"],
    operatorManaged: false,
    signal: "ok",
    accountProvisioned: true,
  },
  {
    id: "stripe",
    name: "Stripe (billing automation)",
    provider: "Stripe Inc.",
    layer: "commercial",
    status: "configured_not_wired",
    purpose:
      "Self-serve checkout · recurring billing · webhook-driven subscription lifecycle. Operator account exists; SDK absent.",
    authMethod: "Stripe Secret + webhook signing secret (future)",
    envVars: ["STRIPE_SECRET_KEY (future)", "STRIPE_WEBHOOK_SECRET (future)"],
    tables: ["subscriptions (stripe_customer_id, stripe_subscription_id columns nullable since 2.D.7)"],
    cronDependencies: [],
    consumedBy: ["future · /user/admin/subscriptions Stripe-backed rows render with the existing amber warning chip"],
    operatorManaged: false,
    signal: "neutral",
    accountProvisioned: true,
    nextMilestone:
      "Install stripe SDK + @stripe/stripe-js · wire /api/webhooks/stripe · opt-in when monetization moves from manual to self-serve.",
    notes: [
      "Schema-ready · operator account provisioned · directive currently defers wiring.",
    ],
    externalLinks: [{ label: "Stripe Dashboard", href: "https://dashboard.stripe.com" }],
  },
];

const DEVELOPER_INFRASTRUCTURE: PlatformIntegrationDescriptor[] = [
  {
    id: "github",
    name: "GitHub",
    provider: "GitHub Inc.",
    layer: "developer_infrastructure",
    status: "live",
    purpose: "Source-of-truth repo · push to main triggers Vercel production deploy · branch pushes deploy preview URLs.",
    authMethod: "GitHub-Vercel OAuth (account-bound, no app secret)",
    envVars: [],
    tables: [],
    cronDependencies: [],
    consumedBy: ["every deploy"],
    operatorManaged: false,
    signal: "ok",
    accountProvisioned: true,
    notes: ["Repo: miguelsambricio-cyber/HotelVALORA."],
    externalLinks: [{ label: "Repo", href: "https://github.com/miguelsambricio-cyber/HotelVALORA" }],
  },
  {
    id: "google-developer-program",
    name: "Google Developer Program",
    provider: "Google",
    layer: "developer_infrastructure",
    status: "configured_not_wired",
    purpose:
      "Backs the Google Cloud Console project · future Google API access (Gmail/Calendar/Drive server-side OAuth).",
    authMethod: "Google account · GCP organisation membership",
    envVars: [],
    tables: [],
    cronDependencies: [],
    consumedBy: ["future · server-side Gmail OAuth · server-side Calendar / Drive"],
    operatorManaged: true,
    signal: "neutral",
    accountProvisioned: true,
    notes: ["Active GCP project hosts the Google Sign-in OAuth client used by Supabase Auth."],
  },
  {
    id: "apple-developer",
    name: "Apple Developer Program",
    provider: "Apple",
    layer: "developer_infrastructure",
    status: "configured_not_wired",
    purpose: "Future Apple Sign-in via Supabase Auth · future iOS app distribution. $99/year.",
    authMethod: "Apple ID + developer account",
    envVars: ["APPLE_CLIENT_ID (Auth.js stub)", "APPLE_CLIENT_SECRET (Auth.js stub)"],
    tables: [],
    cronDependencies: [],
    consumedBy: ["future · Apple Sign-in (Supabase Auth provider) · future iOS app"],
    operatorManaged: true,
    signal: "neutral",
    accountProvisioned: true,
    notes: ["Env stubs sit in the Auth.js parked scaffold."],
  },
];

export const PLATFORM_INTEGRATIONS: PlatformIntegrationDescriptor[] = [
  ...INFRASTRUCTURE,
  ...AUTH,
  ...AI,
  ...ANALYTICS,
  ...COMMUNICATIONS,
  ...RELATIONSHIP_INTELLIGENCE,
  ...EXTERNAL_DATA,
  ...COMMERCIAL,
  ...DEVELOPER_INFRASTRUCTURE,
];

export const PLATFORM_LAYER_META: Record<PlatformIntegrationLayer, {
  label: string;
  subtitle: string;
  /** Display number on the page · Intelligence Sources stays at slot 6 (separate file) */
  order: number;
}> = {
  infrastructure: {
    label: "Infrastructure",
    subtitle: "Foundations — database · storage · host · cron · maps · DNS. Everything else dies if any of these die.",
    order: 1,
  },
  auth: {
    label: "Auth & Identity",
    subtitle: "Sign-in engine + provider backings. Supabase Auth is active; OAuth client credentials live in Google Cloud Console.",
    order: 2,
  },
  ai: {
    label: "AI",
    subtitle: "LLM providers powering the AI Operations Layer. Account-ready · agent runtime currently uses deterministic logic.",
    order: 3,
  },
  analytics: {
    label: "Analytics & Observability",
    subtitle: "Page-view, RUM, product events, error tracking. Vercel layers live; PostHog + Sentry/web pending.",
    order: 4,
  },
  communications: {
    label: "Communications",
    subtitle: "Outbound channels — every email, alert, and future SMS / Slack message flows through this layer.",
    order: 5,
  },
  relationship_intelligence: {
    label: "Relationship Intelligence",
    subtitle: "Upstream data sources feeding the contacts graph — operator-managed batches today.",
    order: 7, // Intelligence Sources takes slot 6 on the page (separate registry)
  },
  external_data: {
    label: "External Data APIs",
    subtitle: "Third-party APIs that enrich the canonical hotel registry — Booking (RapidAPI) for property + room data, Google Places for geocoding. Provenance ranks below operator-managed inputs.",
    order: 7.5,
  },
  commercial: {
    label: "Commercial / Monetization",
    subtitle: "Catalogue · campaign attribution · billing wire to the bank.",
    order: 8,
  },
  developer_infrastructure: {
    label: "Developer Infrastructure",
    subtitle: "Source-of-truth repo + developer-program memberships that back GCP and Apple ecosystems.",
    order: 9,
  },
};

export function platformIntegrationsByLayer(): Array<{
  layer: PlatformIntegrationLayer;
  label: string;
  subtitle: string;
  rows: PlatformIntegrationDescriptor[];
}> {
  return (Object.keys(PLATFORM_LAYER_META) as PlatformIntegrationLayer[])
    .sort((a, b) => PLATFORM_LAYER_META[a].order - PLATFORM_LAYER_META[b].order)
    .map((layer) => ({
      layer,
      label: PLATFORM_LAYER_META[layer].label,
      subtitle: PLATFORM_LAYER_META[layer].subtitle,
      rows: PLATFORM_INTEGRATIONS
        .filter((p) => p.layer === layer)
        .sort((a, b) => {
          const rank = { live: 0, partial: 1, configured_not_wired: 2, planned: 3 } as const;
          const rA = rank[a.status];
          const rB = rank[b.status];
          if (rA !== rB) return rA - rB;
          return a.name.localeCompare(b.name);
        }),
    }));
}
