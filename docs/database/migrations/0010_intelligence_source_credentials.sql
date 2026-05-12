-- ============================================================================
-- HOTELVALORA · Supabase · Migration 0010 — Intelligence Source Credentials
-- ============================================================================
-- Lifts T1 (raw credentials) out of Vercel env vars into encrypted-at-rest
-- Postgres rows so HOTELVALORA itself becomes the operational console for
-- credential provisioning, rotation, and invalidation.
--
-- ARCHITECTURE DECISION (2026-05-12)
--   The original Option A (T1 only in env, T2 encrypted in DB) was approved
--   in the Hosteltur architecture review, but operationally it forced every
--   credential change through Vercel CLI. Option B keeps the same KEK model
--   already accepted for T2 sessions and stores T1 as authenticated
--   ciphertext (AES-256-GCM) in a service-role-only table. Operator workflow
--   moves from `vercel env add` to a one-click admin UI.
--
-- SECURITY POSTURE — preserved guarantees
--   ✓ No plaintext credentials persisted
--   ✓ No credentials in logs (writer/reader both run through redact())
--   ✓ No credentials in audit rows (only event_kind + source_slug + actor)
--   ✓ No frontend exposure (NEXT_PUBLIC_* mirror impossible — server-only)
--   ✓ Service-role-only RLS posture (defence-in-depth via revoke all)
--
-- WHAT CHANGES vs Option A
--   - T1 storage moves from env → table (encrypted)
--   - Rotation: from `vercel env add` → admin UI form
--   - Invalidation: explicit row state machine (active → invalidated)
--   - Audit: dedicated table separate from ai_agent_runs for the credential
--     lifecycle, simpler queries and stricter shape contract
--
-- THREAT MODEL DELTA
--   Compromise of (INTELLIGENCE_SESSION_ENC_KEY + Supabase DB read) now
--   surfaces both T1 and T2 ciphertext. Same KEK so the surface is unified.
--   This is symmetric with the T2 risk already accepted in migration 0009.
--
-- Strategic context: docs/integrations/hosteltur.md
-- Related migration: 0009_intelligence_source_sessions.sql (T2 session storage)
-- ============================================================================

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

do $$ begin
  create type intelligence_credential_status as enum (
    'active',        -- current credentials · used by refresh runs
    'rotated',       -- replaced by a newer 'active' row · kept for forensic trail
    'invalidated'    -- explicitly invalidated · operator action required to restore
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type intelligence_credential_event_kind as enum (
    'provisioned',     -- first-time credentials for the source
    'rotated',         -- replaced existing credentials
    'invalidated',     -- explicit invalidation by operator
    'auth_success',    -- refresh script logged in successfully
    'auth_failure',    -- refresh script login attempt failed
    'decryption_error' -- KEK/iv/tag verification failed on read (tampering signal)
  );
exception when duplicate_object then null; end $$;

-- ─── INTELLIGENCE_SOURCE_CREDENTIALS ────────────────────────────────────────
-- One row = one stored credential pair for one source. Each field is encrypted
-- independently with its own IV + auth tag (so failure in one decrypt does not
-- leak the other). Both encrypted with the same KEK (enc_key_id tracks it).

create table if not exists public.intelligence_source_credentials (
  id                      uuid primary key default gen_random_uuid(),

  -- FK on the source registry — DELETE cascade if a source is removed entirely.
  source_id               uuid not null references public.sources(id) on delete cascade,

  -- Denormalised slug for refresh script lookup without a JOIN.
  source_slug             text not null,

  -- ── Username (AES-256-GCM) ──────────────────────────────────────────────
  username_encrypted      bytea not null,
  username_iv             bytea not null,  -- 12 bytes
  username_auth_tag       bytea not null,  -- 16 bytes

  -- ── Password (AES-256-GCM, separate IV from username) ───────────────────
  password_encrypted      bytea not null,
  password_iv             bytea not null,
  password_auth_tag       bytea not null,

  -- KEK identifier — INTELLIGENCE_SESSION_ENC_KEY_ID at the time of write.
  -- Bumped to v2 when the KEK rotates; old v1 rows decrypt with the legacy
  -- key kept in INTELLIGENCE_SESSION_ENC_KEY_V1 until they're rotated.
  enc_key_id              text not null default 'v1',

  -- State machine — drives operator UI + refresh script gating.
  status                  intelligence_credential_status not null default 'active',

  -- Lifecycle timestamps.
  last_rotated_at         timestamptz not null default now(),
  last_rotated_by         uuid references auth.users(id) on delete set null,
  rotation_count          int not null default 1 check (rotation_count > 0),

  -- Refresh-script telemetry — written by the script after each login attempt.
  -- Decoupled from the audit table (which is the canonical history); these
  -- columns are the cached "latest" surface for the UI.
  last_login_at           timestamptz,
  last_login_status       text check (last_login_status in ('success','failure')),
  -- Sanitised error · MUST NOT contain credential fragments. Writer redacts.
  last_login_error        text,

  -- Non-secret metadata. Writer MUST NOT put credentials here.
  meta                    jsonb not null default '{}'::jsonb,

  created_at              timestamptz not null default now()
);

-- Exactly one ACTIVE credential per source. Multiple rotated rows are fine —
-- they form the forensic trail.
create unique index if not exists intel_source_credentials_active_uniq
  on public.intelligence_source_credentials (source_slug)
  where status = 'active';

create index if not exists intel_source_credentials_source_idx
  on public.intelligence_source_credentials (source_id);

create index if not exists intel_source_credentials_status_idx
  on public.intelligence_source_credentials (status);

-- ─── INTELLIGENCE_CREDENTIALS_AUDIT ─────────────────────────────────────────
-- Canonical audit log for every lifecycle event. Append-only. Operators
-- can read via service-role queries; the credentials_panel UI surfaces
-- only the last N events with status only (never error bodies that could
-- leak credential shape).

create table if not exists public.intelligence_credentials_audit (
  id                  uuid primary key default gen_random_uuid(),

  -- Reference fields — never include the credential value itself.
  source_id           uuid references public.sources(id) on delete set null,
  source_slug         text not null,
  credential_id       uuid references public.intelligence_source_credentials(id) on delete set null,

  event_kind          intelligence_credential_event_kind not null,

  -- Actor — null for autonomous events (Phase 4+ refresh script auth attempts).
  actor_user_id       uuid references auth.users(id) on delete set null,

  -- Sanitised event detail. Writer is responsible for redacting any value
  -- that could expose a credential, full cookie, or session token.
  detail              jsonb not null default '{}'::jsonb,

  -- Sanitised error (when event_kind in ('auth_failure','decryption_error')).
  -- MUST NOT contain credential fragments.
  error               text,

  created_at          timestamptz not null default now()
);

create index if not exists intel_creds_audit_source_idx
  on public.intelligence_credentials_audit (source_slug, created_at desc);

create index if not exists intel_creds_audit_kind_idx
  on public.intelligence_credentials_audit (event_kind, created_at desc);

create index if not exists intel_creds_audit_actor_idx
  on public.intelligence_credentials_audit (actor_user_id, created_at desc);

-- ─── RLS — closed by default ────────────────────────────────────────────────
-- RLS on with NO policies = PostgREST refuses all anon/authenticated queries.
-- Only service-role (which bypasses RLS) can read or write.

alter table public.intelligence_source_credentials enable row level security;
alter table public.intelligence_credentials_audit enable row level security;

-- Defence-in-depth: explicit grant revocation. Even if a future migration
-- creates a permissive policy accidentally, anon/authenticated still cannot
-- SELECT unless privileges are re-granted (which would be visible in PR review).
revoke all on public.intelligence_source_credentials from anon;
revoke all on public.intelligence_source_credentials from authenticated;
revoke all on public.intelligence_credentials_audit from anon;
revoke all on public.intelligence_credentials_audit from authenticated;

-- ─── COMMENTS — discoverable from psql \d+ and Supabase Studio ──────────────

comment on table public.intelligence_source_credentials is
  'Encrypted at-rest storage for T1 source credentials (AES-256-GCM). Service-role only — RLS enabled with no policies. See docs/integrations/hosteltur.md for the full architecture.';

comment on column public.intelligence_source_credentials.username_encrypted is
  'AES-256-GCM ciphertext of the source-account username/email. Decrypt with INTELLIGENCE_SESSION_ENC_KEY (key id in enc_key_id column) + this row''s username_iv + username_auth_tag.';

comment on column public.intelligence_source_credentials.password_encrypted is
  'AES-256-GCM ciphertext of the source-account password. Independent IV + auth tag from username so decryption failure of one cannot leak the other.';

comment on column public.intelligence_source_credentials.enc_key_id is
  'Identifier of the KEK that wrapped this row. Default v1. Bump to rotate without re-provisioning all sources.';

comment on column public.intelligence_source_credentials.last_login_error is
  'Last refresh-script login error · MUST NOT contain credential fragments. Writer redacts via lib/secrets/redact.ts.';

comment on column public.intelligence_source_credentials.meta is
  'Non-secret metadata about the credential. MUST NOT contain credentials, tokens, or session values.';

comment on table public.intelligence_credentials_audit is
  'Append-only audit log of credential lifecycle events (provision · rotate · invalidate · auth_success · auth_failure · decryption_error). MUST NEVER contain plaintext credentials.';

comment on column public.intelligence_credentials_audit.detail is
  'Sanitised event-detail JSON. Writer responsible for ensuring no credential value, cookie, or token reaches this column.';

comment on column public.intelligence_credentials_audit.error is
  'Sanitised error message. MUST NOT contain credential fragments.';

-- ============================================================================
-- END migration 0010
-- ============================================================================
