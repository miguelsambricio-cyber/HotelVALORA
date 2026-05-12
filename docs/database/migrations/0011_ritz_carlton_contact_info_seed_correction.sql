-- ============================================================================
-- HOTELVALORA · Supabase · Migration 0011 — Ritz-Carlton contact_info fix
-- ============================================================================
-- Seed data hygiene: The Ritz-Carlton Madrid carries an active
-- top_promote_reports row but its valuations.contact_info column was
-- left null in migration 0005. The institutional rule is that
-- top-promoted reports MUST expose a contact channel, otherwise the
-- "Schedule a Tour" CTA in the Library is dead. This patches the seed.
--
-- Symptom in production: Ritz-Carlton renders the flame icon in the
-- Report Type column (top-promote active) but the Contact column shows
-- a greyed-out Mail icon — no hoverable account-manager card, no
-- "Schedule a Tour" path, no Resend email triggered.
--
-- Scope: idempotent; only updates the row when contact_info is null so
-- a re-run never overwrites real data.
-- ============================================================================

update public.valuations
set contact_info = jsonb_build_object(
  'accountManager', 'James Whitman',
  'accountManagerId', '2104',
  'email', 'james.whitman@ritzcarlton.com',
  'phone', '(+34) 91 521 2857'
)
where id = '00000000-0000-0000-0000-000000020001'
  and contact_info is null;
