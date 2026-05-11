-- ============================================================================
-- HOTELVALORA · Supabase · Migration 0006 — Hospitality Intelligence Engine
-- ============================================================================
-- Foundation schema for the daily hospitality intelligence collection
-- system. Tables sit empty until the Phase 2 ingestion pipeline lands;
-- applying the migration now gives the foundation a stable identity
-- (table OIDs, RLS posture, indexes) before any ingestion code is
-- written.
--
-- Strategic context: docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md
-- Architecture:      docs/intelligence/intelligence-architecture.md
-- Schema reference:  docs/intelligence/news-data-schema.md
--
-- Tables in this migration
--   sources              · registry of news outlets with reliability scores
--   investors            · institutional investor / buyer / seller entities
--   operators            · hotel operator / brand / management entities
--   market_news          · canonical article records (the dedupe boundary)
--   hotel_transactions   · structured transaction events extracted from news
--   hotel_projects       · structured project / pipeline events extracted from news
--   news_entities        · link table news ↔ investor / operator / hotel
--   news_tags            · free-form taxonomy
--   news_ingestion_runs  · per-run audit log
-- ============================================================================

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

do $$ begin
  create type news_category as enum (
    'acquisition',
    'sale',
    'joint_venture',
    'development',
    'refinancing',
    'rebranding',
    'operator_change',
    'branded_residences',
    'flex_living',
    'pipeline_announcement',
    'distress',
    'investment',
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type hotel_segment as enum (
    'luxury',
    'upper_upscale',
    'upscale',
    'upper_midscale',
    'midscale',
    'economy',
    'lifestyle',
    'resort',
    'boutique',
    'mixed_use',
    'serviced_apartments',
    'unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type entity_role as enum (
    'buyer',
    'seller',
    'investor',
    'operator',
    'broker',
    'lender',
    'developer',
    'previous_operator',
    'new_operator',
    'partner',
    'mentioned'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ingestion_source_kind as enum ('rss', 'scrape', 'api', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ingestion_status as enum ('queued', 'running', 'success', 'partial', 'failed');
exception when duplicate_object then null; end $$;

-- ─── SOURCES ────────────────────────────────────────────────────────────────
-- The registry of news outlets the ingestion pipeline reads from. New
-- outlets are added by inserting rows here — no code change required.

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  base_url text not null,
  ingestion_kind ingestion_source_kind not null,
  rss_url text,
  api_endpoint text,
  scrape_selector jsonb,
  region text not null,                      -- ISO 3166-1 alpha-2, or "EU" / "GLOBAL"
  language text not null default 'en',       -- ISO 639-1
  reliability_score numeric(3,2) check (reliability_score between 0 and 1),
  enabled boolean not null default true,
  schedule_hint text,
  last_ingested_at timestamptz,
  notes text,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sources_enabled_idx on public.sources (enabled);
create index if not exists sources_region_idx on public.sources (region);

-- ─── INVESTORS ──────────────────────────────────────────────────────────────
-- External institutional investor / family office / fund entities tracked
-- as actors in transactions. Distinct from `public.organizations`
-- (HotelVALORA tenants) — `investors` are external market entities.

create table if not exists public.investors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  kind text check (kind in (
    'pe','reit','sovereign','family_office','private_owner','bank',
    'operator_owned','hospitality_fund','asset_manager','developer','unknown'
  )),
  hq_country text,
  aum_eur numeric(18,2),
  website text,
  notes text,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists investors_kind_idx on public.investors (kind);
create index if not exists investors_hq_country_idx on public.investors (hq_country);

-- ─── OPERATORS ──────────────────────────────────────────────────────────────
-- Hotel operator / brand / management company entities. `parent_id`
-- supports brand-within-chain hierarchies (e.g., EDITION → Marriott).

create table if not exists public.operators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  kind text check (kind in (
    'chain','independent','soft_brand','franchise',
    'management_company','operator_owner','unknown'
  )),
  hq_country text,
  parent_id uuid references public.operators(id) on delete set null,
  website text,
  notes text,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists operators_parent_idx on public.operators (parent_id);
create index if not exists operators_kind_idx on public.operators (kind);

-- ─── MARKET NEWS ────────────────────────────────────────────────────────────
-- Canonical article record. Deduplication boundary: `url_hash` is unique
-- (sha256 of `canonical_url`). Repeated stories increment `occurrences`
-- and update `last_seen_at` instead of inserting a new row.

create table if not exists public.market_news (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete restrict,
  title text not null,
  summary text,
  body text,
  url text not null,
  canonical_url text not null,
  url_hash text not null unique,
  content_hash text,
  category news_category not null default 'other',
  hotel_segment hotel_segment,
  country text,
  region text,
  city text,
  market text,
  submarket text,
  language text not null default 'en',
  published_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  occurrences int not null default 1,
  raw_meta jsonb,
  enriched_meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists market_news_source_idx on public.market_news (source_id);
create index if not exists market_news_category_idx on public.market_news (category);
create index if not exists market_news_country_idx on public.market_news (country);
create index if not exists market_news_city_idx on public.market_news (city);
create index if not exists market_news_published_idx on public.market_news (published_at desc);
create index if not exists market_news_first_seen_idx on public.market_news (first_seen_at desc);

-- ─── HOTEL TRANSACTIONS ─────────────────────────────────────────────────────
-- Structured transaction events extracted from news. One news article
-- can produce 0..N transaction rows (a "portfolio sale" news might yield
-- N hotel-level rows).

create table if not exists public.hotel_transactions (
  id uuid primary key default gen_random_uuid(),
  news_id uuid references public.market_news(id) on delete cascade,
  category news_category not null,
  asset_name text,
  city text,
  country text,
  market text,
  submarket text,
  rooms int check (rooms > 0),
  price_eur numeric(18,2),
  price_per_key_eur numeric(14,2),
  cap_rate numeric(5,2),
  closed_at date,
  announced_at date,
  buyer_id uuid references public.investors(id) on delete set null,
  seller_id uuid references public.investors(id) on delete set null,
  notes text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists hotel_transactions_country_idx on public.hotel_transactions (country);
create index if not exists hotel_transactions_city_idx on public.hotel_transactions (city);
create index if not exists hotel_transactions_closed_idx on public.hotel_transactions (closed_at desc);
create index if not exists hotel_transactions_buyer_idx on public.hotel_transactions (buyer_id);
create index if not exists hotel_transactions_seller_idx on public.hotel_transactions (seller_id);

-- ─── HOTEL PROJECTS ─────────────────────────────────────────────────────────
-- Structured project / pipeline events: developments, branded residences,
-- flex-living projects, openings, refurbishments.

create table if not exists public.hotel_projects (
  id uuid primary key default gen_random_uuid(),
  news_id uuid references public.market_news(id) on delete cascade,
  category news_category not null,
  project_name text,
  city text,
  country text,
  market text,
  submarket text,
  rooms int check (rooms >= 0),
  estimated_opening date,
  developer_id uuid references public.investors(id) on delete set null,
  operator_id uuid references public.operators(id) on delete set null,
  capex_eur numeric(18,2),
  notes text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists hotel_projects_country_idx on public.hotel_projects (country);
create index if not exists hotel_projects_city_idx on public.hotel_projects (city);
create index if not exists hotel_projects_opening_idx on public.hotel_projects (estimated_opening);
create index if not exists hotel_projects_developer_idx on public.hotel_projects (developer_id);
create index if not exists hotel_projects_operator_idx on public.hotel_projects (operator_id);

-- ─── NEWS ENTITIES ──────────────────────────────────────────────────────────
-- Polymorphic link table: news article ↔ (investor | operator | hotel | market).
-- `confidence` is 0..1 — the AI/regex extraction will populate this in Phase 2+.

create table if not exists public.news_entities (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references public.market_news(id) on delete cascade,
  entity_kind text not null check (entity_kind in ('investor','operator','hotel','market')),
  entity_id uuid,                            -- references investors/operators/valuations/markets when known
  raw_mention text,                          -- the literal string the extractor saw, useful pre-resolution
  role entity_role not null,
  confidence numeric(3,2) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  unique (news_id, entity_kind, entity_id, role)
);
create index if not exists news_entities_news_idx on public.news_entities (news_id);
create index if not exists news_entities_kind_id_idx on public.news_entities (entity_kind, entity_id);

-- ─── NEWS TAGS ──────────────────────────────────────────────────────────────
-- Free-form taxonomy. Tags are case-insensitive lowercase strings.

create table if not exists public.news_tags (
  news_id uuid not null references public.market_news(id) on delete cascade,
  tag text not null,
  primary key (news_id, tag)
);
create index if not exists news_tags_tag_idx on public.news_tags (tag);

-- ─── NEWS INGESTION RUNS ────────────────────────────────────────────────────
-- Per-run audit log. One row per (source × daily cron firing). The cron
-- function writes the row at start, updates at end.

create table if not exists public.news_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  run_started_at timestamptz not null default now(),
  run_completed_at timestamptz,
  status ingestion_status not null default 'queued',
  items_seen int default 0,
  items_inserted int default 0,
  items_updated int default 0,
  items_skipped int default 0,
  error_message text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists news_ingestion_runs_source_idx on public.news_ingestion_runs (source_id, run_started_at desc);
create index if not exists news_ingestion_runs_status_idx on public.news_ingestion_runs (status);

-- ─── TRIGGERS (updated_at) ──────────────────────────────────────────────────

do $$ begin
  create trigger sources_updated_at before update on public.sources
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger investors_updated_at before update on public.investors
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger operators_updated_at before update on public.operators
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger market_news_updated_at before update on public.market_news
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────────────────────
-- Public-read posture: anonymous visitors can browse market intelligence
-- as part of the showcase. Writes are service-role only (cron + admin).

alter table public.sources              enable row level security;
alter table public.investors            enable row level security;
alter table public.operators            enable row level security;
alter table public.market_news          enable row level security;
alter table public.hotel_transactions   enable row level security;
alter table public.hotel_projects       enable row level security;
alter table public.news_entities        enable row level security;
alter table public.news_tags            enable row level security;
alter table public.news_ingestion_runs  enable row level security;

create policy "sources: public read"             on public.sources              for select using (enabled = true);
create policy "investors: public read"           on public.investors            for select using (true);
create policy "operators: public read"           on public.operators            for select using (true);
create policy "market_news: public read"         on public.market_news          for select using (true);
create policy "hotel_transactions: public read"  on public.hotel_transactions   for select using (true);
create policy "hotel_projects: public read"      on public.hotel_projects       for select using (true);
create policy "news_entities: public read"       on public.news_entities        for select using (true);
create policy "news_tags: public read"           on public.news_tags            for select using (true);
-- news_ingestion_runs has RLS enabled but NO policies — internal-only by design.

-- ─── SEED SOURCES ───────────────────────────────────────────────────────────
-- Initial 10-source roster the daily cron will read from. RSS URLs are
-- left null where the publisher hasn't published a feed — the Phase 2
-- ingestion pipeline will scrape those via HTML extraction.

insert into public.sources (slug, name, base_url, ingestion_kind, rss_url, region, language, reliability_score, notes)
values
  ('hosteltur',       'Hosteltur',        'https://www.hosteltur.com',       'rss',    'https://www.hosteltur.com/rss',     'ES',     'es', 0.85, 'Spanish hospitality industry daily — institutional grade for ES market'),
  ('alimarket',       'Alimarket',        'https://www.alimarket.es',        'scrape', null,                                'ES',     'es', 0.85, 'Spanish business intelligence — paywalled premium feed'),
  ('expansion',       'Expansión',        'https://www.expansion.com',       'rss',    'https://www.expansion.com/rss/empresas.xml','ES','es', 0.80, 'Spanish business newspaper — hospitality coverage in empresas section'),
  ('hospitalitynet',  'HospitalityNet',   'https://www.hospitalitynet.org',  'rss',    'https://www.hospitalitynet.org/rss/news.xml','EU','en', 0.85, 'European hospitality news aggregator'),
  ('hotelnewsnow',    'Hotel News Now',   'https://www.costar.com/news/hotels','rss', null,                                'GLOBAL', 'en', 0.90, 'CoStar Group hospitality vertical — institutional grade'),
  ('costar-news',     'CoStar News',      'https://www.costar.com',          'api',    null,                                'GLOBAL', 'en', 0.90, 'CoStar transactions feed — API integration deferred to Phase 5'),
  ('thp-news',        'THP News',         'https://www.thpnews.com',         'scrape', null,                                'EU',     'en', 0.70, 'The Hospitality Professional — boutique European coverage'),
  ('hvs',             'HVS',              'https://www.hvs.com',             'rss',    'https://www.hvs.com/Blog/Rss',      'GLOBAL', 'en', 0.85, 'HVS publishes analyst briefings + transaction commentary'),
  ('skift-hospitality','Skift Hospitality','https://skift.com',              'rss',    'https://skift.com/feed/',           'GLOBAL', 'en', 0.85, 'Skift hospitality vertical — trend coverage + transaction tracking'),
  ('reuters-hospitality','Reuters Hospitality','https://www.reuters.com',    'rss',    'https://www.reuters.com/business/lifestyle/feed/','GLOBAL','en', 0.95, 'Top-tier wire service — first-mover on major transactions')
on conflict (slug) do update set
  name = excluded.name,
  base_url = excluded.base_url,
  ingestion_kind = excluded.ingestion_kind,
  rss_url = excluded.rss_url,
  region = excluded.region,
  language = excluded.language,
  reliability_score = excluded.reliability_score,
  notes = excluded.notes,
  updated_at = now();

-- ============================================================================
-- END migration 0006
-- ============================================================================
