-- ============================================================================
-- HOTELVALORA · Supabase / PostgreSQL initial schema proposal
-- ============================================================================
-- Status: PROPOSAL ONLY — NOT YET APPLIED.
--
-- This file is the v1 schema for the institutional Library + valuation
-- engine. Once a Supabase project is provisioned and the SDKs are wired
-- (lib/supabase/*), run this file via the Supabase SQL editor OR via:
--
--   supabase db push     (when the migrations dir is set up)
--
-- After applying, regenerate frontend types with:
--
--   pnpm dlx supabase gen types typescript \
--     --project-id <YOUR_PROJECT_REF>      \
--     --schema public                       \
--     > apps/web/src/lib/supabase/types.ts
--
-- ============================================================================
-- Conventions
-- ============================================================================
--  * Every primary key is a UUID (`gen_random_uuid()` from pgcrypto).
--  * Foreign keys to Supabase's auth.users go through public.user_profiles.
--  * Money in EUR is stored as `bigint` (cents) when precision matters;
--    indicative valuations stay `numeric` for human-readable seeds.
--  * Every mutable table carries `created_at` + `updated_at` (timestamptz).
--  * Row Level Security is ENABLED on every public table — no implicit
--    bypass for the anon key.
-- ============================================================================

-- ── Required extensions ───────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Enumerated types ──────────────────────────────────────────────────────
do $$ begin
  create type user_tier as enum ('free', 'pro', 'premium', 'team', 'enterprise');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('user', 'admin', 'owner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_visibility as enum ('private', 'team', 'public', 'top-promote');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_type_badge as enum ('Premium', 'PRO', 'Public', 'Private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_role as enum ('Principal', 'Broker', 'Lender', 'Developer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_objective as enum
    ('For Sale', 'Rent HMA', 'Lending', 'Develop', 'CoInvest');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- public.user_profiles
-- ----------------------------------------------------------------------------
-- 1:1 with auth.users. Auto-populated by `handle_new_user()` trigger.
-- Holds the institutional surface: tier, role, organisation, avatar.
-- ============================================================================
create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  organization text,
  tier user_tier not null default 'free',
  role user_role not null default 'user',
  avatar_url text,
  -- Stripe customer id — populated by webhook on first checkout.
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_tier_idx on public.user_profiles (tier);

-- ============================================================================
-- public.valuations
-- ----------------------------------------------------------------------------
-- The institutional hotel-asset record. Mirrors the frontend
-- LibraryReport shape (`apps/web/src/types/library.ts`).
-- Rich financial blocks live in `financials` jsonb to absorb schema
-- evolution without expensive migrations during the underwriting-engine
-- iteration.
-- ============================================================================
create table if not exists public.valuations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.user_profiles (id) on delete cascade,

  -- Asset metadata
  hotel_name text not null,
  classification text,
  star_rating int check (star_rating between 1 and 5),
  rooms int check (rooms > 0),
  city text not null,
  country text not null,
  address text,
  zip text,
  sub_market text,
  location_score numeric(3, 2) check (location_score between 0 and 10),
  lat numeric(9, 6),
  lng numeric(9, 6),
  open_year int,
  class_label text,
  owner_label text,

  -- Listing context
  role report_role,
  objective report_objective,

  -- Visibility + report tier classification (independent axes)
  visibility report_visibility not null default 'private',
  report_type report_type_badge not null default 'Public',

  -- Rich blocks — flexible during the underwriting engine iteration.
  -- Validated frontend-side via TypeScript types; future RPC functions
  -- can layer SQL-level invariants if a value ever becomes load-bearing.
  financials jsonb not null default '{}'::jsonb,
  amenities jsonb not null default '{}'::jsonb,
  indicators jsonb not null default '{}'::jsonb,
  contact_info jsonb,

  -- Audit
  status report_status not null default 'draft',
  reference_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists valuations_owner_idx on public.valuations (owner_id);
create index if not exists valuations_public_idx on public.valuations (visibility)
  where visibility in ('public', 'top-promote');
create index if not exists valuations_city_idx on public.valuations (city);

-- ============================================================================
-- public.valuation_reports
-- ----------------------------------------------------------------------------
-- Versioned snapshots of a valuation. Every "save scenario" or
-- "publish" mints a new row — enables rollback, audit, and PDF
-- export pipelines.
-- ============================================================================
create table if not exists public.valuation_reports (
  id uuid primary key default gen_random_uuid(),
  valuation_id uuid not null references public.valuations (id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  -- Path under the `reports` storage bucket. Null until the PDF is
  -- generated (background job).
  pdf_path text,
  created_by uuid not null references public.user_profiles (id),
  created_at timestamptz not null default now(),
  unique (valuation_id, version)
);

create index if not exists valuation_reports_valuation_idx
  on public.valuation_reports (valuation_id);

-- ============================================================================
-- public.favorites
-- ----------------------------------------------------------------------------
-- N:M between users and valuations. Drives the "Favoritos" surface.
-- ============================================================================
create table if not exists public.favorites (
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  valuation_id uuid not null references public.valuations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, valuation_id)
);

create index if not exists favorites_valuation_idx on public.favorites (valuation_id);

-- ============================================================================
-- public.top_promote
-- ----------------------------------------------------------------------------
-- Marketplace promotion record per valuation. 1:1 — flipping a
-- valuation between promoted/unpromoted is an UPSERT on this row.
-- ============================================================================
create table if not exists public.top_promote (
  valuation_id uuid primary key references public.valuations (id) on delete cascade,
  promoted_by uuid not null references public.user_profiles (id),
  promoted_at timestamptz not null default now(),
  promoted_until timestamptz not null,
  boost_score numeric(5, 2) check (boost_score >= 0 and boost_score <= 100),
  sponsor_priority int not null default 0,
  featured_region text,
  impressions int not null default 0,
  clicks int not null default 0,
  -- Derived column — TRUE while the slot is paid and unexpired.
  is_active boolean generated always as (promoted_until > now()) stored
);

create index if not exists top_promote_active_idx on public.top_promote (promoted_until)
  where promoted_until > now();
create index if not exists top_promote_priority_idx on public.top_promote (sponsor_priority desc)
  where promoted_until > now();

-- ============================================================================
-- public.subscriptions
-- ----------------------------------------------------------------------------
-- Stripe-backed billing record. One active row per user max.
-- Populated by the Stripe webhook handler in Phase 5.
-- ============================================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  tier user_tier not null,
  status text not null check (status in
    ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);
create index if not exists subscriptions_active_idx on public.subscriptions (status)
  where status in ('active', 'trialing');

-- ============================================================================
-- Triggers
-- ============================================================================

-- updated_at — bump on every row update.
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create trigger user_profiles_updated_at
    before update on public.user_profiles
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger valuations_updated_at
    before update on public.valuations
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger subscriptions_updated_at
    before update on public.subscriptions
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

-- Auto-create user_profile on auth.users insert.
create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name, tier, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'free',
    'user'
  );
  return new;
end;
$$;

do $$ begin
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.user_profiles enable row level security;
alter table public.valuations enable row level security;
alter table public.valuation_reports enable row level security;
alter table public.favorites enable row level security;
alter table public.top_promote enable row level security;
alter table public.subscriptions enable row level security;

-- user_profiles — read + update only your own row.
create policy "user_profiles: read own" on public.user_profiles
  for select to authenticated using (auth.uid() = id);
create policy "user_profiles: update own" on public.user_profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- valuations
--   anonymous + authenticated  → read PUBLIC and TOP-PROMOTE rows
--   authenticated owner        → read + write own rows (any visibility)
create policy "valuations: public read" on public.valuations
  for select using (visibility in ('public', 'top-promote'));
create policy "valuations: own read" on public.valuations
  for select to authenticated using (auth.uid() = owner_id);
create policy "valuations: own write" on public.valuations
  for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- valuation_reports — same as parent valuation visibility.
create policy "valuation_reports: parent public" on public.valuation_reports
  for select using (
    exists (
      select 1 from public.valuations v
      where v.id = valuation_reports.valuation_id
        and v.visibility in ('public', 'top-promote')
    )
  );
create policy "valuation_reports: parent owner" on public.valuation_reports
  for all to authenticated
  using (
    exists (
      select 1 from public.valuations v
      where v.id = valuation_reports.valuation_id and v.owner_id = auth.uid()
    )
  );

-- favorites — only the owning user sees/touches their own favourites.
create policy "favorites: own" on public.favorites
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- top_promote — anyone reads (it's the marketplace surface);
-- only the valuation owner writes.
create policy "top_promote: public read" on public.top_promote
  for select using (true);
create policy "top_promote: owner write" on public.top_promote
  for all to authenticated
  using (
    auth.uid() = (select owner_id from public.valuations where id = valuation_id)
  ) with check (
    auth.uid() = (select owner_id from public.valuations where id = valuation_id)
  );

-- subscriptions — read your own row only. Writes flow through the
-- service-role Stripe webhook (RLS bypassed by design).
create policy "subscriptions: own read" on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);

-- ============================================================================
-- Storage buckets — configured in the Supabase dashboard
-- ============================================================================
-- The dashboard surface (or the storage-admin REST API) is the
-- canonical place to create buckets. Proposed layout:
--
--   reports        public-read   PDFs + published assets
--   pdfs           private       Generated PDF outputs (signed URLs only)
--   excel-uploads  private       User-uploaded workbooks (RLS: own only)
--   renders        public-read   AI-generated CAPEX renders
--   avatars        public-read   Profile pictures (RLS: own write)
--
-- Per-bucket RLS policies live alongside the bucket configuration —
-- this SQL file does NOT script them (storage policies are managed
-- through the dashboard or a separate `supabase/seed.sql`).
