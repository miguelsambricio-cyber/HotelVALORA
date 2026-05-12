-- ============================================================================
-- HOTELVALORA · Supabase · Migration 0010 — Intelligence Source Credentials
-- ============================================================================
-- The T1.5 tier of the credential model. Raw subscriber credentials
-- (username + password) for authenticated hospitality intelligence
-- sources — encrypted at rest with AES-256-GCM, service-role-only RLS.
--
-- WHY T1.5 (and not T1 in env vars)
--
-- The operator must be able to provision, rotate, and invalidate paid-
-- source credentials from the HotelVALORA admin console without going
-- through Vercel env vars + terminal. The institutional operating model
-- requires the platform to be the control surface. The encrypted-in-DB
-- approach is acceptable because:
--   - the system already accepts AES-256-GCM session persistence (T2)
--   - the KEK model is part of the approved security posture
--   - the operational benefits substantially outweigh the marginal risk
--
-- HARD GUARANTEES
--
--   1. NEVER plaintext in this table — username AND password are both
--      AES-256-GCM ciphertext with distinct per-row IVs.
--   2. NEVER decrypted via PostgREST — RLS enabled, zero policies,
--      explicit `revoke all` from anon + authenticated. Only service-
--      role queries can return rows.
--   3. NEVER exposed to frontend payloads — server-side readers strip
--      the encrypted bytea columns before any response serialization.
--   4. NEVER logged — server actions explicitly skip these fields in
--      structured logs. Audit rows reference by source_slug only.
--   5. KEK is the same INTELLIGENCE_SESSION_ENC_KEY env var that wraps
--      T2 sessions. Same threat model, same rotation path.
--
-- LIFECYCLE
--
--   provision    First write → status='active', rotation_count=1
--   rotate       Overwrite → rotation_count++, last_rotated_at=now()
--   invalidate   Operator clears → status='invalidated', invalidated_at
--   auth_failure Detected by refresh script → status='invalidated',
--                invalidated_reason='auth_failure', triggers Resend alert
--
-- INDEPENDENT FROM T2
--
-- intelligence_source_credentials (T1.5) and intelligence_source_sessions
-- (T2) are independent lifecycles. Credentials rotate quarterly; sessions
-- rotate weekly. Invalidating credentials forces a session refresh on the
-- next ingestion run; invalidating a session does NOT touch credentials.
--
-- Strategic context: docs/integrations/hosteltur.md
-- Related migration: 0009_intelligence_source_sessions.sql
-- ============================================================================

-- ─── ENUM ────────────────────────────────────────────────────────────────────

do $$ begin
  create type intelligence_credential_status as enum (
    'active',           -- credentials provisioned and presumed valid
    'invalidated',      -- operator explicitly cleared
    'auth_failure',     -- refresh script reported login failure with these creds
    'rotated'           -- superseded by a newer row (kept for audit trail)
  );
exception when duplicate_object then null; end $$;

-- ─── INTELLIGENCE_SOURCE_CREDENTIALS ────────────────────────────────────────

create table if not exists public.intelligence_source_credentials (
  id                       uuid primary key default gen_random_uuid(),

  source_id                uuid not null references public.sources(id) on delete cascade,
  source_slug              text not null,

  -- Username (typically email). Encrypted with AES-256-GCM using
  -- INTELLIGENCE_SESSION_ENC_KEY. Each row has its own IV + auth tag.
  username_encrypted       bytea not null,
  username_iv              bytea not null,
  username_auth_tag        bytea not null,

  -- Password. Same algorithm, separate IV (NEVER reuse with username).
  password_encrypted       bytea not null,
  password_iv              bytea not null,
  password_auth_tag        bytea not null,

  -- KEK identifier — supports rotation without re-provisioning every source.
  enc_key_id               text not null default 'v1',

  status                   intelligence_credential_status not null default 'active',

  -- When this row was provisioned (first INSERT) or last rotated (UPDATE that
  -- replaces the ciphertext).
  last_rotated_at          timestamptz not null default now(),

  -- When the ingestion pipeline last consumed these credentials (decrypted
  -- and used in a Playwright login). Null until first use.
  last_used_at             timestamptz,

  -- Monotonic counter — operator forensics ("how often are we rotating?").
  rotation_count           int not null default 1 check (rotation_count > 0),

  -- Audit handle — operator who provisioned/rotated. Null for autonomous
  -- rotations (future).
  provisioned_by           uuid references auth.users(id) on delete set null,

  -- Invalidation metadata. Operator-facing reason — never a credential.
  invalidated_at           timestamptz,
  invalidated_reason       text,

  -- Non-secret metadata. Writers MUST NOT put credential fragments here.
  meta                     jsonb not null default '{}'::jsonb,

  created_at               timestamptz not null default now()
);

-- One ACTIVE credential row per source at a time. The partial unique index
-- enforces the invariant while leaving room for historical rows (rotated,
-- invalidated) as a forensic trail.
create unique index if not exists intel_source_credentials_active_uniq
  on public.intelligence_source_credentials (source_slug)
  where status = 'active';

create index if not exists intel_source_credentials_source_idx
  on public.intelligence_source_credentials (source_id);
create index if not exists intel_source_credentials_status_idx
  on public.intelligence_source_credentials (status);
create index if not exists intel_source_credentials_last_used_idx
  on public.intelligence_source_credentials (last_used_at desc nulls last);

-- ─── RLS — closed by default ────────────────────────────────────────────────
-- Same posture as intelligence_source_sessions: RLS enabled, NO policies,
-- explicit grant revocation. Service-role only.

alter table public.intelligence_source_credentials enable row level security;

revoke all on public.intelligence_source_credentials from anon;
revoke all on public.intelligence_source_credentials from authenticated;

-- ─── COMMENTS ───────────────────────────────────────────────────────────────

comment on table public.intelligence_source_credentials is
  'T1.5 tier — encrypted at-rest storage for paid-source login credentials. AES-256-GCM, service-role only, RLS with zero policies. Read by the refresh script; written by the admin provisioning UI. NEVER decrypted via PostgREST.';

comment on column public.intelligence_source_credentials.username_encrypted is
  'AES-256-GCM ciphertext of the subscriber username/email. Decrypt with INTELLIGENCE_SESSION_ENC_KEY using username_iv + username_auth_tag.';

comment on column public.intelligence_source_credentials.password_encrypted is
  'AES-256-GCM ciphertext of the subscriber password. Decrypt with INTELLIGENCE_SESSION_ENC_KEY using password_iv + password_auth_tag. NEVER reuse IV with username_encrypted.';

comment on column public.intelligence_source_credentials.enc_key_id is
  'Identifier of the KEK that wrapped this row. Default v1. Rotation: bump id, write new rows with new id, decommission once old rows are gone.';

comment on column public.intelligence_source_credentials.invalidated_reason is
  'Operator-facing reason for invalidation (e.g., "scheduled rotation", "auth_failure", "operator offboard"). MUST NOT contain credential fragments.';

comment on column public.intelligence_source_credentials.meta is
  'Non-secret metadata. MUST NOT contain credential values, password hints, or auth-failure error bodies.';
