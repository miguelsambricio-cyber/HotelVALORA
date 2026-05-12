# Integrations · Hosteltur

**Last refreshed:** 2026-05-12
**Status:** 🟢 Phase 2.6 live · authenticated cron ingestion shipped 2026-05-12 · session-health gate writes `auth_success` audit + stamps T2 meta every nightly run · canonical T2 row `81f57ee0-…` · 11 cookies · last cron run: 34 articles with authed body fetches (avg 4.8kB body each) · `/premium` health check Δ=+57,062B · expires 2026-05-19

Hosteltur is the validation source for HOTELVALORA's authenticated-intelligence track. Architecture goal: prove the **three-tier credential model** end-to-end on a single source before extending to Alimarket / STR / others. **Goal achieved.**

Strategic context: `docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md`.
Schema: `docs/database/migrations/0009_intelligence_source_sessions.sql`.
Snapshot: `docs/SNAPSHOT_2026_05_12.md` § 4.1 + § 4.3 (placeholder → real T2 transition).

---

## 1 · Access surface (confirmed 2026-05-12)

| Capability | Available? | Notes |
|---|---|---|
| Public RSS feeds | **Yes** | `https://www.hosteltur.com/feed` (main) plus topic feeds (`/feed/hoteles-y-alojamientos`, `/feed/distribucion`, `/feed/economia`, `/feed/transportes`, `/feed/viajes`, `/feed/tag/turismo-sostenible`). Hub: `https://www.hosteltur.com/rss-hosteltur` |
| Subscriber-only RSS | **No** (none discovered) | Premium content is not exposed via authenticated feeds |
| Public REST API | **No** (none discovered) | No documented developer API |
| Subscriber REST API | **No** (none discovered) | Premium access is browser-session-based |
| Browser login required for premium | **Yes** | Form login at `https://www.hosteltur.com/login` · subscription `€6/month` or `€60/year` |
| Premium content scope | Reports · in-depth analysis · interviews · rankings · digital magazine PDF · premium newsletter HTML |

`robots.txt` explicitly disallows crawling of `/login` and `/acceder`. Personal authenticated use is fine; we never crawl the login surface itself.

## 2 · Ingestion strategy

Two complementary paths run in parallel — different blast radius, different operational risk.

### Path A — Public RSS (always-on)

- Uses the existing `fetchRss` in `apps/web/src/lib/intelligence/fetchers.ts`.
- No credentials required. No new code path. Already wired.
- Returns title + summary + URL + `published_at`. Premium articles surface in this feed with a truncated summary.

### Path B — Premium body enrichment (authenticated, opt-in)

- For each RSS item whose URL Hosteltur gates behind login, fetch the full body using the stored Hosteltur session cookies.
- Runs as an enrichment step **after** Path A normalisation, never as a replacement.
- Failure to fetch the premium body is a graceful degradation: we keep the RSS summary and tag the row with `premium_fetch_status='gated'` in `meta`. The ingestion run does not fail.

### Why split

If Hosteltur session expires, the platform keeps ingesting headlines. Only the body-enrichment step degrades. This is the right load-bearing surface for a credentialed-source validation: cheap if it works, harmless if it fails.

---

## 3 · Authentication architecture

**Architecture revision · 2026-05-12 — Option B:** T1 credentials lifted from Vercel env into encrypted Supabase storage. The admin UI is now the operational console for provisioning, rotation, and invalidation. See `docs/changelog.md` for the rationale.

```
┌─────────────────────────────────────────────────────────────────────┐
│  T1 · Encrypted credentials (Option B)                               │
│  AES-256-GCM(username) + AES-256-GCM(password)                       │
│  → public.intelligence_source_credentials                            │
│  Service-role RLS · independent IV per field                         │
│  Touched by: admin UI provisioning + refresh script reader           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  Playwright login flow (refresh script)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  T2 · Encrypted session artifact                                     │
│  AES-256-GCM(storageState JSON) → public.intelligence_source_sessions│
│  Storage: Supabase row, service-role RLS                             │
│  TTL: 7 days, refreshed proactively + on 401                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  Cookie-jar HTTP fetch
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  T3 · Article content                                                │
│  public.market_news + companions (existing tables)                   │
│  Never touches credentials                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Playwright for login, fetch for content

Hosteltur's login form has CSRF tokens + JS-rendered fields. Reproducing it with raw HTTP is brittle. Playwright handles the dance once, exports `storageState` (cookies + localStorage), and we then use plain `fetch` with a cookie jar for the daily content fetches. **Playwright never runs on Vercel in v1** — login happens in the operator's local CLI.

### Vercel / serverless compatibility

- Daily ingestion runs on Vercel cron (`/api/cron/hospitality-intel`) — **no Playwright dependency** in the function bundle. Bundle stays small. Edge-clean.
- Session refresh runs locally (operator CLI) → writes the encrypted row to Supabase via service-role client → next cron picks it up.
- Phase 3 candidate: move refresh into a Vercel function gated by `INTELLIGENCE_REFRESH_TOKEN`, using `playwright-core` + `@sparticuz/chromium`. Until then, **local-CLI is intentional** — smaller blast radius, no Playwright on the request path.

---

## 4 · Session lifecycle

| Phase | Trigger | Who | Side effects |
|---|---|---|---|
| **Initial mint** | First operator run of `pnpm intel:refresh hosteltur` | Operator | Login → encrypt → INSERT row with `status='active'`, `expires_at = now() + 7d` |
| **Proactive refresh** | Weekly cron (Phase 3+) OR operator CLI | Operator / cron | Re-login → INSERT new row → previous active row marked `status='expired'` |
| **Reactive refresh** | Market Intelligence Agent detects 401 / login-redirect / paywall HTML pattern | Agent (emits event) → operator (acts) | Row marked `status='invalidated'`; `intelligence.session.expired` event emitted; Resend digest to `INTERNAL_ALERT_RECIPIENTS`; operator runs refresh |
| **Refresh failure** | Refresh script fails (bad credentials, MFA challenge, layout change) | Operator | Row marked `status='refresh_failed'`; `last_refresh_error` written (redacted); Resend digest |

The partial unique index on `(source_slug) where status='active'` makes the state machine self-enforcing — there is at most one active session per source at any time.

---

## 5 · Required environment variables

All values land in **Vercel → Project → Environment Variables → Production scope only, Sensitive flag set**, and in the operator's local `apps/web/.env.local`. None of these are ever committed.

| Variable | Tier | Role | Generation / source |
|---|---|---|---|
| `HOSTELTUR_USERNAME` | T1 | Subscriber email | Hosteltur account |
| `HOSTELTUR_PASSWORD` | T1 | Subscriber password | Hosteltur account |
| `HOSTELTUR_LOGIN_URL` | T1 (optional) | Override if login URL moves | Default: `https://www.hosteltur.com/login` |
| `INTELLIGENCE_SESSION_ENC_KEY` | T1.5 | 32-byte AES-256 KEK that wraps T2 rows | `openssl rand -base64 32` |
| `INTELLIGENCE_SESSION_ENC_KEY_ID` | T1.5 | Identifier of the active KEK (`v1`, `v2`, ...) | Literal string, default `v1` |
| `INTELLIGENCE_REFRESH_TOKEN` | T1 | Auth for the future `POST /api/agents/refresh-session` endpoint | `openssl rand -hex 32` |

Existing variables this builds on: `SUPABASE_SERVICE_ROLE_KEY` (service-role client for session writes/reads), `CRON_SECRET` (gates the daily ingestion cron), `INTERNAL_ALERT_RECIPIENTS` (target for session-expired Resend digests).

### Key-generation runbook

```bash
# Run ONCE per environment (local + production). Different values per env.
openssl rand -base64 32   # → paste as INTELLIGENCE_SESSION_ENC_KEY
openssl rand -hex 32      # → paste as INTELLIGENCE_REFRESH_TOKEN
```

For the operator's local environment, paste straight into `apps/web/.env.local`. For Vercel, paste into the dashboard's env-var form with **Sensitive** checked, **Production** scope only.

---

## 6 · Recommended `.env.local` structure (operator)

```bash
# apps/web/.env.local  (NEVER COMMITTED — already covered by .gitignore)

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=https://twebgqutuqgonabvhzjk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>
SUPABASE_SERVICE_ROLE_KEY=<service-role>

# AI-Ops infrastructure (existing)
CRON_SECRET=<cron-secret>
INGESTION_AUDIT_TOKEN=<audit-token>
INTERNAL_ALERT_RECIPIENTS=miguel.sambricio@metcub.com

# Session encryption (new, Phase 2.5)
INTELLIGENCE_SESSION_ENC_KEY=<32-byte-base64>
INTELLIGENCE_SESSION_ENC_KEY_ID=v1
INTELLIGENCE_REFRESH_TOKEN=<32-byte-hex>

# Hosteltur (new, Phase 2.5)
HOSTELTUR_USERNAME=<subscriber-email>
HOSTELTUR_PASSWORD=<subscriber-password>
```

The operator pulls this via `vercel env pull apps/web/.env.local --environment=production` after the values are set in Vercel. Manual re-typing is also fine — no value ever flows back upstream.

---

## 6b · Live-state aggregator (added 2026-05-12)

The Administrator dashboard reads integration state from `lib/admin/integrations/live.ts` (`getIntegrationLive(slug)` / `getIntegrationsLive()`). It merges static registry metadata with per-request DB reads of:

- `public.intelligence_source_credentials` → credentials configured + last rotated + last login
- `public.intelligence_source_sessions` → session status, expires_at, hours-to-expiry, refresh count
- `public.news_ingestion_runs` → 7d success / failed counts, mean items/run, last run state
- `public.market_news` → article counts (today / 7d / 30d)

The `IntegrationCard`, `IntegrationDetail`, `AuthenticatedSourcesPanel` components are unchanged — they consume the same `IntegrationDescriptor` shape. The static `INTEGRATIONS_REGISTRY` now only supplies display metadata (name, tagline, region, external links). Connection status is derived dynamically by `deriveConnection()`.

The first session-refresh and ingestion run for `alimarket` were executed via `scripts/execute-session-refresh.mjs` and a direct SQL ingestion run — see changelog 2026-05-12 entry.

## 7 · Operational runbook

### First-time setup (one-off)

```
1. Hosteltur account created and Premium subscription active.
2. operator: openssl rand -base64 32 → set INTELLIGENCE_SESSION_ENC_KEY in Vercel + .env.local
3. operator: openssl rand -hex 32     → set INTELLIGENCE_REFRESH_TOKEN
4. operator: paste HOSTELTUR_USERNAME / HOSTELTUR_PASSWORD into Vercel + .env.local
5. Apply migration 0009_intelligence_source_sessions.sql via Supabase.
6. UPDATE public.sources SET requires_auth=true, auth_strategy='cookie_session' WHERE slug='hosteltur';
7. operator: pnpm intel:refresh hosteltur     → produces first encrypted session row
8. Verify: SELECT source_slug, status, expires_at FROM public.intelligence_source_sessions;
9. operator: pnpm intel:run hosteltur         → smoke test the auth body-enrichment path
```

### Daily steady state (cron)

```
08:48 Madrid (Phase 2)
  /api/cron/hospitality-intel
    → for source in public.sources where enabled=true:
        Path A: fetchRss(source)                            # always
        Path B: if source.requires_auth and active session:
                  decrypt T2 → cookie jar → fetch body      # opt-in
        normalise → market_news INSERT (existing pipeline)
    → ai_agent_runs row, counts only, no credential surface
```

### Weekly proactive refresh (Phase 3+)

```
Sundays 04:30 Madrid (or operator manual)
  pnpm intel:refresh hosteltur
    → Playwright login → new T2 row → previous row marked 'expired'
    → ai_events: { kind: 'session_refreshed', source: 'hosteltur' }
```

### Reactive refresh (any time)

```
Market Intelligence Agent run detects 401 / login-redirect / paywall HTML
  → mark active row status='invalidated'
  → emit ai_events { kind: 'session_expired' }
  → Resend digest to INTERNAL_ALERT_RECIPIENTS
  → operator runs: pnpm intel:refresh hosteltur
```

---

## 8 · Failure modes & responses

| Failure | Detection | Response |
|---|---|---|
| Hosteltur changes login form layout | `pnpm intel:refresh` throws during Playwright steps | Operator updates selector in refresh script; rotates the script, not credentials |
| Hosteltur enforces MFA | Refresh script blocks waiting for OTP | Add TOTP secret as `HOSTELTUR_TOTP_SECRET` env var; Playwright reads + computes code |
| Hosteltur invalidates session early | Daily ingest returns 401 / paywall HTML | Agent emits `session_expired` event → operator runs refresh |
| Hosteltur rate-limits the cookie session | Daily ingest returns 429 | Agent backs off + reschedules to next day; no auto-retry |
| `INTELLIGENCE_SESSION_ENC_KEY` rotated | Old rows fail `auth_tag` verification on read | Mark all rows with the old `enc_key_id` as `expired`; re-run refresh per source |
| Credentials leaked in a commit | gitleaks pre-commit catches; or post-hoc audit | (1) Rotate password at Hosteltur. (2) Rotate Vercel env var. (3) Run `pnpm intel:refresh`. (4) Optionally `git filter-repo` for history hygiene |

---

## 9 · Security controls (cross-references)

- **No secrets in logs**: `lib/secrets/redact.ts` runs every log payload through a known-credential-name allowlist. The Market Intelligence Agent's `fetch` wrapper logs status + host + timing only — no headers, no body, no cookies.
- **No frontend exposure**: T1/T2 are server-only. The browser bundle never imports `lib/intelligence/session-store.*`. No `NEXT_PUBLIC_HOSTELTUR_*` variables — and there never will be.
- **No Git tracking**: `.env.local` and `.env` are gitignored. `gitleaks` pre-commit hook (planned) catches accidental commits. The `.env.example` documents NAMES only — never values.
- **No plaintext credential persistence**: T1 lives only in env vars. T2 is AES-256-GCM-encrypted at rest. `ai_agent_runs` audit rows reference sessions by `source_slug` + `enc_key_id` + `refreshed_at` — never by credential.

Full security matrix: `docs/infrastructure/security-audit.md`.

---

## 10 · What is NOT in v1 (intentional)

- **No Playwright on Vercel.** Refresh happens locally. Bundle stays small. Phase 3 candidate.
- **No autonomous re-login.** A `session_expired` event always escalates to the operator. Phase 4 candidate.
- **No archive crawl.** RSS gives recent only. Backfilling historical Premium archive is out of scope for validation.
- **No second source.** Hosteltur only. Alimarket + STR follow after the validation pass closes successfully.
- **No body-rendering changes in Library / Underwriting surfaces.** Premium body, when fetched, lands in `market_news.body_html` and `market_news.body_text` — existing consumers keep working.
