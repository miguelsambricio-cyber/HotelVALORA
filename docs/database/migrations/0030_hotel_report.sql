-- ============================================================================
-- Migration 0030 · hotel_report — institutional report sessions
-- ============================================================================
-- Applied via Supabase MCP on 2026-05-25 (project twebgqutuqgonabvhzjk).
-- A row per report instance · separate from hotel_report_library (catalog).
-- The report_id (uuid) is the URL identity that survives navigation between
-- the 10 /report/[reportId]/<section> pages — replaces the URL-pass-through
-- ?ref=<slug> pattern that fell through to mock when CompSet emitted slugs
-- the resolver couldn't map.
--
-- Distinction:
--   hotel_report_library · catalog of rendered reports · 1:1 per canonical_id
--   hotel_report         · live instances · N:1 per canonical_id (per day per owner)
--
-- Dedup policy (operator-approved A2): one row per (canonical_id, owner, day).
-- Reopening the same hotel the same day reuses the row instead of creating
-- a duplicate · keeps the library / map clean.
--
-- Retention: infinite for now (operator decision). Purge policy TBD.
-- ============================================================================

create table if not exists public.hotel_report (
  id              uuid primary key default gen_random_uuid(),
  canonical_id    uuid not null references public.hotel_canonical(id) on delete cascade,
  report_date     date not null default current_date,
  tier_snapshot   text,
  input_params    jsonb not null default '{}'::jsonb,
  owner_user_id   uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  last_viewed_at  timestamptz not null default now()
);

-- A2 dedup: one row per (canonical_id, owner, day).
-- COALESCE on owner_user_id collapses NULL into a sentinel UUID so the
-- index treats anonymous reports for the same hotel+day as a single bucket.
create unique index if not exists hotel_report_dedup_uq
  on public.hotel_report (
    canonical_id,
    coalesce(owner_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    report_date
  );

create index if not exists hotel_report_canonical_idx
  on public.hotel_report (canonical_id, created_at desc);

create index if not exists hotel_report_owner_idx
  on public.hotel_report (owner_user_id, created_at desc)
  where owner_user_id is not null;

create index if not exists hotel_report_created_idx
  on public.hotel_report (created_at desc);

-- ─── RLS ──────────────────────────────────────────────────────────────────
-- Showcase mode (today): public-read · public-insert · public-update.
-- The report_id in URL IS the credential.
-- When auth flips on (PRO/PREMIUM): tighten with owner_user_id = auth.uid()
-- in a follow-up migration.

alter table public.hotel_report enable row level security;

drop policy if exists "hotel_report public read" on public.hotel_report;
create policy "hotel_report public read"
  on public.hotel_report
  for select
  using (true);

drop policy if exists "hotel_report public insert" on public.hotel_report;
create policy "hotel_report public insert"
  on public.hotel_report
  for insert
  with check (true);

drop policy if exists "hotel_report public update" on public.hotel_report;
create policy "hotel_report public update"
  on public.hotel_report
  for update
  using (true)
  with check (true);

comment on table public.hotel_report is
  'Live institutional report sessions. URL identity for the 10 /report/[reportId]/<section> pages. A2 dedup: one row per (canonical_id, owner, day). See docs/database.md.';
