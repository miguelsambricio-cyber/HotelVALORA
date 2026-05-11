# HOTELVALORA · Hospitality Intelligence — Master System

> **This is NOT a side feature. This is the core strategic intelligence layer of the HotelVALORA platform.**
>
> Future engineers and AI agents reading this should understand: the Intelligence Engine is the dataset advantage that compounds every other capability — Underwriting, Library, Maps, CRM, Alerts. Building it right early is what separates an institutional-grade product from a frontend demo.

**Last refreshed:** 2026-05-11
**Phase status:** 🟢 Phase 1 (foundation) live — schema applied, sources seeded, pipeline architecture documented. Ingestion code lands in Phase 2.

---

## 1. Mission

Build a continuous, deduplicated, institutional-quality hospitality intelligence corpus that is the **canonical source of market truth** for every decision surface in HotelVALORA.

The corpus tracks:

- Hotel acquisitions, sales, joint ventures
- Hotel developments, openings, refurbishments
- Operator changes, rebrandings, soft-brand conversions
- Refinancing, distress, debt restructuring
- Hospitality investments by institutional capital (PE, REITs, sovereigns, family offices)
- Branded residences
- Flex-living / serviced apartment projects
- Pipeline activity (announcements, planning permissions, breakings ground)

Every event is normalised, geo-tagged, source-traced, and dedupe-checked against URL + content hashes. The same story published by Hosteltur, Reuters, and HospitalityNet collapses to **one canonical record** with three source references.

## 2. Why this is core, not optional

HotelVALORA is an institutional hotel underwriting platform. The product's competitive moat is not the UI — it is the **dataset density per asset**. Three concrete reasons the intelligence engine is strategic, not optional:

### 2.1 · Underwriting is only as good as its comparables

A 5-star Madrid asset valuation needs 8-15 recent Madrid comp transactions to defend. CoStar and STR sell those comps for €30k-150k/year per seat. **A self-built intelligence engine that aggregates open-source transaction reporting + RSS + scraping costs ~€0 marginal once running**, and produces a comparable (and in some markets superior) dataset for European hotel assets.

### 2.2 · Deal sourcing is built on knowing pipeline first

The best hospitality deals close before they hit broker books. Operators, developers, family offices and PE funds telegraph intent in interviews, conference appearances, planning permissions, JV announcements. A daily corpus of every such announcement = a deal-sourcing radar that competitors using only Reuters/Bloomberg miss.

### 2.3 · Institutional clients expect a "Bloomberg of hospitality"

When a partner at a €5B real-estate fund opens HotelVALORA, they expect to see "what just sold, where, at what cap, who bought, who sold, who's next" — the equivalent of a Bloomberg terminal for hotel deals. Without the intelligence layer, the platform is just a calculator with a beautiful UI. With it, the calculator becomes the **decision surface for a fund that already trusts the data**.

## 3. Position in the platform

```
                ┌────────────────────────────────────────────────────────────────────┐
                │           HotelVALORA Frontend (Vercel · Next.js · Supabase)       │
                └────────────────────────────────────────────────────────────────────┘
                       ▲              ▲              ▲              ▲              ▲
                       │ Library      │ Maps         │ Underwriting │ CRM (future) │ Alerts
                       │              │              │              │              │  (future)
                ┌──────┴──────────────┴──────────────┴──────────────┴──────────────┴──────┐
                │                                                                          │
                │            🧠  HOSPITALITY INTELLIGENCE LAYER (Supabase)                │
                │                                                                          │
                │   market_news        hotel_transactions       hotel_projects             │
                │   investors          operators                sources                    │
                │   news_entities      news_tags                news_ingestion_runs        │
                │                                                                          │
                └──────────────────────────────────────────────────────────────────────────┘
                       ▲
                       │  ingest
                       │
                ┌──────┴──────────────────────────────────────────────────────────────────┐
                │                  Daily Ingestion Pipeline                              │
                │                                                                         │
                │      RSS feeds    ──►  Parser  ──►  Normalizer  ──►  Categorizer  ──┐  │
                │      Scrapers     ──►  Parser  ──►  Normalizer  ──►  Categorizer  ──┤  │
                │      APIs         ──►  Parser  ──►  Normalizer  ──►  Categorizer  ──┤  │
                │                                                                      │  │
                │                                                              Deduper ┘  │
                │                                                                 │       │
                │                                                                 ▼       │
                │                                                            UPSERT       │
                │                                                                         │
                └─────────────────────────────────────────────────────────────────────────┘
                       ▲
                       │  schedule
                       │  08:48 Europe/Madrid daily (Vercel Cron)
                ┌──────┴──────────┐
                │   Vercel Cron   │
                └─────────────────┘
```

Every consumer surface reads from the same canonical tables. Adding a new surface (e.g. a Skift-style trend dashboard) is a new query, not a new pipeline.

## 4. Strategic value across the product

| Surface | What the intelligence engine unlocks |
|---|---|
| **Library** | Each `valuations` row gains a "Latest news" panel auto-populated from `news_entities` join. Anonymous showcase visitors see real-time market context per asset. |
| **Maps** | City- and submarket-level transaction density layers — colour-coded by deal volume. Pipeline projects show as future-state pins. |
| **Underwriting** | Comparable transactions auto-fetched per geography + segment, with cap rate / price-per-key distributions feeding sensitivity bands. |
| **Market dashboards** | "What moved this week in Madrid hotels" + investor-flow charts ("Blackstone has bought €1.2B of EU hospitality in the last 12 months"). |
| **CRM (future)** | Auto-enriched investor + operator dossiers — every contact in CRM has a live news ticker scoped to their company. |
| **Alerts (future)** | Per-user / per-org subscription engine: "Notify me when any luxury asset >€100M trades in Madrid Centro." Triggered by inserts on `hotel_transactions`. |
| **AI Daily Brief (future)** | LLM-generated 5-bullet morning briefing from the previous 24h `market_news` rows, tier-gated by subscription. |

## 5. Operating philosophy

Six principles guide every architectural decision:

### 5.1 · Once per day, never more

The cron fires at **08:48 Europe/Madrid**. Single firing per source per day. Rationale:
- Avoids duplicate ingestion and infrastructure waste
- Reduces probability of re-publishing the same story under different URLs
- Matches the cadence of upstream publishers (hotel news rarely breaks intraday like equities)
- Stays well within Vercel Hobby cron limits (1 cron, daily)
- Predictable for ops + monitoring

### 5.2 · Idempotent by design

Every fetched URL is hashed (`url_hash = sha256(canonical_url)`). The `market_news` table has a `unique` constraint on `url_hash`. Re-ingesting the same URL increments `occurrences` and updates `last_seen_at` — never inserts a duplicate row. Content hashes (`content_hash`) detect when a publisher updates the article body.

### 5.3 · Public-read by default

Market intelligence is part of the institutional showcase. RLS public-read on `market_news`, `hotel_transactions`, `hotel_projects`, `investors`, `operators`, `sources`. Anonymous visitors can browse the corpus without auth — consistent with the Public Beta posture across the rest of the platform.

### 5.4 · Service-role writes only

The cron function runs with service-role credentials. No client-side write paths exist. RLS denies all writes from `anon` / `authenticated` roles. This keeps the corpus tamper-proof and lets us trust every row's provenance.

### 5.5 · Future-proof shapes

Two `jsonb` columns per primary table (`raw_meta` + `enriched_meta`):
- `raw_meta`: untouched fields from the source (RSS metadata, scraped HTML attrs, API response payload)
- `enriched_meta`: future AI enrichment — embeddings, sentiment, extracted entities, opportunity scores

Adding a new AI capability never requires a schema migration — just write to `enriched_meta`.

### 5.6 · Source reliability is a first-class field

`sources.reliability_score` (0–1). Reuters at 0.95, Hosteltur at 0.85, boutique blog at 0.50. Used by:
- Tie-breaking when two sources disagree on a transaction price
- Tier-gating: free users see news from sources ≥ 0.80, premium sees everything
- Confidence weighting in future opportunity scoring

## 6. Long-term product vision

### Phase 1 (this commit · live 2026-05-11) — Foundation
- Schema applied to Supabase (9 tables + 5 enums + RLS + 10 seeded sources)
- Strategic + technical documentation
- Scheduler strategy decided (Vercel Cron at 08:48 Europe/Madrid)
- **No ingestion code yet** — pipeline is documented, not running

### Phase 2 — Pipeline implementation
- Cron route handler at `apps/web/src/app/api/cron/hospitality-intel/route.ts`
- RSS parser (the 7 RSS-enabled sources)
- HTML scraper (Alimarket, THP) with respectful rate limiting
- Categoriser: keyword regex first pass (acquisitions, JVs, etc.)
- Deduplication logic (canonical URL + content hash)
- First read into `market_news` table, validated against the existing demo seed valuations

### Phase 3 — Entity extraction + tagging
- Entity recognition: investor + operator names from a curated registry
- Geographic enrichment: city → market → submarket lookup
- Hotel-asset linking: news ↔ `public.valuations` via fuzzy matching
- Free-form `news_tags` from a controlled vocabulary

### Phase 4 — AI summaries + opportunity scoring
- LLM (OpenAI/Anthropic via Vercel AI Gateway) generates `enriched_meta.summary_es` + `summary_en`
- Embeddings for similarity search ("show me deals like this one")
- Opportunity score: composite of buyer activity, market hotness, source reliability, our institutional thesis
- Daily AI brief generation — written to a `news_briefs` table (future migration)

### Phase 5 — Investor/operator dossier surfaces
- `/intelligence/investor/[slug]` route — every investor's deal history + live news feed
- `/intelligence/operator/[slug]` route — operator-level brand portfolio + pipeline
- AppHeader nav adds **"Intelligence"** entry
- Library cross-link: each report shows "View dossier for [Owner]"

### Phase 6 — CRM + alerts + monetisation
- CRM contact enrichment: every contact's company linked to investor/operator entities
- Alerts engine: user-defined queries triggered on `hotel_transactions` inserts → email via Resend
- Monetisation:
  - Tier gating: free sees last-30-days; pro sees last-12-months; premium sees full corpus + alerts
  - API access for partners (institutional terms)
  - Co-branded daily briefs for partner funds

## 7. Operational workflow

Daily timeline (Europe/Madrid):

```
08:48  ──  Vercel Cron fires hospitality-intel route handler
           │
08:48-49 ──  For each enabled source in `sources` table:
           │   - new `news_ingestion_runs` row (status: running)
           │   - fetch RSS / scrape HTML / call API
           │   - parse items
           │   - canonicalise URLs (strip tracking params, normalise host)
           │   - compute url_hash + content_hash
           │   - UPSERT into market_news on conflict (url_hash) → bump occurrences
           │   - categorise via keyword regex → news_category enum
           │   - update run row (status: success, items_*: counters)
           │
08:55-ish ──  All sources complete. Aggregate run summary logged.
           │
09:00  ──  (Future Phase 4) AI batch: summarise rows where enriched_meta is null
           │
Throughout the day:
           ──  Frontend reads market_news / hotel_transactions / hotel_projects
           ──  No re-ingestion until 08:48 tomorrow
```

## 8. Scalability vision

### Today (Phase 1) — single Vercel function, daily firing
Vercel Hobby plan: serverless function with 60s execution cap. 10 sources × ~5s each = 50s well within budget. Storage cost: marginal (jsonb columns are compact, indexes are normal-sized).

### Year 1 — 50 sources, dozens of consumer surfaces
- Move cron from "1 daily" to "1 daily per region cluster" if needed (4 cron jobs on Vercel Pro)
- Sources past 50: split into batched workers (`sources.batch_id` column)
- Storage: still small (corpus ~1M rows = ~5GB jsonb)

### Year 2 — multi-tenant, multi-market, AI-curated
- Embeddings vector store: pgvector extension in Supabase (already supported, just enable)
- Real-time push: Supabase Realtime broadcasts on `market_news` insert → frontend live ticker
- Per-org custom sources: tenants can add their own RSS feeds, kept in their org-scoped `sources` row

### Year 3 — institutional API + partner monetisation
- Read-only API: `GET /api/v1/intelligence/transactions?country=ES&from=...` — partners pay per API key
- Webhook endpoints: partners receive POSTs when matching transactions land
- Migrate write path to Supabase Edge Functions if function duration becomes a constraint

## 9. Maintenance strategy

| Task | Cadence | Owner |
|---|---|---|
| Add a new source | On demand | Engineer — single `insert into public.sources` |
| Disable a flaky source | On demand | Engineer — `update public.sources set enabled = false` |
| Rotate Resend / OAuth keys | Quarterly | Operator |
| Review reliability scores | Quarterly | Operator + Engineer |
| Prune ingestion runs > 90 days | Automated (cron) | Engineer adds a Phase 2 sweep |
| Re-run dedup over corpus | On demand | Engineer — service-role one-off SQL |
| Snapshot for analytics | Weekly | Future — Vercel Edge Config or partner data warehouse |

## 10. Future monetisation possibilities

Pre-product-market-fit thesis — to be validated, not committed to:

- **Tier-gated access** to historical corpus: free (30 days), pro (12 months), premium (full)
- **API access for partner funds** at €5k–25k/month
- **Co-branded daily briefs** for partner funds, distributed under their brand
- **Sponsored visibility** in the corpus (clearly marked) for operators wanting deal-flow visibility
- **Custom corpus segments** for asset managers tracking specific submarkets — €500–2k/month per segment subscription

## 11. Why this document exists

Future Claude sessions, future engineers, and future investors should be able to read this single document and understand:

1. **The strategic importance** — section 2
2. **The architectural philosophy** — sections 5 + 8
3. **The operational goals** — sections 3 + 7
4. **The long-term roadmap** — section 6
5. **The relationship with the overall platform** — section 4

If you are an engineer joining the project, your reading order should be:

1. This file (strategic context)
2. [`intelligence-architecture.md`](./intelligence-architecture.md) (system design)
3. [`news-data-schema.md`](./news-data-schema.md) (schema reference)
4. [`ingestion-pipeline.md`](./ingestion-pipeline.md) (pipeline mechanics)
5. [`scheduler-strategy.md`](./scheduler-strategy.md) (cron decision)
6. [`hospitality-intelligence-roadmap.md`](./hospitality-intelligence-roadmap.md) (phased plan)

After that, the migration at `docs/database/migrations/0006_hospitality_intelligence_schema.sql` is the source of truth for the schema.

---

**Cross-references:**

| Topic | Doc |
|---|---|
| Platform-wide system overview | [`docs/HOTELVALORA_MASTER_SYSTEM.md`](../HOTELVALORA_MASTER_SYSTEM.md) |
| Tech stack inventory | [`docs/infrastructure/HOTELVALORA_TECH_STACK_MASTER.md`](../infrastructure/HOTELVALORA_TECH_STACK_MASTER.md) |
| Database schema (full) | [`docs/database/README.md`](../database/README.md) |
| Library surface | [`docs/features/library.md`](../features/library.md) |
| Auth runtime | [`docs/auth.md`](../auth.md) |
| Resend email integration | [`docs/integrations/resend.md`](../integrations/resend.md) |
