-- ============================================================================
-- HOTELVALORA · Supabase · Migration 0008 — CEO / Orchestration Agent (Tier 0)
-- ============================================================================
-- Adds the 10th agent — the orchestration + supervision layer that sits
-- ABOVE the 9 operational agents declared in migration 0007.
--
-- The CEO Agent is NOT a chatbot. It is the operations command center —
-- chief-of-staff for the platform. It reviews platform health hourly,
-- runs a strategic review daily, supervises every other agent, and
-- routes critical anomalies to humans via ai_human_review.
--
-- This migration:
--   1. Extends the `ai_agent_id` enum with the new 'ceo' value
--   2. Extends `ai_event_kind` with three orchestration-specific kinds
--   3. Inserts the CEO Agent registry row
--   4. Catalogues 9 new tools the CEO Agent will use (supervisory + cross-agent)
--
-- Strategic context: docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md § Tier 0
-- ============================================================================

alter type ai_agent_id add value if not exists 'ceo';

alter type ai_event_kind add value if not exists 'strategic_review_completed';
alter type ai_event_kind add value if not exists 'agent_anomaly_detected';
alter type ai_event_kind add value if not exists 'cost_cap_warning';

-- The new enum values become available in subsequent transactions.
-- The inserts below run after the enum-extending DDL has committed.

commit;

insert into public.ai_agents (id, display_name, status, description, responsibilities, kpis) values
  ('ceo', 'CEO / Orchestration Agent', 'planned',
   'Tier 0 — operations command center, AI chief-of-staff, supervisor of every other agent. NOT customer-facing. Hourly platform health reviews + daily strategic reviews + cross-agent coordination + escalation routing. Never executes destructive tools; instead inserts into ai_human_review or emits system_alert events.',
   '{"primary":["hourly platform health review","daily strategic review","agent supervision","escalation routing","operational kpi tracking","ai governance supervision","infrastructure monitoring","deployment verification","scheduled-job verification","cost cap monitoring"],"secondary":["workflow optimisation recommendations","cross-agent coordination","operational reporting"]}'::jsonb,
   '[{"name":"mttd_platform","target":"<5min mean-time-to-detect any platform issue"},{"name":"escalation_precision","target":">=90% of escalations are actionable"},{"name":"agent_coverage","target":"100% of agents reviewed per cycle"},{"name":"hourly_run_completion","target":">=99% of hourly runs completed"},{"name":"strategic_review_quality","target":">=80% manual rating after 30d"}]'::jsonb
  )
on conflict (id) do update set
  display_name = excluded.display_name,
  status = excluded.status,
  description = excluded.description,
  responsibilities = excluded.responsibilities,
  kpis = excluded.kpis,
  updated_at = now();

-- ─── CEO Agent tools ────────────────────────────────────────────────────────
-- The CEO is read-heavy. Most tools are SELECTs across operational tables;
-- the destructive surface is one tool only (`ai_ops.invoke_agent`) and it
-- can only invoke READ tools of the callee — enforced at runtime.

insert into public.ai_tools (id, display_name, description, category, integration, is_destructive, requires_human_approval) values
  ('ai_ops.health_check',           'Aggregate platform health',     'Aggregates ai_agent_runs counts by agent x status over a time window',          'monitoring', 'supabase', false, false),
  ('ai_ops.runs.select',            'Read agent runs',               'Cross-agent SELECT on ai_agent_runs for supervisory analysis',                  'monitoring', 'supabase', false, false),
  ('ai_ops.events.select',          'Read events',                   'Cross-agent SELECT on ai_events',                                               'monitoring', 'supabase', false, false),
  ('ai_ops.human_review.select',    'Read human review queue',       'Read pending + expired ai_human_review rows',                                   'monitoring', 'supabase', false, false),
  ('ai_ops.cost.aggregate',         'Aggregate daily costs',         'Sum cost_usd per agent per day for cap monitoring',                             'monitoring', 'supabase', false, false),
  ('ai_ops.invoke_agent',           'Invoke another agent',          'Agent-to-agent call. Can only invoke READ tools of the callee. Enforced runtime', 'monitoring', 'supabase', false, false),
  ('supabase.advisors.check',       'Read Supabase advisors',        'Returns current security + performance lint advisories',                        'monitoring', 'supabase', false, false),
  ('supabase.audit_logs.select',    'Read platform audit log',       'SELECT on public.audit_logs for supervisory review',                            'monitoring', 'supabase', false, false),
  ('github.commits.list',           'List recent GitHub commits',    'Recent main-branch commits for deploy-context correlation',                     'monitoring', 'github',   false, false),
  ('intelligence.runs.summary',     'Summarise ingestion runs',      'Aggregates news_ingestion_runs for the Intelligence Engine status check',       'monitoring', 'supabase', false, false)
on conflict (id) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  category = excluded.category,
  integration = excluded.integration,
  is_destructive = excluded.is_destructive,
  requires_human_approval = excluded.requires_human_approval,
  updated_at = now();

-- ============================================================================
-- END migration 0008
-- ============================================================================
