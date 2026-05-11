-- ============================================================================
-- HOTELVALORA · Supabase · Migration 0001 — initial schema
-- ============================================================================
-- Apply once via the SQL editor:
--   https://supabase.com/dashboard/project/twebgqutuqgonabvhzjk/sql/new
--
-- After apply: regenerate types with
--   pnpm dlx supabase gen types typescript \
--     --project-id twebgqutuqgonabvhzjk     \
--     --schema public                        \
--     > apps/web/src/lib/supabase/types.ts
-- (or use the hand-written shim already in repo until the CLI access
-- token is provisioned).
--
-- Domains:
--   ① auth + users    profiles · organizations · user_roles · sessions
--                     · oauth_accounts
--   ② library         valuations · saved_reports · favorite_reports
--                     · top_promote_reports · report_visibility
--                     · report_shares
--   ③ investment      investment_requirements · market_preferences
--                     · valuation_preferences · revpar_scenarios
--                     · hotel_filters
--   ④ crm             contacts · leads · companies · notes · activity_log
--   ⑤ files           report_files · generated_pdfs · uploaded_excels
--                     · renders · avatars
--   ⑥ system          audit_logs · notifications · feature_flags
--                     · subscriptions · payment_events
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================
do $$ begin
  create type user_tier as enum ('free','pro','premium','team','enterprise');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('user','admin','owner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type org_role as enum ('owner','admin','member','viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type oauth_provider as enum ('google','linkedin','apple','microsoft');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_visibility_t as enum ('private','team','public','top-promote');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_type_badge as enum ('Premium','PRO','Public','Private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('draft','published','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_role as enum ('Principal','Broker','Lender','Developer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_objective as enum ('For Sale','Rent HMA','Lending','Develop','CoInvest');
exception when duplicate_object then null; end $$;

do $$ begin
  create type share_permission as enum ('view','comment','edit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_status as enum ('new','qualified','contacted','proposal','closed_won','closed_lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pdf_status as enum ('queued','generating','ready','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type excel_status as enum ('queued','parsing','staged','applied','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active','trialing','past_due','canceled','incomplete');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_kind as enum ('tour_request','promotion_expiring','comment','share','system');
exception when duplicate_object then null; end $$;

-- Helper: updated_at trigger function (shared by every mutable table)
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ============================================================================
-- ① AUTH + USERS
-- ============================================================================

-- Public.users — 1:1 with auth.users. Auth-adjacent fields the app
-- reads frequently (tier, current org) live here so we never round-trip
-- to auth.users.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  tier user_tier not null default 'free',
  role user_role not null default 'user',
  current_organization_id uuid,
  -- Stripe customer id — populated by webhook on first checkout.
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists users_tier_idx on public.users (tier);
create index if not exists users_org_idx on public.users (current_organization_id);

-- Profiles — display-layer fields (avatar, locale, bio). Split from
-- users so social-fluff churn doesn't touch the auth-adjacent surface.
create table if not exists public.profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  bio text,
  phone text,
  locale text not null default 'en',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Organizations — multi-tenant workspaces.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references public.users (id) on delete restrict,
  plan user_tier not null default 'free',
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists organizations_owner_idx on public.organizations (owner_id);

-- Now that organizations exists, attach the FK on users.current_organization_id.
do $$ begin
  alter table public.users
    add constraint users_current_organization_fk
    foreign key (current_organization_id) references public.organizations (id) on delete set null;
exception when duplicate_object then null; end $$;

-- User ↔ organization junction with role.
create table if not exists public.user_roles (
  user_id uuid not null references public.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role org_role not null default 'member',
  invited_by uuid references public.users (id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (user_id, organization_id)
);
create index if not exists user_roles_org_idx on public.user_roles (organization_id);

-- App-level session log (Supabase auth.sessions is the canonical session
-- store — this table tracks app-level activity for audit + analytics).
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  ip text,
  user_agent text,
  signed_in_at timestamptz not null default now(),
  signed_out_at timestamptz,
  last_seen_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on public.sessions (user_id);
create index if not exists sessions_last_seen_idx on public.sessions (last_seen_at desc);

-- OAuth account links. Supabase Auth has auth.identities internally —
-- this surface is for the UI's "Linked Accounts" feature so the app
-- doesn't need access to the auth schema.
create table if not exists public.oauth_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  provider oauth_provider not null,
  provider_account_id text not null,
  linked_email text,
  linked_at timestamptz not null default now(),
  unique (provider, provider_account_id)
);
create index if not exists oauth_accounts_user_idx on public.oauth_accounts (user_id);

-- ============================================================================
-- ② LIBRARY
-- ============================================================================

-- The main institutional hotel-asset record. Mirrors the frontend
-- LibraryReport shape (apps/web/src/types/library.ts).
create table if not exists public.valuations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,

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
  location_score numeric(3,2) check (location_score between 0 and 10),
  lat numeric(9,6),
  lng numeric(9,6),
  open_year int,
  class_label text,
  owner_label text,

  -- Listing
  role report_role,
  objective report_objective,

  -- Visibility + report tier classification (independent axes)
  visibility report_visibility_t not null default 'private',
  report_type report_type_badge not null default 'Public',

  -- Rich blocks — flexible during underwriting engine iteration.
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
create index if not exists valuations_org_idx on public.valuations (organization_id);
create index if not exists valuations_public_idx on public.valuations (visibility)
  where visibility in ('public','top-promote');
create index if not exists valuations_city_idx on public.valuations (city);

-- Versioned snapshots — every "save scenario" or "publish" mints a new row.
create table if not exists public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  valuation_id uuid not null references public.valuations (id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  pdf_path text,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  unique (valuation_id, version)
);
create index if not exists saved_reports_valuation_idx on public.saved_reports (valuation_id);

-- N:M favourites.
create table if not exists public.favorite_reports (
  user_id uuid not null references public.users (id) on delete cascade,
  valuation_id uuid not null references public.valuations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, valuation_id)
);
create index if not exists favorite_reports_valuation_idx on public.favorite_reports (valuation_id);

-- Marketplace promotion record (1:1 with a valuation).
create table if not exists public.top_promote_reports (
  valuation_id uuid primary key references public.valuations (id) on delete cascade,
  promoted_by uuid not null references public.users (id),
  promoted_at timestamptz not null default now(),
  promoted_until timestamptz not null,
  boost_score numeric(5,2) check (boost_score >= 0 and boost_score <= 100),
  sponsor_priority int not null default 0,
  featured_region text,
  impressions int not null default 0,
  clicks int not null default 0
  -- NOTE: "is_active" is derived at query time as (promoted_until > now()).
  -- A stored generated column using now() is rejected by Postgres
  -- (generation expressions must be immutable). Use the partial index below.
);
-- NOTE: partial indexes with "where promoted_until > now()" are rejected
-- by Postgres (index predicate must be IMMUTABLE). Plain b-tree indexes
-- are fine and the planner will still prune efficiently when callers
-- include "and promoted_until > now()" in their WHERE clause.
create index if not exists top_promote_active_idx on public.top_promote_reports (promoted_until);
create index if not exists top_promote_priority_idx on public.top_promote_reports (sponsor_priority desc);

-- Audit log of visibility transitions on a valuation.
create table if not exists public.report_visibility (
  id uuid primary key default gen_random_uuid(),
  valuation_id uuid not null references public.valuations (id) on delete cascade,
  changed_by uuid not null references public.users (id),
  previous_visibility report_visibility_t,
  new_visibility report_visibility_t not null,
  reason text,
  changed_at timestamptz not null default now()
);
create index if not exists report_visibility_valuation_idx on public.report_visibility (valuation_id);

-- Explicit share grants (link + per-user).
create table if not exists public.report_shares (
  id uuid primary key default gen_random_uuid(),
  valuation_id uuid not null references public.valuations (id) on delete cascade,
  shared_by uuid not null references public.users (id),
  -- When null: link share (anyone with the token can view). When set:
  -- direct user grant.
  shared_with uuid references public.users (id) on delete cascade,
  permission share_permission not null default 'view',
  token text unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists report_shares_valuation_idx on public.report_shares (valuation_id);
create index if not exists report_shares_shared_with_idx on public.report_shares (shared_with);

-- ============================================================================
-- ③ INVESTMENT ENGINE
-- ============================================================================

-- One row per user — the top-level investor preferences container.
create table if not exists public.investment_requirements (
  user_id uuid primary key references public.users (id) on delete cascade,
  -- Asset criteria (segment, geography, room range, classification).
  asset jsonb not null default '{}'::jsonb,
  -- Facility / amenity preferences.
  facilities jsonb not null default '{}'::jsonb,
  -- Coverage area (countries / cities / markets).
  coverage jsonb not null default '{}'::jsonb,
  -- ADR + occupancy growth assumptions.
  growth jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-market preference detail (target markets, RevPAR scenario picks).
create table if not exists public.market_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  country_code text,
  city text,
  sub_market text,
  revpar_scenario text check (revpar_scenario in ('DOWN','BASE','UP')),
  target jsonb,
  created_at timestamptz not null default now()
);
create index if not exists market_preferences_user_idx on public.market_preferences (user_id);

-- Per-user valuation criteria — cap rate / yield / IRR targets, debt
-- structure, acquisition cost preferences.
create table if not exists public.valuation_preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  site jsonb not null default '{}'::jsonb,
  exit jsonb not null default '{}'::jsonb,
  rent jsonb not null default '{}'::jsonb,
  finance jsonb not null default '{}'::jsonb,
  pl_forecast jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Saved RevPAR scenario sets (DOWN / BASE / UP buckets + custom).
create table if not exists public.revpar_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  scenario text check (scenario in ('DOWN','BASE','UP','CUSTOM')),
  revpar_eur numeric(10,2),
  adr_eur numeric(10,2),
  occupancy numeric(5,2),
  created_at timestamptz not null default now()
);
create index if not exists revpar_scenarios_user_idx on public.revpar_scenarios (user_id);

-- Saved searches — filter criteria the user wants to re-run later.
create table if not exists public.hotel_filters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  criteria jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hotel_filters_user_idx on public.hotel_filters (user_id);

-- ============================================================================
-- ④ CRM
-- ============================================================================

-- External company records (different from public.organizations, which
-- are HotelVALORA tenants).
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  website text,
  industry text,
  size text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists companies_owner_idx on public.companies (owner_id);

-- Person records — contacts (could be leads, account managers, etc).
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  position text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contacts_owner_idx on public.contacts (owner_id);
create index if not exists contacts_company_idx on public.contacts (company_id);

-- Lead pipeline state on a contact.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  status lead_status not null default 'new',
  source text,
  estimated_value_eur numeric(14,2),
  expected_close_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_owner_idx on public.leads (owner_id);
create index if not exists leads_contact_idx on public.leads (contact_id);
create index if not exists leads_status_idx on public.leads (status);

-- Polymorphic notes — attached to any entity via (entity_type, entity_id).
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('contact','lead','company','valuation','organization')),
  entity_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_owner_idx on public.notes (owner_id);
create index if not exists notes_entity_idx on public.notes (entity_type, entity_id);

-- CRM activity stream (sent email, scheduled call, opened report, …).
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users (id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists activity_log_entity_idx on public.activity_log (entity_type, entity_id);
create index if not exists activity_log_actor_idx on public.activity_log (actor_id);
create index if not exists activity_log_occurred_idx on public.activity_log (occurred_at desc);

-- ============================================================================
-- ⑤ FILES & STORAGE METADATA
-- ============================================================================
-- Each file table is the DB-side metadata; the binary lives in the
-- matching Supabase Storage bucket (configured via dashboard).

-- Files attached to a valuation (deal documents, photos, contracts).
create table if not exists public.report_files (
  id uuid primary key default gen_random_uuid(),
  valuation_id uuid not null references public.valuations (id) on delete cascade,
  uploaded_by uuid not null references public.users (id) on delete cascade,
  bucket text not null default 'reports',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
create index if not exists report_files_valuation_idx on public.report_files (valuation_id);

-- PDF generation queue/log.
create table if not exists public.generated_pdfs (
  id uuid primary key default gen_random_uuid(),
  saved_report_id uuid references public.saved_reports (id) on delete set null,
  requested_by uuid not null references public.users (id) on delete cascade,
  bucket text not null default 'pdfs',
  storage_path text,
  status pdf_status not null default 'queued',
  error_message text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists generated_pdfs_status_idx on public.generated_pdfs (status);
create index if not exists generated_pdfs_requested_by_idx on public.generated_pdfs (requested_by);

-- Excel workbook ingestion log.
create table if not exists public.uploaded_excels (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references public.users (id) on delete cascade,
  bucket text not null default 'excel-uploads',
  storage_path text not null,
  file_name text not null,
  size_bytes bigint,
  status excel_status not null default 'queued',
  parsed_summary jsonb,
  error_message text,
  uploaded_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists uploaded_excels_status_idx on public.uploaded_excels (status);
create index if not exists uploaded_excels_user_idx on public.uploaded_excels (uploaded_by);

-- AI render metadata.
create table if not exists public.renders (
  id uuid primary key default gen_random_uuid(),
  valuation_id uuid references public.valuations (id) on delete cascade,
  requested_by uuid not null references public.users (id) on delete cascade,
  bucket text not null default 'renders',
  storage_path text,
  prompt text,
  provider text,
  model text,
  cost_usd numeric(8,4),
  created_at timestamptz not null default now()
);
create index if not exists renders_valuation_idx on public.renders (valuation_id);

-- Avatar versioning (in case the user uploads multiple — keeps history).
create table if not exists public.avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  bucket text not null default 'avatars',
  storage_path text not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists avatars_user_idx on public.avatars (user_id);
create index if not exists avatars_current_idx on public.avatars (user_id) where is_current;

-- ============================================================================
-- ⑥ SYSTEM
-- ============================================================================

-- Generic audit trail across the entire app.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users (id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb,
  reversible boolean not null default false,
  reverted_at timestamptz,
  reverted_by uuid references public.users (id),
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_event_idx on public.audit_logs (event_type);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- User notifications.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  kind notification_kind not null,
  title text not null,
  body text,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- Server-side feature flags — per-user / per-org overrides.
create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  flag text not null,
  user_id uuid references public.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Either user-scoped or org-scoped (not both, not neither).
  check ((user_id is not null) <> (organization_id is not null))
);
create unique index if not exists feature_flags_user_unique
  on public.feature_flags (flag, user_id) where user_id is not null;
create unique index if not exists feature_flags_org_unique
  on public.feature_flags (flag, organization_id) where organization_id is not null;

-- Stripe-backed billing record.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  tier user_tier not null,
  status subscription_status not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id);
create index if not exists subscriptions_org_idx on public.subscriptions (organization_id);
create index if not exists subscriptions_active_idx on public.subscriptions (status)
  where status in ('active','trialing');

-- Stripe webhook event log — every event ingested.
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  related_user uuid references public.users (id) on delete set null,
  related_subscription uuid references public.subscriptions (id) on delete set null,
  processed boolean not null default false,
  received_at timestamptz not null default now()
);
create index if not exists payment_events_type_idx on public.payment_events (event_type);
create index if not exists payment_events_received_idx on public.payment_events (received_at desc);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- updated_at — fired on every mutable table.
do $$ begin
  create trigger users_updated_at before update on public.users
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger profiles_updated_at before update on public.profiles
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger organizations_updated_at before update on public.organizations
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger valuations_updated_at before update on public.valuations
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger investment_requirements_updated_at before update on public.investment_requirements
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger valuation_preferences_updated_at before update on public.valuation_preferences
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger hotel_filters_updated_at before update on public.hotel_filters
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger companies_updated_at before update on public.companies
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger contacts_updated_at before update on public.contacts
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger leads_updated_at before update on public.leads
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger notes_updated_at before update on public.notes
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger feature_flags_updated_at before update on public.feature_flags
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger subscriptions_updated_at before update on public.subscriptions
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

-- Auto-create public.users + public.profiles on auth.users insert.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, tier, role)
  values (new.id, new.email, 'free', 'user')
  on conflict (id) do nothing;

  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (user_id) do nothing;

  return new;
end;
$$;

do $$ begin
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
exception when duplicate_object then null; end $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.users                  enable row level security;
alter table public.profiles               enable row level security;
alter table public.organizations          enable row level security;
alter table public.user_roles             enable row level security;
alter table public.sessions               enable row level security;
alter table public.oauth_accounts         enable row level security;
alter table public.valuations             enable row level security;
alter table public.saved_reports          enable row level security;
alter table public.favorite_reports       enable row level security;
alter table public.top_promote_reports    enable row level security;
alter table public.report_visibility      enable row level security;
alter table public.report_shares          enable row level security;
alter table public.investment_requirements enable row level security;
alter table public.market_preferences     enable row level security;
alter table public.valuation_preferences  enable row level security;
alter table public.revpar_scenarios       enable row level security;
alter table public.hotel_filters          enable row level security;
alter table public.companies              enable row level security;
alter table public.contacts               enable row level security;
alter table public.leads                  enable row level security;
alter table public.notes                  enable row level security;
alter table public.activity_log           enable row level security;
alter table public.report_files           enable row level security;
alter table public.generated_pdfs         enable row level security;
alter table public.uploaded_excels        enable row level security;
alter table public.renders                enable row level security;
alter table public.avatars                enable row level security;
alter table public.audit_logs             enable row level security;
alter table public.notifications          enable row level security;
alter table public.feature_flags          enable row level security;
alter table public.subscriptions          enable row level security;
alter table public.payment_events         enable row level security;

-- ──────────────────────────────────────────────────────────────────────────
-- Identity tables
-- ──────────────────────────────────────────────────────────────────────────
create policy "users: read own" on public.users for select to authenticated using (auth.uid() = id);
create policy "users: update own" on public.users for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles: read own" on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy "profiles: update own" on public.profiles for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Organizations: members read, owners write.
create policy "organizations: members read" on public.organizations for select to authenticated using (
  exists (select 1 from public.user_roles ur where ur.organization_id = organizations.id and ur.user_id = auth.uid())
);
create policy "organizations: owners write" on public.organizations for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "user_roles: members read own org" on public.user_roles for select to authenticated using (
  user_id = auth.uid() or
  exists (select 1 from public.user_roles ur2 where ur2.organization_id = user_roles.organization_id and ur2.user_id = auth.uid())
);
create policy "user_roles: org owner write" on public.user_roles for all to authenticated
  using (exists (select 1 from public.organizations o where o.id = user_roles.organization_id and o.owner_id = auth.uid()))
  with check (exists (select 1 from public.organizations o where o.id = user_roles.organization_id and o.owner_id = auth.uid()));

create policy "sessions: own" on public.sessions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "oauth_accounts: own" on public.oauth_accounts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────
-- Library
-- ──────────────────────────────────────────────────────────────────────────
create policy "valuations: public read" on public.valuations for select using (visibility in ('public','top-promote'));
create policy "valuations: own read" on public.valuations for select to authenticated using (auth.uid() = owner_id);
create policy "valuations: own write" on public.valuations for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "saved_reports: parent public" on public.saved_reports for select using (
  exists (select 1 from public.valuations v where v.id = saved_reports.valuation_id and v.visibility in ('public','top-promote'))
);
create policy "saved_reports: parent owner" on public.saved_reports for all to authenticated using (
  exists (select 1 from public.valuations v where v.id = saved_reports.valuation_id and v.owner_id = auth.uid())
) with check (
  exists (select 1 from public.valuations v where v.id = saved_reports.valuation_id and v.owner_id = auth.uid())
);

create policy "favorite_reports: own" on public.favorite_reports for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "top_promote_reports: public read" on public.top_promote_reports for select using (true);
create policy "top_promote_reports: owner write" on public.top_promote_reports for all to authenticated
  using (auth.uid() = (select owner_id from public.valuations where id = valuation_id))
  with check (auth.uid() = (select owner_id from public.valuations where id = valuation_id));

create policy "report_visibility: owner read" on public.report_visibility for select to authenticated using (
  exists (select 1 from public.valuations v where v.id = report_visibility.valuation_id and v.owner_id = auth.uid())
);

create policy "report_shares: shared with me" on public.report_shares for select to authenticated using (shared_with = auth.uid() or shared_by = auth.uid());
create policy "report_shares: owner write" on public.report_shares for all to authenticated
  using (exists (select 1 from public.valuations v where v.id = report_shares.valuation_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.valuations v where v.id = report_shares.valuation_id and v.owner_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────────────────
-- Investment engine — own only
-- ──────────────────────────────────────────────────────────────────────────
create policy "investment_requirements: own" on public.investment_requirements for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "market_preferences: own" on public.market_preferences for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "valuation_preferences: own" on public.valuation_preferences for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "revpar_scenarios: own" on public.revpar_scenarios for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "hotel_filters: own" on public.hotel_filters for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────
-- CRM — own only
-- ──────────────────────────────────────────────────────────────────────────
create policy "companies: own" on public.companies for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "contacts: own" on public.contacts for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "leads: own" on public.leads for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "notes: own" on public.notes for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "activity_log: own" on public.activity_log for select to authenticated using (auth.uid() = actor_id);

-- ──────────────────────────────────────────────────────────────────────────
-- Files
-- ──────────────────────────────────────────────────────────────────────────
create policy "report_files: parent owner" on public.report_files for all to authenticated
  using (exists (select 1 from public.valuations v where v.id = report_files.valuation_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.valuations v where v.id = report_files.valuation_id and v.owner_id = auth.uid()));

create policy "generated_pdfs: requester" on public.generated_pdfs for all to authenticated using (auth.uid() = requested_by) with check (auth.uid() = requested_by);
create policy "uploaded_excels: own" on public.uploaded_excels for all to authenticated using (auth.uid() = uploaded_by) with check (auth.uid() = uploaded_by);
create policy "renders: requester" on public.renders for all to authenticated using (auth.uid() = requested_by) with check (auth.uid() = requested_by);
create policy "avatars: own" on public.avatars for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────
-- System
-- ──────────────────────────────────────────────────────────────────────────
create policy "audit_logs: actor read" on public.audit_logs for select to authenticated using (auth.uid() = actor_id);

create policy "notifications: own read" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "notifications: own update" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "feature_flags: own read" on public.feature_flags for select to authenticated using (
  user_id = auth.uid() or
  organization_id in (select organization_id from public.user_roles where user_id = auth.uid())
);

create policy "subscriptions: own read" on public.subscriptions for select to authenticated using (auth.uid() = user_id);

-- payment_events has NO authenticated policy by design — only the
-- service-role Stripe webhook handler writes here, and the service role
-- bypasses RLS.

-- ============================================================================
-- END migration 0001
-- ============================================================================
