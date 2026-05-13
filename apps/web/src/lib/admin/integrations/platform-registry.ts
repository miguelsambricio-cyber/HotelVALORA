/**
 * Platform integrations registry — the layers BEYOND intelligence feeds.
 *
 * The /user/admin/integrations surface now renders 5 operational layers:
 *   1. Intelligence Sources        · existing rich card · session telemetry
 *   2. Infrastructure              · this file
 *   3. Communications              · this file
 *   4. Relationship Intelligence   · this file
 *   5. Commercial / Monetization   · this file
 *
 * Layers 2-5 don't need T1/T2 session telemetry, RSS URLs, or scrape kinds;
 * their operational contract is closer to "is the wire connected and what
 * does it carry". This registry captures that shape — auth method (as a
 * human-readable phrase, not an enum), env vars, schema touchpoints, cron
 * dependencies, and the admin surfaces that consume each integration.
 */

export type PlatformIntegrationStatus = "live" | "beta" | "planned";

export type PlatformIntegrationLayer =
  | "infrastructure"
  | "communications"
  | "relationship_intelligence"
  | "commercial";

export type HealthSignal = "ok" | "warn" | "error" | "neutral" | "unknown";

export interface PlatformIntegrationDescriptor {
  id: string;
  /** Display name */
  name: string;
  /** Provider / vendor */
  provider: string;
  /** Operational layer (drives the page section it lands in) */
  layer: PlatformIntegrationLayer;
  /** Operational maturity (drives the badge tone) */
  status: PlatformIntegrationStatus;
  /** One-line operational purpose */
  purpose: string;
  /** Human-readable auth method ("Service-role key", "Operator export", "None — public token") */
  authMethod: string;
  /** Env vars required (display only — operator already knows the values) */
  envVars: string[];
  /** Primary DB tables / storage buckets touched */
  tables: string[];
  /** Cron schedules that depend on this integration */
  cronDependencies: string[];
  /** Admin surfaces that consume the integration */
  consumedBy: string[];
  /** Whether the integration ever needs operator credentials / manual refresh */
  operatorManaged: boolean;
  /** External links surfaced in the card footer */
  externalLinks?: { label: string; href: string }[];
  /** Free-form operational notes */
  notes?: string[];
  /** Next milestone — surfaced under PLANNED / BETA cards */
  nextMilestone?: string;
  /** Visual signal — operational telemetry placeholder */
  signal: HealthSignal;
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
    notes: [
      "Admin client patched in Phase 2.D.5 to bypass Next.js Data Cache (cache: 'no-store' on every roundtrip).",
      "All migrations (0001-0022) applied · advisor warnings closed.",
    ],
    externalLinks: [
      { label: "Project dashboard", href: "https://supabase.com/dashboard/project/twebgqutuqgonabvhzjk" },
      { label: "Integration dossier", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/integrations/supabase.md" },
    ],
  },
  {
    id: "supabase-auth",
    name: "Supabase Auth",
    provider: "Supabase Inc. (Google OAuth provider)",
    layer: "infrastructure",
    status: "beta",
    purpose:
      "Operator (and future end-user) sign-in. OAuth code-exchange via /auth/callback writes the HttpOnly session cookie.",
    authMethod: "Google OAuth (Supabase-managed handshake) · HttpOnly cookie session",
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
    nextMilestone:
      "Flip AUTH_ENABLED=true on Vercel · validate 3-way curl matrix (anon → 307 /login · non-operator → 404 · operator → 200).",
    notes: [
      "Code paths fail-closed (operator-guard.ts) · enforcement gated on AUTH_ENABLED flag in Vercel env.",
      "Google is the only active IdP · LinkedIn / Apple scaffolds parked.",
    ],
    externalLinks: [
      { label: "Supabase Auth providers", href: "https://supabase.com/dashboard/project/twebgqutuqgonabvhzjk/auth/providers" },
      { label: "Activation runbook", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/auth.md" },
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
    notes: ["19 own-namespace RLS policies · advisor warning on broad-public-read fixed in 0004."],
  },
  {
    id: "vercel-platform",
    name: "Vercel Platform",
    provider: "Vercel Inc.",
    layer: "infrastructure",
    status: "live",
    purpose:
      "Hosting · GitHub → main auto-deploy · custom domain hotelvalora.com · Vercel Analytics + Speed Insights mounted in root layout.",
    authMethod: "Deploy account (Sign in with GitHub)",
    envVars: [],
    tables: [],
    cronDependencies: [],
    consumedBy: ["everything"],
    operatorManaged: false,
    signal: "ok",
    notes: ["Vercel CLI not installed locally — env vars set via web dashboard until the operator runs `npm i -g vercel`."],
  },
  {
    id: "vercel-cron",
    name: "Vercel Cron",
    provider: "Vercel Inc.",
    layer: "infrastructure",
    status: "live",
    purpose:
      "Three daily schedules carrying every recurring autonomous workflow. Bearer CRON_SECRET injected by the Vercel runtime.",
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
    notes: [
      "Hobby plan caps schedules at daily — all 3 obey that.",
      "QA monitor escalates via Resend on threshold breach (15-min cooldown).",
    ],
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
    notes: ["Token domain-restricted in the Mapbox dashboard so leak → quota cost only."],
  },
];

const COMMUNICATIONS: PlatformIntegrationDescriptor[] = [
  {
    id: "resend",
    name: "Resend (Transactional Email)",
    provider: "Resend",
    layer: "communications",
    status: "live",
    purpose:
      "Every outbound transactional email — tour requests · bulk invitations · QA escalations · campaign sends.",
    authMethod: "API key (server-only) · verified hotelvalora.com domain (DKIM + SPF)",
    envVars: ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "INTERNAL_ALERT_RECIPIENTS"],
    tables: ["contact_invitations (resend_message_id)"],
    cronDependencies: ["qa-monitoring · 30 9 * * * (escalations only)"],
    consumedBy: ["library 'Schedule a Tour' CTA", "/user/admin/contacts (bulk invite)", "AI Operations escalation"],
    operatorManaged: false,
    signal: "ok",
    notes: [
      "150 ms spacing between bulk-invite sends keeps the loop under the 10/s default cap.",
      "Two templates today: tour-request + contact-invite. Campaign-specific templates land alongside Phase 2.D.8.",
    ],
    externalLinks: [
      { label: "Resend dashboard", href: "https://resend.com/emails" },
      { label: "Integration dossier", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/integrations/resend.md" },
    ],
  },
  {
    id: "gmail-signals",
    name: "Gmail Signals (export-driven)",
    provider: "Google",
    layer: "communications",
    status: "live",
    purpose:
      "Per-email JSONL aggregations powering the relationship band derivation (active threads · directionality · bounce detection · inferred stage).",
    authMethod: "Operator-driven Gmail export → JSONL · no in-app OAuth today",
    envVars: [],
    tables: [
      "relationship_contacts (active_threads, last_email_date, email_directionality, ...)",
      "relationship_labels (inferred_stage)",
      "relationship_health (bounce_count, email_validity)",
    ],
    cronDependencies: [],
    consumedBy: ["/user/admin/contacts (drawer · timeline + lifecycle)"],
    operatorManaged: true,
    signal: "neutral",
    notes: [
      "30+ bounce snippet patterns in 4 languages (ES/EN/FR/DE).",
      "Server-side Gmail OAuth would autonomize this layer — see Phase 2.E candidate in the integration audit.",
    ],
  },
  {
    id: "slack",
    name: "Slack (real-time operator channel)",
    provider: "Slack Inc.",
    layer: "communications",
    status: "planned",
    purpose: "Real-time operator alerts complementing Resend's 15-min cooldown — invite accepted, sub expiring, AI agent escalation.",
    authMethod: "Incoming webhook URL (per channel)",
    envVars: ["SLACK_WEBHOOK_URL (future)"],
    tables: [],
    cronDependencies: [],
    consumedBy: ["future · AI Operations escalation · subscription expiry sweep"],
    operatorManaged: false,
    signal: "neutral",
    nextMilestone: "Provision a single ops webhook + emit alongside Resend in escalation.ts.",
  },
  {
    id: "twilio",
    name: "Twilio (SMS)",
    provider: "Twilio Inc.",
    layer: "communications",
    status: "planned",
    purpose:
      "SMS for critical-stage notifications — declined deal, accepted high-value invite, subscription payment past due.",
    authMethod: "Twilio account SID + auth token",
    envVars: ["TWILIO_ACCOUNT_SID (future)", "TWILIO_AUTH_TOKEN (future)", "TWILIO_FROM_NUMBER (future)"],
    tables: [],
    cronDependencies: [],
    consumedBy: ["future · institutional-priority lifecycle moments only"],
    operatorManaged: false,
    signal: "neutral",
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
      "Institutional contacts master — 4,547 contacts · 2,990 companies · 2,990 deal timelines · 143 Gmail label edges.",
    authMethod: "Operator authenticates with Datasite OUTSIDE HotelVALORA · drops `.xlsm` export into CONTACTOS DATASITE/incoming/",
    envVars: [],
    tables: [
      "relationship_companies",
      "relationship_contacts",
      "relationship_interactions",
      "relationship_labels",
      "relationship_health",
    ],
    cronDependencies: [],
    consumedBy: ["/user/admin/contacts (live)", "/user/admin/users (linked contact)"],
    operatorManaged: true,
    signal: "ok",
    notes: [
      "scripts/contactos/ingest.py · 2-pass classify → dedup → merge.",
      "scripts/contactos/promote_to_supabase.py · idempotent stdlib PostgREST upserter.",
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
    purpose:
      "Operator's personal/professional address book cross-referenced against the institutional Master. Read-only join · no auto-merge.",
    authMethod: "Operator-driven Google Takeout CSV export · no in-app OAuth today",
    envVars: [],
    tables: ["(read-only · writes to local Google enrichment workbook only)"],
    cronDependencies: [],
    consumedBy: ["scripts/contactos/ingest_google.py (operator review surface)"],
    operatorManaged: true,
    signal: "neutral",
    notes: ["9-bucket Google taxonomy (investor / lender / broker / operator / brand / consultant / advisor / personal / unknown)."],
  },
  {
    id: "gmail-relationship-intel",
    name: "Gmail Relationship Intelligence",
    provider: "Google",
    layer: "relationship_intelligence",
    status: "live",
    purpose:
      "Same Gmail signals layer feeds the relationship intelligence drawer — timeline events, bounce detection, inferred relationship stage.",
    authMethod: "Operator-driven export · same source as Communications.gmail-signals (single export feeds both layers)",
    envVars: [],
    tables: ["relationship_labels", "relationship_health", "relationship_contacts (rollup fields)"],
    cronDependencies: [],
    consumedBy: ["/user/admin/contacts drawer (timeline + conversion status)"],
    operatorManaged: true,
    signal: "ok",
    notes: ["The same JSONL export feeds Communications and Relationship Intelligence — listed twice to surface both operational purposes."],
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
    consumedBy: ["/user/admin/subscriptions", "/user/admin/users (bulk · linked contact subscribe)"],
    operatorManaged: false,
    signal: "ok",
    notes: [
      "Catalogue is data, not enum (Phase 2.D.7 + 2.D.7b).",
      "Bulk lifecycle: assign · replace · comp · expire · revoke · all audit-logged.",
    ],
  },
  {
    id: "campaign-attribution",
    name: "Campaign Attribution System",
    provider: "HotelVALORA",
    layer: "commercial",
    status: "live",
    purpose:
      "Every invitation + subscription carries source_campaign_id. Per-campaign cards surface conversion funnel (active / converted / failed / subs).",
    authMethod: "Operator-only · gated by requireOperator()",
    envVars: [],
    tables: ["campaigns", "contact_invitations", "subscriptions (source_campaign_id)"],
    cronDependencies: [],
    consumedBy: ["/user/admin/campaigns", "/user/admin/contacts drawer (Source campaign chip)"],
    operatorManaged: false,
    signal: "ok",
    notes: ["Campaigns reference subscription_product_id as the monetization cohort link (2.D.7b)."],
  },
  {
    id: "stripe",
    name: "Stripe (billing automation)",
    provider: "Stripe Inc.",
    layer: "commercial",
    status: "planned",
    purpose:
      "Self-serve checkout, recurring billing, webhook-driven subscription lifecycle. Currently deferred by directive — schema is ready.",
    authMethod: "Stripe Secret + webhook signing secret (future)",
    envVars: ["STRIPE_SECRET_KEY (future)", "STRIPE_WEBHOOK_SECRET (future)"],
    tables: ["subscriptions (stripe_customer_id, stripe_subscription_id columns present and nullable)"],
    cronDependencies: [],
    consumedBy: ["future · /user/admin/subscriptions (Stripe-backed rows would render with the existing amber warning chip)"],
    operatorManaged: false,
    signal: "neutral",
    nextMilestone:
      "Install @stripe/stripe-js + stripe SDKs · wire /api/webhooks/stripe · operator opt-in when monetization moves from manual to self-serve.",
    notes: [
      "Schema-ready: `subscriptions.stripe_customer_id` and `stripe_subscription_id` columns are already in the table.",
      "Stripe-backed rows would be operator-read-only (cancel via Stripe Dashboard so the webhook stays authoritative).",
    ],
    externalLinks: [{ label: "Stripe Dashboard", href: "https://dashboard.stripe.com" }],
  },
];

export const PLATFORM_INTEGRATIONS: PlatformIntegrationDescriptor[] = [
  ...INFRASTRUCTURE,
  ...COMMUNICATIONS,
  ...RELATIONSHIP_INTELLIGENCE,
  ...COMMERCIAL,
];

export const PLATFORM_LAYER_META: Record<PlatformIntegrationLayer, {
  label: string;
  subtitle: string;
  order: number;
}> = {
  infrastructure: {
    label: "Infrastructure",
    subtitle: "Database · auth · storage · host · cron · maps · everything else dies if any of these die.",
    order: 2,
  },
  communications: {
    label: "Communications",
    subtitle: "Outbound channels — every email, alert, and future SMS / Slack message flows through this layer.",
    order: 3,
  },
  relationship_intelligence: {
    label: "Relationship Intelligence",
    subtitle: "Upstream data sources feeding the institutional contacts graph — operator-managed batches today.",
    order: 4,
  },
  commercial: {
    label: "Commercial / Monetization",
    subtitle: "Catalogue, campaign attribution, and the future billing wire to the bank.",
    order: 5,
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
          // status sort: live → beta → planned · then alphabetical within
          const rank = { live: 0, beta: 1, planned: 2 } as const;
          const rA = rank[a.status];
          const rB = rank[b.status];
          if (rA !== rB) return rA - rB;
          return a.name.localeCompare(b.name);
        }),
    }));
}
