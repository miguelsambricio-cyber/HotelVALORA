-- 0021_subscription_products
--
-- Phase 2.D.7 · Subscription products as DATA, not enum-locked code.
--
-- The /user/admin/subscriptions surface becomes a visual operational
-- frontend (Stripe/Notion-style pricing cards). Operators create new
-- products dynamically; the catalogue is no longer hardcoded.
--
-- Decisions:
--   * Pricing in numeric(10,2) — matches Stripe products.
--   * VAT display per-product flag (inclusive / exclusive / none) so
--     country-specific products render correctly.
--   * Features as jsonb array of {title, included} objects. Operator
--     UI renders each as a bullet; included=false → strikethrough.
--   * tier_enum preserves backward-compatibility with the existing
--     subscriptions.tier enum column. New products created via the UI
--     leave tier_enum NULL — product_id is the new source of truth.
--   * visibility decouples public pricing-page presence from row
--     persistence (operator can hide without archiving).
--
-- Already applied to project twebgqutuqgonabvhzjk on 2026-05-13 via MCP.

CREATE TABLE public.subscription_products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE,
  name             text NOT NULL,
  subtitle         text,
  description      text,

  currency         text NOT NULL DEFAULT 'EUR',
  monthly_price    numeric(10,2),
  yearly_price     numeric(10,2),
  vat_display      text NOT NULL DEFAULT 'inclusive',

  badge            text,
  cta_label        text NOT NULL DEFAULT 'Get started',
  color_theme      text NOT NULL DEFAULT 'lime',
  features         jsonb NOT NULL DEFAULT '[]'::jsonb,

  display_order    integer NOT NULL DEFAULT 100,
  visibility       text NOT NULL DEFAULT 'visible',

  tier_enum        text,

  created_by_email text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT subscription_products_vat_display_check
    CHECK (vat_display IN ('inclusive', 'exclusive', 'none')),
  CONSTRAINT subscription_products_color_theme_check
    CHECK (color_theme IN ('lime', 'emerald', 'amber', 'rose', 'slate', 'forest')),
  CONSTRAINT subscription_products_visibility_check
    CHECK (visibility IN ('visible', 'hidden', 'archived'))
);

CREATE INDEX subscription_products_visibility_idx
  ON public.subscription_products (visibility, display_order);
CREATE INDEX subscription_products_tier_idx
  ON public.subscription_products (tier_enum);

ALTER TABLE public.subscription_products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_products FROM anon, authenticated;

ALTER TABLE public.subscriptions
  ADD COLUMN product_id uuid REFERENCES public.subscription_products(id) ON DELETE SET NULL;

CREATE INDEX subscriptions_product_idx ON public.subscriptions (product_id);

-- Seed defaults (operator-editable from the admin UI)
INSERT INTO public.subscription_products
  (slug, name, subtitle, monthly_price, yearly_price, badge, color_theme,
   display_order, tier_enum, cta_label, features)
VALUES
  ('free', 'Free', 'Public showcase access',
   0, 0, NULL, 'slate', 100, 'free', 'Get started',
   '[{"title":"Browse library reports","included":true},
     {"title":"Top promoted listings","included":true},
     {"title":"Premium analytics","included":false},
     {"title":"Underwriting workspace","included":false}]'::jsonb),
  ('pro', 'Pro', 'For institutional analysts',
   49, 490, NULL, 'lime', 200, 'pro', 'Start Pro',
   '[{"title":"Full library + favourites","included":true},
     {"title":"Premium analytics","included":true},
     {"title":"CompSet underwriting","included":true},
     {"title":"AI Operations access","included":false}]'::jsonb),
  ('premium', 'Premium', 'For investment teams',
   199, 1990, 'Most popular', 'emerald', 300, 'premium', 'Start Premium',
   '[{"title":"Everything in Pro","included":true},
     {"title":"AI Operations Layer","included":true},
     {"title":"Intelligence Engine","included":true},
     {"title":"Custom reports","included":true}]'::jsonb),
  ('top_promote', 'Top Promote', 'For asset owners',
   499, 4990, 'Investor visibility', 'amber', 400, 'top_promote', 'Apply for Top Promote',
   '[{"title":"Everything in Premium","included":true},
     {"title":"Top placement in library","included":true},
     {"title":"Investor pipeline distribution","included":true},
     {"title":"Direct deal flow","included":true}]'::jsonb);

-- Backfill product_id on existing subscriptions by joining on tier_enum
UPDATE public.subscriptions s
SET product_id = p.id
FROM public.subscription_products p
WHERE s.product_id IS NULL
  AND s.tier::text = p.tier_enum;
