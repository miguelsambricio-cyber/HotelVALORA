# Phase D-8 — Hotel-Website Fallback Architecture v1 + T2 ROI Analysis

**Workstream:** `feature/hotel-enrichment-pipeline`
**Status:** **DESIGN ONLY** — NO scraping execution authorized. Operator approval required per-domain before live mode.
**Allowlist (initial 7 chains):** Marriott · Hilton · Meliá · NH · Hyatt · IHG · Accor.
**Targets:** `total_rooms`, `year_opened`, `meeting_rooms_count`, `meeting_space_sqm`.
**Constraints:** robots/ToS aware · lightweight scraping · persistent cache · minimal retries · conservative rate limit.

---

## 1 · TL;DR — ROI surface (read this first)

| Scenario | T2 passing rate | Hotels reaching ≥16/19 | Gap to 70% goal |
|---|---|---|---|
| **Current state (post D-7)** | 0 % | 0 / 224 | −70 pp |
| **S1 — D-8 only (7 chains)** | 0 % | 0 / 224 | −70 pp |
| **S2 — PostGIS markets only** | 0 % | 0 / 224 | −70 pp |
| **S3 — D-8 + PostGIS combined** | ~18 % | ~41 / 224 | −52 pp |
| **S4 — S3 + expanded allowlist (+Hotusa/Catalonia/Vincci/ILUNION)** | ~29 % | ~66 / 224 | −41 pp |
| **S5 — S4 + T2 threshold lowered to 13/19** | ~50 % | ~111 / 224 | −20 pp |

**Hard conclusion:** the 70 % goal is **mathematically unreachable for the Madrid 224 corpus as currently scoped** — 113 indie hotels (50.4 %) structurally lack `brand_family` + `operator_id` and 56 branded hotels are outside the 7-chain allowlist. Even with D-8 + PostGIS + allowlist expansion, ceiling is ~49 % unless either:

1. **T2 spec is revised** (e.g. lower threshold from 16/19 to 13/19; or drop `market_id`/`submarket_id` mandate for indies), OR
2. **The institutional cohort is redefined** to exclude pure indies (focus the 80 % goal on branded hotels only, where uplift is realistic).

This is the most important finding of Phase D. Section 8 expands the math; the rest of the doc is the D-8 design assuming we proceed.

---

## 2 · Allowlist coverage map (Madrid 224)

| Chain | # in Madrid | Avg hotels passing post-D-8 (75 % field reliability × ≥2 of 4 targets ≥ 0.7) |
|---|---|---|
| Marriott International | 13 | ~10 |
| Meliá Hotels International | 11 | ~9 |
| NH Hotel Group | 10 | ~8 |
| InterContinental Hotels Group | 6 | ~5 |
| Vincci Hotels (NOT in initial allowlist) | 6 | — |
| Accor | 5 | ~4 |
| Hilton | 5 | ~4 |
| Hyatt | 5 | ~4 |
| ILUNION (NOT in initial allowlist) | 4 | — |
| Hotusa (NOT in initial allowlist — Eurostars/Petit Palace = 14 hotels) | 16 | — |
| Catalonia (NOT in initial allowlist) | 7 | — |
| Palladium | 3 | — |
| Barceló | 3 | — |
| Sercotel | 2 | — |
| Radisson | 2 | — |
| Pestana | 2 | — |
| Other 1-property chains | 11 | — |
| **No brand_family (indie)** | **113** | **0 (not reachable via D-8)** |

**Allowlist hits 7 / 17 chains.** Misses Hotusa (16 hotels), Catalonia (7), Vincci (6), ILUNION (4) — total **33 additional branded hotels** that could be added in a Phase 2 allowlist expansion if extraction quality is proven on the initial 7.

---

## 3 · Architecture overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Fallback Dispatcher (existing, M6)                                       │
│  ──────────────────────────────────────────────────────────────────────  │
│  Identifies hotels with missing TIER-2 fields →                          │
│  routes year_opened / MICE / total_rooms → "hotel_website" provider      │
└────────────────────┬─────────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────────────────────┐
│  hotel-website provider (M6, scaffolded · live currently throws)         │
│  ──────────────────────────────────────────────────────────────────────  │
│   1. Domain Authoriser     (allowlist check; deny by default)             │
│   2. Robots.txt Compliance (cache 24h per domain; respect Crawl-delay)    │
│   3. Per-Domain Rate Limiter (4–8 s jitter above Crawl-delay)             │
│   4. Persistent Fetch Cache (ETag/Last-Modified · 90-day TTL)             │
│   5. Domain Adapter Dispatch (routes URL → chain-specific extractor)     │
│   6. Extractor                                                            │
│      ├ Adapter (per-chain): URL discovery + DOM/regex/JSON-LD parser     │
│      └ Generic fallback: meta-tag + JSON-LD harvest                       │
│   7. Confidence scorer (tier × extraction-method × validation)            │
│   8. ProvenanceEntry emitter (one per (hotel, field, source))            │
└──────────────────────────────────────────────────────────────────────────┘
```

Existing scaffold at `apps/web/src/lib/enrichment/providers/hotel-website/` (~480 LOC, M6) covers steps 1–3 + 8. Steps 4–7 are the D-8 build.

---

## 4 · Domain adapters (per-chain extraction strategy)

Each adapter is a small TypeScript module exporting:

```ts
export interface DomainAdapter {
  matches(url: URL): boolean;
  discoverHotelUrl(args: { hotelName: string; brand: string; city: string }): Promise<string | null>;
  extractFields(html: string, baseUrl: string): {
    total_rooms?: { value: number; method: ExtractionMethod };
    year_opened?: { value: number; method: ExtractionMethod };
    meeting_rooms_count?: { value: number; method: ExtractionMethod };
    meeting_space_sqm?: { value: number; method: ExtractionMethod };
  };
}
```

### 4.1 Per-chain adapter specs

| Chain | Domain | Hotel-page URL pattern | Primary extraction methods | Expected reliability per target |
|---|---|---|---|---|
| **Marriott** | `marriott.com` | `/hotels/<code>-<slug>/` + `/hotels/.../overview/` + `/hotels/.../meetings/` | JSON-LD `Hotel` schema · meeting-room `hd:floor-plan` table parse | rooms ~85% · year ~50% · MICE ~70% |
| **Hilton** | `hilton.com` | `/en/hotels/<code>-<slug>/` + `/meetings/` | JSON-LD + `data-osc-product` attr · "About this hotel" text-regex for year | rooms ~80% · year ~45% · MICE ~65% |
| **Meliá** | `melia.com` | `/<locale>/hotels/<country>/<city>/<slug>` + `/meetings-events` | OpenGraph + `application/ld+json` · `<dl class="meeting-room">` parse | rooms ~70% · year ~35% · MICE ~55% |
| **NH** | `nh-hotels.com` | `/<locale>/hotel/<slug>` + `/meetings-and-events/` | JSON-LD · meta `og:description` (rooms count) · meeting table CSS selectors | rooms ~75% · year ~40% · MICE ~60% |
| **Hyatt** | `hyatt.com` | `/<brand>/<region>/<code>-<slug>` + `/meetings-events/` | JSON-LD · Twitter card meta · `<table class="meeting-rooms">` | rooms ~80% · year ~50% · MICE ~70% |
| **IHG** | `ihg.com` | `/<brand>/hotels/<country>/<city>/<code>/hoteldetail` + `/meeting-rooms` | API endpoint `/api/hotels/<code>/property` returns JSON with rooms · meeting capacity table | rooms ~85% · year ~50% · MICE ~75% |
| **Accor** | `all.accor.com` + `accorhotels.com` | `/hotel/<code>/index.<locale>.shtml` + `/meeting-rooms` | `__INITIAL_STATE__` JSON in `<script>` · meeting-room JSON | rooms ~75% · year ~40% · MICE ~65% |

### 4.2 Extraction-method confidence ladder

| Method | Reliability | Confidence boost vs Tier-B base (0.80) |
|---|---|---|
| `JSON-LD schema:Hotel` | Highest (structured, schema.org) | +0.10 → 0.90 |
| `Chain API endpoint` (e.g. IHG property API) | Highest | +0.10 → 0.90 |
| `OpenGraph / Twitter Card meta` | High | +0.05 → 0.85 |
| `Inline __INITIAL_STATE__ JSON` (Accor pattern) | High | +0.05 → 0.85 |
| `Structured DOM table` (specific CSS selector) | Medium | 0.80 baseline |
| `Regex on visible text` (e.g. "Opened in 1992") | Lower | −0.10 → 0.70 |
| `Generic JSON-LD fallback` (no chain adapter) | Lowest | −0.15 → 0.65 |

Validation gates (post-extraction):
- `total_rooms`: integer, 10 ≤ x ≤ 5000.
- `year_opened`: integer, 1700 ≤ x ≤ 2100, and ≤ current year.
- `meeting_rooms_count`: integer, 1 ≤ x ≤ 100.
- `meeting_space_sqm`: integer, 10 ≤ x ≤ 50000.
- Cross-check with Booking E2 if both sources present (agreement_bonus +0.10).

---

## 5 · Cost & throughput estimate

| Variable | Value |
|---|---|
| HTTP calls per allowlist hotel | 2 (overview page + meetings page) |
| Allowlist hotels Madrid (initial 7 chains) | 55 |
| Total HTTP calls (one-shot, no refresh) | 110 |
| Throttle (rate limit + jitter) | 4–8 s per request per domain |
| Wall-clock runtime (single-threaded per domain) | **8–12 min** |
| Avg page weight (HTML + inline JSON) | ~200 KB |
| Total bandwidth (one-shot) | ~22 MB |
| Persistent cache TTL | 90 days |
| Refresh cadence (recommended) | Quarterly per hotel |
| **Monetary cost** | **€0** (no proxy, no headless browser, native `fetch`) |
| Engineering implementation effort | ~3-4 days (7 adapters × ~150 LOC + tests + audit-log wiring) |

If allowlist later expands to 11 chains (+Hotusa/Catalonia/Vincci/ILUNION = +33 hotels), cost doubles in calls + dev (~+2 days for 4 more adapters) but stays trivial monetarily.

---

## 6 · Expected uplift vs current T2 (numerical)

Current Madrid average T2 fill = 12.4 / 19 = **65.3 %** (presence-based). Tier-aware count from `hotel_coverage_scored_v` shows:

| Hotel cohort | n | Current avg T2 | Post D-8 only | Post D-8 + PostGIS |
|---|---|---|---|---|
| Allowlist branded (Marriott/Hilton/Meliá/NH/Hyatt/IHG/Accor) | 55 | 12.4 | 14.5 (+2.1) | **16.5 (+4.1, passing)** |
| Out-of-allowlist branded (Hotusa/Catalonia/Vincci/etc.) | 56 | 12.4 | 12.4 (no uplift) | 14.4 (+2) |
| Indie / no-brand | 113 | 9.0 | 9.0 (no uplift, no brand path) | 11.0 (+2) |
| **Madrid overall** | **224** | **10.5** | **11.0** | **12.4** |

Hotels reaching **≥16/19 (T2 passing)** by scenario:

| Scenario | Allowlist branded passing | Out-allowlist passing | Indie passing | Total |
|---|---|---|---|---|
| Now | 0 | 0 | 0 | 0 (0 %) |
| S1 D-8 only | 0 | 0 | 0 | 0 (0 %) |
| S2 PostGIS only | 0 | 0 | 0 | 0 (0 %) |
| S3 D-8 + PostGIS | ~41 | 0 | 0 | ~41 (18 %) |
| S4 + expand allowlist (+4 chains) | ~41 | ~25 | 0 | ~66 (29 %) |
| S5 + T2 threshold to 13/19 | ~55 | ~56 | 0 | ~111 (50 %) |
| S6 + drop market_id/submarket_id from T2 for indies | ~55 | ~56 | ~50 | ~161 (72 %) ✓ |

**Goal of 70 % is only reachable in S6** — by revising the T2 spec to acknowledge that `market_id`/`submarket_id` is a system-generated field that should not penalize hotels missing the geometry input, AND lowering the bar for indies (no brand fields available).

---

## 7 · Recommended sequencing

1. **Phase 0 (done):** D-1 provenance + dedup sweep + coverage views.
2. **Phase 1 (operator gate now open):** Build D-8 framework for 7 allowlist chains. Smoke-test on 5 hotels (1 per chain). Operator validates extraction quality before scaling to all 55.
3. **Phase 2 (parallel):** Madrid markets PostGIS workstream — boundaries + GIST contains assignment. Independent of D-8.
4. **Phase 3 (gated on Phase 1 + 2 results):** Revisit T2 spec. Either (a) lower threshold to 13/19, or (b) decompose T2 into "branded-T2" (full 19) and "indie-T2" (15 — drop brand/operator/year fields). Operator decision.
5. **Phase 4 (optional):** Expand allowlist by +4 chains (Hotusa/Catalonia/Vincci/ILUNION).

---

## 8 · Math of unreachable 70 % (assumption check for §1)

```
Total Madrid hotels:  224
  Branded (in allowlist):              55   max T2 reachable with D-8+PostGIS: 17/19  → can pass
  Branded (out of allowlist):          56   max T2 without D-8:                  14/19 → cannot pass
  Indie (no brand_family):            113   max T2:                              11/19 → cannot pass

Without D-8 and PostGIS, even all 55 allowlist hotels passing = 55/224 = 24.6%
With T2 threshold at 16/19, indie hotels cannot pass because they need:
  brand + brand_family + operator_id + operator_type + (year_opened OR ≥3 of the 6 other T2 fields they lack)

The 6 T2 fields indies lack: brand, brand_family, operator_id, year_opened, total_rooms, room_type_mix.
Even gaining 4/6 via D-8 + heuristics (e.g. total_rooms via webscan, year_opened via Wikidata) still
leaves indies at 13/19 = 68.4% (below T2 threshold).

Therefore the only paths to ≥70% institutional passing are:
  (a) Redefine "institutional" to exclude indies (focus on branded 111 hotels — then 73% achievable).
  (b) Lower T2 threshold to 13/19 (accept that indie hotels can pass without brand attribution).
  (c) Both.
```

---

## 9 · Decision matrix for operator

| Question | Options | Recommendation |
|---|---|---|
| Allowlist initial scope | 7 chains (now) vs 11 chains (expanded) | 7 chains — validate extraction quality first |
| T2 spec | Keep 16/19 vs lower to 13/19 vs split branded/indie | **Split branded/indie** — most defensible institutionally |
| PostGIS markets workstream | Now in parallel vs after D-8 results | After — D-8 effort is smaller and more bounded |
| D-5 bonus signals schema | Add columns vs JSONB | Add columns — these are first-class T2-adjacent fields |
| Indie strategy | Drop from institutional cohort vs include with lower bar | **Include with lower bar** — they remain in CompSet but won't gate institutional reports |

---

## 10 · Open questions before live execution

1. **Robots/ToS:** confirm per-chain robots.txt allows HEAD + GET on overview/meetings pages. Some hotel chains block all scraping in their ToS (not robots).
2. **User-Agent identity:** confirm `HOTELVALORA_USER_AGENT` constant value (currently `HotelVALORA/1.0`) is acceptable to legal — should it include contact email for opt-out?
3. **Hotel-page discovery:** for chains with non-obvious URL slugs (Meliá especially), do we use Google site search to find the right page, or chain's own search?
4. **Quarterly refresh:** auto-refresh or only on demand?
5. **JSON-LD missing chains:** if a chain ships no JSON-LD AND no API, fallback to regex parsing of HTML — what's the acceptable confidence floor? (Currently 0.65.)

---

## 11 · Hard rules in force (carried forward from autonomy directive)

- NO scraping execution without operator approval per-domain.
- NO touch on `/report/*` · workflow UX · PDF flow · sync layer · underwriting · main branch.
- NO storage of HTML payloads — only extracted field values + their source URL + extraction method.
- NO retries beyond 1 per request (operator constraint: "retries mínimos").
- robots.txt must pass; any 4xx response (other than 404) aborts the chain.

---

## 12 · Next concrete steps

1. Operator approves this design v1 → I build the 7 adapters + extractor + cache.
2. Smoke test on 1 hotel per chain (7 calls total) → confirm extraction quality + confidence calibration.
3. Operator reviews smoke output → green-light scaling to full 55 hotels.
4. Apply UPDATEs + insert provenance + recompute coverage views.
5. Report on real uplift vs estimates in §6.
