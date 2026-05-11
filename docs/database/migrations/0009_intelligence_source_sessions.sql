-- ============================================================================
-- HOTELVALORA · Supabase · Migration 0009 — Intelligence Source Sessions
-- ============================================================================
-- Adds the encrypted-session-storage layer that turns the Hospitality
-- Intelligence engine from "public RSS only" into "authenticated paid
-- sources also." First consumer: Hosteltur Premium (validation tier).
-- Designed source-agnostic so Alimarket / STR / future paid feeds drop
-- in without schema change.
--
-- THE SECURITY MODEL — three-tier separation of secrets:
--
--   T1  Raw credentials (HOSTELTUR_USERNAME / HOSTELTUR_PASSWORD)
--       Storage:   Vercel env vars (Sensitive, Production scope only) +
--                  operator's local .env.local (gitignored).
--       Touched by: only the refresh-session script + future refresh API.
--       NEVER stored in the database. NEVER logged. NEVER in audit rows.
--
--   T2  Session artifacts (cookies / storageState / bearer JWTs)
--       Storage:   THIS TABLE, encrypted at rest with AES-256-GCM.
--       Touched by: refresh-session writer · Market Intelligence Agent reader.
--       Service-role only — RLS enabled with zero policies, so PostgREST
--       cannot return rows to anon or authenticated callers.
--
--   T3  Content (article HTML / RSS / normalised rows)
--       Storage:   existing market_news + companion tables.
--       Touched by: existing ingestion pipeline. No credential surface.
--
-- Encryption details
--   Algorithm  AES-256-GCM (authenticated encryption — tampering detected)
--   Key        INTELLIGENCE_SESSION_ENC_KEY env var, 32 bytes, never in DB
--   Nonce      `iv` column, 12 bytes, unique per encryption
--   Auth tag   `auth_tag` column, 16 bytes, verified on decrypt
--   Rotation   enc_key_id column tags each row with the KEK that wrapped it;
--              rotating means adding INTELLIGENCE_SESSION_ENC_KEY_V2,
--              writing new rows with enc_key_id='v2', and letting v1 rows
--              expire via TTL.
--
-- Source-level auth flag
--   Extends public.sources with `requires_auth` + `auth_strategy` so the
--   Market Intelligence Agent can branch on per-source auth posture
--   without code change when new paid sources are onboarded.
--
-- Strategic context: docs/integrations/hosteltur.md
-- Related migration: 0006_hospitality_intelligence_schema.sql (sources, market_news)
-- ============================================================================

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

do $$ begin
  create type intelligence_auth_strategy as enum (
    'none',           -- public RSS / public scrape · no credentials needed
    'cookie_session', -- Playwright login → storageState (cookies + localStorage)
    'bearer_token',   -- subscriber API token, future-proofing
    'oauth2'          -- future-proofing for partner OAuth flows
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type intelligence_session_status as enum (
    'active',           -- session is current and unexpired
    'expired',          -- TTL has elapsed; needs refresh
    'invalidated',      -- explicitly invalidated (e.g., 401 detected, password rotated)
    'refresh_failed'    -- last refresh attempt failed; needs operator attention
  );
exception when duplicate_object then null; end $$;

-- ─── SOURCES — extend with auth posture ─────────────────────────────────────
-- Idempotent: existing public-RSS rows default to (false, 'none'), so the
-- ingestion pipeline behaviour for Phase 2 sources is unchanged.

alter table public.sources
  add column if not exists requires_auth boolean not null default false;

alter table public.sources
  add column if not exists auth_strategy intelligence_auth_strategy not null default 'none';

-- Optional human-readable hint for operators: where to log in, where the
-- premium-content gate sits, etc. Never a credential.
alter table public.sources
  add column if not exists auth_notes text;

create index if not exists sources_requires_auth_idx
  on public.sources (requires_auth)
  where requires_auth = true;

-- ─── INTELLIGENCE_SOURCE_SESSIONS ───────────────────────────────────────────
-- One row = one stored authenticated session artifact for one source.
-- Encrypted at rest. Service-role read-only via RLS posture.

create table if not exists public.intelligence_source_sessions (
  id                      uuid primary key default gen_random_uuid(),

  -- Foreign-keyed to sources so a source DELETE cascades the session away.
  source_id               uuid not null references public.sources(id) on delete cascade,

  -- Denormalised slug for operator readability + simpler service-role queries
  -- (no JOIN needed when the refresh script doesn't have the source uuid in hand).
  source_slug             text not null,

  -- AES-256-GCM ciphertext of the JSON-encoded Playwright storageState
  -- (or, for bearer-token strategies, of { "token": "...", "expires_at": "..." }).
  storage_state_encrypted bytea not null,

  -- GCM nonce — 12 bytes, unique per encryption, generated by the writer.
  iv                      bytea not null,

  -- GCM authentication tag — 16 bytes, verified on decrypt.
  -- Tampering with `storage_state_encrypted` causes decrypt to fail loudly.
  auth_tag                bytea not null,

  -- Which KEK wrapped this row. Lets us rotate INTELLIGENCE_SESSION_ENC_KEY
  -- without re-logging-in every source: bump the id, write new rows with
  -- the new id, let old rows die via TTL.
  enc_key_id              text not null default 'v1',

  -- Status machine — drives operator UI + ingestion-time guards.
  status                  intelligence_session_status not null default 'active',

  -- TTL — set conservatively (e.g., 7 days even if source's natural expiry
  -- is 30 days) so we never wake up on Monday with a dead session. Cron
  -- refreshes proactively before this fires.
  expires_at              timestamptz not null,

  -- When this row was last written (login + encrypt succeeded).
  refreshed_at            timestamptz not null default now(),

  -- Operator who triggered the refresh. Null for autonomous refreshes
  -- (Phase 4+).
  refreshed_by            uuid references auth.users(id) on delete set null,

  -- Monotonic counter — useful for operator forensics ("when did we start
  -- thrashing this source's login?") and rate-limit signalling.
  refresh_count           int not null default 1 check (refresh_count > 0),

  -- Last failure reason. Cleared on successful refresh.
  -- IMPORTANT: callers must NOT write password fragments or full cookie
  -- values here. The redaction utility on the writer enforces this.
  last_refresh_error      text,

  -- Optional metadata — anything non-secret the writer wants to keep.
  -- Example: { "user_agent": "...", "login_duration_ms": 4321 }.
  -- IMPORTANT: callers must NOT write credentials here.
  meta                    jsonb not null default '{}'::jsonb,

  created_at              timestamptz not null default now()
);

-- One ACTIVE session per source at a time. Multiple expired/invalidated
-- rows are fine — useful as a forensic trail. The unique constraint is
-- partial so historical rows don't block new active ones.
create unique index if not exists intel_source_sessions_active_uniq
  on public.intelligence_source_sessions (source_slug)
  where status = 'active';

create index if not exists intel_source_sessions_expires_idx
  on public.intelligence_source_sessions (expires_at)
  where status = 'active';

create index if not exists intel_source_sessions_status_idx
  on public.intelligence_source_sessions (status);

create index if not exists intel_source_sessions_source_idx
  on public.intelligence_source_sessions (source_id);

-- ─── RLS — closed by default ────────────────────────────────────────────────
-- Enable RLS but define NO policies. PostgREST will refuse all anon and
-- authenticated reads/writes. Only the Supabase service-role key (which
-- bypasses RLS) can touch this table — and the service-role key only ever
-- runs in trusted server contexts (Vercel functions + operator CLI).

alter table public.intelligence_source_sessions enable row level security;

-- Defensive: revoke the default PostgREST grants on this table. Even if a
-- future migration accidentally creates a permissive policy, the grants
-- below ensure anon / authenticated cannot SELECT against it.
revoke all on public.intelligence_source_sessions from anon;
revoke all on public.intelligence_source_sessions from authenticated;

-- ─── COMMENTS — discoverable from psql \d+ and Supabase Studio ──────────────

comment on table public.intelligence_source_sessions is
  'Encrypted at-rest storage for authenticated source sessions (T2 in the three-tier credential model). Service-role only — RLS enabled with no policies. See docs/integrations/hosteltur.md for the full architecture.';

comment on column public.intelligence_source_sessions.storage_state_encrypted is
  'AES-256-GCM ciphertext of the Playwright storageState JSON (or bearer-token payload). Decrypt with INTELLIGENCE_SESSION_ENC_KEY (key id in enc_key_id column).';

comment on column public.intelligence_source_sessions.iv is
  'GCM nonce. 12 bytes. Unique per encryption.';

comment on column public.intelligence_source_sessions.auth_tag is
  'GCM authentication tag. 16 bytes. Verified on decrypt — tampering causes loud failure.';

comment on column public.intelligence_source_sessions.enc_key_id is
  'Identifier of the KEK that wrapped this row. Default v1. Bump to rotate without re-logging-in all sources.';

comment on column public.intelligence_source_sessions.last_refresh_error is
  'Last refresh failure reason. MUST NOT contain credential fragments. Writer is responsible for redaction.';

comment on column public.intelligence_source_sessions.meta is
  'Non-secret metadata about the refresh run. MUST NOT contain credentials, full cookies, or auth tokens.';
