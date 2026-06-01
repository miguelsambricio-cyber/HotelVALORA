-- ============================================================================
-- Migration 0038 · gross_building_sqm column on hotel_canonical
-- ============================================================================
-- Applied via Supabase MCP on 2026-06-01 (project twebgqutuqgonabvhzjk).
-- Master-per-hotel M1: gross building area in m² (CoStar "Superficie alquilable
-- del inmueble / SBA"). Merged from source=costar_inmueble with provenance.
-- Distinct from meeting_space_sqm (which is meeting-rooms area only). Enables
-- future per-m² metrics (TRAMO 5 / underwriting). NULL = no CoStar twin / no data.
-- Additive column, nullable, no default → catalog-only change, no table
-- rewrite. Idempotent: re-running is a no-op.
-- ============================================================================

alter table public.hotel_canonical
  add column if not exists gross_building_sqm numeric;

comment on column public.hotel_canonical.gross_building_sqm is
  'Superficie bruta del edificio en m² (CoStar "Superficie alquilable del inmueble/SBA"). Poblado en M1 desde source=costar_inmueble · nullable · ortogonal a meeting_space_sqm (solo salas de reuniones).';
