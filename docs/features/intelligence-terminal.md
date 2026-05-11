# Feature · Market Intelligence Terminal

The institutional hospitality intelligence dashboard. Lives at `/user/admin/agents/market_intelligence` and renders in place of the standard agent dashboard when that agent slug is visited — the Market Intelligence Agent **is** the terminal.

Strategic context: `docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` · `docs/integrations/hosteltur.md`.

---

## 1 · Mandate

The terminal is **not a generic news feed**. It is the operator-facing surface of HotelVALORA's institutional hospitality intelligence layer — a Bloomberg / MSCI / CoStar-grade terminal that surfaces:

- Daily-refreshed hospitality news, ranked by institutional relevance
- Structured transactions (price · €/key · buyer · seller · advisors)
- Pipeline + development projects (rooms · opening · capex · operator · brand)
- Category distribution across the news_category enum
- Trending investor + operator entities (mention frequency · trend deltas)
- Per-source ingestion health (links into the Integrations directory)
- High-relevance alerts band (critical + high items pulled forward)
- Every article preserves its **original source URL** for institutional traceability and underwriting validation

The terminal does **not** mutate state. Phase 4 candidate: operator actions (mark as read, route to underwriting workspace, create a follow-up task).

---

## 2 · Route + composition

- Route: `/user/admin/agents/market_intelligence`
- File: `apps/web/src/app/user/admin/agents/[agentId]/page.tsx` — when `params.agentId === "market_intelligence"`, renders `IntelligenceTerminal` instead of `AgentDashboard`. Per-agent SSG is preserved (the terminal is pre-rendered like every other agent page).
- Composition file: `apps/web/src/components/admin/intelligence/intelligence-terminal.tsx`

```
IntelligenceTerminal
├── Hero (Madrid coverage window · static Clock)
├── VolumeKpis                     · 6 KPI tiles
├── RelevanceAlertsPanel           · critical + high band
├── SourceCoveragePanel            · per-source matrix linked into /user/admin/integrations
├── Two-column body
│   ├── (left)
│   │    ├── CategoryBreakdown      · horizontal bars by news_category
│   │    └── EntityMentionsPanel    · investors + operators trending
│   └── (right)
│        └── ExtractedDealsPanel    · transactions + projects tables
└── NewsFeedPanel                  · full feed · ordered by relevance
```

---

## 3 · Data layer

Source-of-truth: `apps/web/src/lib/admin/intelligence/`.

Shapes mirror migration `0006_hospitality_intelligence_schema.sql` 1:1 so the Phase 3 realtime swap is mechanical:

| Mock | Real DB |
|---|---|
| `NewsItem` | `public.market_news` (+ joined `news_tags`, `news_entities`) |
| `ExtractedDeal` | `public.hotel_transactions` (joined to `market_news`, `investors`) |
| `ExtractedProject` | `public.hotel_projects` (joined to `market_news`, `operators`) |
| `EntityMentionsRow` | rollup over `news_entities` grouped by `(entity_kind, entity_id, role)` |
| `SourceCoverageRow` | rollup over `news_ingestion_runs` grouped by `source_id` |
| `CategoryBreakdownRow` | rollup over `market_news` grouped by `category` |
| `RelevanceAlert` | `market_news` with derived `relevance_band` (Phase 4 LLM scoring) |
| `VolumeKpi` | aggregates over `market_news` + `hotel_transactions` |

Every component imports from `@/lib/admin/intelligence` only — no direct Supabase access yet. The Phase 3 swap target is a server-side `getTerminalData(): Promise<IntelligenceTerminalData>` that replaces `MOCK_TERMINAL_DATA`.

---

## 4 · Categorization surfaces

The terminal already renders the full `news_category` enum from migration 0006:

```
acquisition · sale · joint_venture · development · refinancing ·
rebranding · operator_change · branded_residences · flex_living ·
pipeline_announcement · distress · investment · other
```

Plus `hotel_segment` (luxury / upper_upscale / upscale / upper_midscale / midscale / economy / lifestyle / resort / boutique / mixed_use / serviced_apartments / unknown) and `brand_affiliation` (branded / soft_brand / independent / unknown).

The actual extraction step that populates these enums is a Phase 4 candidate — today the columns ship and the UI surfaces them. The Market Intelligence Agent fetches RSS and persists raw articles; LLM-assisted classification + entity resolution follows.

---

## 5 · Extracted-deal surface

`ExtractedDealsPanel` renders every field the underwriting pipeline cares about:

- Asset name · geo · rooms
- Price (EUR · formatted as € / €M / €B)
- €/key (formatted as €Xk)
- Cap rate (%)
- Buyer / seller (resolved canonical names via `news_entities`)
- Operator / brand (resolved via operator slug)
- Buy-side + sell-side advisors
- Original source URL (per-row external link, preserved verbatim)
- Notes / one-liner context

Projects panel adds: project name · estimated opening · developer · capex.

---

## 6 · Source-URL preservation contract

**Every news item, deal, project, and alert exposes its original source URL as an `<a target="_blank" rel="noopener noreferrer">`.** The URL is never altered — no UTM injection, no tracking-parameter rewrite, no canonical-collapse. This is institutional-traceability load-bearing:

- An underwriting analyst can click through to the actual article that produced an extracted price.
- A compliance review can verify the corpus against source-of-truth.
- A re-ingestion run can re-fetch the canonical URL without ambiguity.

The contract is enforced at the data layer (`NewsItem.url` is required) and at every component that renders a footer trace link.

---

## 7 · Phase 3 realtime path

The mock layer becomes a Supabase read. Pseudocode:

```ts
// apps/web/src/lib/intelligence/server-read.ts (Phase 3)
export async function getTerminalData(): Promise<IntelligenceTerminalData> {
  const sb = createServiceRoleClient();
  const recentNews = await sb
    .from("market_news")
    .select("*, news_tags(tag), news_entities(entity_kind, entity_id, role, raw_mention, confidence)")
    .gte("published_at", thirtyDaysAgo())
    .order("published_at", { ascending: false })
    .limit(50);
  // ...joins to hotel_transactions / hotel_projects, rollups, alert filter
  return shape(recentNews);
}
```

Components stay unchanged. Server component on the page swaps `MOCK_TERMINAL_DATA` for `await getTerminalData()`.

---

## 8 · Visual contract

Bloomberg-terminal aesthetic, identical to the Executive Control Room:

- Dark `forest-900 → slate-950` canvas for every panel
- `lime-300` for numerals (the terminal's signal colour)
- Tracked-out uppercase `[0.18–0.25em]` micro-labels everywhere
- `font-mono` for timestamps + tickers + structured fields
- `font-headline` for asset names + entity names
- 4-signal tint system (`ok` · `warn` · `error` · `neutral`) reused from `signal-tints.ts`
- Per-category tints (acquisition/sale=ok · refinancing/development=warn · distress=error · rebrand=neutral)

The terminal coexists with the lighter `bg-[#f6f8f7]` page canvas; cards on the terminal are dark, secondary cards (notes, links) are white.

---

## 9 · What is NOT in v1

- **No LLM-assisted classification.** The category + segment enums are extractor-fed; today the mock data demonstrates the shape, Phase 4 introduces actual classification.
- **No realtime subscription.** Phase 3 reads on page request; Phase 4 candidate is a Supabase Realtime subscription that pushes updates.
- **No operator mutation surface.** Mark-as-read · routing-to-underwriting · follow-up tasks are Phase 5.
- **No bookmarking / saved searches.** Phase 5.
- **No multilingual normalization in the UI.** Articles in es/en render as-is. The data pipeline already normalizes for dedup; surface localization is Phase 5.
