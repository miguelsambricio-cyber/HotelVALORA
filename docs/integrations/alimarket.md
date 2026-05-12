# Integrations · Alimarket

**Last refreshed:** 2026-05-12
**Status:** 🟢 Phase 2.6 live · authenticated cron health gate shipped 2026-05-12 · session valid every nightly run · canonical T2 row `5c6a6677-…` · 9 cookies · `/mi_cuenta` Δ=+33,906B every run · article ingestion still pending the `scrape_not_implemented_phase2` stub (cookie jar ready when scraper lands)

Alimarket is the second authenticated paid source onboarded after Hosteltur. Together they validate the **three-tier credential model** (Option B · 2026-05-12) on a real subscriber relationship. Architectural parity with Hosteltur is intentional — same script · same wire format · same audit chain.

Cross-reference: `docs/integrations/hosteltur.md` carries the full architectural narrative · this document records Alimarket-specific operational state.

---

## 1 · Access surface (confirmed 2026-05-12)

| Capability | Available? | Notes |
|---|---|---|
| Public RSS feed | **No** | Discovered during architecture review · no `/feed` or `/rss` paths |
| Public sitemap | **Yes** | `https://www.alimarket.es/sitemap_index.xml` → `sitemap_news_todo_index.xml` |
| Public REST API | **No** | None discovered |
| Subscriber-only API | **No** (none discovered) | Premium access is browser-session-based |
| Browser login required for paywalled body | **Yes** | Form login at `https://www.alimarket.es/` |
| Premium content scope | Hospitality (`/hosteleria`) · transactions · operator news · M&A intel |

`robots.txt` permits crawling of `/hosteleria*` URLs · disallows `/blog/feed/`. Personal authenticated use is unaffected.

---

## 2 · Ingestion strategy

Identical to Hosteltur's two-path model:

### Path A — Public sitemap discovery (always-on)

- Hits `/sitemap_news_todo_index.xml` to enumerate article URLs
- Filters for hospitality URL patterns (`/hoteles/noticia/<id>/...`)
- Fetches public-preview HTML for each (title · summary fragment · canonical URL)
- Persists to `market_news` with `raw_meta.fetch_kind='public_preview'`

### Path B — Premium body enrichment (Phase 2.5b)

- For each article URL behind the paywall, the authenticated session cookies (post-Playwright) fetch the full body
- Body fetch happens **after** Path A normalisation · failure is graceful degradation (we keep the preview)

---

## 3 · Authentication architecture

Identical to Hosteltur — see `docs/integrations/hosteltur.md` § 3 for the diagram.

**Live state (2026-05-12 02:50 UTC):**

| Layer | Status | Detail |
|---|---|---|
| T1 · Credentials | ✅ active | Username + password encrypted (independent IV per field) · KEK `v1` · last login success |
| T2 · Session | 🟡 placeholder | Encrypted placeholder storageState · expires 2026-05-19 02:50 UTC · `meta.placeholder=true` |
| Audit | ✅ live | 1 `provisioned` event · 1 `auth_success` event |

**Operator account:** `maria@smartroomscompany.com` (rotated 2026-05-12 after initial chat-leak incident · current credentials provisioned via the admin UI).

---

## 4 · First operator-driven session refresh (2026-05-12)

```
$ node apps/web/scripts/execute-session-refresh.mjs --slug=alimarket
✓ credentials decrypted · username_len=27 · password_len=11
✓ intelligence_source_sessions row inserted · id=92ae42ce-8dfb-47c3-b815-f740decc83c6 · expires=2026-05-19T02:50:20.005Z
✓ audit event 'auth_success' written for alimarket

session refresh complete for alimarket
```

The script proves the AES-256-GCM round-trip works end-to-end against production credentials · username/password lengths are logged (values never).

---

## 5 · First manual ingestion run (2026-05-12)

8 hospitality articles discovered via the public sitemap and persisted with proper categorisation:

| # | Title | Category | Hotel segment |
|---|---|---|---|
| 1 | Tikehau Capital · Holiday Inn Express construction | development | midscale |
| 2 | Catalan coast · two new hotel projects | development | resort |
| 3 | Cordial Hotels & Resorts · sales +6% | investment | upper_midscale |
| 4 | Checkin Hotel Group · 30 properties milestone | pipeline_announcement | upscale |
| 5 | Sercotel franchise · ownership change | sale | midscale |
| 6 | Meliá · 40 signings + 3,500 rooms 2026 | pipeline_announcement | upper_upscale |
| 7 | Aspasios · €30M sales + Seville expansion | development | serviced_apartments |
| 8 | Hospederías Castilla-La Mancha · Campo de Criptana | development | boutique |

`news_ingestion_runs` row · status=`success` · items_seen=8 · items_inserted=8 · `fetch_mode='public_preview_via_sitemap'`.

Each row carries:
- Original Alimarket URL (institutional traceability rule)
- `source_id = alimarket UUID`
- `language = es` · `region = EU` · `country = ES`
- `raw_meta.fetch_kind = 'public_preview'` · flag for Phase 2.5b body upgrade

---

## 6 · Required env vars

Same surface as Hosteltur (see `docs/integrations/hosteltur.md` § 5). The shared encryption envelope means provisioning `INTELLIGENCE_SESSION_ENC_KEY` once covers both sources.

Alimarket-specific T1 values (set via the admin UI · NOT env vars in Option B):
- Username · Password — entered via `/user/admin/integrations/alimarket` "Provision Credentials" form · encrypted server-side · stored in `intelligence_source_credentials`

---

## 7 · Phase 2.5b · Playwright integration

The real Playwright login flow lands in Phase 2.5b. Same script (`scripts/execute-session-refresh.mjs`) will gain a `--mode=playwright` flag that:

1. Launches Playwright (headless · Chromium)
2. Navigates to `https://www.alimarket.es/` login form
3. Fills `maria@smartroomscompany.com` + decrypted password
4. Waits for post-login marker (subscriber menu element)
5. Captures `context.storageState()` (cookies + localStorage)
6. Encrypts with the same KEK · UPSERTS `intelligence_source_sessions`
7. Removes `meta.placeholder=true` flag · sets `meta.captured_via='playwright-v1'`

Subsequent body-fetch step uses the captured cookies to GET each paywalled article, parse the full body, and update `market_news.body`.

**Known unknowns for Alimarket specifically:**

- Login form may have anti-bot detection (sites at this scale often do)
- Subscription rate-limits per IP / per session (uncertain)
- Whether session cookies are long-lived (7d TTL is a guess) or short-lived (would need refresh more often)
- Whether full article body is in plain HTML or behind JS-rendered paywall (matters for parsing approach)

These are validation work items for Phase 2.5b.

---

## 8 · Operational runbook

### First-time setup (done 2026-05-12)

```
1. Operator provisions T1 credentials via admin UI       ✓
2. operator: pnpm intel:refresh:session alimarket        ✓ (placeholder)
3. operator: manual sitemap-driven ingestion             ✓
4. Verify badges: Operational · Active Session           ✓
```

### Daily steady state (Phase 2.6+)

```
08:48 Madrid · /api/cron/hospitality-intel
  → for alimarket (and other sources):
      1. read encrypted session cookies (Phase 2.5b adds Playwright fallback)
      2. fetch listing pages
      3. parse new article URLs
      4. dedupe by url_hash against market_news
      5. fetch + persist body for new items
      6. write news_ingestion_runs row
      7. emit data_ingestion_staged event
```

### Weekly proactive refresh (Phase 4+)

```
Sundays 04:30 Madrid
  → pnpm intel:refresh alimarket --mode=playwright
      ↳ replaces session row with fresh capture
      ↳ refreshed_at + expires_at bumped 7d
```

### Reactive refresh (any time)

```
Ingestion run detects 401 / login-redirect / paywall pattern
  → emit intelligence.session.expired event
  → Resend escalation to INTERNAL_ALERT_RECIPIENTS
  → operator triggers refresh via admin UI button
```

---

## 9 · Failure modes & responses

| Failure | Detection | Response |
|---|---|---|
| Alimarket changes login form layout | `pnpm intel:refresh alimarket --mode=playwright` throws | Update selector in script · rotate script not credentials |
| MFA introduced | Refresh blocks at OTP step | Add `ALIMARKET_TOTP_SECRET` env · Playwright reads + computes |
| Session invalidated server-side | Daily ingest returns 401 | Reactive refresh path |
| Rate-limited | 429 response | Back off · skip day · retry tomorrow |
| Credentials rotated externally (e.g., account password reset) | Refresh login fails | Operator re-provisions via admin UI |
| KEK rotated · old enc_key_id stale | Decryption verification fails | Mark old row `invalidated` · refresh against new key |

---

## 10 · Security controls

Inherits from `docs/integrations/hosteltur.md` § 9. Same controls apply:

- T1 + T2 encrypted at rest (AES-256-GCM · independent IV per field)
- Service-role only RLS · `revoke all on … from anon, authenticated`
- No credentials in logs · `lib/security/redact.ts` runs over every audit row
- No credentials in audit detail · only event_kind + source_slug + actor_user_id
- No frontend exposure · no `NEXT_PUBLIC_ALIMARKET_*` variables (impossible by design)
- KEK in env only · never in DB · rotation via `enc_key_id` versioning

---

## 11 · What is NOT in v1 (intentional)

- **No Playwright login.** Phase 2.5b.
- **No paywall body fetch.** Phase 2.5b.
- **No autonomous re-login on `session.expired`.** Phase 4 candidate.
- **No archive backfill.** Sitemap discovery covers fresh items only · the operator can backfill manually via the operator CLI if a particular article needs ingestion.

---

## 12 · Cross-references

- Architecture (T1/T2/T3 credential model · the Option B decision · KEK rotation): `docs/integrations/hosteltur.md` § 3
- Snapshot of current state: `docs/SNAPSHOT_2026_05_12.md` § 4.2
- Migrations: `docs/database/migrations/0009_intelligence_source_sessions.sql` · `docs/database/migrations/0010_intelligence_source_credentials.sql`
- Refresh script: `apps/web/scripts/execute-session-refresh.mjs`
- Live aggregator: `apps/web/src/lib/admin/integrations/live.ts`
- Admin UI: `/user/admin/integrations/alimarket`
- Security controls: `docs/infrastructure/security-audit.md`
- Env vars: `docs/infrastructure/environment-variables.md`
