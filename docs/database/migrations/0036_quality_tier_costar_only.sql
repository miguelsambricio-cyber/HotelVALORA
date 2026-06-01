-- ============================================================================
-- Migration 0036 · 'costar_only' value on quality_tier_enum
-- ============================================================================
-- Applied via Supabase MCP on 2026-06-01 (project twebgqutuqgonabvhzjk).
-- Master-per-hotel M0: promotes CoStar-only buildings (no enriched twin) into
-- hotel_canonical as rows tagged data_quality_tier='costar_only'. These rows
-- carry NO lat/lng, so loadSearchCorpus's coords filter excludes them from the
-- front (search/compset/report) — they exist for inventory/registry only.
-- Additive enum value; pre-existing tiers (gold/silver/bronze/quarantined)
-- unchanged. Idempotent: re-running is a no-op.
-- ============================================================================

alter type quality_tier_enum add value if not exists 'costar_only';
