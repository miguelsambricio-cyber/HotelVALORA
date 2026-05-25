-- ============================================================================
-- Migration 0029 · hotel_canonical.slug column + curated seed + backfill
-- ============================================================================
-- Applied via Supabase MCP on 2026-05-25 (project twebgqutuqgonabvhzjk).
-- Adds a stable URL-safe identity to every hotel so resolveCanonicalIdAny()
-- can drop the hardcoded SLUG_TO_CANONICAL_ID dictionary and become
-- geographically agnostic (works for any hotel anywhere, not just Madrid).
--
-- Strategy:
--   1. Add slug text column (nullable initially for safe backfill)
--   2. Seed 14 operator-curated slugs (NOT auto-derivable from canonical_name
--      - e.g. "edition-madrid" vs canonical "The Madrid EDITION")
--   3. Auto-generate slugs for the remaining 211 rows: lowercase + Spanish
--      diacritic strip + non-alnum to hyphen + collision suffix
--   4. NOT NULL + UNIQUE constraint
--
-- Future inserts (CoStar mundial enrichment) MUST populate slug at insert
-- time. App-level generator lives in lib/enrichment/slug.ts (next commit).
-- ============================================================================

-- Step 1 · column
alter table public.hotel_canonical
  add column if not exists slug text;

-- Step 2 · curated slugs (operator-spec from deprecated SLUG_TO_CANONICAL_ID)
update public.hotel_canonical set slug = 'barcelo-torre-madrid'          where id = '291e4210-d4b8-4427-b0c5-8aecc2a4cbfa';
update public.hotel_canonical set slug = 'bless-hotel-madrid'            where id = 'eabde8b9-41b1-4eec-b528-916768ce8f31';
update public.hotel_canonical set slug = 'edition-madrid'                where id = '709f2211-42bc-48ec-b173-97c9b912fbd9';
update public.hotel_canonical set slug = 'eurostars-madrid-tower'        where id = '8f2edc75-4e8a-4056-a823-06c013c0e5f7';
update public.hotel_canonical set slug = 'four-seasons-madrid'           where id = 'fa20d9a6-94fa-4227-95f8-74f528e955e3';
update public.hotel_canonical set slug = 'hotel-unico-madrid'            where id = '42b8804f-495b-4bb6-8ef1-c5373c8acf21';
update public.hotel_canonical set slug = 'hyatt-regency-hesperia-madrid' where id = 'd3868189-c30d-4515-a51f-7e7a881b17e5';
update public.hotel_canonical set slug = 'mandarin-oriental-ritz'        where id = 'dafc4073-ab60-43ec-91a0-ac1d7311232e';
update public.hotel_canonical set slug = 'marriott-auditorium'           where id = 'eafb935d-a6eb-44d3-b2b8-11feff59a23e';
update public.hotel_canonical set slug = 'melia-castilla'                where id = '6a8cb14d-43b0-42f0-b183-b0e4399d3052';
update public.hotel_canonical set slug = 'nh-collection-eurobuilding'    where id = '7e5d4cb7-9d21-4a9b-89b4-bdb7e045b32c';
update public.hotel_canonical set slug = 'only-you-atocha'               where id = '0cf74e8d-56ee-4969-b45c-d02f5ad8f8e8';
update public.hotel_canonical set slug = 'rosewood-villa-magna'          where id = '820c73b0-362e-49b3-be85-6c6cdcadcd82';
update public.hotel_canonical set slug = 'vp-plaza-espana-design'        where id = '730f91ca-e1a7-4c77-8c4d-f62a2e4a0785';

-- Step 3 · auto-generate slugs for remaining rows from canonical_name
-- Collision resolution: curated entries take rn=1 (priority -1 sorts before
-- priority 0 auto-gen), subsequent collisions get -2, -3 suffix.
with all_slugs as (
  select id,
         coalesce(
           slug,
           trim(both '-' from regexp_replace(
             lower(translate(
               canonical_name,
               E'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
               'aaaaaeeeeiiiioooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
             )),
             '[^a-z0-9]+', '-', 'g'
           ))
         ) as base_slug,
         case when slug is null then 0 else -1 end as priority
  from public.hotel_canonical
),
ranked as (
  select id, base_slug, priority,
         row_number() over (partition by base_slug order by priority, id) as rn
  from all_slugs
)
update public.hotel_canonical hc
set slug = case when r.rn = 1 then r.base_slug else r.base_slug || '-' || r.rn end
from ranked r
where hc.id = r.id
  and hc.slug is null;

-- Step 4 · constraints (NOT NULL + UNIQUE).
alter table public.hotel_canonical
  alter column slug set not null;

create unique index if not exists hotel_canonical_slug_uq
  on public.hotel_canonical (slug);
