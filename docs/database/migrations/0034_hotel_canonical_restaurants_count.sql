-- ============================================================================
-- Migration 0034 · restaurants_count column on hotel_canonical
-- ============================================================================
-- Applied via Supabase MCP on 2026-05-26 (project twebgqutuqgonabvhzjk).
-- Adds discrete count of restaurants per hotel · mirrors meeting_rooms_count
-- (migration 0024). Enables the facility-aware P&L rule (PASO 4) where each
-- restaurant ABOVE the first adds 2-4 percentage points to the F&B revenue
-- share. Until enrichment populates it, the field stays NULL and the rule
-- treats amenities.restaurant=true as a single restaurant.
--
-- Enrichment source: Booking RapidAPI `Get_Hotel_Facilities` endpoint
-- returns a list with item counts; the mapper extracts the "Restaurants"
-- entry's count into this column.
-- ============================================================================

alter table public.hotel_canonical
  add column if not exists restaurants_count smallint
  check (restaurants_count is null or restaurants_count between 0 and 50);

comment on column public.hotel_canonical.restaurants_count is
  'Number of distinct restaurants on the property. NULL = enrichment has not run yet (or no data). 0 = explicitly confirmed no restaurant. ≥1 = real count. Used by the facility-aware P&L F&B rule.';
