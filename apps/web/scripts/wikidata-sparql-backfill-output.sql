-- Wikidata SPARQL backfill · 2026-05-20T07:16:11.544Z
-- Source: query.wikidata.org · properties P1106 (capacity) + P571 (inception) + P1619 (opening)

UPDATE public.hotel_canonical SET year_opened = 2021 WHERE id = '2adc938d-afcb-4463-83d7-4693bb9c35f7';
INSERT INTO public.hotel_field_provenance (hotel_canonical_id, field_name, source_kind, source_path, confidence, observed_at) VALUES ('2adc938d-afcb-4463-83d7-4693bb9c35f7', 'year_opened', 'wikidata', 'https://www.wikidata.org/wiki/Q112011952#P571', 0.90, NOW()) ON CONFLICT DO NOTHING;
UPDATE public.hotel_canonical SET year_opened = 1992 WHERE id = '550c9ba0-48de-471f-975a-b3b030ffa4e2';
INSERT INTO public.hotel_field_provenance (hotel_canonical_id, field_name, source_kind, source_path, confidence, observed_at) VALUES ('550c9ba0-48de-471f-975a-b3b030ffa4e2', 'year_opened', 'wikidata', 'https://www.wikidata.org/wiki/Q72172868#P571', 0.90, NOW()) ON CONFLICT DO NOTHING;