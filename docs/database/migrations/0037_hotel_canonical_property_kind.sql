-- ============================================================================
-- Migration 0037 · property_kind column on hotel_canonical
-- ============================================================================
-- Applied via Supabase MCP on 2026-06-01 (project twebgqutuqgonabvhzjk).
-- Master-per-hotel M0/M1: universal asset kind, orthogonal to chain_scale and
-- hotel_type. Populated from CoStar "Tipo secundario" (Hotel/Hostel/Apartamento)
-- and reusable by any market ingestor. Values used today: 'hotel' | 'hostel'
-- | 'apartment'. NULL = not yet classified.
-- NOTE: Group-2 aparthotels that entered the corpus as hotels (limehome, Hyatt
-- Residences, etc.) are intentionally kept 'hotel' for now (operator decision,
-- 2026-06-01); reclassify to 'apartment' when the apartments segment activates
-- (see docs/roadmap/backlog.md).
-- Additive column, nullable, no default → catalog-only change, no table
-- rewrite. Idempotent: re-running is a no-op.
-- ============================================================================

alter table public.hotel_canonical
  add column if not exists property_kind text;

comment on column public.hotel_canonical.property_kind is
  'Universal asset kind: hotel | hostel | apartment. Populated from CoStar Tipo secundario (M0) and any market ingestor; orthogonal to chain_scale/hotel_type.';
