insert into public.hotel_enrichment_run (id, source, triggered_by, scope, started_at, completed_at, hotels_seen, hotels_inserted, hotels_updated, fields_updated, errors_count, status, budget_max_requests, budget_used, notes)
values (
  'ab42328d-8357-418e-904b-9d1207db2f55',
  'booking_rapidapi',
  'phase_c_smoke_pilot',
  '{"city":"Madrid","limit":50,"sort":"popularity"}'::jsonb,
  '2026-05-19T17:32:57.652Z',
  '2026-05-19T17:37:01.801Z',
  55,
  50,
  0,
  937,
  0,
  'completed',
  25000,
  60,
  'Phase C 50-hotel smoke pilot · Madrid · booking-com15'
);
