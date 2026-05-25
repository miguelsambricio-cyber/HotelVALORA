-- ============================================================================
-- Migration 0032 · Rebrand policy infrastructure · 3 layers
-- ============================================================================
-- Applied via Supabase MCP on 2026-05-26 (project twebgqutuqgonabvhzjk).
-- Building-identity continuity through rebrand events. A physical hotel
-- (one canonical_id) may carry multiple commercial identities over time;
-- this migration stops the system from inserting a NEW canonical row when
-- an existing building is re-discovered under a new brand.
--
-- LAYER A is the TS detector (no DB component · lib/enrichment/dedup/).
-- LAYER B is hotel_name_alias (this migration).
-- LAYER C is hotel_canonical_history (this migration).
-- Plus: extend dup_tier_enum with `same_building_rebrand` for the
--       detector to surface rebrand candidates via hotel_duplicate_candidate.
--
-- The strict ON CONFLICT behavior of slug + external-id unique indexes
-- (0024 + 0029) already prevents accidental duplicates of the SAME
-- name/external-id. This migration covers rebrands · where the building
-- is the same but the name/brand changed.
-- ============================================================================

alter type public.dup_tier_enum add value if not exists 'same_building_rebrand';

create table if not exists public.hotel_name_alias (
  id            uuid primary key default gen_random_uuid(),
  canonical_id  uuid not null references public.hotel_canonical(id) on delete cascade,
  alias_name    text not null,
  alias_slug    text,
  valid_from    date,
  valid_to      date,
  source        text not null,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (canonical_id, alias_name)
);

create index if not exists hotel_name_alias_slug_idx
  on public.hotel_name_alias (alias_slug)
  where alias_slug is not null;

create index if not exists hotel_name_alias_name_lower_idx
  on public.hotel_name_alias (lower(alias_name));

create index if not exists hotel_name_alias_canonical_idx
  on public.hotel_name_alias (canonical_id);

alter table public.hotel_name_alias enable row level security;

drop policy if exists "hotel_name_alias public read" on public.hotel_name_alias;
create policy "hotel_name_alias public read"
  on public.hotel_name_alias for select using (true);

comment on table public.hotel_name_alias is
  'Historical / alternative names + URL slugs that resolve to a canonical building. See docs/database.md rebrand policy section.';

create table if not exists public.hotel_canonical_history (
  id              uuid primary key default gen_random_uuid(),
  canonical_id    uuid not null references public.hotel_canonical(id) on delete cascade,
  canonical_name  text not null,
  brand           text,
  brand_family    text,
  chain_scale     public.hotel_segment,
  valid_from      date not null,
  valid_to        date,
  rebrand_reason  text,
  source_record_id uuid references public.hotel_source_record(id),
  created_at      timestamptz not null default now()
);

create index if not exists hotel_canonical_history_canonical_idx
  on public.hotel_canonical_history (canonical_id, valid_from);

create index if not exists hotel_canonical_history_active_idx
  on public.hotel_canonical_history (canonical_id)
  where valid_to is null;

alter table public.hotel_canonical_history enable row level security;

drop policy if exists "hotel_canonical_history public read" on public.hotel_canonical_history;
create policy "hotel_canonical_history public read"
  on public.hotel_canonical_history for select using (true);

comment on table public.hotel_canonical_history is
  'Append-only timeline of building identities through rebrand events. valid_to IS NULL means current identity. See docs/database.md rebrand policy section.';
