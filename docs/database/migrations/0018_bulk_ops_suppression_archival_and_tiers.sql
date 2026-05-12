-- 0018_bulk_ops_suppression_archival_and_tiers
--
-- Phase 2.D.3 · Operational bulk workflows on the contacts surface.
--
-- Three additions, all backward-compatible:
--
-- 1) Extend `user_tier` enum with `top_promote` + `comped`. Both are
--    institutional tiers the operator assigns at bulk-invite time.
--    `subscriptions.tier` uses the same enum so they're now valid
--    subscription tier values too.
--
-- 2) Two contact-quality columns on relationship_contacts:
--      * suppressed_outreach (default false) — bulk-suppress flow.
--        Partial-indexed on `= true` (most rows are false, so the
--        index stays small).
--      * archived_at — bulk-archive flow. Distinct from `deleted_at`:
--        archived rows stay queryable, deleted rows do not.
--
-- 3) `contact_invitations.default_subscription_tier` — tier hint that
--    the invited contact will inherit when they accept. NULL = use
--    platform default at conversion time. CHECK constraint over text
--    so adding a tier later is a single ALTER, not a migration against
--    every row.
--
-- Already applied to project twebgqutuqgonabvhzjk on 2026-05-12 via MCP.

ALTER TYPE public.user_tier ADD VALUE IF NOT EXISTS 'top_promote';
ALTER TYPE public.user_tier ADD VALUE IF NOT EXISTS 'comped';

ALTER TABLE public.relationship_contacts
  ADD COLUMN suppressed_outreach boolean NOT NULL DEFAULT false,
  ADD COLUMN archived_at timestamptz;

CREATE INDEX relationship_contacts_suppressed_idx
  ON public.relationship_contacts (suppressed_outreach)
  WHERE suppressed_outreach = true;

CREATE INDEX relationship_contacts_archived_idx
  ON public.relationship_contacts (archived_at)
  WHERE archived_at IS NOT NULL;

ALTER TABLE public.contact_invitations
  ADD COLUMN default_subscription_tier text;

ALTER TABLE public.contact_invitations
  ADD CONSTRAINT contact_invitations_default_tier_check
  CHECK (default_subscription_tier IS NULL
         OR default_subscription_tier IN
            ('free','pro','premium','team','enterprise','top_promote','comped'));
