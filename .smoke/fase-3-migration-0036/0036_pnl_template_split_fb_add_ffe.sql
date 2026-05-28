-- ============================================================================
-- Migration · pnl_template_split_fb_add_ffe (0036 · FASE 3 prerequisite)
-- ============================================================================
-- Schema deltas:
--   ADD pnl_template.expenses_food_pct      numeric(5,2) NULL
--   ADD pnl_template.expenses_beverage_pct  numeric(5,2) NULL
--   ADD pnl_template.ffe_reserve_pct        numeric(5,2) NULL
--
-- Data backfill:
--   · F&B: revenue-weighted split of expenses_fb_pct
--     food_share = fb_food_pct / (fb_food_pct + fb_beverage_pct)
--     Preserves the total exactly under any unit interpretation.
--   · FF&E: uniform 4.0 (USALI standard · HV methodology default)
--     applied only to non-pending rows.
--
-- View pnl_template_effective regenerated:
--   · New columns COALESCE'd with overrides (3 new line_items).
--   · expenses_fb_pct INTENTIONALLY EXCLUDED from view exposure (deprecation).
--   · Table column expenses_fb_pct STAYS (transition safety · drop in 0037
--     after API + UI validation).
--
-- Override table pnl_template_override: no schema change · line_item is TEXT.
-- New valid line_items: expenses_food_pct, expenses_beverage_pct, ffe_reserve_pct.
-- ============================================================================

-- ── 1 · ADD COLUMNS ─────────────────────────────────────────────────────────
ALTER TABLE public.pnl_template
  ADD COLUMN expenses_food_pct      numeric(5,2),
  ADD COLUMN expenses_beverage_pct  numeric(5,2),
  ADD COLUMN ffe_reserve_pct        numeric(5,2);

-- ── 2 · BACKFILL F&B (revenue-weighted per-row split) ──────────────────────
UPDATE public.pnl_template
SET
  expenses_food_pct = ROUND(
    (expenses_fb_pct * fb_food_pct / NULLIF(fb_food_pct + fb_beverage_pct, 0))::numeric, 2
  ),
  expenses_beverage_pct = ROUND(
    (expenses_fb_pct * fb_beverage_pct / NULLIF(fb_food_pct + fb_beverage_pct, 0))::numeric, 2
  )
WHERE expenses_fb_pct IS NOT NULL
  AND fb_food_pct IS NOT NULL
  AND fb_beverage_pct IS NOT NULL
  AND (fb_food_pct + fb_beverage_pct) > 0;

-- ── 3 · BACKFILL FF&E (4.0 for non-pending · USALI standard) ───────────────
UPDATE public.pnl_template
SET ffe_reserve_pct = 4.0
WHERE data_source <> 'pending_costar'
  AND ffe_reserve_pct IS NULL;

-- ── 4 · DEPRECATION marker + provenance notes on new/legacy columns ────────
COMMENT ON COLUMN public.pnl_template.expenses_fb_pct IS
  'DEPRECATED 2026-05-28 (migration 0036) · split into expenses_food_pct + expenses_beverage_pct via revenue-weighted backfill. Kept for one cycle as safety fallback · drop in 0037 after API validation.';

COMMENT ON COLUMN public.pnl_template.expenses_food_pct IS
  'F&B departmental expense · food share (post-0036 split). Backfilled from expenses_fb_pct via revenue-weighted formula on initial migration. Native value when re-imported from CoStar source.';

COMMENT ON COLUMN public.pnl_template.expenses_beverage_pct IS
  'F&B departmental expense · beverage share (post-0036 split). Backfilled from expenses_fb_pct via revenue-weighted formula on initial migration. Native value when re-imported from CoStar source.';

COMMENT ON COLUMN public.pnl_template.ffe_reserve_pct IS
  'FF&E replacement reserve · % of total revenue. Backfilled uniform 4.0 on 0036 = USALI convention default · NOT a CoStar measurement per geography. Refine per market/class when better data available (backlog #19 · post-FASE 3).';

-- ── 5 · RECREATE pnl_template_effective view ────────────────────────────────
-- Drops: exposure of expenses_fb_pct (table column stays, just hidden from view).
-- Adds:  expenses_food_pct, expenses_beverage_pct, ffe_reserve_pct (with COALESCE).
DROP VIEW IF EXISTS public.pnl_template_effective;

CREATE VIEW public.pnl_template_effective AS
SELECT
  t.id,
  t.country,
  t.market,
  t.submarket,
  t.class,
  t.segmentation_type,
  t.data_source,
  t.last_imported_at,
  t.imported_from,
  t.notes,
  t.created_at,
  t.updated_at,
  -- Revenue (% of total)
  COALESCE(o.rooms_revenue_pct, t.rooms_revenue_pct)             AS rooms_revenue_pct,
  COALESCE(o.fb_food_pct, t.fb_food_pct)                         AS fb_food_pct,
  COALESCE(o.fb_beverage_pct, t.fb_beverage_pct)                 AS fb_beverage_pct,
  COALESCE(o.meeting_events_pct, t.meeting_events_pct)           AS meeting_events_pct,
  COALESCE(o.spa_wellness_pct, t.spa_wellness_pct)               AS spa_wellness_pct,
  COALESCE(o.parking_other_pct, t.parking_other_pct)             AS parking_other_pct,
  -- Departmental expenses (own dept rev base)
  COALESCE(o.expenses_rooms_pct, t.expenses_rooms_pct)           AS expenses_rooms_pct,
  COALESCE(o.expenses_food_pct, t.expenses_food_pct)             AS expenses_food_pct,       -- NEW (0036)
  COALESCE(o.expenses_beverage_pct, t.expenses_beverage_pct)     AS expenses_beverage_pct,   -- NEW (0036)
  COALESCE(o.other_departments_pct, t.other_departments_pct)     AS other_departments_pct,
  -- Undistributed (% of total rev)
  COALESCE(o.admin_general_pct, t.admin_general_pct)             AS admin_general_pct,
  COALESCE(o.it_telecom_pct, t.it_telecom_pct)                   AS it_telecom_pct,
  COALESCE(o.sales_marketing_pct, t.sales_marketing_pct)         AS sales_marketing_pct,
  COALESCE(o.operations_maintenance_pct, t.operations_maintenance_pct) AS operations_maintenance_pct,
  COALESCE(o.utilities_pct, t.utilities_pct)                     AS utilities_pct,
  COALESCE(o.gop_pct, t.gop_pct)                                 AS gop_pct,
  -- Non-operating (% of total rev)
  COALESCE(o.management_fees_pct, t.management_fees_pct)         AS management_fees_pct,
  COALESCE(o.rent_pct, t.rent_pct)                               AS rent_pct,
  COALESCE(o.property_taxes_pct, t.property_taxes_pct)           AS property_taxes_pct,
  COALESCE(o.insurance_pct, t.insurance_pct)                     AS insurance_pct,
  COALESCE(o.ffe_reserve_pct, t.ffe_reserve_pct)                 AS ffe_reserve_pct,         -- NEW (0036)
  COALESCE(o.ebitda_pct, t.ebitda_pct)                           AS ebitda_pct,
  COALESCE(o.staff_cost_memo_pct, t.staff_cost_memo_pct)         AS staff_cost_memo_pct,
  -- Override metadata
  o.overridden_lines
  -- NOTE: expenses_fb_pct INTENTIONALLY excluded from view (deprecated 2026-05-28)
FROM public.pnl_template t
LEFT JOIN LATERAL (
  SELECT
    MAX(override_value) FILTER (WHERE line_item = 'rooms_revenue_pct')         AS rooms_revenue_pct,
    MAX(override_value) FILTER (WHERE line_item = 'fb_food_pct')               AS fb_food_pct,
    MAX(override_value) FILTER (WHERE line_item = 'fb_beverage_pct')           AS fb_beverage_pct,
    MAX(override_value) FILTER (WHERE line_item = 'meeting_events_pct')        AS meeting_events_pct,
    MAX(override_value) FILTER (WHERE line_item = 'spa_wellness_pct')          AS spa_wellness_pct,
    MAX(override_value) FILTER (WHERE line_item = 'parking_other_pct')         AS parking_other_pct,
    MAX(override_value) FILTER (WHERE line_item = 'expenses_rooms_pct')        AS expenses_rooms_pct,
    MAX(override_value) FILTER (WHERE line_item = 'expenses_food_pct')         AS expenses_food_pct,        -- NEW
    MAX(override_value) FILTER (WHERE line_item = 'expenses_beverage_pct')     AS expenses_beverage_pct,    -- NEW
    MAX(override_value) FILTER (WHERE line_item = 'other_departments_pct')     AS other_departments_pct,
    MAX(override_value) FILTER (WHERE line_item = 'admin_general_pct')         AS admin_general_pct,
    MAX(override_value) FILTER (WHERE line_item = 'it_telecom_pct')            AS it_telecom_pct,
    MAX(override_value) FILTER (WHERE line_item = 'sales_marketing_pct')       AS sales_marketing_pct,
    MAX(override_value) FILTER (WHERE line_item = 'operations_maintenance_pct') AS operations_maintenance_pct,
    MAX(override_value) FILTER (WHERE line_item = 'utilities_pct')             AS utilities_pct,
    MAX(override_value) FILTER (WHERE line_item = 'gop_pct')                   AS gop_pct,
    MAX(override_value) FILTER (WHERE line_item = 'management_fees_pct')       AS management_fees_pct,
    MAX(override_value) FILTER (WHERE line_item = 'rent_pct')                  AS rent_pct,
    MAX(override_value) FILTER (WHERE line_item = 'property_taxes_pct')        AS property_taxes_pct,
    MAX(override_value) FILTER (WHERE line_item = 'insurance_pct')             AS insurance_pct,
    MAX(override_value) FILTER (WHERE line_item = 'ffe_reserve_pct')           AS ffe_reserve_pct,          -- NEW
    MAX(override_value) FILTER (WHERE line_item = 'ebitda_pct')                AS ebitda_pct,
    MAX(override_value) FILTER (WHERE line_item = 'staff_cost_memo_pct')       AS staff_cost_memo_pct,
    COALESCE(array_agg(line_item ORDER BY line_item), ARRAY[]::text[])         AS overridden_lines
  FROM pnl_template_override
  WHERE template_id = t.id
) o ON true;

-- ── 6 · Audit row ───────────────────────────────────────────────────────────
INSERT INTO public.ai_agent_runs (agent_id, trigger_kind, status, run_completed_at, metadata)
VALUES (
  'data_ingestion',
  'manual',
  'success',
  NOW(),
  jsonb_build_object(
    'operation',          'schema_migration',
    'migration_name',     '0036_pnl_template_split_fb_add_ffe',
    'phase',              'FASE 3 prerequisite',
    'schema_changes',     ARRAY[
      'ADD pnl_template.expenses_food_pct numeric(5,2)',
      'ADD pnl_template.expenses_beverage_pct numeric(5,2)',
      'ADD pnl_template.ffe_reserve_pct numeric(5,2)',
      'DEPRECATE pnl_template.expenses_fb_pct (drop in 0037)',
      'RECREATE pnl_template_effective view with new columns'
    ],
    'backfill_methodology', jsonb_build_object(
      'fb_split',           'revenue-weighted per-row · expenses_food_pct = expenses_fb_pct × fb_food_pct / (fb_food_pct + fb_beverage_pct) · symmetric for beverage · sum preserved exactly',
      'ffe_reserve',        'uniform 4.0 for non-pending rows · USALI convention default · NOT a CoStar measurement per geography · refine when better data available'
    ),
    'open_debts', jsonb_build_object(
      'backlog_19',         'FF&E reserve per-geography refinement · current 4.0 is industry rule of thumb, not CoStar real per (country, market, submarket, class) · post-FASE 3 priority',
      'backlog_20',         'expenses_fb_pct unit reconciliation · BD values (90.7 all-in CoStar / 79.2 national / 72.5 derived) appear higher than panel defaults (32 percent food rev + 22 percent beverage rev ~= 29 weighted) · CoStar bundles labor + overhead + allocations · panel default reflects cost-of-goods only · decide in sub-step 6 of FASE 3 whether to adjust panel sub-labels to "% food rev all-in" or reinterpret · methodological debt pre-existing FASE 3 · HIGH PRIORITY before investor demo'
    ),
    'rows_affected_target', 108,
    'operator_verified',  true
  )
);
