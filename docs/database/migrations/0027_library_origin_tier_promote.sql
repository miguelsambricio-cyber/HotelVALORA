-- Migration 0027 · library origin + tier + promote classification
-- Applied via MCP on 2026-05-21 · this file persists the schema state in repo.
--
-- Extends `hotel_report_library` (migration 0026) with the 5-layer
-- architecture classifiers:
--   - report_origin   · engine_render | showcase | community | bulk_seed |
--                      manual_seed | imported | migrated
--   - tier_badge      · free | pro | premium
--   - is_top_promote  · paid placement flag (independent of tier)
--   - contact_visible · operator-set contact channel exposure
--   - contact_info    · jsonb · email/phone/account-manager metadata
--   - showcase_priority · integer ordering within showcase set
--   - last_operator_render_at · timestamptz · tracks ONLY engine_render
--                              renders (not bulk_seed re-runs)
--
-- Plus 3 indexes for the filtered surfaces (origin · promote · priority).
-- Backfill: 1 row 'manual_seed' (Mandarin smoke test) + 223 rows 'bulk_seed'.
-- After this migration the operator promoted 8 rows to 'showcase' via
-- direct SQL UPDATE (see docs/hotel-intelligence/library-showcase-architecture-2026-05-21.md).

ALTER TABLE public.hotel_report_library
  ADD COLUMN IF NOT EXISTS report_origin text NOT NULL DEFAULT 'engine_render'
  CHECK (report_origin IN (
    'engine_render', 'showcase', 'community', 'bulk_seed',
    'manual_seed', 'imported', 'migrated'
  ));

ALTER TABLE public.hotel_report_library
  ADD COLUMN IF NOT EXISTS tier_badge text NOT NULL DEFAULT 'free'
  CHECK (tier_badge IN ('free', 'pro', 'premium'));

ALTER TABLE public.hotel_report_library
  ADD COLUMN IF NOT EXISTS is_top_promote boolean NOT NULL DEFAULT false;

ALTER TABLE public.hotel_report_library
  ADD COLUMN IF NOT EXISTS contact_visible boolean NOT NULL DEFAULT false;

ALTER TABLE public.hotel_report_library
  ADD COLUMN IF NOT EXISTS contact_info jsonb;

ALTER TABLE public.hotel_report_library
  ADD COLUMN IF NOT EXISTS showcase_priority integer NOT NULL DEFAULT 0;

ALTER TABLE public.hotel_report_library
  ADD COLUMN IF NOT EXISTS last_operator_render_at timestamptz;

CREATE INDEX IF NOT EXISTS hotel_report_library_origin_idx
  ON public.hotel_report_library (report_origin);

CREATE INDEX IF NOT EXISTS hotel_report_library_promote_idx
  ON public.hotel_report_library (is_top_promote, showcase_priority DESC)
  WHERE is_top_promote = true;

CREATE INDEX IF NOT EXISTS hotel_report_library_showcase_idx
  ON public.hotel_report_library (report_origin, showcase_priority DESC)
  WHERE report_origin IN ('showcase', 'community');

-- Backfill the 224 rows that existed before this migration ran.
UPDATE public.hotel_report_library SET report_origin = 'bulk_seed'
  WHERE report_origin = 'engine_render';

UPDATE public.hotel_report_library
  SET report_origin = 'manual_seed'
  WHERE canonical_id = 'dafc4073-ab60-43ec-91a0-ac1d7311232e'
    AND created_at < '2026-05-21 13:09:00+00';

-- Sanity probe · raise on any inconsistency.
DO $$
DECLARE manual_n int; bulk_n int; total_n int;
BEGIN
  SELECT count(*) INTO total_n FROM public.hotel_report_library;
  SELECT count(*) INTO manual_n FROM public.hotel_report_library WHERE report_origin='manual_seed';
  SELECT count(*) INTO bulk_n FROM public.hotel_report_library WHERE report_origin='bulk_seed';
  -- showcase rows added by post-migration UPDATE · they reduce bulk_seed by the
  -- count promoted (8 today · still total = manual + bulk + showcase).
  IF total_n < manual_n + bulk_n THEN
    RAISE EXCEPTION 'Migration 0027 backfill incomplete · % total · % manual · % bulk', total_n, manual_n, bulk_n;
  END IF;
END $$;
