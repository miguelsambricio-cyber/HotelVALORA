# Coverage Measurement Spec — v1

**Workstream:** `feature/hotel-enrichment-pipeline`.
**Status:** Specification — concrete SQL views ship inside migration `0024_hotel_enrichment_schema.sql`.
**Drives:** Operator-facing 80% Madrid coverage metric.
**Companion to:** [`institutional-feature-coverage-targets-v1.md`](./institutional-feature-coverage-targets-v1.md) (defines what is measured).

---

## 1 · Surfaces

Three reads on the same underlying data:

1. **Per-hotel row** (`hotel_coverage_v`): one row per hotel, computed coverage per tier + per-tier conf-weighted score + pass/fail flags.
2. **Per-market summary** (`hotel_coverage_market_v`): aggregated counts and percentages per `(country_code, city_normalized)`.
3. **Madrid headline metric** (`hotel_coverage_madrid_v`): single-row materialised summary for dashboard widgets and operator status reports.

All three are **views** (not tables) — always current; no separate refresh.

---

## 2 · Per-hotel view — `hotel_coverage_v`

### 2.1 Columns

| Column | Type | Meaning |
|---|---|---|
| `hotel_id` | uuid | FK `hotel_canonical(id)` |
| `canonical_name` | text | passthrough |
| `country_code` | char(2) | passthrough |
| `city_normalized` | text | passthrough |
| `data_quality_tier` | quality_tier_enum | passthrough |
| `t0_filled` | smallint | count of TIER-0 fields populated AND valid (0..8) |
| `t0_complete` | boolean | `t0_filled = 8` |
| `t1_filled` | smallint | count of TIER-1 fields populated at conf ≥ 0.70 (0..12) |
| `t1_pct` | numeric(5,2) | `t1_filled / 12` |
| `t1_passing` | boolean | `t1_filled >= 11` (≥ 92%) |
| `t2_filled` | smallint | count of TIER-2 fields populated at conf ≥ 0.70 (0..19) |
| `t2_pct` | numeric(5,2) | `t2_filled / 19` |
| `t2_passing` | boolean | `t2_filled >= 16` (≥ 84%) |
| `institutional_passing` | boolean | `t0_complete AND t1_passing AND t2_passing` |
| `last_enriched_at` | timestamptz | passthrough |

### 2.2 DDL sketch

```sql
create or replace view public.hotel_coverage_v as
with field_conf as (
  -- Pull most recent active confidence per (hotel, field)
  select
    p.hotel_id,
    p.field_name,
    p.confidence
  from public.hotel_field_provenance p
  where p.superseded_at is null
)
select
  h.id                                              as hotel_id,
  h.canonical_name,
  h.country_code,
  h.city_normalized,
  h.data_quality_tier,

  -- TIER-0 (validity, not just presence)
  (
    (h.booking_hotel_id is not null)::int +
    (h.canonical_name   is not null)::int +
    (h.city             is not null)::int +
    (h.city_normalized  is not null)::int +
    (h.country_code     is not null and length(h.country_code) = 2)::int +
    (h.lat              is not null and h.lat  between -90 and 90)::int +
    (h.lng              is not null and h.lng  between -180 and 180)::int +
    (h.geom             is not null)::int
  ) as t0_filled,

  -- TIER-1 (presence × conf ≥ 0.70)
  (
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'star_rating'        and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'total_rooms'        and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'segment'            and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'hotel_type'         and c.confidence >= 0.70))::int +
    (case when (select count(*) from jsonb_object_keys(h.amenities)) >= 5 then 1 else 0 end) +  -- ≥5 amenity keys explicit
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'review_score'       and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'review_count'       and c.confidence >= 0.80))::int +
    (h.booking_url        is not null)::int +
    (h.primary_source     is not null)::int +
    (h.data_quality_tier  is not null)::int +
    (h.status             is not null)::int +
    (h.enrichment_version >= 1)::int
  ) as t1_filled,

  -- TIER-2 (presence × conf ≥ 0.70)
  (
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'brand'              and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'brand_family'       and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'chain_scale'        and c.confidence >= 0.70))::int +
    (h.operator_id        is not null)::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'operator_type'      and c.confidence >= 0.70))::int +
    (case when (select count(*) from jsonb_object_keys(h.amenities)) >= 14 then 1 else 0 end) +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'address_line1'      and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'postal_code'        and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'neighborhood'       and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'room_type_mix'      and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'meeting_rooms_count' and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'meeting_space_sqm'   and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'year_opened'         and c.confidence >= 0.65))::int +
    (h.hero_image_path    is not null)::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'website_url'        and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'phone'              and c.confidence >= 0.70))::int +
    (h.google_place_id    is not null)::int +
    (h.market_id          is not null)::int +
    (h.submarket_id       is not null)::int
  ) as t2_filled,

  h.last_enriched_at

from public.hotel_canonical h
where h.deleted_at is null;
```

Wrap the integer counts with computed percentages and passing flags in a second view layered on this (kept separate for readability):

```sql
create or replace view public.hotel_coverage_scored_v as
select
  v.*,
  (v.t0_filled = 8)                                          as t0_complete,
  round(v.t1_filled::numeric / 12, 4)                        as t1_pct,
  (v.t1_filled >= 11)                                        as t1_passing,
  round(v.t2_filled::numeric / 19, 4)                        as t2_pct,
  (v.t2_filled >= 16)                                        as t2_passing,
  ((v.t0_filled = 8) and (v.t1_filled >= 11) and (v.t2_filled >= 16))
    as institutional_passing
from public.hotel_coverage_v v;
```

---

## 3 · Per-market view — `hotel_coverage_market_v`

```sql
create or replace view public.hotel_coverage_market_v as
select
  s.country_code,
  s.city_normalized,
  count(*)                                          as hotels_total,
  count(*) filter (where s.data_quality_tier <> 'quarantined') as hotels_non_quarantined,
  count(*) filter (where s.data_quality_tier = 'gold')         as hotels_gold,
  count(*) filter (where s.data_quality_tier = 'silver')       as hotels_silver,
  count(*) filter (where s.data_quality_tier = 'bronze')       as hotels_bronze,
  count(*) filter (where s.data_quality_tier = 'quarantined')  as hotels_quarantined,
  count(*) filter (where s.t1_passing)              as hotels_t1_passing,
  count(*) filter (where s.t2_passing)              as hotels_t2_passing,
  count(*) filter (where s.institutional_passing)   as hotels_institutional_passing,
  avg(s.t1_pct)::numeric(5,4)                       as avg_t1_pct,
  avg(s.t2_pct)::numeric(5,4)                       as avg_t2_pct,
  -- Weighted institutional coverage (headline metric)
  case
    when count(*) filter (where s.data_quality_tier <> 'quarantined') > 0 then
      round(
        (count(*) filter (where s.institutional_passing))::numeric
        / count(*) filter (where s.data_quality_tier <> 'quarantined'),
        4
      )
    else 0
  end                                               as institutional_passing_rate
from public.hotel_coverage_scored_v s
group by s.country_code, s.city_normalized;
```

---

## 4 · Madrid headline metric — `hotel_coverage_madrid_v`

```sql
create or replace view public.hotel_coverage_madrid_v as
select
  m.hotels_total,
  m.hotels_non_quarantined,
  m.hotels_gold,
  m.hotels_silver,
  m.hotels_bronze,
  m.hotels_quarantined,
  m.hotels_t1_passing,
  m.hotels_t2_passing,
  m.hotels_institutional_passing,
  m.avg_t1_pct,
  m.avg_t2_pct,
  m.institutional_passing_rate,
  -- Workstream goal: institutional_passing_rate >= 0.70
  (m.institutional_passing_rate >= 0.70)            as goal_reached
from public.hotel_coverage_market_v m
where m.country_code = 'ES'
  and m.city_normalized = 'Madrid';
```

---

## 5 · Operator-facing queries

### 5.1 Headline status

```sql
select * from public.hotel_coverage_madrid_v;
```

Returns one row. `goal_reached = true` → workstream done.

### 5.2 Madrid bottom-of-funnel — hotels close to passing but not yet

```sql
select
  s.hotel_id,
  s.canonical_name,
  s.t1_filled,
  s.t2_filled,
  s.t2_pct,
  s.data_quality_tier
from public.hotel_coverage_scored_v s
where s.country_code = 'ES'
  and s.city_normalized = 'Madrid'
  and not s.institutional_passing
  and s.t2_filled >= 12        -- close to passing (≥ 63%)
order by s.t2_filled desc, s.t1_filled desc
limit 100;
```

Drives operator-facing "what would unblock the most hotels next?" list.

### 5.3 Most-missing field across Madrid

```sql
with t2_fields as (
  select unnest(array[
    'brand', 'brand_family', 'chain_scale', 'operator_type',
    'address_line1', 'postal_code', 'neighborhood',
    'room_type_mix', 'meeting_rooms_count', 'meeting_space_sqm',
    'year_opened', 'website_url', 'phone'
  ]) as field_name
)
select
  t.field_name,
  count(*) filter (
    where exists (
      select 1 from public.hotel_field_provenance p
      where p.hotel_id = h.id
        and p.field_name = t.field_name
        and p.superseded_at is null
        and p.confidence >= 0.70
    )
  ) as filled_count,
  count(*) as total_hotels,
  round(
    count(*) filter (
      where exists (
        select 1 from public.hotel_field_provenance p
        where p.hotel_id = h.id
          and p.field_name = t.field_name
          and p.superseded_at is null
          and p.confidence >= 0.70
      )
    )::numeric / nullif(count(*), 0),
    4
  ) as coverage_pct
from public.hotel_canonical h
cross join t2_fields t
where h.deleted_at is null
  and h.country_code = 'ES'
  and h.city_normalized = 'Madrid'
  and h.data_quality_tier <> 'quarantined'
group by t.field_name
order by coverage_pct asc;
```

Identifies which TIER-2 field is the biggest blocker for hitting 80%. Drives source-prioritisation decisions.

---

## 6 · Indexes the views depend on

All already specified in migration `0024_hotel_enrichment_schema.sql`:

- `hotel_canonical(deleted_at) where deleted_at is null` partial
- `hotel_canonical(country_code, city_normalized) where deleted_at is null` partial
- `hotel_field_provenance(hotel_id, field_name) where superseded_at is null` partial
- `hotel_field_provenance(hotel_id, field_name, confidence) where superseded_at is null` covering

---

## 7 · Operator dashboard wiring (Phase 3+)

A small Next.js route (`apps/web/src/app/dev/hotel-enrichment-coverage/page.tsx`) will surface:

- Madrid headline metric card (one number, big).
- Quality-tier histogram (gold/silver/bronze/quarantined counts).
- "Close to passing" list (§5.2) — actionable.
- "Most-missing field" bar chart (§5.3) — drives next pipeline pass.

This is **scaffolded for later**; not built in this milestone. The DDL ships now so the data is queryable from the moment migration 0024 is applied.

---

## 8 · Assumptions taken (under autonomy)

1. **Amenities as a single field for the count.** The 14-key bitmap is counted as 1 TIER-2 field (with the rule "all 14 keys must be explicitly true OR false"). An alternative is to count each key separately (so 14/19 fields are amenities and brand+address etc. dilute). Chose the simpler "1 field, all-or-nothing" rule for the headline metric; the dashboard can drill in if needed.
2. **`hero_image_path` non-null is enough** — no separate confidence check, because the image binary itself is the validation (it exists on disk or it doesn't).
3. **`operator_id`, `market_id`, `submarket_id`, `google_place_id` use `IS NOT NULL` only.** These are FK references or self-authoritative IDs — presence is sufficient; provenance confidence is implicit at write time.
4. **Views, not materialised views.** Phase 1 Madrid scale (~1,800 hotels × ~40 fields) is well under the threshold where materialisation pays off. Re-evaluate at Phase 5 when Spain-wide views may join 10k+ hotels.
