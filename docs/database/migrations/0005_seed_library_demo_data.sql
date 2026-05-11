-- ============================================================================
-- HOTELVALORA · Supabase · Migration 0005 — Library demo seed
-- ============================================================================
-- Seeds the live database with the six institutional showcases that
-- /library/* surfaces have been rendering from `apps/web/src/lib/library/
-- mock-reports.ts`. All seeded valuations carry `visibility = 'public'`
-- so anonymous visitors (and the mock auth surface) see them through the
-- existing public-read RLS policy on public.valuations. The DB columns
-- and JSONB blobs mirror the LibraryReport shape exactly — the frontend
-- adapter is a 1:1 mapping.
--
-- All inserts are idempotent (deterministic UUIDs + ON CONFLICT updates).
-- Re-run safely after schema or seed-content changes.
-- ============================================================================

-- ─── Demo user ──────────────────────────────────────────────────────────────
-- auth.users only requires `id` to be non-null (Supabase auth fills the rest).
-- The handle_new_user trigger fires on insert and auto-creates public.users
-- + public.profiles rows; an explicit upsert below keeps the email/tier
-- columns in sync without depending on trigger ordering.

insert into auth.users (id, email, email_confirmed_at, aud, role, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000010001',
  'demo-library@hotelvalora.com',
  now(),
  'authenticated',
  'authenticated',
  jsonb_build_object('full_name', 'HotelVALORA Library Demo'),
  jsonb_build_object('seeded', true),
  now(),
  now()
)
on conflict (id) do update set
  email_confirmed_at = excluded.email_confirmed_at,
  raw_user_meta_data = excluded.raw_user_meta_data,
  raw_app_meta_data  = excluded.raw_app_meta_data,
  updated_at         = excluded.updated_at;

-- Belt-and-suspenders: ensure public.users + profiles exist even if the
-- handle_new_user trigger did not run on this path.
insert into public.users (id, email, tier, role)
values ('00000000-0000-0000-0000-000000010001', 'demo-library@hotelvalora.com', 'premium', 'admin')
on conflict (id) do update set
  email = excluded.email,
  tier  = excluded.tier,
  role  = excluded.role;

insert into public.profiles (user_id, full_name, locale, timezone)
values ('00000000-0000-0000-0000-000000010001', 'HotelVALORA Library Demo', 'es', 'Europe/Madrid')
on conflict (user_id) do update set
  full_name = excluded.full_name;

-- ─── Valuations (6 showcase hotels) ─────────────────────────────────────────

insert into public.valuations (
  id, owner_id, hotel_name, classification, star_rating, rooms,
  city, country, address, zip, sub_market, location_score, lat, lng,
  open_year, class_label, owner_label, role, objective,
  visibility, report_type, financials, amenities, indicators, contact_info,
  status, reference_code, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000020001',
    '00000000-0000-0000-0000-000000010001',
    'The Ritz-Carlton Madrid', '5* Gran Lujo', 5, 250,
    'Madrid', 'España', 'Plaza de la Lealtad 5', '28014', 'Madrid Centro', 9.85,
    40.4159, -3.6925, 1910, 'Luxury', 'Mandarin Oriental Group', 'Principal', 'For Sale',
    'public', 'Premium',
    '{"capex":14200000,"totalInvest":{"total":250000000,"perRoom":1000000,"perM2":12500},"capRate":4.85,"marketValueTtm":{"total":252000000,"perRoom":1008000,"perM2":12600},"exitYear":2031,"exitPrice":{"total":310000000,"perRoom":1240000,"perM2":14200},"yield":6.4,"irrProject":11.8,"irrEquity":17.5}'::jsonb,
    '{"bar":true,"restaurant":true,"rooftop":true,"meetingRooms":true,"gym":true,"spa":true,"pool":true,"parking":false}'::jsonb,
    '{"topPromote":true,"userModified":false,"private":false,"tierBadge":"PREMIUM","visibilityTier":"promoted","tags":["luxury","trophy-asset","madrid-centro"],"mockPosition":{"topPct":42,"leftPct":48},"hasPdf":true}'::jsonb,
    null,
    'published', 'HV-2024-001', '2026-04-22T00:00:00Z', '2026-04-22T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000020002',
    '00000000-0000-0000-0000-000000010001',
    'Mandarin Oriental Ritz', '5* Gran Lujo', 5, 153,
    'Madrid', 'España', 'Plaza de la Lealtad 5', '28014', 'Madrid Centro', 9.92,
    40.4156, -3.6932, 1910, 'Luxury', 'Mandarin Oriental Hotel Group', 'Principal', 'For Sale',
    'public', 'Premium',
    '{"capex":18500000,"totalInvest":{"total":320000000,"perRoom":2091000,"perM2":14200},"capRate":4.55,"marketValueTtm":{"total":322000000,"perRoom":2104000,"perM2":14300},"exitYear":2032,"exitPrice":{"total":395000000,"perRoom":2582000,"perM2":16400},"yield":6.1,"irrProject":10.9,"irrEquity":16.8}'::jsonb,
    '{"bar":true,"restaurant":true,"rooftop":true,"meetingRooms":true,"gym":true,"spa":true,"pool":false,"parking":true}'::jsonb,
    '{"topPromote":true,"userModified":true,"private":false,"tierBadge":"INSTITUTIONAL","visibilityTier":"promoted","tags":["luxury","heritage","trophy-asset"],"mockPosition":{"topPct":45,"leftPct":56},"hasPdf":true}'::jsonb,
    '{"accountManager":"Sara Smith","accountManagerId":"3014","email":"sara.smith@mandarinoriental.com","phone":"(+34) 91 701 6767"}'::jsonb,
    'published', 'HV-2024-002', '2026-05-02T00:00:00Z', '2026-05-02T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000020003',
    '00000000-0000-0000-0000-000000010001',
    'Four Seasons Madrid', '5* Gran Lujo', 5, 200,
    'Madrid', 'España', 'Calle de Sevilla 3', '28014', 'Madrid Centro', 9.78,
    40.4181, -3.6972, 2020, 'Luxury', 'OHLA / Mohari Hospitality', 'Principal', 'Develop',
    'public', 'Premium',
    '{"capex":22400000,"totalInvest":{"total":410000000,"perRoom":2050000,"perM2":13400},"capRate":4.6,"marketValueTtm":{"total":415000000,"perRoom":2075000,"perM2":13550},"exitYear":2033,"exitPrice":{"total":510000000,"perRoom":2550000,"perM2":15800},"yield":6.0,"irrProject":11.2,"irrEquity":17.0}'::jsonb,
    '{"bar":true,"restaurant":true,"rooftop":true,"meetingRooms":true,"gym":true,"spa":true,"pool":true,"parking":true}'::jsonb,
    '{"topPromote":false,"userModified":true,"private":false,"tierBadge":"PREMIUM","visibilityTier":"institutional","tags":["luxury","centro-canalejas"],"mockPosition":{"topPct":32,"leftPct":38},"hasPdf":true}'::jsonb,
    null,
    'published', 'HV-2024-003', '2026-03-15T00:00:00Z', '2026-03-15T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000020004',
    '00000000-0000-0000-0000-000000010001',
    'The Madrid EDITION', '5* Lifestyle', 5, 200,
    'Madrid', 'España', 'Plaza de Celenque 2', '28013', 'Madrid Centro', 9.45,
    40.4163, -3.7066, 2022, 'Upper Upscale', 'Marriott / RLH Properties', 'Lender', 'Lending',
    'public', 'Public',
    '{"capex":null,"totalInvest":null,"capRate":5.1,"marketValueTtm":{"total":185000000,"perRoom":925000,"perM2":9200},"exitYear":null,"exitPrice":null,"yield":null,"irrProject":null,"irrEquity":null}'::jsonb,
    '{"bar":true,"restaurant":true,"rooftop":true,"meetingRooms":true,"gym":true,"spa":true,"pool":true,"parking":false}'::jsonb,
    '{"topPromote":false,"userModified":false,"private":false,"visibilityTier":"community","tags":["lifestyle","marriott"],"mockPosition":{"topPct":28,"leftPct":30},"hasPdf":true}'::jsonb,
    null,
    'published', 'HV-2024-004', '2026-04-04T00:00:00Z', '2026-04-04T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000020005',
    '00000000-0000-0000-0000-000000010001',
    'Hard Rock Hotel Marbella', '4* Resort', 4, 366,
    'Marbella', 'España', 'Av. de las Tres Olas 1', '29603', 'Costa del Sol', 8.6,
    36.4944, -4.8868, 2018, 'Upper Upscale', 'Palladium Hotel Group', 'Broker', 'Rent HMA',
    'public', 'PRO',
    '{"capex":null,"totalInvest":{"total":95000000,"perRoom":259000,"perM2":4400},"capRate":6.4,"marketValueTtm":{"total":98500000,"perRoom":269000,"perM2":4550},"exitYear":2028,"exitPrice":{"total":118000000,"perRoom":322000,"perM2":5200},"yield":7.1,"irrProject":13.6,"irrEquity":null}'::jsonb,
    '{"bar":true,"restaurant":true,"rooftop":false,"meetingRooms":true,"gym":true,"spa":true,"pool":true,"parking":true}'::jsonb,
    '{"topPromote":false,"userModified":true,"private":false,"tierBadge":"PRO","visibilityTier":"verified","tags":["resort","leisure","costa-del-sol"],"mockPosition":{"topPct":70,"leftPct":22},"hasPdf":true}'::jsonb,
    null,
    'published', 'HV-2024-005', '2026-02-28T00:00:00Z', '2026-02-28T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000020006',
    '00000000-0000-0000-0000-000000010001',
    'W Barcelona', '5* Iconic', 5, 473,
    'Barcelona', 'España', 'Plaça de la Rosa dels Vents 1', '08039', 'Barceloneta', 9.7,
    41.3683, 2.1893, 2009, 'Luxury', 'Marriott / Híspanos del Inmueble', 'Principal', 'CoInvest',
    'public', 'Private',
    '{"capex":null,"totalInvest":null,"capRate":5.05,"marketValueTtm":{"total":305000000,"perRoom":645000,"perM2":8100},"exitYear":null,"exitPrice":null,"yield":null,"irrProject":null,"irrEquity":null}'::jsonb,
    '{"bar":true,"restaurant":true,"rooftop":true,"meetingRooms":true,"gym":true,"spa":true,"pool":true,"parking":true}'::jsonb,
    '{"topPromote":false,"userModified":false,"private":true,"visibilityTier":"community","tags":["iconic","barceloneta","leisure"],"mockPosition":{"topPct":58,"leftPct":78},"hasPdf":true}'::jsonb,
    null,
    'published', 'HV-2024-006', '2026-04-18T00:00:00Z', '2026-04-18T00:00:00Z'
  )
on conflict (id) do update set
  hotel_name      = excluded.hotel_name,
  classification  = excluded.classification,
  star_rating     = excluded.star_rating,
  rooms           = excluded.rooms,
  city            = excluded.city,
  country         = excluded.country,
  address         = excluded.address,
  zip             = excluded.zip,
  sub_market      = excluded.sub_market,
  location_score  = excluded.location_score,
  lat             = excluded.lat,
  lng             = excluded.lng,
  open_year       = excluded.open_year,
  class_label     = excluded.class_label,
  owner_label     = excluded.owner_label,
  role            = excluded.role,
  objective       = excluded.objective,
  visibility      = excluded.visibility,
  report_type     = excluded.report_type,
  financials      = excluded.financials,
  amenities       = excluded.amenities,
  indicators      = excluded.indicators,
  contact_info    = excluded.contact_info,
  status          = excluded.status,
  reference_code  = excluded.reference_code,
  updated_at      = excluded.updated_at;

-- ─── Top promote rows (2 of the 6) ──────────────────────────────────────────

insert into public.top_promote_reports (
  valuation_id, promoted_by, promoted_at, promoted_until,
  boost_score, sponsor_priority, featured_region, impressions, clicks
) values
  (
    '00000000-0000-0000-0000-000000020001',
    '00000000-0000-0000-0000-000000010001',
    now(), '2026-12-31T23:59:59Z',
    92, 50, 'ES-MAD', 12400, 480
  ),
  (
    '00000000-0000-0000-0000-000000020002',
    '00000000-0000-0000-0000-000000010001',
    now(), '2026-09-30T23:59:59Z',
    95, 60, 'ES-MAD', 18900, 720
  )
on conflict (valuation_id) do update set
  promoted_until   = excluded.promoted_until,
  boost_score      = excluded.boost_score,
  sponsor_priority = excluded.sponsor_priority,
  featured_region  = excluded.featured_region,
  impressions      = excluded.impressions,
  clicks           = excluded.clicks;

-- ─── Demo user favourites (all 6, so the signed-in demo sees the same
-- starred state the mock UI surfaces). Anonymous visitors see no
-- favourites; the frontend hook treats that as the "demo fallback"
-- state and renders every public valuation as starred. ──────────────────────

insert into public.favorite_reports (user_id, valuation_id)
values
  ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000020001'),
  ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000020002'),
  ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000020003'),
  ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000020004'),
  ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000020005'),
  ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000020006')
on conflict (user_id, valuation_id) do nothing;

-- ============================================================================
-- END migration 0005
-- ============================================================================
