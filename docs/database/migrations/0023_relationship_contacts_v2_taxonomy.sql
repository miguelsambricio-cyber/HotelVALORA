-- =============================================================================
-- 0023_relationship_contacts_v2_taxonomy.sql · 2026-05-15
-- Phase C · Contactos canonical operational taxonomy (v2 promotion to Supabase)
--
-- Adds 4 columns to public.relationship_contacts:
--   - contact_category_v2     · operational source-of-truth (Master col 65)
--   - relationship_type       · CRM dimension (operator-set via admin UI)
--   - original_category_raw   · provenance (Master col 66 · NULL today)
--   - original_category_source · how original_category_raw got there
--                              (NULL today · 'inferred_backfill' if ever)
--
-- Strictly additive. Existing columns (investor_type, investor_subtype,
-- relationship_band, etc.) are untouched. v1-style filters that read
-- investor_type continue to work. New filters/UI/CRM read v2 column.
--
-- Index added on contact_category_v2 to keep .eq() filter cheap (single
-- equality query · replaces the .in("investor_type", [...]) Phase A
-- mapping layer in admin/contacts).
--
-- Backfill is performed by promote_to_supabase.py (Phase B-Repair
-- sentinel guards it · operator lifts manually post-validation).
-- =============================================================================

ALTER TABLE public.relationship_contacts
  ADD COLUMN IF NOT EXISTS contact_category_v2       text,
  ADD COLUMN IF NOT EXISTS relationship_type         text,
  ADD COLUMN IF NOT EXISTS original_category_raw     text,
  ADD COLUMN IF NOT EXISTS original_category_source  text;

-- Operational filter index. Replaces the Phase A in-memory expansion
-- with a single equality query. Partial-index NOT used because every
-- bucket value is queryable.
CREATE INDEX IF NOT EXISTS relationship_contacts_category_v2_idx
  ON public.relationship_contacts (contact_category_v2);

-- relationship_type: CRM dimension · examples (operator-controlled set):
--   strategic_partner · commercial_target · prospect · qualified_lead ·
--   inactive · cold · won · lost · disqualified
-- No CHECK constraint to keep the value space flexible during early
-- iteration. Phase D may codify an enum once usage stabilises.
COMMENT ON COLUMN public.relationship_contacts.contact_category_v2
  IS 'Phase C canonical operational taxonomy (8 buckets) · source-of-truth = Master xlsx classify_master.py --scheme=v2 · enum: Principal · Broker · Lender · Operator · Developer · Hotel Supply · IA Supply · Uncategorized.';

COMMENT ON COLUMN public.relationship_contacts.relationship_type
  IS 'CRM dimension · operator-set via admin UI · NEVER overwritten by promote_to_supabase.py upsert · examples: strategic_partner · commercial_target · prospect · qualified_lead · inactive · cold · won · lost.';

COMMENT ON COLUMN public.relationship_contacts.original_category_raw
  IS 'Provenance audit · raw category value from source-of-record at ingest · NULL when source has no category field · NEVER inferred-backfilled (would contaminate provenance integrity).';

COMMENT ON COLUMN public.relationship_contacts.original_category_source
  IS 'Source attribution for original_category_raw · NULL by default · or one of: source_field_<name> · inferred_backfill (only if explicitly marked inference, never to fake real source data).';
