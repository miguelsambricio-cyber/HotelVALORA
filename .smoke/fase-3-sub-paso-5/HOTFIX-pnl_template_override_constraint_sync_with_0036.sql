-- ============================================================================
-- Hotfix migration · pnl_template_override_constraint_sync_with_0036
-- ============================================================================
-- Sync olvidado en migración 0036 · el CHECK constraint
-- pnl_override_line_item_known seguía listando solo las 21 columnas de 0035
-- · NO incluía las 3 nuevas:
--   - expenses_food_pct
--   - expenses_beverage_pct
--   - ffe_reserve_pct
--
-- Destapado por smoke pre-commit del FASE 3 sub-paso 5 (useDraftedOverrides
-- Supabase hook) al intentar simular un save sobre ffe_reserve_pct.
--
-- Impacto pre-hotfix: el primer operador que editara Food expense, Beverage
-- expense o FF&E reserve vía sub-paso 6 panel hubiera fallado con error
-- 23514 (check constraint violation) y nada se guardaba. Bug latente
-- bloqueante.
--
-- expenses_fb_pct se MANTIENE en el constraint (decisión transición:
-- consistente con que la columna sigue en la tabla hasta 0037). Drop
-- del nombre en 0037 cuando se elimine la columna también.
-- ============================================================================

ALTER TABLE public.pnl_template_override
  DROP CONSTRAINT pnl_override_line_item_known;

ALTER TABLE public.pnl_template_override
  ADD CONSTRAINT pnl_override_line_item_known CHECK (
    line_item = ANY (ARRAY[
      'rooms_revenue_pct'::text,
      'fb_food_pct'::text,
      'fb_beverage_pct'::text,
      'meeting_events_pct'::text,
      'spa_wellness_pct'::text,
      'parking_other_pct'::text,
      'expenses_rooms_pct'::text,
      'expenses_fb_pct'::text,            -- DEPRECATED · drop in 0037
      'expenses_food_pct'::text,          -- NEW (0036)
      'expenses_beverage_pct'::text,      -- NEW (0036)
      'other_departments_pct'::text,
      'admin_general_pct'::text,
      'it_telecom_pct'::text,
      'sales_marketing_pct'::text,
      'operations_maintenance_pct'::text,
      'utilities_pct'::text,
      'gop_pct'::text,
      'management_fees_pct'::text,
      'rent_pct'::text,
      'property_taxes_pct'::text,
      'insurance_pct'::text,
      'ffe_reserve_pct'::text,            -- NEW (0036)
      'ebitda_pct'::text,
      'staff_cost_memo_pct'::text
    ])
  );

INSERT INTO public.ai_agent_runs (agent_id, trigger_kind, status, run_completed_at, metadata)
VALUES (
  'data_ingestion',
  'manual',
  'success',
  NOW(),
  jsonb_build_object(
    'operation',         'schema_migration_hotfix',
    'migration_name',    'pnl_template_override_constraint_sync_with_0036',
    'fixes',             'Sync olvidado en 0036 · expenses_food_pct/expenses_beverage_pct/ffe_reserve_pct no eran editables como overrides',
    'detected_by',       'FASE 3 sub-paso 5 structural smoke (.smoke/fase-3-sub-paso-5/smoke.mjs)',
    'impact_pre_fix',    'Operator save on Food expense / Beverage expense / FF&E reserve failed with constraint violation 23514 · zero data persisted',
    'transition_note',   'expenses_fb_pct kept in constraint to mirror table column deprecation pattern (drop in migration 0037 with column)',
    'reversibility',     'REVERT.sql captured in .smoke/fase-3-sub-paso-5/ · restores 21-item array'
  )
);
