-- 0022_campaigns_subscription_product_link
--
-- Phase 2.D.7b · Campaigns become monetization cohorts.
--
-- Each campaign now references the subscription product it grants.
-- When a recipient accepts an invitation tied to the campaign, the
-- product (and its tier_enum for backward-compat) bootstraps the
-- subscription. ON DELETE SET NULL — archiving a product does NOT
-- delete its historical campaign attribution.
--
-- Already applied to project twebgqutuqgonabvhzjk on 2026-05-13 via MCP.

ALTER TABLE public.campaigns
  ADD COLUMN subscription_product_id uuid
    REFERENCES public.subscription_products(id) ON DELETE SET NULL;

CREATE INDEX campaigns_product_idx
  ON public.campaigns (subscription_product_id);

-- Best-effort backfill: existing campaigns whose kind cleanly maps to
-- a seeded product slug get auto-linked. Operator can override from
-- the UI at any time.
UPDATE public.campaigns c
SET subscription_product_id = p.id
FROM public.subscription_products p
WHERE c.subscription_product_id IS NULL
  AND c.kind = 'top_promote_rollout'
  AND p.slug = 'top_promote';
