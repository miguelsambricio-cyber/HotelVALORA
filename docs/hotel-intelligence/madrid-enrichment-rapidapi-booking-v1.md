# Madrid Hotel Enrichment — RapidAPI Booking Provider Layer v1

**Workstream:** `feature/hotel-enrichment-pipeline` (parallel — independent of underwriting deploy freeze and report synchronization).
**Phase:** 1 — provider implementation layer, architectural. **No mass scraping. No production calls yet.**
**Scope:** RapidAPI Booking-specific implementation contract for the canonical enrichment pipeline. **Provider-specific.**
**Companion to:** [`madrid-enrichment-architecture-v1.md`](./madrid-enrichment-architecture-v1.md) (source-agnostic canonical layer — load-bearing, do **not** duplicate here).
**Author:** Hotel Intelligence Data Agent.
**Status:** Draft v1 — pending operator review before RapidAPI subscription tier is committed.

---

## 0 · Strategic positioning

This document is a **sidecar** — it lives below the canonical layer. Architectural decisions (schema, confidence model, dedup, normalization, refresh policy) remain in the main architecture doc and must continue to hold even if RapidAPI Booking is later swapped for, augmented with, or replaced by:

- Booking.com Partner API (official)
- Google Places API (already planned as fallback)
- Expedia RapidAPI
- STR direct feed
- Proprietary scraping
- Hotel-website ingestion

**What lives in this sidecar:**

| In | Out |
|---|---|
| RapidAPI endpoint paths, params, response shapes | Canonical hotel schema |
| RapidAPI field-name → canonical field mapping | Source hierarchy across providers |
| RapidAPI quotas, pricing tiers, throughput math | Confidence model formula |
| RapidAPI-specific retry codes, headers, pagination | Duplicate detection composite weights |
| Caching cadence keyed to RapidAPI volatility | Normalization pipeline |
| `X-RapidAPI-Key` / `X-RapidAPI-Host` plumbing | Migration sequence (`0008`) |

The canonical doc references this sidecar only via Tier-A in §2 of the main doc. The sidecar references the main doc by section number — never duplicates content.

**Provider note.** RapidAPI hosts multiple Booking.com integrations from independent publishers. The most production-grade family at time of writing is `booking-com15` (v15), an evolution of the long-running `booking-com` integration. Endpoint paths, parameter shapes, and response keys differ slightly across publishers; **every concrete shape in this doc must be re-validated against the subscribed publisher's spec at integration time (Phase 2).** Numbers below are illustrative anchors, not contractual.

---

## 1 · Endpoint inventory

Phase 1 anchors on the minimum set required to populate the canonical row and to satisfy critical-field coverage (§6.2 main doc).

### 1.1 Endpoint family

| # | Endpoint (representative) | Purpose | Cardinality per hotel | Phase 1? |
|---|---|---|---|---|
| E0 | `GET /v1/locations/auto-complete` | Resolve `"Madrid"` → `destination_id` (city) | Once per market | ✅ |
| E1 | `GET /v1/hotels/search-by-coordinates` or `/v1/hotels/search` | Paginated list of hotels in scope | 1 search call per page (~25–60 hotels/page) | ✅ |
| E2 | `GET /v1/hotels/data` (a.k.a. `/v1/hotels/details`) | Full hotel detail object: identity, address, geo, star, segment, contact, summary amenities, hero photo | 1 per hotel | ✅ |
| E3 | `GET /v1/hotels/facilities` | Full facilities/amenities taxonomy (granular flags + groupings) | 1 per hotel — IF E2 does not return granular facilities | ✅ (conditional) |
| E4 | `GET /v1/hotels/photos` | Gallery URLs (often 20–80 photos) | 1 per hotel | ⚠️ deferred to Phase 3 |
| E5 | `GET /v1/hotels/reviews` | Paginated review list (with score, language, scored dimensions) | 1+ per hotel | ⚠️ deferred to Phase 3 |
| E6 | `GET /v1/hotels/policies` | Check-in/check-out windows, cancellation, deposits | 1 per hotel | ⚠️ optional Phase 2 |
| E7 | `GET /v1/hotels/location-highlights` | Nearby points-of-interest, distances | 1 per hotel | ⏸ Phase 4 or skip |
| E8 | `GET /v1/hotels/room-list` | Room types, occupancy, current rates (with dates) | 1 per hotel per stay window | ⏸ requires date sweep — out of Phase 1 scope |
| E9 | `GET /v1/hotels/description` (or `/v1/hotels/info`) | Long-form description, tags, themes | 1 per hotel | ⏸ Phase 4 (LLM consumes; not canonical Phase 1) |

**Phase 1 active set:** `E0 + E1 + E2 + (E3 conditional)` = **2–3 calls per hotel on first pass**.

### 1.2 Authentication contract

All RapidAPI requests carry two headers; no body auth.

```
X-RapidAPI-Key:  <env: RAPIDAPI_BOOKING_KEY>
X-RapidAPI-Host: <env: RAPIDAPI_BOOKING_HOST>     # e.g. "booking-com15.p.rapidapi.com"
Accept:          application/json
```

**Env vars (new — to be added to `.env.example` and Vercel envs in Phase 2):**

| Var | Scope | Notes |
|---|---|---|
| `RAPIDAPI_BOOKING_KEY` | Server-only (never exposed) | Single subscription key |
| `RAPIDAPI_BOOKING_HOST` | Server-only | Publisher host — switching providers = changing this string |
| `RAPIDAPI_BOOKING_BASE_URL` | Server-only | `https://${HOST}` (computed) |
| `RAPIDAPI_BOOKING_TIER` | Server-only | `basic` \| `pro` \| `ultra` \| `mega` — drives rate limit constants |
| `RAPIDAPI_BOOKING_DAILY_BUDGET` | Server-only | Hard ceiling per UTC day, defensive |
| `RAPIDAPI_BOOKING_MONTHLY_BUDGET` | Server-only | Hard ceiling per calendar month |

**Tied to** `docs/ai-agents/ai-agent-cost-guardrails.md` — same pattern. Worker reads tier + budget; halts at cap.

### 1.3 Pagination conventions

- E1 (search) returns `result_count`, `pagination` block, `next_page_offset` (publisher-dependent). Page size cap is typically 25 (`v1`) or 60 (`v15`).
- Madrid full sweep at page_size=25 → ~72 pages. At page_size=60 → ~30 pages.
- Pagination MUST be deterministic — pass `sort_by=popularity` and explicit `offset` to avoid duplicates across pages on re-runs.
- Idempotency: pagination signature `(destination_id, page_size, offset, date_window?)` becomes part of `hotel_enrichment_job.dedup_key` (§9 main doc) — re-runs within TTL are no-ops.

### 1.4 Search-strategy decision

E1 has two flavors:
- **`/v1/hotels/search`** — requires `destination_id` (city or region resolved via E0). Best for full-market sweep.
- **`/v1/hotels/search-by-coordinates`** — bbox/lat-lng + radius. Best for verifying coverage and for re-scanning underserved neighborhoods.

Phase 1 Madrid sweep uses both: primary pass via `destination_id` (one canonical anchor), secondary verification pass via 4–6 coordinate bboxes covering Madrid metro to catch listings missed by the destination_id query (chains that index under suburban municipios).

---

## 2 · Canonical field mapping

The contract: every canonical field consumed from a RapidAPI response carries a fixed source key, an intrinsic confidence floor, an overwrite policy, and a validation hook before reaching `hotel_field_provenance`.

### 2.1 Mapping table — E2 `/v1/hotels/data` → canonical

| Canonical field | RapidAPI path (representative) | Type / cast | Confidence floor | Overwrite policy |
|---|---|---|---|---|
| `booking_hotel_id` | `hotel_id` | string | 1.00 (self-authoritative) | Insert-only; never overwritten |
| `canonical_name` | `name` | string → multilingual normalize | 0.85 (Tier A) | Overwrite only if new confidence ≥ canonical + 0.10 |
| `legal_name` | `name_trans.en` or `legal_name` if present | string | 0.70 | Manual override sticky |
| `address_line1` | `address` | string → addr-normalize | 0.85 | Overwrite per §4.4 main doc |
| `address_line2` | `address_extra` | string | 0.80 | Same |
| `city` | `city_trans` or `city_name_en` | string | 0.85 | Same |
| `city_normalized` | derived via Madrid alias table (§5.2 main) | string | 0.95 (deterministic derivation) | Always overwrite |
| `postal_code` | `zip` | string → regex validate `^\d{5}$` | 0.85 | Validation gate |
| `country_code` | `cc1` or `country_code` | upper(string) → ISO-3166-1 | 0.95 | Validation gate |
| `region` | `state` or `region` | string | 0.75 | Standard |
| `neighborhood` | `district` or `neighborhood` | string | 0.70 | Standard |
| `lat`, `lng` | `latitude`, `longitude` | numeric → round 6dp | 0.85 (geo from Booking is well-curated for indexed listings) | Cross-validate vs Google Places (§2.5) |
| `geom` | computed from lat/lng | geography(POINT,4326) | inherits lat/lng | Derived |
| `star_rating` | `class` or `propertyClass` (sometimes "stars") | int 1–5 | 0.85 | Validation gate |
| `total_rooms` | `room_count` or `nr_rooms` | int | 0.85 (when present) — **OFTEN MISSING** → triggers fallback (§6.2 main) | Standard |
| `brand` | `chain_name` or `brand` | string → brand-normalize | 0.80 | Standard |
| `brand_family` | derived via brand→family lookup table | string | 0.85 (deterministic) | Standard |
| `chain_scale` | derived via brand_family → scale table | enum | 0.80 (deterministic) | Standard |
| `operator` | rarely present in Booking payloads — typically null | string | 0.60 if present, null otherwise | Reserved for Tier-B/S sources |
| `hotel_type` | `accommodation_type_id` + `accommodation_type_name` → enum map | enum | 0.80 | Standard |
| `segment` | derived from `class` + `accommodation_type` | enum | 0.75 (heuristic derivation) | Lower-priority source |
| `amenities` | `facilities` (summary subset) + E3 (granular if subscribed) | jsonb (14-key canonical bitmap) | 0.80 (Booking is curated) | Per-key merge: take true ∨ true (any source positive ≥ confidence 0.80) |
| `review_score` | `review_score` (Booking scale 0–10) | numeric(4,2) | 0.85 | Stored **per-source**, never fused (§2.5) |
| `review_count` | `review_nr` | int | 0.90 (count is verifiable) | Standard |
| `primary_review_source` | constant `"booking_rapidapi"` when E2 returns score | string | 1.00 | Set on score write |
| `website_url` | `url` or `website` | string → URL validate | 0.70 (Booking sometimes returns Booking listing URL, not hotel site) | Tier-B (official website discovery) preferred |
| `phone` | `phone` | string → E.164 normalize | 0.75 | Standard |
| `email` | `email` (rarely present) | string → RFC 5322 + MX check | 0.65 | Standard |
| `booking_url` | `url` (the Booking listing URL) | string | 1.00 (self-authoritative) | Insert-only |
| `hero_image_path` | from E4 first photo OR `main_photo_url` in E2 | string (bucket key after download) | 0.85 | See §8 image strategy |
| `gallery_paths` | from E4 photo array | string[] | 0.80 | See §8 |
| `year_opened` | rarely present | int | 0.65 if present | Tier-B/F preferred |
| `year_renovated_last` | rarely present | int | 0.60 if present | Tier-B/F preferred |

### 2.2 Mapping table — E1 `/v1/hotels/search` → canonical (summary fields only)

E1 returns a thinner shape per hit. Used for discovery + as a sanity check, not as the primary source of detail.

| Canonical field | RapidAPI path | Confidence floor |
|---|---|---|
| `booking_hotel_id` | `hotel_id` | 1.00 |
| `canonical_name` (display only — overwritten by E2 if values diverge) | `hotel_name` | 0.75 |
| `star_rating` | `class` | 0.75 |
| `review_score`, `review_count` | `review_score`, `review_nr` | 0.80 |
| `lat`, `lng` | `latitude`, `longitude` | 0.80 |
| `city_name` | `city` | 0.80 |

E1 writes are **never canonical-overwriting** on their own — E1 hits emit `discover` jobs (job_type=`discover`, §9 main) that schedule E2 calls. Canonical insert happens only after E2 parse succeeds OR after dedupe rejects the row.

### 2.3 Mapping table — E3 `/v1/hotels/facilities` → canonical

E3 is conditional (only invoked when E2 returns no granular amenities). It yields the canonical 14-key amenity bitmap with higher confidence.

| Canonical amenity key | RapidAPI facility_id(s) (representative — verify per publisher) | Confidence |
|---|---|---|
| `bar` | facility group "Food & Drink" → ids in bar set | 0.85 |
| `restaurant` | same group → restaurant ids | 0.85 |
| `rooftop` | typically inferred from "Terrace" + altitude + photo metadata | 0.65 (heuristic — flag in provenance) |
| `spa` | facility group "Wellness" | 0.85 |
| `gym` | "Fitness centre", "Fitness facilities" | 0.90 |
| `pool` | "Swimming pool", "Outdoor pool", "Indoor pool" | 0.90 |
| `parking` | "Parking" (any), "Private parking" | 0.85 |
| `meet` | "Meeting/banquet facilities" | 0.85 |
| `business_center` | "Business centre" | 0.85 |
| `kids_club` | "Kids club", "Kids' outdoor play equipment" | 0.80 |
| `beach_access` | "Beachfront", distance ≤ 100m → flag | 0.75 |
| `golf` | "Golf course (within 3 km)" | 0.70 (proximity flag, not on-property) |
| `casino` | "Casino" | 0.85 |
| `marina` | derived (rare in Madrid) | n/a Phase 1 |

Unmapped facility ids preserved in `hotel_source_record.payload` for later analytics; not promoted to canonical.

### 2.4 Reviews — strict isolation

`review_score` and `review_count` from RapidAPI Booking are stored **per-source**, never fused into a global "review_score" field that mixes Google, Tripadvisor, and Booking. The canonical `review_score` column holds the Booking value (when Booking is `primary_review_source`); a future `hotel_review_snapshot` table (Phase 4) will hold parallel per-source rows.

### 2.5 Cross-validation triggers

| Field | When E2 lands a value | Trigger |
|---|---|---|
| `lat`, `lng` | Booking returns coords | Schedule Google Places `place_details` call within 30d; if haversine > 100m → conflict review |
| `total_rooms` | Booking missing OR < 0.85 confidence | Schedule website + Tripadvisor + Wikidata fallback |
| `brand` / `brand_family` | Booking returns `chain_name` | Cross-check against `brand_family` lookup table; if no match → flag for curator review |

---

## 3 · Rate-limit strategy

This is the load-bearing section for capacity planning. All numbers are conservative estimates; real-world throughput depends on subscribed publisher + tier.

### 3.1 Plan tiers — illustrative

Most production RapidAPI Booking publishers expose ~4 tiers. Representative shape:

| Tier | Monthly quota | Hard RPS cap (publisher-side) | Practical sustained RPS (client-side, after backoff) | Monthly cost (USD, illustrative) |
|---|---|---|---|---|
| Basic / Free | 100–500 / month | 1 req/s | 0.5 req/s | $0 |
| Starter / Pro | 5,000–25,000 / month | 5 req/s | 2–3 req/s | $10–50 |
| Ultra | 50,000–100,000 / month | 10 req/s | 5–7 req/s | $100–300 |
| Mega / Enterprise | 250,000+ / month, often soft-capped | 20+ req/s | 10–15 req/s | $500–1,500+ |

These are anchors — Phase 2 work item: confirm exact figures against the subscribed publisher's plan page.

### 3.2 Per-hotel call budget

| Pass | Calls per hotel | Notes |
|---|---|---|
| First sweep (E1 amortized + E2 + E3 conditional) | **2.5 on average** | E1 amortized as `1 / page_size` ≈ 0.04 calls per hotel; E2 always; E3 ~50% of hotels |
| Refresh light (E2 only — for prices/availability would need E8 too, but Phase 1 skips E8) | **1 per hotel per refresh window** | Cadence: 7 days per main doc §11 |
| Refresh photo (E4) | 1 per hotel | Phase 3+ only |
| Refresh reviews (E5) | 1+ per hotel | Phase 3+ only |

**Phase 1 active budget per hotel: 2.5 calls (first sweep) + 1 call per 7-day refresh.**

### 3.3 Projected Madrid sweep duration

Anchor: **~1,800 hotels** in Madrid metro (Booking-indexed; conservative upper bound, includes municipios).

| Tier | First sweep calls (2.5 × 1,800 = 4,500) | At sustained RPS (wall clock) | At daily quota (calendar days) |
|---|---|---|---|
| Basic | 4,500 | 4,500 / 0.5 = 2.5 hours | 100/day quota → **45 days** ❌ infeasible Phase 1 |
| Pro (10k/mo, 2 RPS) | 4,500 | 4,500 / 2 = ~37 minutes | 333/day burn → **~14 days** ⚠️ tight but viable |
| Pro (25k/mo, 3 RPS) | 4,500 | ~25 minutes | 833/day burn → **~5.5 days** ✅ recommended |
| Ultra (50k/mo) | 4,500 | ~15 minutes | 1,666/day → **~3 days** ✅ comfortable |
| Mega (250k/mo) | 4,500 | ~7 minutes | Capacity-trivial — **<1 day** ✅ |

**Phase 1 recommendation: Pro 25k/month tier** — accommodates Madrid sweep in ~1 week with budget headroom for fallbacks AND nightly refresh from day 1.

### 3.4 Throughput per tier — sustained workloads

Monthly call envelope after first sweep is dominated by refresh.

| Workload | Monthly call burn | Min tier |
|---|---|---|
| Madrid refresh (1,800 × 4 refreshes/mo) | 7,200 | Pro 10k |
| Madrid refresh + Madrid photos (yearly cycle 1×/mo for new properties) | ~9,000 | Pro 10k |
| Madrid refresh + Barcelona sweep + Barcelona refresh | ~12,000 (4.5k + 7.2k) | Pro 25k |
| Spain full portfolio sweep + monthly refresh (see §4.3) | ~50,000 | Ultra 50k |
| Iberian Peninsula (ES + PT) sweep + refresh + reviews | ~150,000 | Mega 250k |

### 3.5 Queue / backoff policy

- Token bucket per provider (already specified in main doc §8.2). Bucket capacity = `min(plan_RPS, plan_monthly / seconds_in_month)`.
- 429 handling: read `Retry-After` header; if absent default 60s. Each 429 = halve current concurrency (floor 1).
- 5xx handling: exponential `2^n + jitter(30%)` up to 6 attempts; after 6 → DLQ.
- 401/403 handling: hard halt provider in `rate_limit_state` (status = `auth_blocked`); Sentry alert; do not retry until operator clears.
- Daily-budget guard: worker reads `RAPIDAPI_BOOKING_DAILY_BUDGET`. If `used + planned_batch > budget`, defer remaining batch to next UTC day.
- Monthly-budget guard: same shape, at month boundary.

### 3.6 Nightly refresh feasibility

| Coverage | Calls/night (1 E2 per hotel) | Min tier |
|---|---|---|
| Madrid only (~1,800) | 1,800 | Pro 10k (18% of monthly budget over 30 nights = 54k → does not fit; **need refresh weekly, not nightly, on Pro 10k**) |
| Madrid weekly refresh (~257/night avg) | ~7,700/month | Pro 10k ✅ |
| Madrid + Barcelona + Valencia weekly | ~14,500/month | Pro 25k ✅ |
| Spain full weekly | ~40,000/month | Ultra 50k ✅ |
| Spain full nightly | ~300,000/month | Mega 250k+ ❌ marginal |

**Decision rule:** "nightly refresh" means **stale-aware nightly worker** that selects only hotels past their per-source TTL (main doc §11.1). At Booking's 7-day TTL, average daily burn = `total_hotels / 7`. Madrid worst case ≈ 257/night, which fits any Pro plan.

---

## 4 · Cost modeling

All cost figures USD, illustrative. Real cost = subscribed publisher × tier × overage policy. Pricing varies up to 5× across publishers for the same call volume — Phase 2 procurement task.

### 4.1 First-sweep cost (one-time)

| Scope | Hotels | Calls | Tier minimum | Cost of needed tier (1 month) |
|---|---|---|---|---|
| Madrid only | 1,800 | 4,500 | Pro 10k | $20–40 |
| Madrid + Barcelona | 3,300 | 8,250 | Pro 10k | $20–40 |
| Spain top-8 markets (Madrid, BCN, VLC, SVQ, MLG, PMI, TCI, BIO) | ~9,000 | ~22,500 | Pro 25k | $40–80 |
| Spain full | ~10,500 | ~26,000 | Pro 25k | $40–80 |

### 4.2 Incremental refresh cost (steady state, monthly)

Assumes Booking 7-day TTL → ~4.3 refreshes/hotel/month.

| Coverage | Monthly E2 calls | Tier | Monthly cost |
|---|---|---|---|
| Madrid refresh | 7,740 | Pro 10k | $20–40 |
| Madrid + Barcelona | 14,190 | Pro 25k | $40–80 |
| Spain full | 45,150 | Ultra 50k | $100–200 |
| Spain + photos quarterly refresh (E4) | ~50,000 | Ultra 50k | $100–200 |
| Spain + photos + reviews monthly (E4 + E5) | ~80,000 | Ultra 100k | $200–400 |

### 4.3 Portfolio scale — Spain full

Anchor inventory (Booking-indexed, approximate):

| Market | Hotels (anchor) |
|---|---|
| Madrid metro | 1,800 |
| Barcelona metro | 1,500 |
| Valencia | 600 |
| Sevilla | 500 |
| Málaga + Costa del Sol | 1,500 |
| Mallorca + Balearics | 1,200 |
| Canarias | 1,500 |
| Bilbao + País Vasco | 400 |
| Other (~smaller markets, aggregated) | 1,500 |
| **Total** | **~10,500** |

| Phase | One-time first-sweep | Monthly steady-state | Annual run-rate |
|---|---|---|---|
| Madrid only | $20–40 | $20–40 | $260–500 |
| Spain top-8 | $40–80 | $80–160 | $1,000–2,000 |
| Spain full + photos + reviews | $80–160 | $200–400 | $2,500–5,000 |

### 4.4 When to escalate plan tier

| Trigger | Action |
|---|---|
| Daily 429 rate > 5% on Pro 10k | Bump to Pro 25k |
| Monthly burn > 80% of plan quota for 2 consecutive months | Bump one tier |
| Adding a major market (>1,500 hotels) | Pre-bump to next tier before sweep |
| Activating E5 (reviews) at scale | Pre-bump (reviews are 3–5× call multiplier) |
| Sub-7d refresh required for institutional clients | Bump to Ultra minimum |

### 4.5 Cost per useful canonical row

A useful canonical row = `quality_tier` ∈ `{gold, silver}` after enrichment.

Anchor: ~75% of Booking-indexed hotels achieve `silver+` after Phase-1 enrichment (estimate; refined post-pilot).

| Tier | Cost/useful row (first sweep, Madrid) | Cost/useful row (annual, Madrid) |
|---|---|---|
| Pro 10k | $0.015–0.030 | $0.20–0.40 |
| Ultra 50k | $0.060–0.110 | $1.00–2.00 (full coverage, faster, with photos+reviews) |

This is **negligible** compared to the institutional value per row downstream (each gold-tier hotel enables CompSet matching, Library inclusion, Underwriting baseline, and future Match Engine scoring).

---

## 5 · Caching policy

Caching strategy is keyed to field-level volatility, not endpoint-level. Same response payload contains stable + volatile fields; each is cached separately at the canonical layer.

### 5.1 Volatility classification

| Class | Examples | TTL | Cache layer |
|---|---|---|---|
| **Static** | `booking_hotel_id`, `legal_name`, `lat`, `lng`, `address_*`, `year_opened`, `country_code` | 90 days | `hotel_source_record` payload retained; canonical not refreshed unless explicit `force_refresh` |
| **Semi-static** | `total_rooms`, `star_rating`, `brand`, `operator`, granular `amenities`, `meeting_space_sqm` | 30–60 days | Refresh weekly per Booking TTL (§11 main); diff to canonical only if value changes |
| **Volatile metadata** | `review_score`, `review_count`, `description`, `policies` | 7–14 days | Refresh on every Booking-cadence pass |
| **Photos** | `hero_image_path`, `gallery_paths` | 30 days | URLs can rotate; signed URLs require re-fetch; binaries cached locally (§8) |
| **Reviews list** | E5 review array | 14 days | Append-only per-review id in future `hotel_review` table (Phase 4) |
| **Pricing/rates** | E8 room-list | ≤ 24 hours | **Not Phase 1.** When activated, ephemeral cache only — never canonical |
| **Search results** | E1 paginated lists | 7 days | Cache by `(destination_id, page_size, offset, sort)`; idempotent re-runs |

### 5.2 Cache invalidation triggers

- Manual curator override → invalidate `static` cache for that hotel; force re-fetch all sources.
- Alias merge accepted → invalidate canonical and re-score conflict candidates.
- Quality tier flipped to `quarantined` → invalidate all caches for hotel.
- Publisher schema drift (detected by parser) → invalidate `static` for affected fields, schedule re-fetch.

### 5.3 Storage of cache

- **L1 (durable):** `hotel_source_record` (already in main doc §1.2) — append-only, partitioned by month when row count > 1M.
- **L2 (in-process):** Worker-process memo for the duration of a single batch — avoids redundant E0/E1 lookups within one run.
- **L3 (CDN / runtime cache):** Vercel Runtime Cache for high-read canonical reads from app routes; NOT for RapidAPI raw responses (those stay server-side).

---

## 6 · Error taxonomy (RapidAPI-specific)

Layered on top of the generic error taxonomy in main doc §10.1.

### 6.1 RapidAPI-specific errors

| Symptom | Error class | HTTP | RapidAPI signal | Handling |
|---|---|---|---|---|
| **Timeout** | `NETWORK` | — | request abort > 30s | Retry with exponential backoff (max 6); record latency for SLO monitoring |
| **Quota exceeded — daily** | `QUOTA_DAILY` | 429 | `X-RateLimit-Requests-Remaining: 0` + reset header | Halt provider until next UTC day; reschedule deferred jobs |
| **Quota exceeded — monthly** | `QUOTA_MONTHLY` | 429 | quota headers indicate monthly reset | Halt provider; alert operator (Sentry); requires plan upgrade decision |
| **Rate cap — burst** | `RATE_BURST` | 429 | `Retry-After: N` | Wait + retry; halve concurrency for cool-down |
| **Auth invalid** | `AUTH` | 401/403 | `message: "Invalid API key"` or similar | Hard halt; alert; do not retry |
| **Endpoint not subscribed** | `PLAN_LIMIT` | 403 | `"You are not subscribed to this API"` | Mark endpoint disabled for current plan; surface in operator dashboard |
| **Partial payload** | `PAYLOAD_PARTIAL` | 200 | response missing expected keys for the publisher's documented schema | Parse what's present, mark `fetch_status='parsed_with_warnings'`, flag missing fields at low confidence |
| **Geo mismatch** | `GEO_MISMATCH` | 200 | response lat/lng outside expected bbox (Madrid metro) | Insert raw record; flag canonical merge as `needs_review` (possibly a stale or misindexed listing) |
| **Duplicate entity** | `DUPLICATE` | 200 | response `hotel_id` already maps to existing canonical via a different alias | Route through dedup (§4 main); auto_merge if confident, else `needs_review` |
| **Stale listing** | `STALE_LISTING` | 200 | response includes `is_closed: true` OR `last_seen` > 365d | Set canonical `status='closed'` (do not delete); record `audit_log` event |
| **Booking alias mismatch** | `ALIAS_DRIFT` | 200 | hotel returns under a `name` differing from canonical name by Jaro-Winkler < 0.80 | Insert into `hotel_aliases`; do NOT overwrite `canonical_name`; raise dedup re-scan |
| **Empty result page** | `EMPTY_PAGE` | 200 | E1 returns no hits beyond a known-non-final offset | Treat as end-of-sweep; record sweep_completed marker |
| **Schema drift** | `SCHEMA_DRIFT` | 200 | parser detects unknown top-level key OR missing previously-required key | Persist payload, Sentry alert, route to DLQ for operator review; do NOT halt provider (drift is often additive) |

### 6.2 DLQ inspection contract

DLQ rows from RapidAPI Booking carry these required fields beyond the base DLQ shape (main doc §10.2):

```json
{
  "provider": "booking_rapidapi",
  "publisher": "<RAPIDAPI_BOOKING_HOST value>",
  "endpoint": "/v1/hotels/data",
  "params_hash": "<sha256 of request params>",
  "rapidapi_request_id": "<from response header if present>",
  "error_class": "PAYLOAD_PARTIAL",
  "payload_sample_keys": ["hotel_id", "name", "address", "latitude", "longitude"],
  "expected_keys_missing": ["class", "review_score", "facilities"]
}
```

This shape lets the future probe page `/dev/hotel-enrichment-dlq` (main doc §10.2) filter by provider + endpoint + drift signature.

### 6.3 Self-healing rules

- After 100 consecutive `PAYLOAD_PARTIAL` on the same endpoint → suspect publisher schema migration → auto-route next 24h of that endpoint to DLQ + alert operator, do not corrupt canonical.
- After 5 consecutive `GEO_MISMATCH` from a single sweep → suspect a destination_id resolution error → re-run E0 for the market.

---

## 7 · Matching strategy (RapidAPI-specific signals)

The canonical dedup model (main doc §4) is provider-agnostic. This section enumerates **RapidAPI Booking-specific signals** that feed into it and the failure modes unique to this source.

### 7.1 RapidAPI-specific keys to leverage

| Signal | Used for | Confidence contribution |
|---|---|---|
| `booking_hotel_id` | Self-identity. Unique within Booking ecosystem. | Hard match → bypass fuzzy: same `booking_hotel_id` = same canonical (subject to lifecycle check) |
| `chain_id` / `chain_name` | Brand/operator detection | Boost `operator_match` component when both candidates share `chain_id` |
| `accommodation_type_id` | Asset type alignment | Distinguish hotel vs aparthotel vs apartment-only listings — prevents merging different asset classes |
| `latitude`, `longitude` | Geo proximity | Standard haversine input (main doc §4.2) |
| `address` (raw string) | Address-fuzzy fallback | Tokenize and Jaccard against canonical address; tie-breaker when geo is null |
| `district` / `neighborhood` | Locality reinforcement | Boost `geo_proximity` when neighborhoods agree |

### 7.2 Failure modes specific to RapidAPI Booking

1. **Apartment-block flooding.** Single physical building (e.g., a serviced-apartment hotel) often appears as N separate listings on Booking, one per managed-room cluster, all sharing the same lat/lng and a near-identical address.
   - **Mitigation:** if dedup score ≥ 0.85 AND `accommodation_type_id` ∈ {apartment, aparthotel} → tier `needs_review`, NEVER `auto_merge`. Curator decides.
2. **Chain rebrand with stale `chain_name`.** Booking sometimes lags 60–180 days on rebrands.
   - **Mitigation:** brand mismatch with canonical does not trigger merge rejection; instead writes to `hotel_aliases` and schedules a 90-day re-fetch.
3. **Same-name different-building.** Madrid has multiple "NH Madrid Atocha", "Hotel Madrid Centro", etc. Name fuzzy alone is insufficient.
   - **Mitigation:** `geo_proximity` weight of 20% (main doc §4.2) prevents false merge when names match but geo > 500m. Counter-check: `street_number` extracted from address line.
4. **Hotel + Resort split listings.** A property and its resort wing sometimes index as siblings.
   - **Mitigation:** `total_rooms` discrepancy > 30% with geo < 100m → mark `sibling_listing`; canonical row preserved per listing; future relationship table (Phase 5) links them.
5. **Closed/seasonal listings re-appearing.** Closed property may re-emerge as a new `booking_hotel_id` after relaunch.
   - **Mitigation:** when new `booking_hotel_id` is created but geo + canonical_name match a `status='closed'` row → propose merge (`needs_review`); curator decides whether to revive or treat as new asset.
6. **Long-stay/extended-stay duplicates.** Same building, two `booking_hotel_id`s: one for short stay, one for extended stay.
   - **Mitigation:** detected via `accommodation_type_id` divergence + ≥ 0.85 dedup score → `needs_review` with `extended_stay_sibling` flag.
7. **Multilingual name variants.** `"Hotel Palacio del Retiro"` vs `"Palacio del Retiro Hotel"` vs `"Retiro Palace Hotel"`.
   - **Mitigation:** `normalize_for_matching` from main doc §5 strips stopwords + word-order-insensitive Jaro-Winkler. Variants captured as aliases.

### 7.3 Pre-canonical match gate

Before any new row from Booking enters `hotel_canonical`, the pipeline executes:

```
1. If booking_hotel_id already exists in canonical → update path (no insert; per §4.4 main).
2. Compute block_key (main §4.1).
3. Fetch candidates with same block_key (typically < 30 rows).
4. Compute composite score against each candidate.
5. If max(score) ≥ 0.92 AND accommodation_type matches AND no aparthotel flag → auto_merge.
6. If max(score) ≥ 0.80 → enqueue hotel_duplicate_candidate, do NOT insert.
7. If max(score) < 0.80 → insert new canonical row; record alias.
```

Critical invariant: **never create a second canonical row for a `booking_hotel_id` already mapped.** Enforced by partial unique index `hotel_canonical_booking_uq` (main §1.2).

---

## 8 · Image strategy

### 8.1 Decision: store URLs OR assets?

**Phase 1: store both. Default consumption is URL.**

| Path | Source | Trade-off |
|---|---|---|
| URLs only | RapidAPI Booking returns CDN URLs to Booking's image servers | Cheapest; but URLs can rotate, expire, or be deauthorized; legal/attribution constraints (§9) |
| Download to Supabase Storage | Hash-named binary in `hotel-media-raw` bucket | Survives provider URL changes; legal review required; storage cost |

**Phase 1 policy:**
- Store URLs in `hotel_source_record.payload` and reference in `hotel_canonical.hero_image_path` / `gallery_paths`.
- Download **only the hero image** to `hotel-media-canonical` bucket (one binary per hotel, hash-keyed).
- Defer full gallery download to Phase 3 — when curator UI is built.
- Never expose RapidAPI Booking image URLs directly to end users without checking attribution requirements (§9).

### 8.2 Thumbnail pipeline (Phase 3+)

- Use `next/image` for runtime resizing if hero served via canonical bucket (Supabase Storage native).
- Three preset sizes: `thumb` (240×160), `card` (480×320), `hero` (1280×720) — generated on-demand via Next image optimizer or pre-generated via Vercel build step.
- Aspect-ratio policy: 3:2 default; never letterbox; CSS `object-fit: cover`.

### 8.3 CDN policy (Phase 4+)

- Migrate canonical hero + gallery to dedicated CDN (Vercel Edge or Cloudflare Images) when monthly egress > 50 GB.
- Cache headers: 30 days immutable for hash-named binaries.
- Signed URLs for private/tier-gated galleries (Library Premium tier).

### 8.4 Photo provenance

Every downloaded binary writes a `hotel_field_provenance` row keyed `field_name='hero_image_path'` with:
- Source URL (from RapidAPI Booking)
- SHA256 of binary
- Download timestamp
- Image dimensions
- License/attribution string (when publisher exposes it)

This guarantees we can re-source or remove a specific binary if a takedown request arrives.

---

## 9 · Compliance / operational notes

### 9.1 Attribution

Booking.com / RapidAPI publisher ToS typically requires attribution when surfacing review scores and review counts in user-facing UI.

**Default policy until ToS confirmed:**
- All UI surfaces that display Booking-sourced `review_score` MUST include "Source: Booking.com" inline or in a tooltip.
- Hotel listing pages MUST link back to the canonical Booking URL (`booking_url`) when the score is shown.
- Photos sourced from Booking MUST carry a discoverable attribution (e.g., overlay or caption).
- This is enforced **at the consuming layer** (Library, Report) — not at this pipeline. But this pipeline preserves attribution metadata in provenance.

**Operator action:** read the subscribed publisher's exact ToS at integration time; codify exact attribution wording in `docs/business-rules/`.

### 9.2 API usage constraints

- **No bulk redistribution.** Data fetched from RapidAPI Booking is for HotelVALORA's analytical use; not for re-sale as a dataset.
- **No reverse-engineering of pricing.** E8 (room-list) data, when activated, MUST NOT be used to feed a comparison-pricing product without explicit license.
- **Caching limits.** Most publishers permit caching of metadata for "reasonable" periods; reviews/pricing have shorter limits. Our cache TTLs in §5 are conservative.
- **No automated booking actions.** This pipeline is read-only. Phase 1 must not include any booking-creation, cancellation, or transactional endpoint.

### 9.3 Scraping fallback boundaries

Scraping (Tier-Z in main doc §2.1) is **last resort** and explicitly bounded:

| Scraping permitted | Scraping forbidden |
|---|---|
| Publicly-accessible hotel websites (no login wall) | Booking.com itself — we already have a paid feed |
| `robots.txt`-compliant fetches | Pages disallowed by robots.txt |
| Single-page metadata extraction (about, contact, year) | Reviews scraping from third parties already covered by API |
| Open-data sources (Wikidata SPARQL, OSM Overpass) | Anything behind CAPTCHA or rate-limit shield |
| User-agent identifies HotelVALORA + contact email | Anonymous / spoofed UA |
| ≤ 1 req per 4–8s per domain, randomized | Aggressive crawling |

**Phase 1 hard rule:** no scraping fetches whatsoever. Architecture only. Implementation gated to Phase 4+ behind explicit operator approval per domain.

### 9.4 Anti-abuse + robots awareness

- Every scraping fetch (Phase 4+) reads `/robots.txt` first; respects `Disallow` + `Crawl-delay`.
- Per-domain rate state lives in `rate_limit_state` table (same shape as for RapidAPI).
- On 403/CAPTCHA → halt that domain for 24h; log to DLQ; never auto-retry.

### 9.5 PII / GDPR

- This pipeline NEVER ingests guest data, review-author personal info beyond pseudonymous display names, or any data that could identify a natural person.
- `hotel.email` field stores property contact email (a business email), not personal.
- Right-to-be-forgotten requests on Booking-sourced reviews are handled at the source — we re-fetch and our cache reflects the deletion at next refresh.

---

## 10 · Open questions for operator review

1. **Publisher selection.** Confirm `booking-com15` vs alternative publishers (e.g., `apidojo-booking-v1`). Diff: response schema stability + monthly cost + endpoint coverage.
2. **Plan tier commit.** §3.3 recommends **Pro 25k/month** for Phase 1 Madrid. Confirm budget approval before subscription.
3. **Image download policy.** §8.1 proposes download-hero-only Phase 1. Confirm or escalate to full-gallery download.
4. **Attribution wording.** §9.1 needs canonical wording to be added to `docs/business-rules/`. Operator owns text.
5. **Reviews activation.** §1.1 defers E5 to Phase 3. Confirm — or pull forward if institutional clients want review analytics in launch.
6. **Madrid municipios scope.** `city_normalized` mapping (main doc §5.2) folds 28 municipios into "Madrid". Confirm Pozuelo / Alcobendas / Las Rozas are in scope (some institutional clients prefer separate market treatment).
7. **Spain expansion sequencing.** §4.3 implies 8-market Phase 2. Confirm order: Madrid → Barcelona → Valencia/Sevilla/Málaga → Balearics → Canarias → País Vasco?
8. **Scraping authorization.** Per §9.3, scraping deferred to Phase 4+. Confirm hard rule — no exceptions for "just one property" requests.

---

## 11 · Non-goals (this sidecar)

- **No canonical-schema design** — lives in main doc.
- **No dedup-scoring weight definition** — lives in main doc.
- **No migration DDL** — main doc reserves `0008_hotel_enrichment_schema.sql`.
- **No agent runtime modification** — main doc positions this pipeline as `enrich_hotel` tool inside Data Ingestion Agent.
- **No production calls** — Phase 1 is documentation + architecture only.
- **No scraping fetches** — explicit hard rule (§9.3).
- **No transactional Booking endpoints** — explicit hard rule (§9.2).
- **No touching report-system / underwriting / synchronization** — same boundary as main doc §14.

---

## 12 · Next phases (informational)

| Phase | Output | Trigger |
|---|---|---|
| 1 (this doc + main doc) | Architecture + provider layer documented | Operator sign-off + plan tier confirmed |
| 2 | RapidAPI client implementation (`apps/web/src/lib/enrichment/providers/booking-rapidapi/`); E0/E1/E2 wired; smoke pilot (50 Madrid hotels manually triggered) | Phase 1 sign-off + RAPIDAPI_BOOKING_KEY provisioned |
| 3 | E3 + E4 + E5 wired; gallery download; reviews ingest into `hotel_review_snapshot` (new table) | Phase 2 stable + reviews scope confirmed |
| 4 | Fallback dispatchers (Google Places, hotel website, Tripadvisor, Wikidata) per main doc §6 | Phase 3 stable |
| 5 | Cross-source conflict-resolution UI; curator console; sibling-listing relationship table | Phase 4 stable + institutional pilot |
| 6 | Spain full-portfolio sweep + nightly refresh + Match Engine integration | Phase 5 stable + tier upgrade to Ultra+ |

---

## 13 · Reference — strict boundaries this sidecar respects

- This file lives at `docs/hotel-intelligence/madrid-enrichment-rapidapi-booking-v1.md`.
- This file references `docs/hotel-intelligence/madrid-enrichment-architecture-v1.md` by section number only.
- This file does **NOT** modify any other doc, code, schema, route, or component.
- This file is part of branch `feature/hotel-enrichment-pipeline` and does not affect `main` until merged.
- This file is the foundation of the **Hotel Intelligence Layer** — HotelVALORA's proprietary canonical hotel knowledge graph. Provider-specific implementations live as siblings to this file; the canonical layer stays pure.
