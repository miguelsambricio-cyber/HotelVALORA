# Ingestion Pipeline

Design of the daily fetch → parse → normalise → categorise → dedupe → store pipeline.

**Status:** implementation live (apps/web/src/lib/intelligence/) — Phase 2 shipped 2026-05-11.
**Last refreshed:** 2026-05-11

## Two ingestion branches

The Intelligence Engine has TWO parallel ingestion paths feeding the same downstream consumers:

| Branch | Source | Destination | Driver |
|---|---|---|---|
| **A. Automated news** | RSS / scrape / API (10 catalogued sources) | `public.market_news` + `news_tags` + `news_ingestion_runs` | Daily cron `48 7 * * *` UTC at `/api/cron/hospitality-intel` |
| **B. Operator masters** | Manual XLSX/CSV drops in `services/transactions/INPUT_*/` | `MASTER/HOTEL_TRANSACCIONES_MASTER.xlsx` + `MASTER/HOTEL_PROYECTOS_MASTER.xlsx` | Data Ingestion Agent (manual trigger today; cron in Phase 2) |

Sections 1–9 below describe Branch A. Branch B follows the same fetch → parse → normalise → categorise → dedupe → store shape but the storage target is an XLSX workbook with full ingestion-meta. The detailed contract for Branch B lives in `transaction-ingestion-workflow.md` + `data-normalization-rules.md`.

---

## Branch A — Automated news pipeline

---

## 1. Pipeline as a function

```
sources[]  ─►  for each source, in parallel:
                  ┌─────────────────────────────────────────────────────────────┐
                  │  start_run(source_id) → news_ingestion_runs row             │
                  │                                                             │
                  │    1. fetch()    →   raw payload                            │
                  │    2. parse()    →   RawNewsItem[]                          │
                  │    3. normalise()→   NormalisedItem[]                       │
                  │    4. categorise()→  CategorisedItem[]                      │
                  │    5. upsert()   →   counts: { inserted, updated, skipped } │
                  │                                                             │
                  │  finish_run(run_id, status, counts)                         │
                  └─────────────────────────────────────────────────────────────┘
```

Steps 1–5 are pure functions. The only side effects are:
- `start_run` / `finish_run` (audit log writes)
- The final `upsert` (corpus writes)

This is intentional: the pipeline can be unit-tested deterministically by stubbing `fetch` and asserting on `upsert` payloads.

## 2. Step 1 · Fetchers

### 2.1 · RSS fetcher

```ts
async function fetchRss(source: SourceRow): Promise<RawNewsItem[]> {
  const res = await fetch(source.rss_url!, {
    headers: { "User-Agent": "HotelVALORA Intelligence Bot (https://www.hotelvalora.com)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`RSS fetch failed: ${source.slug} ${res.status}`);
  const xml = await res.text();
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  const items = parsed.rss?.channel?.item ?? parsed.feed?.entry ?? [];
  return items.map(itemToRaw);
}
```

### 2.2 · Scrape fetcher

```ts
async function fetchScraped(source: SourceRow): Promise<RawNewsItem[]> {
  const res = await fetch(source.base_url, { headers: USER_AGENT_HEADERS });
  const html = await res.text();
  const $ = cheerio.load(html);
  const sel = source.scrape_selector as ScrapeSelectorConfig;
  return $(sel.itemSelector).map((_, el) => ({
    title: $(el).find(sel.titleSelector).text().trim(),
    summary: $(el).find(sel.summarySelector).text().trim(),
    url: new URL($(el).find(sel.linkSelector).attr("href") ?? "", source.base_url).toString(),
    published_at: sel.dateSelector ? parseDate($(el).find(sel.dateSelector).text()) : undefined,
    raw: { html: $(el).html() },
  })).get();
}
```

`scrape_selector` jsonb shape:

```json
{
  "itemSelector": "article.news-item",
  "titleSelector": "h2.headline a",
  "summarySelector": ".lead",
  "linkSelector": "h2.headline a",
  "dateSelector": "time.published"
}
```

### 2.3 · API fetcher

```ts
async function fetchApi(source: SourceRow): Promise<RawNewsItem[]> {
  const meta = source.meta as { auth?: string; method?: string };
  const res = await fetch(source.api_endpoint!, {
    method: meta.method ?? "GET",
    headers: {
      ...(meta.auth ? { Authorization: meta.auth } : {}),
      ...USER_AGENT_HEADERS,
    },
  });
  if (!res.ok) throw new Error(`API fetch failed: ${source.slug} ${res.status}`);
  const json = await res.json();
  return mapApiResponse(source.slug, json);
}
```

API mapping is per-source — each integration has a known response shape. The `mapApiResponse` dispatcher routes by `source.slug`.

### 2.4 · Manual fetcher

For sources where automation isn't possible, an operator pastes a JSON payload via a (future) admin route. The pipeline accepts the same `RawNewsItem[]` shape and processes identically.

## 3. Step 2 · Parsers

`RawNewsItem` → `NormalisedItem`:

```ts
interface NormalisedItem {
  title: string;
  summary?: string;
  body?: string;
  url: string;
  canonical_url: string;
  url_hash: string;       // sha256(canonical_url)
  content_hash: string;   // sha256(title + summary)
  language: string;
  published_at?: Date;
  raw_meta: unknown;
}

function normalise(raw: RawNewsItem): NormalisedItem {
  const canonical = canonicaliseUrl(raw.url);
  return {
    title: raw.title.trim(),
    summary: raw.summary?.trim(),
    body: raw.body?.trim(),
    url: raw.url,
    canonical_url: canonical,
    url_hash: sha256(canonical),
    content_hash: sha256(`${raw.title.trim()}\n${raw.summary?.trim() ?? ""}`),
    language: raw.language ?? detectLanguage(raw.title),
    published_at: raw.published_at,
    raw_meta: raw.raw,
  };
}
```

## 4. Step 3 · URL canonicalisation

```ts
function canonicaliseUrl(input: string): string {
  const u = new URL(input);
  u.protocol = u.protocol.toLowerCase();
  u.hostname = u.hostname.toLowerCase();
  u.hash = "";
  // strip tracking params
  const drop = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","fbclid","ref","_hsenc","_hsmi"];
  drop.forEach((k) => u.searchParams.delete(k));
  // remove trailing slash from pathname
  if (u.pathname.length > 1 && u.pathname.endsWith("/")) u.pathname = u.pathname.slice(0, -1);
  return u.toString();
}
```

## 5. Step 4 · Categoriser (Phase 2 regex)

```ts
const CATEGORY_RULES: Array<{ category: NewsCategory; patterns: RegExp[] }> = [
  { category: "acquisition", patterns: [/\bacquires?\b/i, /\bbuys?\b/i, /\badquiere\b/i, /\bcompra\b/i] },
  { category: "sale", patterns: [/\bsells?\b/i, /\bdivests?\b/i, /\bvende\b/i, /\bdesinvierte\b/i] },
  { category: "joint_venture", patterns: [/\bjoint venture\b/i, /\bJV\b/, /\bpartners with\b/i] },
  { category: "development", patterns: [/\bbreaks? ground\b/i, /\bto open\b/i, /\babrirá\b/i, /\binaugurará\b/i] },
  { category: "refinancing", patterns: [/\brefinanc/i, /\bloan extended\b/i] },
  { category: "rebranding", patterns: [/\brebrand/i, /\bto be managed by\b/i, /\bconvertido a\b/i] },
  { category: "operator_change", patterns: [/\boperator change\b/i, /\bnew manager\b/i] },
  { category: "branded_residences", patterns: [/\bbranded residence/i, /\bresidencias de marca\b/i] },
  { category: "flex_living", patterns: [/\bflex.?living\b/i, /\bserviced apartment/i, /\bco.?living\b/i] },
  { category: "distress", patterns: [/\bdistress/i, /\binsolven/i, /\bbankrupt/i, /\bdefault/i] },
];

function categorise(item: NormalisedItem): NewsCategory {
  const text = `${item.title} ${item.summary ?? ""}`;
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.category;
  }
  return "other";
}
```

Phase 4 replaces this with an LLM call that writes both the category AND a confidence into `enriched_meta`.

## 6. Step 5 · UPSERT

```ts
async function upsertItem(supabase: SupabaseClient, source: SourceRow, item: NormalisedItem & { category: NewsCategory }) {
  const { error, data } = await supabase
    .from("market_news")
    .upsert(
      {
        source_id: source.id,
        title: item.title,
        summary: item.summary,
        body: item.body,
        url: item.url,
        canonical_url: item.canonical_url,
        url_hash: item.url_hash,
        content_hash: item.content_hash,
        category: item.category,
        language: item.language,
        published_at: item.published_at?.toISOString(),
        raw_meta: item.raw_meta as Json,
        last_seen_at: new Date().toISOString(),
        // first_seen_at is NOT touched on conflict — Postgres default kicks in only on insert
      },
      {
        onConflict: "url_hash",
        ignoreDuplicates: false, // we WANT the update path
      }
    )
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data;
}
```

Postgres handles the conflict with an UPDATE — Supabase's upsert builder maps to `INSERT ... ON CONFLICT (url_hash) DO UPDATE SET ...`. The `last_seen_at` bump happens on both insert and update; `occurrences` increment requires a SQL function (Phase 2 will add a `bump_news_occurrence(...)` RPC or use a raw SQL upsert).

## 7. Failure handling

```ts
async function ingestSource(source: SourceRow, supabase: SupabaseClient) {
  const run = await supabase
    .from("news_ingestion_runs")
    .insert({ source_id: source.id, status: "running" })
    .select("id")
    .single();

  try {
    const raw = await fetchForSource(source);
    const normalised = raw.map(normalise);
    const categorised = normalised.map((n) => ({ ...n, category: categorise(n) }));

    let inserted = 0, updated = 0, skipped = 0;
    for (const item of categorised) {
      const result = await upsertItem(supabase, source, item);
      if (result?.id) inserted++;
      // skipped/updated counting requires per-row pre-check or a returning clause — Phase 2
    }

    await supabase
      .from("news_ingestion_runs")
      .update({
        run_completed_at: new Date().toISOString(),
        status: "success",
        items_seen: raw.length,
        items_inserted: inserted,
        items_updated: updated,
        items_skipped: skipped,
      })
      .eq("id", run.data!.id);
  } catch (err) {
    await supabase
      .from("news_ingestion_runs")
      .update({
        run_completed_at: new Date().toISOString(),
        status: "failed",
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq("id", run.data!.id);
    throw err; // propagate so Promise.allSettled tracks it
  }
}
```

## 8. Rate limiting + politeness

- One concurrent request per host (publishers don't like burst traffic from a single IP)
- 250ms delay between requests to the same host
- `User-Agent` header identifies us transparently
- Respect `robots.txt` for scrape sources (Phase 2 wire-up — `cheerio` doesn't enforce this automatically)
- Cache-Control: never cache aggressively; we want fresh data

## 9. Anti-duplication logic — full picture

Three layers of dedup:

### Layer 1 · Per-URL (atomic)
`market_news.url_hash` unique constraint. Same URL = same row, always.

### Layer 2 · Per-content (detect republished stories)
Phase 4: when two different URLs produce highly similar `content_hash` OR high embedding similarity, link them via a `news_clusters` table (future migration). The user-facing "this is the same story across 3 outlets" UI reads the cluster.

### Layer 3 · Per-transaction (collapse multiple stories about same deal)
Phase 4: when 5 outlets report "Blackstone buys Hyatt portfolio for €2B", we want ONE `hotel_transactions` row with 5 linked `news_id` references. Implemented as an entity-resolution pass that runs after raw ingestion.

## 10. What Phase 2 must deliver

| Deliverable | File |
|---|---|
| Cron route handler | `apps/web/src/app/api/cron/hospitality-intel/route.ts` |
| Cron config in vercel.json | `apps/web/vercel.json` (cron array entry) |
| `CRON_SECRET` env var | Vercel production env |
| Fetchers (rss / scrape / api) | `apps/web/src/lib/intelligence/fetchers.ts` |
| Normaliser + canonicaliser | `apps/web/src/lib/intelligence/normalise.ts` |
| Categoriser regex rules | `apps/web/src/lib/intelligence/categorise.ts` |
| Source-by-source ingest | `apps/web/src/lib/intelligence/ingest.ts` |
| Tests (unit + integration) | `apps/web/src/lib/intelligence/__tests__/` |
| Optional: `bump_news_occurrence` RPC | new migration after observing real upsert patterns |

Phase 2 is sequenced so the cron is the LAST thing wired. Until tests pass against fixture data + a local Supabase branch, the cron route exists but rejects requests with a "Not yet active" 503.
