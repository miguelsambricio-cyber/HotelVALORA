# Madrid Hotel Enrichment Pipeline — Architecture v1

**Workstream:** `feature/hotel-enrichment-pipeline` (parallel — independent of underwriting deploy freeze and report synchronization).
**Phase:** 1 — architecture only. **No mass scraping yet.**
**Scope:** Institutional-grade canonical enrichment pipeline for Madrid hotel inventory, designed to scale to all HotelVALORA target markets.
**Author:** Hotel Intelligence Data Agent.
**Status:** Draft v1 — pending review before any ingestion code lands.

---

## 0 · Positioning in the HotelVALORA stack

This pipeline is **CORE INFRASTRUCTURE**, not a side feature. It produces the canonical `hotel_canonical` entity that downstream surfaces consume read-only:

| Consumer | Reads from canonical |
|---|---|
| CompSet builder | name, geo, rooms, brand, segment, amenities |
| Underwriting (TS engine, frozen) | rooms, segment, classification → cap-rate selection |
| Library institutional tables | full canonical row (39/40 col table) |
| Market Overview reports | brand/segment/operator aggregations |
| Match engine (🟢🟡🔴) | canonical fields scored against `lib/investment` criteria |

**Separation of concerns vs existing layers:**

| Layer | Domain | Path | Relationship |
|---|---|---|---|
| `docs/intelligence/` | News + macro market intel (CoStar/STR/news ingestion) | existing | adjacent, not coupled |
| `docs/ai-agents/` | AI Operations Layer (agent runtime, permissions, memory) | existing | this pipeline runs **inside** Data Ingestion Agent |
| `docs/hotel-intelligence/` | **Per-hotel canonical enrichment (this doc)** | new | new vertical |

The Data Ingestion Agent (Tier 1, already runtime-bootstrapped) gains a new tool: `enrich_hotel`. This pipeline is its implementation contract.

---

## 1 · Canonical hotel schema (institutional-grade)

The canonical row is the single source of truth. Every field is provenance-tracked, confidence-scored, and append-only-versioned through `hotel_field_provenance`.

### 1.1 Core entity — `hotel_canonical`

```sql
CREATE TABLE hotel_canonical (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  canonical_name        TEXT NOT NULL,
  legal_name            TEXT,
  brand                 TEXT,                  -- "Marriott", "Hilton", "Independent"
  brand_family          TEXT,                  -- "Marriott Bonvoy", "Hilton Honors"
  operator              TEXT,                  -- managing entity
  operator_type         operator_type_enum,    -- franchise | managed | owned | lease
  chain_scale           chain_scale_enum,      -- luxury | upper_upscale | upscale | upper_midscale | midscale | economy | independent

  -- Classification
  star_rating           SMALLINT CHECK (star_rating BETWEEN 1 AND 5),
  hotel_type            hotel_type_enum,       -- urban | resort | airport | extended_stay | flex_living | aparthotel | boutique
  segment               segment_enum,          -- luxury | upper_upscale | upscale | upper_midscale | midscale | economy

  -- Location (Madrid Phase 1 scope, extensible)
  address_line1         TEXT,
  address_line2         TEXT,
  city                  TEXT NOT NULL,
  city_normalized       TEXT NOT NULL,         -- alias-resolved (28 Madrid municipios mapped to "Madrid")
  postal_code           TEXT,
  country_code          CHAR(2) NOT NULL,      -- ISO-3166-1
  region                TEXT,                  -- "Comunidad de Madrid"
  neighborhood          TEXT,                  -- "Salamanca", "Chamberí", "Centro"
  market_id             UUID REFERENCES market(id),         -- CoStar market FK
  submarket_id          UUID REFERENCES submarket(id),      -- CoStar submarket FK
  lat                   NUMERIC(9,6),
  lng                   NUMERIC(9,6),
  geom                  GEOGRAPHY(POINT, 4326),

  -- Capacity
  total_rooms           SMALLINT,
  total_keys            SMALLINT,              -- rooms + apartments + suites unified count
  room_type_mix         JSONB,                 -- { "standard": 80, "deluxe": 30, "suite": 10 }
  meeting_rooms_count   SMALLINT,
  meeting_space_sqm     NUMERIC(10,2),

  -- Amenities (canonical 14-key bitmap — aligned with library/amenity-icon-cell.tsx)
  amenities             JSONB NOT NULL DEFAULT '{}'::jsonb,
                        -- { bar, restaurant, rooftop, spa, gym, pool, parking, meet,
                        --   business_center, kids_club, beach_access, golf, casino, marina }

  -- Reviews snapshot (cross-source, last refresh per source tracked separately)
  review_score          NUMERIC(4,2),          -- 0–10 normalized
  review_count          INTEGER,
  primary_review_source TEXT,

  -- Operations
  year_opened           SMALLINT,
  year_renovated_last   SMALLINT,
  ownership_structure   TEXT,

  -- Contact
  website_url           TEXT,
  phone                 TEXT,
  email                 TEXT,
  booking_url           TEXT,

  -- Media (URLs; binaries in Supabase Storage)
  hero_image_path       TEXT,                  -- bucket key in hotel-media-canonical
  gallery_paths         TEXT[],

  -- External IDs (each unique per provider)
  booking_hotel_id      TEXT,
  google_place_id       TEXT,
  tripadvisor_id        TEXT,
  expedia_id            TEXT,
  agoda_id              TEXT,
  str_property_id       TEXT,
  costar_property_id    TEXT,
  wikidata_qid          TEXT,
  osm_id                TEXT,

  -- Governance / provenance
  primary_source        TEXT,                  -- source key with highest aggregate confidence
  source_confidence     JSONB NOT NULL DEFAULT '{}'::jsonb,
                        -- { "<field_name>": <0..1> }
  field_provenance_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
                        -- { "<field_name>": { source, fetched_at, confidence } }
  data_quality_tier     quality_tier_enum,     -- gold | silver | bronze | quarantined
  last_enriched_at      TIMESTAMPTZ,
  enrichment_version    INTEGER NOT NULL DEFAULT 1,

  -- Lifecycle
  status                hotel_lifecycle_enum,  -- active | closed | under_construction | planned | unverified
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

CREATE UNIQUE INDEX hotel_canonical_booking_uq ON hotel_canonical(booking_hotel_id) WHERE booking_hotel_id IS NOT NULL;
CREATE UNIQUE INDEX hotel_canonical_google_uq  ON hotel_canonical(google_place_id)  WHERE google_place_id  IS NOT NULL;
CREATE        INDEX hotel_canonical_geom_gix   ON hotel_canonical USING GIST(geom);
CREATE        INDEX hotel_canonical_city_idx   ON hotel_canonical(country_code, city_normalized) WHERE deleted_at IS NULL;
CREATE        INDEX hotel_canonical_brand_idx  ON hotel_canonical(brand_family) WHERE deleted_at IS NULL;
```

### 1.2 Supporting tables

```sql
-- Immutable raw payload history (one row per fetch)
CREATE TABLE hotel_source_record (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL,                 -- 'booking_rapidapi' | 'google_places' | 'tripadvisor' | 'website' | 'wikidata' | ...
  source_id       TEXT NOT NULL,                 -- provider-side id (e.g. booking hotel id)
  hotel_id        UUID REFERENCES hotel_canonical(id),
  payload         JSONB NOT NULL,
  payload_hash    TEXT NOT NULL,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  fetch_status    fetch_status_enum NOT NULL,    -- ok | parsed_with_warnings | parse_failed | rate_limited | not_found
  ttl_expires_at  TIMESTAMPTZ NOT NULL,          -- when re-fetch becomes eligible
  enrichment_run_id UUID
);
CREATE UNIQUE INDEX hotel_source_record_uq ON hotel_source_record(source, source_id, fetched_at);
CREATE        INDEX hotel_source_record_hash_idx ON hotel_source_record(payload_hash);

-- Append-only per-field history
CREATE TABLE hotel_field_provenance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      UUID NOT NULL REFERENCES hotel_canonical(id),
  field_name    TEXT NOT NULL,
  value         JSONB NOT NULL,                  -- typed via jsonb to keep history homogeneous
  source        TEXT NOT NULL,
  source_record_id UUID REFERENCES hotel_source_record(id),
  confidence    NUMERIC(4,3) NOT NULL,           -- [0, 1]
  fetched_at    TIMESTAMPTZ NOT NULL,
  superseded_at TIMESTAMPTZ,                     -- non-null when a later record overwrote canonical
  override_by   UUID REFERENCES auth.users(id),  -- non-null on manual curator override
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX hotel_field_prov_active_idx ON hotel_field_provenance(hotel_id, field_name) WHERE superseded_at IS NULL;

-- Per-run audit
CREATE TABLE hotel_enrichment_run (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL,
  triggered_by    TEXT NOT NULL,                 -- cron | manual | merge_trigger | conflict_resolution
  scope           JSONB NOT NULL,                -- e.g. { "city": "Madrid", "limit": 200 }
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  hotels_seen     INTEGER NOT NULL DEFAULT 0,
  hotels_inserted INTEGER NOT NULL DEFAULT 0,
  hotels_updated  INTEGER NOT NULL DEFAULT 0,
  fields_updated  INTEGER NOT NULL DEFAULT 0,
  errors_count    INTEGER NOT NULL DEFAULT 0,
  rate_limit_hits INTEGER NOT NULL DEFAULT 0,
  status          run_status_enum NOT NULL       -- running | completed | failed | partial
);

-- Likely duplicates surfaced by detector (reuses existing review-queue convention)
CREATE TABLE hotel_duplicate_candidate (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_a_id    UUID NOT NULL REFERENCES hotel_canonical(id),
  hotel_b_id    UUID NOT NULL REFERENCES hotel_canonical(id),
  score         NUMERIC(4,3) NOT NULL,
  tier          dup_tier_enum NOT NULL,          -- auto_merge | needs_review | likely_duplicate
  components    JSONB NOT NULL,                  -- { name_exact, name_fuzzy, geo, operator, rooms } each in [0,1]
  status        dup_status_enum NOT NULL DEFAULT 'pending_review',
  decided_at    TIMESTAMPTZ,
  decided_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hotel_dup_canonical_order CHECK (hotel_a_id < hotel_b_id),
  CONSTRAINT hotel_dup_pair_uq UNIQUE (hotel_a_id, hotel_b_id)
);

-- Aliases — reuse pattern from existing hotel_aliases (do NOT duplicate; FK to canonical)
-- See apps/api/app/services/alias_service.py for the inlined normalization _key() function.
```

### 1.3 Enums

`operator_type_enum`, `chain_scale_enum`, `hotel_type_enum`, `segment_enum`, `quality_tier_enum`, `hotel_lifecycle_enum`, `fetch_status_enum`, `run_status_enum`, `dup_tier_enum`, `dup_status_enum`.

Migration filename (next sequential after `0023_relationship_contacts_v2_taxonomy.sql`): **`0024_hotel_enrichment_schema.sql`**.

---

## 2 · Source hierarchy

Authority is **per-field**, not global. A source is excellent at some fields, poor at others. A single global ranking would systematically degrade quality.

### 2.1 Source tiers (intrinsic authority weight)

| Tier | Weight | Source | Strengths | Weaknesses |
|---|---|---|---|---|
| S | 1.00 | Operator/PMS feed (when contracted) | Authoritative for rooms, ADR, OCC | Not available for most properties |
| A | 0.85 | **Booking.com Pro (RapidAPI) — primary** | Structured: name, address, rooms, amenities, photos, review_score, geo, booking_id | Marketing-skewed descriptions; partial CAPEX/operator info |
| B | 0.80 | Official hotel website | Brand-controlled: legal_name, year_opened, exact amenity list, contact, gallery | No common schema; multilingual; layout drift |
| C | 0.70 | Google Places API | Geo precision, phone, hours, current review_score, place_id | Limited rooms/segment info |
| D | 0.65 | Tripadvisor | Reviews, ranking, amenity flags, photos | Crowdsourced noise; rate-limit unfriendly |
| E | 0.60 | Expedia / Agoda | Cross-validation pricing, occupancy hints | Same payload family as Booking; risk of correlated errors |
| F | 0.50 | Wikidata / OpenStreetMap | year_opened, operator history, structured links | Sparse coverage for chain properties |
| Z | 0.35 | Targeted scraping | Last-resort fill for missing fields | Brittle, legal/ToS-sensitive, requires per-domain consent check |

### 2.2 Field-by-field authority map

| Field | Tier order (highest authority first) |
|---|---|
| `canonical_name` | A → B → C → D → F |
| `legal_name` | B → F → A |
| `brand` / `brand_family` | B → A → F |
| `operator` | S → B → F → A |
| `chain_scale` | S → A → (derived from brand_family lookup table) |
| `total_rooms` | S → B → A → D → F |
| `room_type_mix` | S → B → A |
| `lat`, `lng`, `geom` | C → A → F |
| `address_*`, `postal_code` | C → A → B |
| `year_opened` | B → F → A |
| `amenities[14 keys]` | A → D → B |
| `star_rating` | A → B |
| `review_score`, `review_count` | A and C and D in parallel — stored separately, never fused into one number |
| `website_url`, `phone`, `email` | B → C → A |
| `meeting_space_sqm` | B → A |
| External IDs | self-authoritative per source |

### 2.3 Booking-first principle

Phase 1 anchors **Booking RapidAPI** as the bootstrap source: it gives the broadest single-call coverage. Other sources are invoked only for fields Booking leaves null OR for cross-validation triggers (§3.3).

---

## 3 · Confidence model — field-level

### 3.1 Components

For each field write, confidence is computed as:

```
confidence = clamp(0, 1,
    tier_weight                       -- intrinsic source authority (§2.1)
  × freshness_decay                   -- linear decay from 1.0 → 0.5 over 365 days
  × validation_multiplier             -- 1.0 if regex/range/dictionary OK, else 0.80
  + agreement_bonus                   -- +0.10 per matching independent source, cap +0.25
)
```

Manual curator override pins confidence to `1.00` and freezes the field (`override_by` non-null in `hotel_field_provenance`); subsequent automated writes are recorded in provenance but do **not** overwrite the canonical value.

### 3.2 Validation rules (subset)

| Field | Rule |
|---|---|
| `lat` | -90 ≤ x ≤ 90, 6-decimal precision |
| `lng` | -180 ≤ x ≤ 180 |
| `total_rooms` | 1 ≤ x ≤ 3000 |
| `star_rating` | 1 ≤ x ≤ 5 (integer) |
| `postal_code` | regex `^\d{5}$` for ES |
| `country_code` | ISO-3166-1 alpha-2 |
| `year_opened` | 1700 ≤ x ≤ current_year |
| `review_score` | 0 ≤ x ≤ 10 (normalize 0–5 sources × 2) |
| `phone` | E.164 after normalization |
| `email` | RFC 5322 + DNS MX check |

### 3.3 Cross-source corroboration

Two sources independently report the same `total_rooms` (within ±2%) → +0.10 bonus on top of the leading tier weight. Three sources agreeing → +0.20. Cap +0.25. Disagreement does NOT subtract — disagreement triggers conflict-resolution flow (§4.4) instead.

### 3.4 Routing thresholds

| Confidence | Routing |
|---|---|
| ≥ 0.92 | Auto-write to canonical |
| 0.80 – 0.92 | Auto-write; flag as `needs_observation` (re-fetch within 30 days to confirm) |
| 0.65 – 0.80 | Auto-write; enqueue `hotel_review_queue` for human verification |
| < 0.65 | Do NOT write to canonical; store in `hotel_field_provenance` only; surface in `hotel_review_queue` (`low_confidence` type) |

Aligned with existing `/review` page thresholds (`apps/api/app/services/dedup_service.py`: auto_merge ≥0.92, needs_review ≥0.80, likely_duplicate ≥0.65).

---

## 4 · Duplicate detection strategy

### 4.1 Two-layer architecture

**Layer 1 — Blocking (O(N))** narrows candidates without N×N comparison:

```
block_key = SHA1(
    soundex(normalize_name(name))
  + lower(city_normalized)
  + country_code
)
```

A new payload only competes against canonical rows sharing the same `block_key`. For Madrid (~1.5–2k hotels) typical block size is < 30 → tractable.

### 4.2 Layer 2 — Composite scoring

Reuses the validated weighting from `dedup_service.py` (preserve the institutional rubric):

| Component | Weight | Computation |
|---|---|---|
| `name_exact` | 35% | 1.0 if Jaro-Winkler ≥ 0.95 after `normalize_for_matching()`, else 0 |
| `name_fuzzy` | 30% | linear in Jaro-Winkler over [0.80, 0.95]; below 0.80 → 0 |
| `geo_proximity` | 20% | haversine: < 50 m = 1.0, < 200 m = 0.7, < 500 m = 0.4, ≥ 500 m = 0 |
| `operator_match` | 10% | 1.0 exact operator key match, 0.5 brand_family match, 0 otherwise |
| `room_count_match` | 5% | 1.0 if within ±5%, 0.5 if within ±15%, 0 otherwise |

**Tiers preserved from existing dedup engine:**
- ≥ 0.92 → `auto_merge`
- ≥ 0.80 → `needs_review` (enqueued in `hotel_duplicate_candidate`)
- ≥ 0.65 → `likely_duplicate` (recorded, surfaces in low-priority queue)
- < 0.65 → discarded

Canonical pair order: `hotel_a_id < hotel_b_id` (UUID order) — same convention as existing engine, satisfies `UniqueConstraint`.

### 4.3 Aliases

Renames and rebrands (`Hotel Princesa Plaza Madrid` → `Hotel Princess Madrid` → `NH Collection Princesa`) are absorbed by the existing `hotel_aliases` table. A canonical row owns N aliases, each surfacing from at least one source. Normalization happens via `_key()` (inlined per existing pattern; do NOT depend on `services/data_pipeline` from `apps/api`).

### 4.4 Conflict resolution policy

When a new write disagrees with the canonical value:

| Trigger | Resolution |
|---|---|
| New value confidence ≥ canonical confidence + 0.10 | Auto-supersede; canonical updated; previous row marked `superseded_at`; `audit_log` event `field.superseded` |
| New value confidence within ±0.10 of canonical | Record provenance, do NOT update canonical, route to review_queue (`conflict`) |
| New value confidence < canonical − 0.10 | Record provenance only; canonical untouched |
| Manual override exists | Always preserved; new writes record but never supersede |

---

## 5 · Data normalization strategy

Reuses `services/data_pipeline/pipeline/cleaning/multilingual.py` (ES/EN/FR/PT/DE). Per the AI_CONTEXT rule (§Data Pipeline), logic is **re-implemented inline** in any service that needs it — no cross-service import.

### 5.1 Pipeline order

1. **Encoding** — UTF-8 NFC, strip BOM, collapse internal whitespace.
2. **Multilingual normalize** — `normalize_for_matching(text, remove_stopwords=True)` for matching keys; `remove_stopwords=False` for display.
3. **Address normalize**
   - Street type abbreviations: `C/` → `Calle`, `Avda.` → `Avenida`, `Pza.` → `Plaza`.
   - Postal code regex `^\d{5}$` for ES; reject otherwise → low confidence.
   - City alias table — 28 Madrid municipios (Alcobendas, Pozuelo, Las Rozas, Majadahonda, San Sebastián de los Reyes, Getafe, …) mapped to `city_normalized = "Madrid"` when context is metropolitan; otherwise preserved.
4. **Geo normalize** — round lat/lng to 6 decimals; reject if (0,0) or null-island; build `geom = ST_MakePoint(lng, lat)::geography`.
5. **Numeric parse** — `"120 rooms"`, `"120 hab."`, `"120 keys"`, `"120-key"` → integer 120. Currency parse normalizes to EUR for Madrid.
6. **Star rating parse** — `"5*"`, `"5-star"`, `"5 estrellas"`, `"★★★★★"`, `"Five-star"` → 5.
7. **Operator/brand normalize** — chain lookup table (Marriott Intl., Marriott International, Marriott → `MARRIOTT`); seeded from existing CoStar reference data in `services/costar/`.
8. **Amenity normalize** — free-text amenity strings mapped to canonical 14-key set used by `apps/web/src/components/library/amenity-icon-cell.tsx`. Anything outside the canonical set is preserved in `raw_payload` only.
9. **Output** — canonical row update (typed) + `hotel_source_record.payload` preserves raw for audit.

### 5.2 Madrid Phase 1 specifics

| Concern | Decision |
|---|---|
| Language | Source payloads accepted in ES + EN; both normalized identically |
| Currency | EUR (assumed) |
| Postal codes | ES 5-digit, ranges 28001–28055 for Madrid municipio, 28xxx for Comunidad |
| Markets | Map to CoStar Markets: `Madrid Central`, `Madrid Periphery`, `Madrid Airport` |
| Submarkets | Map to neighborhoods + CoStar submarket FKs |
| Address format | `Calle <name>, <number>` — number after comma is canonical |

---

## 6 · Enrichment flow

### 6.1 End-to-end DAG (per hotel)

```
                       ┌────────────────────────────────┐
                       │  Booking RapidAPI (primary)    │
                       │  - list_search(city=Madrid)    │
                       │  - get_hotel_details(id)       │
                       └──────────────┬─────────────────┘
                                      │
                                      ▼
                       ┌────────────────────────────────┐
                       │  Parse + persist source_record │
                       │  (immutable, hashed, TTL-set)  │
                       └──────────────┬─────────────────┘
                                      │
                                      ▼
                       ┌────────────────────────────────┐
                       │  Normalize (§5)                │
                       └──────────────┬─────────────────┘
                                      │
                                      ▼
                       ┌────────────────────────────────┐
                       │  Duplicate detection (§4)      │
                       │  - block_key                   │
                       │  - composite score             │
                       └────────┬──────────┬────────────┘
                                │          │
            auto_merge / no-dupe│          │needs_review / likely_duplicate
                                ▼          ▼
              ┌───────────────────┐   ┌───────────────────────────┐
              │  Upsert canonical │   │  Insert duplicate_candidate│
              │  (per-field merge │   │  Queue for human review    │
              │   by confidence)  │   └───────────────────────────┘
              └─────────┬─────────┘
                        │
                        ▼
              ┌───────────────────┐
              │  Field coverage   │
              │  audit            │
              └─────────┬─────────┘
                        │
              missing critical fields?
                        │ yes
                        ▼
              ┌───────────────────────────────────────────┐
              │  Fallback dispatch (priority order):       │
              │  1. Google Places API (geo/contact)        │
              │  2. Hotel website (year_opened/operator)   │
              │  3. Tripadvisor (amenities/reviews)        │
              │  4. Wikidata/OSM (year_opened/operator)    │
              │  5. Targeted scraping (last resort, gated) │
              └─────────┬──────────────────────────────────┘
                        │
                        ▼
              ┌───────────────────┐
              │  Repeat parse →   │
              │  normalize → score│
              │  → conflict policy│
              └─────────┬─────────┘
                        │
                        ▼
              ┌───────────────────┐
              │  Field-level conf │
              │  scoring (§3)     │
              └─────────┬─────────┘
                        │
                        ▼
              ┌───────────────────┐
              │  audit_log per    │
              │  field changed    │
              │  (uses existing   │
              │  AuditService)    │
              └─────────┬─────────┘
                        │
                        ▼
              ┌───────────────────┐
              │  Compute quality  │
              │  tier (gold/      │
              │  silver/bronze)   │
              └───────────────────┘
```

### 6.2 Critical-field set (drives fallback dispatch)

`canonical_name, address_line1, city, country_code, lat, lng, total_rooms, star_rating, brand_family, segment` → if any is null OR confidence < 0.80 after Booking pass, fallback chain triggers.

### 6.3 Quality tier computation

After enrichment, an aggregate tier is assigned:

| Tier | Condition |
|---|---|
| `gold` | All critical fields present at confidence ≥ 0.85; ≥ 2 independent sources corroborating any 3 fields |
| `silver` | All critical fields present at confidence ≥ 0.70 |
| `bronze` | ≥ 70% of critical fields at any confidence |
| `quarantined` | Critical fields missing OR validation failures → excluded from Library/Reports until reviewed |

---

## 7 · Supabase storage proposal

### 7.1 Tables

Migration **`0024_hotel_enrichment_schema.sql`** introduces (full DDL in §1):

- `hotel_canonical`
- `hotel_source_record`
- `hotel_field_provenance`
- `hotel_enrichment_run`
- `hotel_duplicate_candidate`
- `hotel_enrichment_job` (queue — §9)
- `hotel_enrichment_dlq` (dead-letter — §10)
- `rate_limit_state` (provider × window state — §8)
- All ten enums (§1.3)

Plus extension of existing `hotel_aliases` with FK to `hotel_canonical(id)` (additive — does NOT touch underwriting tables or report tables).

### 7.2 Storage buckets

| Bucket | Purpose | Access |
|---|---|---|
| `hotel-media-raw` | Versioned raw images from providers (one path per `source_record_id`) | Service role write; no public read |
| `hotel-media-canonical` | Curated hero + gallery (referenced by canonical row) | Service role write; public read via signed URLs |

### 7.3 Indexes (summary)

- `hotel_canonical(geom)` GIST — radius / bbox queries for CompSet builder
- `hotel_canonical(country_code, city_normalized)` partial — market browsing
- `hotel_canonical(brand_family)` partial — brand aggregation
- Unique partial indexes on each external_id field (null-safe)
- `hotel_source_record(source, source_id, fetched_at)` unique — natural dedup
- `hotel_field_provenance(hotel_id, field_name) WHERE superseded_at IS NULL` — fast canonical lookup

### 7.4 RLS

- `hotel_canonical` — read access for authenticated users; tier-gated columns enforced at app layer (Library already implements locked-cell pattern).
- All `_record`, `_provenance`, `_run`, `_job`, `_dlq` tables — service-role only.
- `hotel_duplicate_candidate` — service role write; read access for users with `data_curator` role (future).

### 7.5 Backfill / migration order

1. Apply migration `0024_hotel_enrichment_schema.sql` (idempotent guards).
2. Seed `block_key` for any pre-existing `hotel_alias` rows (if relevant; this workstream does not depend on those).
3. Backfill `hotel_canonical` from existing CompSet/CoStar property records ONLY where unambiguous (auto_merge tier).
4. Begin Booking pull (Phase 2 — out of scope for this doc).

**Zero touch on `valuation`, `underwriting`, `report_*` tables.**

---

## 8 · Rate limit strategy

### 8.1 Provider-specific budgets

| Provider | RPS | Daily cap (starter) | Notes |
|---|---|---|---|
| Booking RapidAPI | 2 req/s | 500 req/day (plan-dependent) | Hard quota; 429 on overrun |
| Google Places API | 10 req/s | 100k/month | Cost: $0.017/Place Details |
| Tripadvisor (rapid/scrape hybrid) | 0.5 req/s | 1000 req/day | ToS-sensitive — official API preferred |
| Hotel websites (scraping) | 1 req / 4–8 s per domain | n/a | robots.txt honored; user-agent identifies HotelVALORA |
| Wikidata SPARQL | 1 req/s | n/a | Bulk SPARQL queries preferred over per-row |
| OSM Overpass | 1 req / 10 s | n/a | Self-hosted mirror later |

### 8.2 Mechanisms

- **Token bucket per provider** persisted in `rate_limit_state(provider, window_start, used, reset_at)`. Worker reads → decrements → writes.
- **Exponential backoff on 429/5xx**: `delay = min(60, 2^attempt) ± jitter(30%)`, max 6 attempts before DLQ.
- **Circuit breaker**: 5 consecutive 5xx on a single source → open circuit 15 minutes; half-open trial allowed after 15min.
- **Adaptive concurrency**: halve worker concurrency on each 429; restore by +1 worker per 100 consecutive 2xx.

### 8.3 Cost guardrails

Per-run cap reuses the AI Operations Layer cost guardrail pattern (`docs/ai-agents/ai-agent-cost-guardrails.md`): each `enrichment_run` declares a budget (max requests / max EUR / max wall-clock); worker halts at cap and resumes next cron tick.

---

## 9 · Queue / batching strategy

### 9.1 Queue table

```sql
CREATE TABLE hotel_enrichment_job (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID REFERENCES hotel_canonical(id),         -- null for discovery jobs
  source          TEXT NOT NULL,
  job_type        job_type_enum NOT NULL,                       -- discover | enrich | refresh | conflict_recheck
  priority        SMALLINT NOT NULL DEFAULT 5,                  -- 1 highest, 9 lowest
  scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempt_count   SMALLINT NOT NULL DEFAULT 0,
  status          job_status_enum NOT NULL DEFAULT 'pending',   -- pending | leased | done | failed | dlq
  leased_by       TEXT,
  leased_at       TIMESTAMPTZ,
  last_error      TEXT,
  dedup_key       TEXT NOT NULL,                                -- (source, source_id, day-bucket) — see §10
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX hotel_job_ready_idx ON hotel_enrichment_job(scheduled_for, priority) WHERE status = 'pending';
CREATE UNIQUE INDEX hotel_job_dedup_uq ON hotel_enrichment_job(dedup_key) WHERE status IN ('pending', 'leased');
```

### 9.2 Worker

- Vercel Cron entry triggers `/api/cron/hotel-enrichment` every N minutes; the route leases jobs ready now, batched per provider budget.
- Worker concurrency per provider matches the §8 RPS bucket.
- Batch size per tick: `floor(provider_budget_remaining × 0.10)` — never burn full budget in one tick.

### 9.3 Priority lanes

| Priority | Use case |
|---|---|
| 1 | Manual curator-triggered refresh |
| 2 | Conflict-recheck (after dispute) |
| 3 | New hotel discovered, no canonical row yet |
| 4 | Critical field missing on canonical |
| 5 | Stale refresh (default) |
| 7 | Background full-rotation refresh |

### 9.4 Madrid Phase 1 bootstrap plan (not yet executed — for reference)

1. `discover` job (Booking search by city=Madrid, paginated) — emits N `enrich` jobs.
2. `enrich` jobs draw down Booking budget over ~3–4 days.
3. Fallback `enrich` jobs (Google, website, Tripadvisor) emitted only for canonical rows with critical-field gaps.
4. Refresh cadence kicks in after first full pass (§11).

---

## 10 · Error recovery strategy

### 10.1 Error taxonomy

| Class | Recoverable? | Action |
|---|---|---|
| `NETWORK` (timeout, DNS, TCP reset) | Yes | Retry with exponential backoff (§8.2) |
| `RATE_LIMIT` (429) | Yes | Honor `Retry-After`; reschedule beyond reset |
| `AUTH` (401/403) | No | Halt provider; alert via Sentry; queue manual review |
| `NOT_FOUND` (404) | No | Record `fetch_status='not_found'`; canonical untouched; reschedule per provider TTL |
| `PARSE` (schema mismatch) | Partial | Persist payload; emit Sentry breadcrumb; route to DLQ |
| `VALIDATION` (field rejected) | Partial | Field-level: skip that field, continue others; route low-confidence to review |
| `BUDGET_EXCEEDED` | Soft | Halt run; record state; resume next tick |

### 10.2 Dead-letter queue

```sql
CREATE TABLE hotel_enrichment_dlq (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL,
  source_id       TEXT,
  job_id          UUID REFERENCES hotel_enrichment_job(id),
  error_class     TEXT NOT NULL,
  error_message   TEXT NOT NULL,
  payload_snapshot JSONB,
  attempt_count   SMALLINT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES auth.users(id)
);
```

Probe page `/dev/hotel-enrichment-dlq` (mirrors existing `/dev/intelligence-test` and `/dev/ai-ops` patterns) surfaces DLQ rows for operator inspection.

### 10.3 Idempotency invariants

1. `hotel_source_record` always appends; never updates. Re-fetching the same payload within TTL is a no-op via natural dedup key `(source, source_id, fetched_at-day)`.
2. `hotel_canonical` is updated only if the candidate write strictly improves confidence per §4.4.
3. `hotel_enrichment_job(dedup_key)` partial unique index prevents duplicate active jobs.
4. All canonical mutations write `audit_log` entries inside the same DB transaction — leveraging existing `AuditService(db).log(...)` pattern.

### 10.4 Partial-data preservation

If a fetch succeeds but only N of M fields parse:
- N fields written through normal flow.
- M-N fields marked `parse_failed` in `hotel_source_record.fetch_status='parsed_with_warnings'`.
- Canonical row flagged `partial_data` in `field_provenance_summary`.
- No regression — canonical never overwritten with null.

---

## 11 · Incremental refresh strategy

### 11.1 Per-source TTL

| Source | Refresh cadence | Rationale |
|---|---|---|
| Booking | 7 days | Pricing/availability changes weekly |
| Google Places | 30 days | Reviews trickle; place_id stable |
| Tripadvisor | 30 days | Reviews + ranking shift slowly |
| Hotel website | 90 days | Brand pages change rarely |
| Wikidata | 180 days | Reference data is near-static |
| OSM | 180 days | Slow-moving |

### 11.2 Stale view + scheduler

```sql
CREATE VIEW hotel_stale_v AS
SELECT
  h.id,
  h.canonical_name,
  h.city,
  p.source,
  MAX(p.fetched_at) AS last_fetched_at,
  EXTRACT(EPOCH FROM (now() - MAX(p.fetched_at))) / 86400 AS days_since
FROM hotel_canonical h
LEFT JOIN hotel_field_provenance p
       ON p.hotel_id = h.id
WHERE h.deleted_at IS NULL
GROUP BY h.id, h.canonical_name, h.city, p.source;
```

Nightly cron picks rows where `days_since > ttl[source]`, builds `refresh` jobs (priority 5), and enqueues respecting daily budget.

### 11.3 Forced-refresh triggers

- Manual curator override committed → re-fetch all sources for that hotel.
- Alias merge accepted → re-score conflict candidates.
- Conflict resolved with `superseded` decision → schedule re-fetch from losing source within 24h to confirm.
- Quality tier flipped to `quarantined` → re-fetch from Tier-A/B sources within 24h.

### 11.4 Diff logging

Every canonical mutation writes a structured diff into `audit_log`:

```json
{
  "event": "hotel.canonical.field_updated",
  "hotel_id": "...",
  "field": "total_rooms",
  "before": { "value": 178, "source": "booking_rapidapi", "confidence": 0.85, "fetched_at": "2026-04-01T..." },
  "after":  { "value": 180, "source": "official_website", "confidence": 0.87, "fetched_at": "2026-05-19T..." },
  "run_id": "..."
}
```

This reuses the existing `audit_log` table and `AuditService` (no schema changes; only new event types added to the dotted taxonomy).

---

## 12 · Deliverables boundary (Phase 1)

| In scope | Out of scope (later phases) |
|---|---|
| This architecture document | Any scraping execution |
| Migration draft `0024_hotel_enrichment_schema.sql` (DDL only, not yet applied) | Booking RapidAPI client implementation |
| ENTRYPOINTS.md row + docs/changelog.md entry | Worker / cron implementation |
| Branch `feature/hotel-enrichment-pipeline` | RLS deployment |
| | Front-end probe page |
| | Library integration |

---

## 13 · Open questions for review

1. **Booking RapidAPI plan tier** — confirm starter quota (500/day assumed). Higher plan unlocks Madrid full sweep in 1 day vs 4 days.
2. **Tripadvisor official API vs scraping hybrid** — ToS preference and budget for API access.
3. **Curator role** — should `data_curator` be a Supabase role or a tier flag on existing user? Affects RLS in §7.4.
4. **Scope creep guardrail** — confirm Madrid-only Phase 1; Barcelona/Valencia/Lisbon explicitly deferred.
5. **CoStar property_id linkage** — back-link to CoStar markets/submarkets is in schema; do we wait for CoStar master refresh or accept null FKs Phase 1?

---

## 14 · Non-goals

- This pipeline does **NOT** ingest news, market reports, or transaction data — those live in `docs/intelligence/` and `services/transactions/`.
- This pipeline does **NOT** compute valuations — handed off to underwriting engine (currently frozen).
- This pipeline does **NOT** modify the report-system synchronization layer.
- This pipeline does **NOT** consume from or emit to the report registry in `src/lib/report/sections.ts`.

---

## 15 · Next phases (informational)

| Phase | Output | Trigger |
|---|---|---|
| 1 (current) | This doc, approved | Sign-off on architecture |
| 2 | Migration `0024` applied; Supabase storage buckets provisioned; RLS policies | Phase 1 sign-off |
| 3 | Booking RapidAPI client + parser; `enrich` worker; first 50-hotel Madrid pilot | Phase 2 complete |
| 4 | Fallback dispatchers (Google Places, website, Tripadvisor) | Phase 3 stable |
| 5 | Refresh scheduler + DLQ probe page | Phase 4 stable |
| 6 | Library integration (canonical reads); CompSet builder integration | Phase 5 stable |
| 7 | Expansion to Barcelona / Valencia / Lisbon | Phase 6 stable |
