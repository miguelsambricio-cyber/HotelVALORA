-- REVERT · restore 2 hotels to pre-resolution state
-- Use ONLY if you need to roll back. Will null out enrichment + booking_hotel_id.
-- ============================================================================

-- The Madrid EDITION · revert to BEFORE
UPDATE public.hotel_canonical SET
  booking_hotel_id = NULL,
  amenities = '{"bar":true,"gym":true,"spa":true,"pool":true,"parking":false,"rooftop":true,"restaurant":true,"meetingRooms":true}'::jsonb,
  restaurants_count = NULL,
  meeting_rooms_count = NULL,
  review_score = NULL,
  review_count = NULL,
  gallery_paths = NULL,
  hero_image_path = NULL,
  enrichment_version = 1
WHERE id = '709f2211-42bc-48ec-b173-97c9b912fbd9'::uuid;

-- Riu Plaza España · revert to BEFORE
UPDATE public.hotel_canonical SET
  booking_hotel_id = NULL,
  amenities = '{}'::jsonb,
  restaurants_count = NULL,
  meeting_rooms_count = NULL,
  review_score = NULL,
  review_count = NULL,
  gallery_paths = NULL,
  hero_image_path = NULL,
  enrichment_version = 1
WHERE id = '00cb78a8-2139-4497-91f8-0bfde3053a61'::uuid;

