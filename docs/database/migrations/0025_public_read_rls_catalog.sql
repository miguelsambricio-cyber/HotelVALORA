-- Migration 0025 · public-read RLS for hotel catalog tables
--
-- Aligns the data layer with the showcase-mode middleware that allows
-- anonymous traffic to /report/*. Today report renders fail on anon
-- sessions because:
--   1. hotel_canonical has RLS enabled with a SELECT policy scoped to
--      role `authenticated` (deleted_at IS NULL). Anon role gets 0 rows.
--   2. market + submarket have RLS DISABLED — currently anyone-readable
--      but the Supabase advisor flags this as a security gap. Enable RLS
--      and add an explicit public-read policy so the posture is
--      intentional rather than incidental.
--
-- Effect:
--   - Anon + authenticated roles can SELECT live (deleted_at IS NULL)
--     hotel_canonical rows. Soft-deleted rows stay hidden from all
--     non-service-role callers.
--   - market + submarket become readable by anon + authenticated under
--     an explicit policy (not "RLS disabled" wide-open).
--   - service-role continues to bypass RLS for writes / admin / cron.
--
-- After this migration:
--   - apps/web/src/lib/report/canonical-reader.ts can switch from
--     `getSupabaseAdmin()` to `createAnonServerSupabaseClient()`, ending
--     the architectural smell of using service-role for catalog reads.
--   - Preview deployments no longer need SUPABASE_SERVICE_ROLE_KEY just
--     to render reports.
--
-- Reversible: each policy is DROP/CREATE-safe; this migration drops by
-- name only if it exists so it can be re-run idempotently.

BEGIN;

-- ============================================================
-- 1 · hotel_canonical · widen SELECT to public role
-- ============================================================
-- Keep the existing authenticated-only policy intact and ADD a public
-- policy. PERMISSIVE policies union, so authenticated callers gain
-- nothing new (still bounded by deleted_at IS NULL), while anon
-- callers gain the same bounded read.

DROP POLICY IF EXISTS "hotel_canonical_read_public" ON public.hotel_canonical;

CREATE POLICY "hotel_canonical_read_public"
  ON public.hotel_canonical
  FOR SELECT
  TO public
  USING (deleted_at IS NULL);

-- ============================================================
-- 2 · market · enable RLS + add public read policy
-- ============================================================

ALTER TABLE public.market ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_read_public" ON public.market;

CREATE POLICY "market_read_public"
  ON public.market
  FOR SELECT
  TO public
  USING (true);

-- ============================================================
-- 3 · submarket · enable RLS + add public read policy
-- ============================================================

ALTER TABLE public.submarket ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submarket_read_public" ON public.submarket;

CREATE POLICY "submarket_read_public"
  ON public.submarket
  FOR SELECT
  TO public
  USING (true);

-- ============================================================
-- 4 · Sanity probe
-- ============================================================
-- Smoke verification: each table should expose at least one SELECT
-- policy to the public role. This block raises if the migration
-- silently no-ops (e.g. if a future schema change drops the table).

DO $$
DECLARE
  expected text[] := ARRAY['hotel_canonical_read_public','market_read_public','submarket_read_public'];
  missing text;
BEGIN
  FOREACH missing IN ARRAY expected LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND policyname = missing
    ) THEN
      RAISE EXCEPTION 'Migration 0025 incomplete · policy % was not created', missing;
    END IF;
  END LOOP;
END $$;

COMMIT;
