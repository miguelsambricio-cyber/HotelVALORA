-- ============================================================================
-- REVERT · pnl_template_override_constraint_sync_with_0036
-- ============================================================================
-- Restores the pre-hotfix 21-item CHECK constraint. Use ONLY if a regression
-- is detected; otherwise the hotfix should stay (it unblocks all overrides
-- on the 3 columns added by migration 0036).
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
      'expenses_fb_pct'::text,
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
      'ebitda_pct'::text,
      'staff_cost_memo_pct'::text
    ])
  );
