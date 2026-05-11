# Hospitality Intelligence — Roadmap

Phased delivery plan for the HotelVALORA Hospitality Intelligence Engine.

**Last refreshed:** 2026-05-11
**Current phase:** 🟢 **Phase 1** complete · 🟡 **Phase 2 partial — pipeline shipped, awaiting first cron firing**

---

## Phase 1 — Foundation (✅ done · 2026-05-11)

**Goal**: schema + strategic documentation + scheduler strategy. No ingestion code.

| Deliverable | Status | Location |
|---|---|---|
| Schema migration applied to Supabase | ✅ | `docs/database/migrations/0006_hospitality_intelligence_schema.sql` |
| 10 sources seeded | ✅ | `public.sources` |
| Strategic master document | ✅ | `docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` |
| Technical architecture | ✅ | `docs/intelligence/intelligence-architecture.md` |
| Schema reference | ✅ | `docs/intelligence/news-data-schema.md` |
| Pipeline design | ✅ | `docs/intelligence/ingestion-pipeline.md` |
| Scheduler decision | ✅ | `docs/intelligence/scheduler-strategy.md` |
| Trackers updated | ✅ | `HOTELVALORA_TECH_STACK_MASTER.md` · `INFRASTRUCTURE_MASTER_TRACKER.md` |

**Validates:**
- DB tables compile + RLS posture matches the rest of the platform
- 10 seeded sources cover ES + EU + GLOBAL with reliability scores
- Public-read access ready for the eventual showcase surface

## Phase 2 — Pipeline implementation (🟡 partial — code shipped 2026-05-11)

**Goal**: live daily ingestion. 10 sources fetched, normalised, deduped, written to `market_news`. Categorisation via regex first pass.

| Deliverable | Status |
|---|---|
| Cron route handler `apps/web/src/app/api/cron/hospitality-intel/route.ts` | ✅ |
| `vercel.json` cron entry (`48 7 * * *`) at `apps/web/vercel.json` | ✅ |
| Fetchers (RSS / scrape / API) at `apps/web/src/lib/intelligence/fetchers.ts` | ✅ RSS live · scrape + api stubbed |
| Normaliser + canonicaliser at `apps/web/src/lib/intelligence/normalise.ts` | ✅ |
| Regex categoriser at `apps/web/src/lib/intelligence/categorise.ts` | ✅ |
| Ingest orchestrator at `apps/web/src/lib/intelligence/ingest.ts` | ✅ |
| Unit tests for normaliser + categoriser | ☐ (deferred — see Phase 2.1 follow-up) |
| Integration test against fixture RSS payloads | ☐ (deferred) |
| Cron first firing verified — `news_ingestion_runs` populated, `market_news` rows landing | ☐ awaiting first deploy cron tick |
| `/dev/intelligence-test` probe page (mirror of `/dev/supabase-test`) | ✅ |

**Exit criteria:**
- 7 consecutive days of all-source `status=success` runs
- Corpus shows ≥10 new `market_news` rows per day on average
- Zero `news_ingestion_runs.status=failed` for any source we mean to keep enabled
- Anonymous visitor can `select * from market_news limit 10` and see real data

## Phase 3 — Entity extraction + tagging

**Goal**: link each `market_news` row to investors, operators, hotels, markets — and tag it.

| Deliverable | Status |
|---|---|
| Curated investor registry seeded (~50 institutional players) | ☐ |
| Curated operator registry seeded (~50 brands + chains) | ☐ |
| Fuzzy-match investor/operator names in news titles | ☐ |
| Geographic enricher: city → market → submarket lookup | ☐ |
| News ↔ existing `public.valuations` matcher (pg_trgm similarity) | ☐ |
| Controlled vocabulary for `news_tags` | ☐ |
| `news_entities.confidence` populated per match | ☐ |

**Exit criteria:**
- ≥80% of news rows have at least one `news_entities` row
- ≥60% have a geography tag at city-level
- Sample manual audit: 20 random rows, ≥17 have correct entity assignments

## Phase 4 — AI summaries + opportunity scoring

**Goal**: enrichment that turns raw articles into institutional-grade structured intel.

| Deliverable | Status |
|---|---|
| LLM provider wired (OpenAI or Anthropic via Vercel AI Gateway) | ☐ |
| AI summariser: writes `enriched_meta.summary_en` + `summary_es` | ☐ |
| LLM-based categoriser with confidence (replaces regex first pass) | ☐ |
| Embeddings stored in `pgvector` column on `market_news` | ☐ |
| Sentiment + opportunity score in `enriched_meta` | ☐ |
| Cluster detection: same story across multiple outlets → `news_clusters` table | ☐ |
| Daily AI brief generation → `news_briefs` table + email distribution | ☐ |

**Exit criteria:**
- Manual review of 50 AI summaries: ≥90% factually accurate, ≥80% rate as "useful for an institutional analyst"
- Daily brief sent successfully for 7 consecutive days
- Search by similarity ("find deals like this one") returns sensible neighbours

## Phase 5 — Investor / operator dossier surfaces

**Goal**: client-facing intelligence pages.

| Deliverable | Status |
|---|---|
| `/intelligence` index — global feed + filters | ☐ |
| `/intelligence/investor/[slug]` dossier | ☐ |
| `/intelligence/operator/[slug]` dossier | ☐ |
| `/intelligence/market/[country]/[city]` market dashboard | ☐ |
| Library cross-link: `valuations` show "Open dossier for [owner]" | ☐ |
| Map overlay: transaction density heatmap | ☐ |
| AppHeader nav adds "Intelligence" | ☐ |

**Exit criteria:**
- An institutional partner can navigate from any Library report → operator dossier → recent deals
- Map surface shows distinct transaction density per submarket
- Page load < 1.5s on the 4 surfaces above

## Phase 6 — CRM + alerts + monetisation

**Goal**: subscription engine + B2B monetisation paths.

| Deliverable | Status |
|---|---|
| Alerts subscription table + UI | ☐ |
| Alert dispatcher triggered on `hotel_transactions` insert via Supabase Realtime | ☐ |
| Email delivery via Resend (existing integration) | ☐ |
| Tier gating: free (30d) / pro (12m) / premium (full corpus + alerts) | ☐ |
| Read-only intelligence API: `/api/v1/intelligence/...` | ☐ |
| Partner webhook dispatcher | ☐ |
| Co-branded daily brief generator | ☐ |
| Stripe billing integration | ☐ |

**Exit criteria:**
- 1 paying partner subscribed at €5k+/month
- Free → pro conversion path measured + working
- Alert latency < 5 min from insert to delivery

---

## Phase ownership matrix

| Phase | Engineering | Ops | Product | AI |
|---|---|---|---|---|
| 1 | ✅ |  |  |  |
| 2 | primary |  | review categories |  |
| 3 | primary |  | curate registries |  |
| 4 | primary |  | review summaries | primary |
| 5 | primary |  | design surfaces |  |
| 6 | primary | billing/legal | tier design |  |

## Cross-phase concerns

| Concern | Phase 2 | Phase 4 | Phase 6 |
|---|---|---|---|
| Storage growth | <1MB/day | +embeddings ~5MB/day | +briefs ~10MB/day |
| LLM cost | €0 | ~$1/month | ~$10-50/month |
| Vercel function time | ~30s | ~50s | sub-second (read paths) |
| Resend volume | 0 | 30 briefs/month if internal | 1k-10k alerts/month at scale |
| pgvector dependency | no | YES (enable extension) | YES |
| Stripe dependency | no | no | YES |

## Anti-goals (explicitly NOT building yet)

- ❌ Generative AI agents that "do work" (decide deals, write contracts, etc.)
- ❌ Public read API for non-authenticated users (corpus IS public-read in DB, but no API route exposes it directly until rate-limiting + tier gating exist)
- ❌ Live transcription / video parsing of conference recordings
- ❌ Social-media sentiment (Twitter/LinkedIn) ingestion
- ❌ Distressed-asset early-warning ML model
- ❌ Operator forecasting from pipeline data

These are explicitly out of scope. When a future phase needs them, they get their own phase + roadmap entry.

## When to declare "done"

The Intelligence Engine is **never done** — it's a living dataset. But each phase has a clean exit criterion that, when met, declares the phase shipped and the next phase active.

Phase 1 exit: this document published + schema applied + trackers updated. **Today, 2026-05-11. ✅**
