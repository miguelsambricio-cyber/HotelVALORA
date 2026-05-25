-- ============================================================================
-- Migration 0031 · reconcile 4 legacy slugs from deprecated SLUG_TO_CANONICAL_ID
-- ============================================================================
-- Applied via Supabase MCP on 2026-05-25 (project twebgqutuqgonabvhzjk).
-- The deprecated 14-slug dictionary listed 4 entries with no canonical row:
--   ac-cuzco · hard-rock-madrid · riu-plaza-espana · westin-palace
-- Reality after audit:
--   ac-cuzco           · the building was rebranded; it is now
--                        The Westin Madrid Cuzco (id 45695396-...). The
--                        legacy registry name is stale. NO ROW inserted
--                        here · followup is to retire `ac-cuzco` from
--                        apps/web/src/lib/data/madrid-hotels.ts.
--   hard-rock-madrid   · exists as `hard-rock-hotel-madrid`. Slug rename.
--   riu-plaza-espana   · genuinely absent. INSERT with operator-curated
--                        seed values matching the registry signal.
--   westin-palace      · exists as `the-palace-a-luxury-collection-hotel-madrid`
--                        (Marriott rebrand 2020 Westin → Luxury Collection).
--                        Slug rename preserves the legacy marketing slug
--                        without rewriting the canonical_name.
-- ============================================================================

update public.hotel_canonical
   set slug = 'hard-rock-madrid'
 where id = 'cd0dea49-1dc8-4637-89bb-c019b315202d'
   and slug = 'hard-rock-hotel-madrid';

update public.hotel_canonical
   set slug = 'westin-palace'
 where id = 'e2e80e9d-933f-44c2-888e-ae716fd3bf62'
   and slug = 'the-palace-a-luxury-collection-hotel-madrid';

insert into public.hotel_canonical (
  canonical_name, slug, brand, brand_family, chain_scale, segment,
  star_rating, hotel_type,
  address_line1, city, city_normalized, postal_code, country_code,
  neighborhood,
  market_id, submarket_id,
  lat, lng,
  total_rooms, total_keys,
  primary_source, data_quality_tier, status
)
select
  'Riu Plaza España',
  'riu-plaza-espana',
  'Riu Plaza',
  'RIU Hotels & Resorts',
  'upscale'::public.hotel_segment,
  'upscale'::public.hotel_segment,
  4,
  'urban'::hotel_type_enum,
  'Plaza de España 8',
  'Madrid',
  'Madrid',
  '28008',
  'ES',
  'Centro',
  (select id from public.market   where name = 'Madrid' limit 1),
  (select id from public.submarket where name = 'Centro' limit 1),
  40.4234,
  -3.7117,
  583, 583,
  'manual_curated_2026_05',
  'silver'::quality_tier_enum,
  'active'::hotel_lifecycle_enum
where not exists (
  select 1 from public.hotel_canonical where slug = 'riu-plaza-espana'
);
