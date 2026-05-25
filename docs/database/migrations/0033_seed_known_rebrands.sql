-- ============================================================================
-- Migration 0033 · Seed two known Madrid rebrands into hotel_name_alias
-- + hotel_canonical_history.
-- ============================================================================
-- Applied via Supabase MCP on 2026-05-26 (project twebgqutuqgonabvhzjk).
-- The 4-slug audit surfaced two real rebrand events. Operator-curated
-- entries · valid_from/valid_to approximate (institutional reference, not
-- cadastral). Cleans up the gap left by the deprecated SLUG_TO_CANONICAL_ID
-- dictionary that had `ac-cuzco` resolving to nothing.
-- ============================================================================

insert into public.hotel_name_alias
  (canonical_id, alias_name, alias_slug, valid_from, valid_to, source, notes)
values
  (
    '45695396-5e18-4001-a670-a5e599de8103',
    'AC Hotel Cuzco by Marriott',
    'ac-cuzco',
    '2008-01-01',
    '2018-12-31',
    'manual_curated',
    'Marriott brand swap · AC retired in 2018 · same building (Castellana 133)'
  )
on conflict (canonical_id, alias_name) do nothing;

insert into public.hotel_canonical_history
  (canonical_id, canonical_name, brand, brand_family, chain_scale, valid_from, valid_to, rebrand_reason)
values
  (
    '45695396-5e18-4001-a670-a5e599de8103',
    'AC Hotel Cuzco by Marriott',
    'AC Hotels',
    'Marriott International',
    'upscale'::public.hotel_segment,
    '2008-01-01',
    '2018-12-31',
    'marriott_brand_swap_2018'
  ),
  (
    '45695396-5e18-4001-a670-a5e599de8103',
    'The Westin Madrid Cuzco',
    'Westin',
    'Marriott International',
    'upper_upscale'::public.hotel_segment,
    '2019-01-01',
    null,
    'current_identity'
  );

insert into public.hotel_name_alias
  (canonical_id, alias_name, alias_slug, valid_from, valid_to, source, notes)
values
  (
    'e2e80e9d-933f-44c2-888e-ae716fd3bf62',
    'The Westin Palace Madrid',
    null,
    '1989-01-01',
    '2020-09-30',
    'manual_curated',
    'Marriott reshuffle 2020 · Westin → Luxury Collection · same building (Plaza de las Cortes 7). Slug westin-palace lives directly on hotel_canonical.'
  )
on conflict (canonical_id, alias_name) do nothing;

insert into public.hotel_canonical_history
  (canonical_id, canonical_name, brand, brand_family, chain_scale, valid_from, valid_to, rebrand_reason)
values
  (
    'e2e80e9d-933f-44c2-888e-ae716fd3bf62',
    'The Westin Palace Madrid',
    'The Westin',
    'Starwood / Marriott',
    'luxury'::public.hotel_segment,
    '1989-01-01',
    '2020-09-30',
    'marriott_luxury_collection_swap_2020'
  ),
  (
    'e2e80e9d-933f-44c2-888e-ae716fd3bf62',
    'The Palace, a Luxury Collection Hotel, Madrid',
    'Luxury Collection',
    'Marriott International',
    'unknown'::public.hotel_segment,
    '2020-10-01',
    null,
    'current_identity'
  );
