-- ============================================================================
-- HOTELVALORA · Supabase · Migration 0012 — Top-Promote matrix examples
-- ============================================================================
-- /library/top-list must demonstrate every icon-combination operators can
-- legitimately ship to the marketplace:
--
--   chip · flame · pencil · eye-off    ← combinations to demo
--   ────────────────────────────────────────────────────────────────────
--   Premium · flame                    ✓ The Ritz-Carlton Madrid (seed 0005 / fixed 0011)
--   Premium · flame · pencil           ✓ Mandarin Oriental Ritz   (seed 0005)
--   Premium · pencil                   ✓ Four Seasons Madrid      (seed 0005)
--   PRO · pencil                       ✓ Hard Rock Hotel Marbella (seed 0005)
--   Public                             ✓ The Madrid EDITION       (seed 0005)
--   Private · eye-off                  ✓ W Barcelona              (seed 0005)
--   PRO · flame                        ← THIS MIGRATION
--   Public · flame                     ← THIS MIGRATION
--
-- Both new rows are top-promoted so per the institutional rule (locked
-- in by migration 0011) they expose a contact_info channel — the
-- Schedule-a-Tour CTA is functional on every flame-bearing report.
--
-- Indempotent (on conflict do nothing) — safe to re-run.
-- ============================================================================

-- ─── PRO · Top-Promote ──────────────────────────────────────────────────────

insert into public.valuations (
  id, owner_id, hotel_name, classification, star_rating, rooms,
  city, country, address, zip, sub_market, location_score, lat, lng,
  open_year, class_label, owner_label, role, objective, visibility,
  report_type, financials, amenities, indicators, contact_info,
  status, reference_code, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000020007',
  '00000000-0000-0000-0000-000000010001',
  'Hotel Indigo Madrid - Gran Vía',
  '4* Boutique',
  4,
  85,
  'Madrid',
  'España',
  'Calle de la Salud 5',
  '28013',
  'Madrid Centro',
  9.20,
  40.420500,
  -3.705800,
  2017,
  'Upper Midscale',
  'IHG Hotels & Resorts',
  'Broker',
  'For Sale',
  'public',
  'PRO',
  jsonb_build_object(
    'capex', 4200000,
    'yield', 6.3,
    'capRate', 5.9,
    'exitYear', 2029,
    'exitPrice', jsonb_build_object('perM2', 7100, 'total', 38500000, 'perRoom', 453000),
    'irrEquity', 11.4,
    'irrProject', 10.2,
    'totalInvest', jsonb_build_object('perM2', 6300, 'total', 31200000, 'perRoom', 367000),
    'marketValueTtm', jsonb_build_object('perM2', 6450, 'total', 32700000, 'perRoom', 385000)
  ),
  jsonb_build_object(
    'bar', true, 'gym', true, 'spa', false, 'pool', false,
    'parking', false, 'rooftop', true, 'restaurant', true, 'meetingRooms', true
  ),
  jsonb_build_object(
    'tags', jsonb_build_array('boutique','madrid','gran-via','ihg-soft-brand'),
    'hasPdf', true,
    'private', false,
    'tierBadge', 'PRO',
    'topPromote', true,
    'mockPosition', jsonb_build_object('topPct', 42, 'leftPct', 48),
    'userModified', false,
    'visibilityTier', 'promoted'
  ),
  jsonb_build_object(
    'accountManager', 'Elena Vázquez',
    'accountManagerId', '4087',
    'email', 'elena.vazquez@indigomadrid.com',
    'phone', '(+34) 91 521 8500'
  ),
  'published',
  'HV-2026-007',
  '2026-04-28 00:00:00+00',
  '2026-04-28 00:00:00+00'
)
on conflict (id) do nothing;

insert into public.top_promote_reports (
  valuation_id, promoted_by, promoted_until, boost_score, featured_region, impressions, clicks
) values (
  '00000000-0000-0000-0000-000000020007',
  '00000000-0000-0000-0000-000000010001',
  '2026-10-31 23:59:59+00',
  72,
  'ES',
  1247,
  84
)
on conflict (valuation_id) do nothing;

-- ─── Public (free) · Top-Promote ────────────────────────────────────────────

insert into public.valuations (
  id, owner_id, hotel_name, classification, star_rating, rooms,
  city, country, address, zip, sub_market, location_score, lat, lng,
  open_year, class_label, owner_label, role, objective, visibility,
  report_type, financials, amenities, indicators, contact_info,
  status, reference_code, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000020008',
  '00000000-0000-0000-0000-000000010001',
  'Petit Palace Plaza Madrid',
  '3* Urban',
  3,
  64,
  'Madrid',
  'España',
  'Plaza del Ángel 9',
  '28012',
  'Madrid Centro',
  8.85,
  40.414900,
  -3.700100,
  2010,
  'Midscale',
  'High Tech Hotels (independent operator)',
  'Principal',
  'For Sale',
  'public',
  'Public',
  jsonb_build_object(
    'capex', 1800000,
    'yield', 5.6,
    'capRate', 5.2,
    'exitYear', 2030,
    'exitPrice', jsonb_build_object('perM2', 5800, 'total', 18700000, 'perRoom', 292000),
    'irrEquity', 9.1,
    'irrProject', 8.4,
    'totalInvest', jsonb_build_object('perM2', 5100, 'total', 15400000, 'perRoom', 241000),
    'marketValueTtm', jsonb_build_object('perM2', 5250, 'total', 16100000, 'perRoom', 252000)
  ),
  jsonb_build_object(
    'bar', true, 'gym', false, 'spa', false, 'pool', false,
    'parking', false, 'rooftop', false, 'restaurant', false, 'meetingRooms', false
  ),
  jsonb_build_object(
    'tags', jsonb_build_array('boutique','madrid','plaza-mayor','independent'),
    'hasPdf', true,
    'private', false,
    'tierBadge', 'Public',
    'topPromote', true,
    'mockPosition', jsonb_build_object('topPct', 52, 'leftPct', 51),
    'userModified', false,
    'visibilityTier', 'promoted'
  ),
  jsonb_build_object(
    'accountManager', 'Pablo Ruiz',
    'accountManagerId', '5142',
    'email', 'pablo.ruiz@petitpalace.example',
    'phone', '(+34) 91 369 4040'
  ),
  'published',
  'HV-2026-008',
  '2026-04-12 00:00:00+00',
  '2026-04-12 00:00:00+00'
)
on conflict (id) do nothing;

insert into public.top_promote_reports (
  valuation_id, promoted_by, promoted_until, boost_score, featured_region, impressions, clicks
) values (
  '00000000-0000-0000-0000-000000020008',
  '00000000-0000-0000-0000-000000010001',
  '2026-08-31 23:59:59+00',
  58,
  'ES',
  892,
  47
)
on conflict (valuation_id) do nothing;
