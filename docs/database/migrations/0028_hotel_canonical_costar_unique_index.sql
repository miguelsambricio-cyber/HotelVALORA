-- ============================================================================
-- Migration 0028 · costar_property_id partial unique index
-- ============================================================================
-- Applied via Supabase MCP on 2026-05-25 (project twebgqutuqgonabvhzjk).
-- Blinds against duplicate CoStar property IDs landing in hotel_canonical
-- when worldwide CoStar enrichment starts. Partial: NULL values do not
-- conflict, so today's 225 Madrid rows (most with NULL costar_property_id)
-- are unaffected. Pre-verification query against current data returned 0
-- non-null duplicates before applying.
-- ============================================================================

create unique index if not exists hotel_canonical_costar_uq
  on public.hotel_canonical (costar_property_id)
  where costar_property_id is not null;
