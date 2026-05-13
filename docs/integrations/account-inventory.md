# Integrations · Operator Account Inventory & Reconciliation Matrix

Canonical reconciliation between the **operator-provisioned accounts** and the **code/env wiring** inside HotelVALORA. The list below is the architectural source-of-truth — `/user/admin/integrations` is its runtime mirror.

**Last reconciled:** 2026-05-13
**Maintained alongside:** `apps/web/src/lib/admin/integrations/platform-registry.ts` and `apps/web/src/lib/admin/integrations/registry.ts`

---

## Status taxonomy

| Status | Meaning |
|---|---|
| **LIVE** | Operational end-to-end in production |
| **PARTIAL** | Wired in some surfaces, not others (e.g. Sentry on api but not web) |
| **CONFIGURED_NOT_WIRED** | Operator account + env scaffold exist · no code path actually invokes |
| **PLANNED** | No account yet OR explicit deferral by directive |

---

## A · Full reconciliation matrix

| # | Integration | Layer | Account exists | Env configured | SDK installed | DB schema ready | Backend wired | Frontend surface | Cron usage | Production active | Visible on /admin/integrations | **Status** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Supabase Database | Infrastructure | ✓ | ✓ | ✓ (`@supabase/supabase-js`, `@supabase/ssr`) | ✓ (41 tables) | ✓ | ✓ (every admin surface) | ✓ (all 3 crons read/write) | ✓ | ✓ | **LIVE** |
| 2 | Supabase Storage | Infrastructure | ✓ | ✓ | ✓ | ✓ (5 buckets · 19 RLS policies) | ✓ | ✓ (library uploads) | — | ✓ | ✓ | **LIVE** |
| 3 | Supabase Auth | Auth | ✓ | ✓ (Google provider in dashboard) | ✓ | ✓ (auth.users + handle_new_user trigger) | ✓ | ✓ (middleware + /auth/callback) | — | ⚠ (AUTH_ENABLED flag pending) | ✓ | **PARTIAL** |
| 4 | Vercel Platform | Infrastructure | ✓ | n/a (account-bound) | n/a | — | ✓ (host) | ✓ (every page) | n/a | ✓ | ✓ | **LIVE** |
| 5 | Vercel Cron | Infrastructure | ✓ | ✓ (`CRON_SECRET`) | n/a | ✓ (news_ingestion_runs, ai_*) | ✓ | n/a | ✓ (3 schedules) | ✓ | ✓ | **LIVE** |
| 6 | Vercel Analytics | Analytics | ✓ | n/a | ✓ (`@vercel/analytics`) | — | n/a | ✓ (root layout) | — | ✓ | ✓ | **LIVE** |
| 7 | Vercel Speed Insights | Analytics | ✓ | n/a | ✓ (`@vercel/speed-insights`) | — | n/a | ✓ (root layout) | — | ✓ | ✓ | **LIVE** |
| 8 | Mapbox GL | Infrastructure | ✓ | ✓ (`NEXT_PUBLIC_MAPBOX_TOKEN`) | ✓ (`mapbox-gl`) | — | n/a | ✓ (CompSet · Library · MO) | — | ✓ | ✓ | **LIVE** |
| 9 | Namecheap (DNS) | Infrastructure | ✓ | n/a (DNS provider) | n/a | — | n/a | n/a (DNS only) | n/a | ✓ | ✓ | **LIVE** |
| 10 | Google Cloud Console (OAuth client) | Auth | ✓ | Credentials in Supabase Dashboard, not Vercel env | n/a | — | via Supabase Auth | via Supabase Auth | — | ✓ | ✓ | **LIVE** |
| 11 | Auth.js (parked scaffold) | Auth | n/a (library, not an account) | ✓ env stubs only | ✓ (parked) | — | — | — | — | ✗ | ✓ | **CONFIGURED_NOT_WIRED** |
| 12 | OpenAI API | AI | ✓ | ✗ (`OPENAI_API_KEY` not yet in .env.example) | ✗ (`openai` SDK absent) | ✓ (`ai_agent_runs.cost_usd`) | partial (cost-tracking plumbing) | — | — (agents regex-only today) | ✗ | ✓ | **CONFIGURED_NOT_WIRED** |
| 13 | PostHog | Analytics | ✓ | ✗ (no env keys) | ✗ (`posthog-js` absent) | — | ✗ | ✗ | — | ✗ | ✓ | **CONFIGURED_NOT_WIRED** |
| 14 | Sentry (api) | Analytics | ✓ | ✓ (api) | ✓ (`sentry-sdk[fastapi]` 2.14.0) | — | ✓ (FastAPI middleware) | ✗ (web side) | — | ✓ (backend traffic only) | ✓ | **PARTIAL** |
| 15 | Sentry (web) | Analytics | (same account) | ✗ | ✗ (`@sentry/nextjs` absent) | — | ✗ | ✗ | — | ✗ | (folded into Sentry card) | **CONFIGURED_NOT_WIRED** |
| 16 | Resend (Transactional Email) | Communications | ✓ | ✓ (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) | ✓ (`resend` SDK) | ✓ (`contact_invitations.resend_message_id`) | ✓ | ✓ (library tour · bulk invite · QA escalation) | ✓ (qa-monitoring only) | ✓ | ✓ | **LIVE** |
| 17 | Gmail Signals (export-driven) | Communications | ✓ | n/a (export-driven) | n/a (Python scripts) | ✓ (relationship_*) | n/a | ✓ (contacts drawer · timeline) | — | ✓ | ✓ | **LIVE** |
| 18 | Slack | Communications | ✗ | ✗ | ✗ | — | — | — | — | ✗ | ✓ | **PLANNED** |
| 19 | Twilio (SMS) | Communications | ✗ | ✗ | ✗ | — | — | — | — | ✗ | ✓ | **PLANNED** |
| 20 | Hosteltur | Intelligence | ✓ (subscription) | ✓ (T1 env · T2 placeholder Supabase) | n/a | ✓ (sources, intelligence_*) | ✓ | ✓ (admin/integrations rich card) | ✓ (hospitality-intel) | ⚠ (placeholder T2 · Playwright pending) | ✓ | **PARTIAL** (BETA in current dashboard wording) |
| 21 | Alimarket | Intelligence | ✗ (vendor onboarding pending) | ✗ | n/a | — (schema reuses Hosteltur shape) | — | ✓ (admin/integrations card) | — | ✗ | ✓ | **PLANNED** |
| 22 | HospitalityNet | Intelligence | n/a (public RSS) | — | n/a | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **LIVE** |
| 23 | HVS Blog RSS | Intelligence | n/a (public RSS) | — | n/a | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **LIVE** |
| 24 | Reuters Hospitality | Intelligence | n/a (public RSS) | — | n/a | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **LIVE** |
| 25 | CoStar News (scrape) | Intelligence | n/a (public preview) | — | n/a | ✓ | ⚠ (registered · not yet ingesting) | ✓ | — | ⚠ | ✓ | **PARTIAL** (BETA) |
| 26 | Datasite Outreach | Relationship Intelligence | ✓ | n/a (operator export-driven) | n/a (Python scripts) | ✓ (relationship_*) | n/a | ✓ (admin/contacts) | — | ✓ | ✓ | **LIVE** |
| 27 | Google Contacts | Relationship Intelligence | ✓ (Google Takeout) | n/a | n/a (Python) | — (read-only join) | n/a | ✓ (operator review surface) | — | ✓ | ✓ | **LIVE** |
| 28 | Gmail Relationship Intelligence | Relationship Intelligence | ✓ | n/a | n/a (Python) | ✓ (relationship_labels, relationship_health) | n/a | ✓ (contacts drawer) | — | ✓ | ✓ | **LIVE** |
| 29 | Subscription Engine (internal) | Commercial | n/a (internal) | n/a | n/a | ✓ (subscription_products, subscriptions) | ✓ | ✓ (admin/subscriptions) | — | ✓ | ✓ | **LIVE** |
| 30 | Campaign Attribution (internal) | Commercial | n/a (internal) | n/a | n/a | ✓ (campaigns, contact_invitations) | ✓ | ✓ (admin/campaigns) | — | ✓ | ✓ | **LIVE** |
| 31 | Stripe (billing) | Commercial | ✓ | ✗ | ✗ (`stripe` SDK absent) | ✓ (`subscriptions.stripe_customer_id`, `stripe_subscription_id`) | ✗ | ✗ | — | ✗ | ✓ | **CONFIGURED_NOT_WIRED** |
| 32 | GitHub | Developer Infrastructure | ✓ | n/a (account-bound) | n/a | — | ✓ (auto-deploy trigger) | — | n/a | ✓ | ✓ | **LIVE** |
| 33 | Google Developer Program | Developer Infrastructure | ✓ | n/a | n/a | — | — | — | — | ✓ (backs GCP) | ✓ | **CONFIGURED_NOT_WIRED** |
| 34 | Apple Developer | Developer Infrastructure | ✓ | ✗ env stubs only (Auth.js parked) | n/a | — | ✗ | ✗ | — | ✗ | ✓ | **CONFIGURED_NOT_WIRED** |

**Totals (33 integrations, GCP-OAuth + Apple counted once):** 17 LIVE · 3 PARTIAL · 6 CONFIGURED_NOT_WIRED · 2 PLANNED · plus the 6 intelligence sources tracked through the live registry.

---

## B · Missing integration gaps (corrected)

The first-pass audit (2026-05-13 morning) under-represented several integrations because it didn't reconcile against the operator account inventory. This second pass corrects:

| Gap | Reality | Correction |
|---|---|---|
| **PostHog** absent from registry | Operator account exists | Added to Analytics layer · status CONFIGURED_NOT_WIRED · `posthog-js` install + provider mount is the next milestone |
| **OpenAI API** absent | Operator account exists; cost_usd plumbing already in agents | Added to new AI layer · status CONFIGURED_NOT_WIRED · `openai` SDK install + agent runtime fold-in is the next milestone |
| **Sentry** classified PLANNED on web | apps/api already has it; web doesn't | Split visibility: existing card now reflects PARTIAL state with explicit api/web split |
| **Stripe** classified PLANNED | Operator account exists, schema already has stripe_* columns | Promoted to CONFIGURED_NOT_WIRED with the original deferral note preserved |
| **Apple Developer + Google Developer Program** not surfaced | Both operator-provisioned | Added to new Developer Infrastructure layer · status CONFIGURED_NOT_WIRED |
| **GitHub** not represented | Source-of-truth repo with auto-deploy | Added to Developer Infrastructure · status LIVE |
| **Namecheap** not represented | DNS registrar · DKIM + SPF for Resend deliverability | Added to Infrastructure · status LIVE |
| **Google Cloud Console** implicit in Supabase Auth | Backs the OAuth client used by Supabase | Surfaced explicitly in the new Auth layer |
| **Auth.js scaffold** previously unlisted | Parked but env stubs exist | Surfaced as CONFIGURED_NOT_WIRED |

---

## C · Architecture state distinctions

Each integration on this page maps to one of five operational lifecycle states:

| State | Means | Examples today |
|---|---|---|
| **Provisioned account** | The operator has the vendor account; no other commitment | Slack and Twilio are NOT provisioned · everything else in the table is |
| **Connected integration** | Code path exists that calls the vendor (SDK installed, env wired) | Resend · Mapbox · Supabase · Vercel · GitHub · Datasite |
| **Active production integration** | Calls happen in production traffic / scheduled jobs | Same as Connected + Vercel Cron-invoked jobs |
| **Dormant integration** | Account + env scaffold exist, code does not call yet | OpenAI · PostHog · Stripe · Sentry/web · Apple Dev · Google Dev Program · Auth.js |
| **Future planned integration** | No account, no env, no code | Slack · Twilio |

A future surface could overlay these states with cost (account fee · per-call cost · per-event cost) to make the trade-off of "wire up vs defer" explicit.

---

## D · Admin integrations taxonomy (9 layers)

| # | Layer | Member integrations |
|---|---|---|
| 1 | Infrastructure | Supabase DB · Supabase Storage · Vercel Platform · Vercel Cron · Mapbox GL · Namecheap (DNS) |
| 2 | Auth & Identity | Supabase Auth · Google Cloud Console (OAuth client) · Auth.js (parked) |
| 3 | AI | OpenAI API |
| 4 | Analytics & Observability | Vercel Analytics · Vercel Speed Insights · PostHog · Sentry |
| 5 | Communications | Resend · Gmail Signals · Slack · Twilio |
| 6 | Intelligence Sources | Hosteltur · Alimarket · HospitalityNet · HVS · Reuters · CoStar News (registered via the rich-card registry) |
| 7 | Relationship Intelligence | Datasite Outreach · Google Contacts · Gmail Relationship Intelligence |
| 8 | Commercial / Monetization | Subscription Engine · Campaign Attribution · Stripe |
| 9 | Developer Infrastructure | GitHub · Google Developer Program · Apple Developer |

Layer 6 keeps the existing rich `IntegrationCard` with session + credentials lifecycle telemetry. Layers 1–5 and 7–9 use the simpler `PlatformIntegrationCard`.

---

## E · How to keep this in sync

When a new operator account lands:
1. Add a line to the inventory matrix above.
2. Add a descriptor in `apps/web/src/lib/admin/integrations/platform-registry.ts` under the right layer.
3. The page auto-renders.
4. Update `project_operator_accounts.md` in the auto-memory so future Claude sessions inherit the corrected state.

When a CONFIGURED_NOT_WIRED integration gets wired:
1. Install the SDK.
2. Update the descriptor's `status` to `live` (or `partial` if only one surface).
3. Move its row in this matrix's status column.
4. Update the operator-account memory file.
