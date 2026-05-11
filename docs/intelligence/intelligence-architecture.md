# Intelligence Architecture

Technical architecture for the HotelVALORA Hospitality Intelligence Engine.

**Status:** Phase 1 (foundation) — schema applied, pipeline not implemented.
**Last refreshed:** 2026-05-11

---

## 1. System layers

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          Consumer Surfaces (Next.js · Vercel)                    │
│   /library  ·  /report  ·  /map  ·  /intelligence (future)  ·  CRM (future)      │
└──────────────────────────────────────────────────────────────────────────────────┘
                              ▲
                              │  TanStack Query against Supabase
                              │  (anon key, RLS-gated public reads)
                              │
┌──────────────────────────────────────────────────────────────────────────────────┐
│                  Supabase Postgres — Intelligence Tables                        │
│                                                                                  │
│   sources              market_news            hotel_transactions                 │
│   investors            news_entities          hotel_projects                     │
│   operators            news_tags              news_ingestion_runs                │
│                                                                                  │
│   RLS: anon SELECT for showcase; service-role for writes                         │
└──────────────────────────────────────────────────────────────────────────────────┘
                              ▲
                              │  UPSERT via @supabase/supabase-js (service role)
                              │
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   Ingestion Pipeline (Vercel Serverless Function)                │
│                                                                                  │
│   apps/web/src/app/api/cron/hospitality-intel/route.ts  (future Phase 2)         │
│                                                                                  │
│      ┌───────────┐    ┌──────────┐    ┌────────────┐    ┌────────────┐           │
│      │ Fetchers  │ ─► │  Parsers │ ─► │ Normalizer │ ─► │ Categorizer│           │
│      └───────────┘    └──────────┘    └────────────┘    └────────────┘           │
│            │                                                  │                   │
│            ▼                                                  ▼                   │
│     RSS  · Scrape · API                              news_category enum           │
│                                                                                  │
│                                ┌──────────────┐                                  │
│                                │   Deduper    │  ◄── url_hash + content_hash    │
│                                └──────────────┘                                  │
│                                       │                                          │
│                                       ▼                                          │
│                                  UPSERT to DB                                    │
└──────────────────────────────────────────────────────────────────────────────────┘
                              ▲
                              │  HTTP trigger with bearer auth (CRON_SECRET)
                              │
                       ┌──────┴──────┐
                       │ Vercel Cron │     08:48 Europe/Madrid daily
                       └─────────────┘
```

## 2. Component responsibilities

### 2.1 · Vercel Cron
- Single daily firing at **08:48 Europe/Madrid** (`48 7 * * *` UTC during CET, `48 6 * * *` UTC during CEST — see `scheduler-strategy.md` for DST handling)
- Sends HTTP GET to `/api/cron/hospitality-intel` with `Authorization: Bearer ${CRON_SECRET}` header
- Vercel handles retries on 5xx automatically
- Logs visible in Vercel runtime logs panel

### 2.2 · Cron route handler (Phase 2)
File: `apps/web/src/app/api/cron/hospitality-intel/route.ts`

Pseudocode shape:

```ts
import "server-only";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";  // need crypto + DOM parser
export const maxDuration = 60;     // Vercel Hobby cap

export async function GET(request: Request) {
  // 1. Auth
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 2. Fetch enabled sources
  const supabase = getSupabaseAdmin();
  const { data: sources } = await supabase
    .from("sources")
    .select("*")
    .eq("enabled", true);

  // 3. For each source: run ingestion in parallel
  const results = await Promise.allSettled(
    sources!.map((s) => ingestSource(s, supabase))
  );

  return NextResponse.json({
    ok: true,
    sources: results.length,
    success: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  });
}
```

### 2.3 · Fetchers
One implementation per `ingestion_source_kind`:

- **RSS** (`fetchRss`): `fetch(rss_url)` → parse with `fast-xml-parser` (no DOM cost on serverless)
- **Scrape** (`fetchScraped`): `fetch(base_url)` + `cheerio` → apply `scrape_selector` CSS rules from the `sources` row
- **API** (`fetchApi`): `fetch(api_endpoint)` with auth headers from `meta` jsonb

### 2.4 · Parsers
Each fetcher returns a normalised `RawNewsItem[]`:

```ts
interface RawNewsItem {
  title: string;
  summary?: string;
  body?: string;
  url: string;
  published_at?: Date;
  language?: string;
  raw: unknown;  // the original payload — stored in raw_meta jsonb
}
```

### 2.5 · Normaliser
- Canonicalises URLs: strip query params except those in a publisher's allowlist; lowercase scheme + host; remove trailing slashes
- Computes `url_hash = sha256(canonical_url)`
- Computes `content_hash = sha256(title + summary)`
- Detects language via `franc-min` if not provided
- Extracts geography hints from the title/body (Phase 3 entity extraction will deepen this)

### 2.6 · Categoriser
Phase 2: keyword regex first pass:

```
acquisition    ←  "acquires", "buys", "adquiere", "compra"
sale           ←  "sells", "divests", "vende", "desinvierte"
joint_venture  ←  "JV", "joint venture", "partners with"
development    ←  "breaks ground", "to open", "abrirá", "inaugurará"
refinancing    ←  "refinanced", "loan extended", "refinancia"
operator_change←  "rebrand", "to be managed by", "convertido a"
...
```

Phase 4: LLM-based classifier with confidence scoring → writes `enriched_meta.category_confidence`.

### 2.7 · Deduper
The atomic operation is a Postgres `INSERT ... ON CONFLICT (url_hash) DO UPDATE` that:
- On insert: writes the new row, sets `first_seen_at = last_seen_at = now()`, `occurrences = 1`
- On conflict: updates `last_seen_at = now()`, `occurrences = occurrences + 1`, optionally updates `content_hash` + `body` if the publisher revised the article

Content-level "this is a re-publishing of an existing story by a different outlet" detection is deferred to Phase 4 (LLM embeddings + cosine similarity).

## 3. Data flow guarantees

| Guarantee | Mechanism |
|---|---|
| **At-most-once write per URL per day** | `url_hash unique` constraint + `ON CONFLICT DO UPDATE` |
| **All sources attempted even if one fails** | `Promise.allSettled` — one source error doesn't abort the rest |
| **Run audit trail** | Every fetch produces a `news_ingestion_runs` row with counters |
| **No client-side writes** | RLS denies INSERT/UPDATE/DELETE for `anon` + `authenticated` |
| **Public-read transparency** | Showcase visitors can verify the corpus end-to-end |
| **Future AI enrichment doesn't migrate** | `enriched_meta jsonb` accepts arbitrary AI output |

## 4. Failure modes + recovery

| Failure | Symptom | Recovery |
|---|---|---|
| Source publisher down | `news_ingestion_runs.status = 'failed'` + `error_message` populated | Next day's run picks up. If persistent → toggle `sources.enabled = false` |
| Vercel function timeout (>60s) | Cron logs show `FUNCTION_INVOCATION_TIMEOUT` | Phase 2 splits sources into 2 batched cron jobs |
| Schema drift | Insert fails with "column not found" | Apply pending migration, re-run cron manually via `curl` to the cron URL |
| Duplicate URL across sources | Two sources fetch the same URL on the same day | Second write hits `ON CONFLICT`, increments `occurrences`. No duplicate row |
| Resend rate limit (future alerts) | Resend returns 429 | Phase 6 implements exponential backoff in the alerts dispatcher (not in the cron itself) |

## 5. Integration with consumer surfaces

### 5.1 · Library
- `valuations` join: `select v.*, (select count(*) from news_entities ne where ne.entity_kind = 'hotel' and ne.entity_id = v.id) as news_count from valuations v`
- "Latest news" panel per asset: `news_entities` → `market_news` filtered by `entity_id = valuation.id`
- Phase 3 enables fuzzy matching from news titles to valuation rows via `pg_trgm` similarity

### 5.2 · Maps
- Heatmap layer: aggregate `hotel_transactions` rows by `city` + month, colour by `count` or `sum(price_eur)`
- Pipeline pins: `hotel_projects` rows with `estimated_opening > now()` rendered as future-state markers

### 5.3 · Underwriting
- "Recent comps in this market" sidebar reads `hotel_transactions` joined with `news_category in ('acquisition','sale')` and geography matching the valuation under construction
- Distribution shows median + p10/p25/p75/p90 of `price_per_key_eur` and `cap_rate`

### 5.4 · Future intelligence dashboards
- Investor-flow chart: `select investor_id, sum(price_eur), count(*) from hotel_transactions where closed_at > now() - interval '12 months' group by investor_id`
- Operator pipeline: `select operator_id, count(*) from hotel_projects where estimated_opening between now() and now() + interval '24 months'`

### 5.5 · Future alerts
- Subscriptions table (future migration) stores user queries
- Postgres `LISTEN/NOTIFY` or Supabase Realtime broadcasts on `hotel_transactions` insert
- Matching dispatcher checks subscriptions, sends Resend email or in-app notification

## 6. Tech stack rationale

| Choice | Why |
|---|---|
| **Vercel Cron** | Native to our deploy target. Free tier covers our cadence. Integrated logging. UTC-only (DST handled in cron expression) |
| **Vercel Serverless Function (Node runtime)** | Need DOM parsing (cheerio) + crypto. Edge runtime is too restrictive |
| **`fast-xml-parser`** | RSS parsing without DOMParser — works in Node + minimal cold-start cost |
| **`cheerio`** | Server-side jQuery-style HTML traversal. Lower memory than puppeteer for static pages |
| **`@supabase/supabase-js` service role** | Same SDK we already use elsewhere; bypasses RLS for the trusted cron path |
| **Supabase Postgres** | Already our system of record; no new database to operate |
| **`pg_cron` as fallback option** | Supabase-supported; chosen against because Vercel observability is better for the team |

## 7. Cost model

Phase 1 (current): **€0** — schema applied, no traffic.

Phase 2 (active ingestion):
- Vercel: 1 cron firing/day × ~50s avg → ~30 minutes/month → free tier
- Supabase: storage growth ~1MB/day = ~365MB/year → free tier
- Resend (future alerts): existing free tier covers tour-request volume + alert email volume <3k/month
- LLM (Phase 4): 100 articles/day × ~2k tokens summary × $5/M tokens = ~$0.03/day = **~$1/month**

Year-1 total at current cadence: **<€20/month all-in**.

Year-2 with embeddings + alerts: **~€50-150/month** depending on user volume.

## 8. Security posture

- `CRON_SECRET` env var (Vercel) — generated at Phase 2 launch; only the cron route checks it
- Service-role key never leaves the server bundle (`import "server-only"` guard + Vercel function isolation)
- RLS public-read prevents tampering but exposes corpus content (intentional showcase)
- Source URLs are rate-limited (`fetch` with `keepalive: false` + small delay between requests) to respect publisher terms
- User-Agent header set to `HotelVALORA Intelligence Bot (https://www.hotelvalora.com)` for transparency
