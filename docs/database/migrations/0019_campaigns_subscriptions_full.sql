-- 0019_campaigns_subscriptions_full
--
-- Phase 2.D.4 · Promote campaigns + subscriptions from Phase 2.D.1
-- scaffold to a real acquisition + subscription operations layer.
-- Operators can run institutional growth ops: create campaigns,
-- assign tiers manually, grant Comped access, expire subscriptions,
-- and see the full funnel (contact → invited → onboarded → subscribed).
--
-- Already applied to project twebgqutuqgonabvhzjk on 2026-05-12 via MCP.

-- 1) Extend subscription_status with 'expired'. Distinct from
--    'canceled' so operators can filter natural-end (passed expires_at,
--    no renewal) from explicit-cancel.
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'expired';

-- 2) Campaigns operational metadata
ALTER TABLE public.campaigns
  ADD COLUMN target_audience   text,
  ADD COLUMN notes             text,
  ADD COLUMN conversion_target integer,
  ADD COLUMN archived_at       timestamptz,
  ADD COLUMN created_by_email  text;

CREATE INDEX campaigns_archived_idx
  ON public.campaigns (archived_at)
  WHERE archived_at IS NOT NULL;

CREATE INDEX campaigns_owner_idx
  ON public.campaigns (owner_email);

-- 3) Subscriptions operator-management metadata
ALTER TABLE public.subscriptions
  ADD COLUMN expires_at         timestamptz,
  ADD COLUMN notes              text,
  ADD COLUMN assigned_by_email  text,
  ADD COLUMN source_campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

CREATE INDEX subscriptions_expires_idx
  ON public.subscriptions (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX subscriptions_source_campaign_idx
  ON public.subscriptions (source_campaign_id);

-- 4) Comped / manual assignments don't have Stripe customers — drop
--    the NOT NULL on stripe_customer_id so the admin "Assign tier"
--    flow doesn't have to falsify a Stripe identity.
ALTER TABLE public.subscriptions
  ALTER COLUMN stripe_customer_id DROP NOT NULL;

-- Audit trail flows through public.activity_log with:
--   entity_type='campaign'      action='campaign.<verb>'
--   entity_type='subscription'  action='subscription.<verb>'
