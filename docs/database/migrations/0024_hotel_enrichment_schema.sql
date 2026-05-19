-- ============================================================================
-- HOTELVALORA · Supabase · Migration 0024 — Hotel Enrichment Schema
-- ============================================================================
-- Canonical per-hotel knowledge graph: identity, classification, geo,
-- amenities, provenance, confidence, and enrichment-pipeline runtime
-- tables (jobs, rate limits, DLQ).
--
-- This migration is the foundation for the parallel workstream
-- `feature/hotel-enrichment-pipeline`. Applying it stands up table OIDs,
-- enums, indexes, RLS posture, and analytical views BEFORE any
-- ingestion code runs.
--
-- Reuses existing infrastructure (do NOT duplicate):
--   - hotel_segment enum   (migration 0006)
--   - public.operators     (migration 0006) — `operator_id` FK
--   - audit_log + AuditService (migration 0005 / apps/api) — for all
--                            field-level mutation logging
--
-- Strategic context:
--   docs/hotel-intelligence/madrid-enrichment-architecture-v1.md (§1)
--   docs/hotel-intelligence/madrid-enrichment-rapidapi-booking-v1.md
--   docs/hotel-intelligence/institutional-feature-coverage-targets-v1.md
--   docs/hotel-intelligence/coverage-measurement-spec-v1.md
--
-- Tables in this migration
--   hotel_canonical                 · single source of truth per hotel
--   hotel_source_record             · immutable raw payload history
--   hotel_field_provenance          · append-only per-field history
--   hotel_enrichment_run            · per-run audit
--   hotel_duplicate_candidate       · likely duplicates surfaced by dedup
--   hotel_enrichment_job            · queue
--   hotel_enrichment_dlq            · dead-letter
--   rate_limit_state                · provider × window state
--
-- Views in this migration
--   hotel_coverage_v                · per-hotel tier counts
--   hotel_coverage_scored_v         · per-hotel + pass/fail flags
--   hotel_coverage_market_v         · per-market aggregates
--   hotel_coverage_madrid_v         · Madrid headline metric
--
-- Boundary respected: this migration does NOT touch any underwriting,
-- report-system, or synchronization table.
-- ============================================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────
-- Defensive guards; both typically already enabled on Supabase but
-- migration must be idempotent against fresh environments.

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- ─── ENUMS ───────────────────────────────────────────────────────────────────
-- All net-new. `hotel_segment` (used by `segment` and `chain_scale`
-- columns below) is NOT re-created here — it lives in migration 0006.

do $$ begin
  create type operator_type_enum as enum (
    'franchise',
    'managed',
    'owned',
    'lease',
    'unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type hotel_type_enum as enum (
    'urban',
    'resort',
    'airport',
    'extended_stay',
    'flex_living',
    'aparthotel',
    'boutique'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type quality_tier_enum as enum (
    'gold',
    'silver',
    'bronze',
    'quarantined'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type hotel_lifecycle_enum as enum (
    'active',
    'closed',
    'under_construction',
    'planned',
    'unverified'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type fetch_status_enum as enum (
    'ok',
    'parsed_with_warnings',
    'parse_failed',
    'rate_limited',
    'not_found',
    'auth_blocked'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type enrichment_run_status_enum as enum (
    'running',
    'completed',
    'failed',
    'partial',
    'budget_exceeded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type dup_tier_enum as enum (
    'auto_merge',
    'needs_review',
    'likely_duplicate'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type dup_status_enum as enum (
    'pending_review',
    'merged',
    'dismissed',
    'sibling_listing'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type enrichment_job_type_enum as enum (
    'discover',
    'enrich',
    'refresh',
    'conflict_recheck',
    'fallback_dispatch'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type enrichment_job_status_enum as enum (
    'pending',
    'leased',
    'done',
    'failed',
    'dlq'
  );
exception when duplicate_object then null; end $$;

-- ─── HOTEL CANONICAL ─────────────────────────────────────────────────────────
-- Single row per physical hotel. Mutations gated by §4.4 of main
-- architecture doc (confidence-aware overwrite policy).

create table if not exists public.hotel_canonical (
  id                       uuid primary key default gen_random_uuid(),

  -- Identity
  canonical_name           text not null,
  legal_name               text,
  brand                    text,
  brand_family             text,
  operator_id              uuid references public.operators(id) on delete set null,
  operator_type            operator_type_enum not null default 'unknown',
  chain_scale              public.hotel_segment not null default 'unknown',

  -- Classification
  star_rating              smallint check (star_rating between 1 and 5),
  hotel_type               hotel_type_enum,
  segment                  public.hotel_segment not null default 'unknown',

  -- Location
  address_line1            text,
  address_line2            text,
  city                     text not null,
  city_normalized          text not null,
  postal_code              text,
  country_code             char(2) not null,
  region                   text,
  neighborhood             text,
  market_id                uuid,                 -- FK candidate for future CoStar markets table
  submarket_id             uuid,                 -- FK candidate for future CoStar submarkets table
  lat                      numeric(9,6) check (lat between -90 and 90),
  lng                      numeric(9,6) check (lng between -180 and 180),
  geom                     geography(point, 4326),

  -- Capacity
  total_rooms              smallint check (total_rooms is null or total_rooms between 1 and 3000),
  total_keys               smallint,
  room_type_mix            jsonb,
  meeting_rooms_count      smallint,
  meeting_space_sqm        numeric(10,2),

  -- Amenities (14-key canonical bitmap, tri-state via jsonb)
  amenities                jsonb not null default '{}'::jsonb,

  -- Reviews snapshot (Booking-source for Madrid Phase 1)
  review_score             numeric(4,2) check (review_score is null or review_score between 0 and 10),
  review_count             integer,
  primary_review_source    text,

  -- Operations
  year_opened              smallint check (year_opened is null or (year_opened between 1700 and extract(year from now())::int)),
  year_renovated_last      smallint,
  ownership_structure      text,

  -- Contact
  website_url              text,
  phone                    text,
  email                    text,
  booking_url              text,

  -- Media (URLs / bucket keys; binaries in Supabase Storage)
  hero_image_path          text,
  gallery_paths            text[],

  -- External IDs
  booking_hotel_id         text,
  google_place_id          text,
  tripadvisor_id           text,
  expedia_id               text,
  agoda_id                 text,
  str_property_id          text,
  costar_property_id       text,
  wikidata_qid             text,
  osm_id                   text,

  -- Governance / provenance
  primary_source           text,
  source_confidence        jsonb not null default '{}'::jsonb,
  field_provenance_summary jsonb not null default '{}'::jsonb,
  data_quality_tier        quality_tier_enum not null default 'bronze',
  last_enriched_at         timestamptz,
  enrichment_version       integer not null default 1,
  -- App-computed dedup blocking key (see apps/web/src/lib/enrichment/dedup/scoring.ts blockKey()).
  -- Indexed for cheap "find neighborhood by block_key" lookups during dedup.
  block_key                text,

  -- Lifecycle
  status                   hotel_lifecycle_enum not null default 'unverified',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  deleted_at               timestamptz
);

-- Self-authoritative external-id uniqueness (partial — only when present)
create unique index if not exists hotel_canonical_booking_uq
  on public.hotel_canonical (booking_hotel_id)
  where booking_hotel_id is not null;

create unique index if not exists hotel_canonical_google_uq
  on public.hotel_canonical (google_place_id)
  where google_place_id is not null;

create unique index if not exists hotel_canonical_tripadvisor_uq
  on public.hotel_canonical (tripadvisor_id)
  where tripadvisor_id is not null;

create unique index if not exists hotel_canonical_wikidata_uq
  on public.hotel_canonical (wikidata_qid)
  where wikidata_qid is not null;

-- Lookup indexes
create index if not exists hotel_canonical_geom_gix
  on public.hotel_canonical using gist (geom);

create index if not exists hotel_canonical_city_idx
  on public.hotel_canonical (country_code, city_normalized)
  where deleted_at is null;

create index if not exists hotel_canonical_brand_family_idx
  on public.hotel_canonical (brand_family)
  where deleted_at is null;

create index if not exists hotel_canonical_segment_idx
  on public.hotel_canonical (segment, country_code)
  where deleted_at is null;

create index if not exists hotel_canonical_quality_idx
  on public.hotel_canonical (data_quality_tier, country_code)
  where deleted_at is null;

create index if not exists hotel_canonical_status_idx
  on public.hotel_canonical (status)
  where deleted_at is null;

create index if not exists hotel_canonical_block_key_idx
  on public.hotel_canonical (block_key)
  where deleted_at is null;

-- ─── HOTEL SOURCE RECORD ─────────────────────────────────────────────────────
-- Immutable per-fetch payload history. Append-only. The dedup boundary
-- for re-fetches within TTL is `(source, source_id, fetched_at::date)`.

create table if not exists public.hotel_source_record (
  id                   uuid primary key default gen_random_uuid(),
  source               text not null,
  source_id            text not null,
  hotel_id             uuid references public.hotel_canonical(id) on delete set null,
  payload              jsonb not null,
  payload_hash         text not null,
  fetched_at           timestamptz not null default now(),
  fetch_status         fetch_status_enum not null,
  ttl_expires_at       timestamptz not null,
  enrichment_run_id    uuid
);

create unique index if not exists hotel_source_record_natural_uq
  on public.hotel_source_record (source, source_id, (fetched_at::date));

create index if not exists hotel_source_record_hotel_idx
  on public.hotel_source_record (hotel_id, source, fetched_at desc);

create index if not exists hotel_source_record_hash_idx
  on public.hotel_source_record (payload_hash);

create index if not exists hotel_source_record_ttl_idx
  on public.hotel_source_record (ttl_expires_at)
  where fetch_status = 'ok';

-- ─── HOTEL FIELD PROVENANCE ──────────────────────────────────────────────────
-- Append-only per-field history. `superseded_at` is non-null when a
-- later row replaced this one in the canonical view.

create table if not exists public.hotel_field_provenance (
  id                  uuid primary key default gen_random_uuid(),
  hotel_id            uuid not null references public.hotel_canonical(id) on delete cascade,
  field_name          text not null,
  value               jsonb not null,
  source              text not null,
  source_record_id    uuid references public.hotel_source_record(id) on delete set null,
  confidence          numeric(4,3) not null check (confidence between 0 and 1),
  fetched_at          timestamptz not null,
  superseded_at       timestamptz,
  override_by         uuid references auth.users(id),
  created_at          timestamptz not null default now()
);

create index if not exists hotel_field_prov_active_idx
  on public.hotel_field_provenance (hotel_id, field_name)
  where superseded_at is null;

create index if not exists hotel_field_prov_conf_idx
  on public.hotel_field_provenance (hotel_id, field_name, confidence desc)
  where superseded_at is null;

create index if not exists hotel_field_prov_override_idx
  on public.hotel_field_provenance (hotel_id)
  where override_by is not null;

-- ─── HOTEL ENRICHMENT RUN ────────────────────────────────────────────────────

create table if not exists public.hotel_enrichment_run (
  id                  uuid primary key default gen_random_uuid(),
  source              text not null,
  triggered_by        text not null,
  scope               jsonb not null default '{}'::jsonb,
  started_at          timestamptz not null default now(),
  completed_at        timestamptz,
  hotels_seen         integer not null default 0,
  hotels_inserted     integer not null default 0,
  hotels_updated      integer not null default 0,
  fields_updated      integer not null default 0,
  errors_count        integer not null default 0,
  rate_limit_hits     integer not null default 0,
  status              enrichment_run_status_enum not null default 'running',
  budget_max_requests integer,
  budget_used         integer not null default 0,
  notes               text
);

create index if not exists hotel_enrichment_run_status_idx
  on public.hotel_enrichment_run (status, started_at desc);

create index if not exists hotel_enrichment_run_source_idx
  on public.hotel_enrichment_run (source, started_at desc);

-- ─── HOTEL DUPLICATE CANDIDATE ───────────────────────────────────────────────
-- Pairs from the duplicate-detection layer. Canonical order: a_id < b_id.

create table if not exists public.hotel_duplicate_candidate (
  id          uuid primary key default gen_random_uuid(),
  hotel_a_id  uuid not null references public.hotel_canonical(id) on delete cascade,
  hotel_b_id  uuid not null references public.hotel_canonical(id) on delete cascade,
  score       numeric(4,3) not null check (score between 0 and 1),
  tier        dup_tier_enum not null,
  components  jsonb not null,
  status      dup_status_enum not null default 'pending_review',
  decided_at  timestamptz,
  decided_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  constraint hotel_dup_canonical_order check (hotel_a_id < hotel_b_id)
);

create unique index if not exists hotel_duplicate_pair_uq
  on public.hotel_duplicate_candidate (hotel_a_id, hotel_b_id);

create index if not exists hotel_duplicate_status_idx
  on public.hotel_duplicate_candidate (status, score desc);

-- ─── HOTEL ENRICHMENT JOB (queue) ────────────────────────────────────────────

create table if not exists public.hotel_enrichment_job (
  id              uuid primary key default gen_random_uuid(),
  hotel_id        uuid references public.hotel_canonical(id) on delete set null,
  source          text not null,
  job_type        enrichment_job_type_enum not null,
  priority        smallint not null default 5,
  scheduled_for   timestamptz not null default now(),
  attempt_count   smallint not null default 0,
  status          enrichment_job_status_enum not null default 'pending',
  leased_by       text,
  leased_at       timestamptz,
  last_error      text,
  dedup_key       text not null,
  params          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists hotel_job_ready_idx
  on public.hotel_enrichment_job (scheduled_for, priority)
  where status = 'pending';

create unique index if not exists hotel_job_active_dedup_uq
  on public.hotel_enrichment_job (dedup_key)
  where status in ('pending', 'leased');

create index if not exists hotel_job_status_idx
  on public.hotel_enrichment_job (status, source);

-- ─── HOTEL ENRICHMENT DLQ ────────────────────────────────────────────────────

create table if not exists public.hotel_enrichment_dlq (
  id                 uuid primary key default gen_random_uuid(),
  source             text not null,
  source_id          text,
  job_id             uuid references public.hotel_enrichment_job(id) on delete set null,
  error_class        text not null,
  error_message      text not null,
  payload_snapshot   jsonb,
  attempt_count      smallint not null,
  request_meta       jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  resolved_at        timestamptz,
  resolved_by        uuid references auth.users(id)
);

create index if not exists hotel_dlq_pending_idx
  on public.hotel_enrichment_dlq (created_at desc)
  where resolved_at is null;

create index if not exists hotel_dlq_source_idx
  on public.hotel_enrichment_dlq (source, error_class);

-- ─── RATE LIMIT STATE ────────────────────────────────────────────────────────
-- Provider × time-window token-bucket persistence. One row per
-- (provider, window). Worker reads → decrements → writes.

create table if not exists public.rate_limit_state (
  id              uuid primary key default gen_random_uuid(),
  provider        text not null,
  window_label    text not null,                 -- e.g. 'day:2026-05-19', 'month:2026-05'
  budget          integer not null,
  used            integer not null default 0,
  reset_at        timestamptz not null,
  status          text not null default 'open',  -- open | rate_limited | auth_blocked
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists rate_limit_state_window_uq
  on public.rate_limit_state (provider, window_label);

create index if not exists rate_limit_state_status_idx
  on public.rate_limit_state (provider, status);

-- ─── COVERAGE VIEWS ──────────────────────────────────────────────────────────
-- Per-hotel raw counts, scored, market aggregates, Madrid headline.
-- See docs/hotel-intelligence/coverage-measurement-spec-v1.md §2-§4.

create or replace view public.hotel_coverage_v as
with field_conf as (
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

  -- TIER-0 (validity)
  (
    (h.booking_hotel_id is not null)::int +
    (h.canonical_name   is not null)::int +
    (h.city             is not null)::int +
    (h.city_normalized  is not null)::int +
    (h.country_code     is not null and length(h.country_code) = 2)::int +
    (h.lat              is not null and h.lat between -90 and 90)::int +
    (h.lng              is not null and h.lng between -180 and 180)::int +
    (h.geom             is not null)::int
  ) as t0_filled,

  -- TIER-1
  (
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'star_rating'  and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'total_rooms'  and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'segment'      and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'hotel_type'   and c.confidence >= 0.70))::int +
    (case when (select count(*) from jsonb_object_keys(h.amenities)) >= 5 then 1 else 0 end) +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'review_score' and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'review_count' and c.confidence >= 0.80))::int +
    (h.booking_url       is not null)::int +
    (h.primary_source    is not null)::int +
    (h.data_quality_tier is not null)::int +
    (h.status            is not null)::int +
    (h.enrichment_version >= 1)::int
  ) as t1_filled,

  -- TIER-2
  (
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'brand'               and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'brand_family'        and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'chain_scale'         and c.confidence >= 0.70))::int +
    (h.operator_id       is not null)::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'operator_type'       and c.confidence >= 0.70))::int +
    (case when (select count(*) from jsonb_object_keys(h.amenities)) >= 14 then 1 else 0 end) +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'address_line1'       and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'postal_code'         and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'neighborhood'        and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'room_type_mix'       and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'meeting_rooms_count' and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'meeting_space_sqm'   and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'year_opened'         and c.confidence >= 0.65))::int +
    (h.hero_image_path   is not null)::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'website_url'         and c.confidence >= 0.70))::int +
    (exists (select 1 from field_conf c where c.hotel_id = h.id and c.field_name = 'phone'               and c.confidence >= 0.70))::int +
    (h.google_place_id   is not null)::int +
    (h.market_id         is not null)::int +
    (h.submarket_id      is not null)::int
  ) as t2_filled,

  h.last_enriched_at
from public.hotel_canonical h
where h.deleted_at is null;

create or replace view public.hotel_coverage_scored_v as
select
  v.*,
  (v.t0_filled = 8)                                                       as t0_complete,
  round(v.t1_filled::numeric / 12, 4)                                     as t1_pct,
  (v.t1_filled >= 11)                                                     as t1_passing,
  round(v.t2_filled::numeric / 19, 4)                                     as t2_pct,
  (v.t2_filled >= 16)                                                     as t2_passing,
  ((v.t0_filled = 8) and (v.t1_filled >= 11) and (v.t2_filled >= 16))     as institutional_passing
from public.hotel_coverage_v v;

create or replace view public.hotel_coverage_market_v as
select
  s.country_code,
  s.city_normalized,
  count(*)                                                                          as hotels_total,
  count(*) filter (where s.data_quality_tier <> 'quarantined')                       as hotels_non_quarantined,
  count(*) filter (where s.data_quality_tier = 'gold')                               as hotels_gold,
  count(*) filter (where s.data_quality_tier = 'silver')                             as hotels_silver,
  count(*) filter (where s.data_quality_tier = 'bronze')                             as hotels_bronze,
  count(*) filter (where s.data_quality_tier = 'quarantined')                        as hotels_quarantined,
  count(*) filter (where s.t1_passing)                                               as hotels_t1_passing,
  count(*) filter (where s.t2_passing)                                               as hotels_t2_passing,
  count(*) filter (where s.institutional_passing)                                    as hotels_institutional_passing,
  coalesce(avg(s.t1_pct), 0)::numeric(5,4)                                           as avg_t1_pct,
  coalesce(avg(s.t2_pct), 0)::numeric(5,4)                                           as avg_t2_pct,
  case
    when count(*) filter (where s.data_quality_tier <> 'quarantined') > 0 then
      round(
        (count(*) filter (where s.institutional_passing))::numeric
        / nullif(count(*) filter (where s.data_quality_tier <> 'quarantined'), 0),
        4
      )
    else 0
  end                                                                                as institutional_passing_rate
from public.hotel_coverage_scored_v s
group by s.country_code, s.city_normalized;

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
  (m.institutional_passing_rate >= 0.70) as goal_reached
from public.hotel_coverage_market_v m
where m.country_code = 'ES'
  and m.city_normalized = 'Madrid';

-- ─── ROW-LEVEL SECURITY ──────────────────────────────────────────────────────
-- Strict service-role-only on every runtime table. Read-only access to
-- canonical for authenticated users via dedicated policies (tier-gating
-- enforced at the app layer; see Library locked-cell pattern).

alter table public.hotel_canonical            enable row level security;
alter table public.hotel_source_record        enable row level security;
alter table public.hotel_field_provenance     enable row level security;
alter table public.hotel_enrichment_run       enable row level security;
alter table public.hotel_duplicate_candidate  enable row level security;
alter table public.hotel_enrichment_job       enable row level security;
alter table public.hotel_enrichment_dlq       enable row level security;
alter table public.rate_limit_state           enable row level security;

-- Authenticated users may read canonical (non-deleted) rows.
do $$ begin
  create policy "hotel_canonical_read_authenticated"
    on public.hotel_canonical
    for select
    to authenticated
    using (deleted_at is null);
exception when duplicate_object then null; end $$;

-- All write paths AND all read paths on internal tables are
-- service-role-only by virtue of having no `to authenticated` SELECT
-- policy on them. (Service role bypasses RLS by default in Supabase.)

-- ─── TIMESTAMPS — updated_at maintenance ─────────────────────────────────────

create or replace function public.tg_hotel_canonical_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hotel_canonical_touch on public.hotel_canonical;
create trigger hotel_canonical_touch
  before update on public.hotel_canonical
  for each row execute function public.tg_hotel_canonical_touch_updated_at();

drop trigger if exists rate_limit_state_touch on public.rate_limit_state;
create trigger rate_limit_state_touch
  before update on public.rate_limit_state
  for each row execute function public.tg_hotel_canonical_touch_updated_at();

-- ─── COMMENTS (institutional notes for future maintainers) ───────────────────

comment on table public.hotel_canonical is
  'Canonical single-source-of-truth per physical hotel. Mutations gated by confidence-aware overwrite policy. Reuses public.hotel_segment enum (migration 0006) for segment + chain_scale.';

comment on column public.hotel_canonical.amenities is
  '14-key canonical bitmap: { bar, restaurant, rooftop, spa, gym, pool, parking, meet, business_center, kids_club, beach_access, golf, casino, marina }. Tri-state per key: true | false | null (not determined).';

comment on column public.hotel_canonical.source_confidence is
  'Per-field confidence snapshot at last enrichment: { "<field_name>": <0..1> }. Authoritative confidence history lives in hotel_field_provenance.';

comment on column public.hotel_canonical.field_provenance_summary is
  'Per-field provenance snapshot at last enrichment: { "<field_name>": { source, fetched_at, confidence } }.';

comment on view public.hotel_coverage_madrid_v is
  'Workstream headline metric. goal_reached = true means Madrid hit the institutional 80% target (≥70% of non-quarantined hotels passing).';

-- ============================================================================
-- END migration 0024
-- ============================================================================
