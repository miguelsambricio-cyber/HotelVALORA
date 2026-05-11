-- ============================================================================
-- HOTELVALORA · Supabase · Migration 0007 — AI Operations Layer (foundation)
-- ============================================================================
-- Foundation schema for the HotelVALORA AI Operations Layer. These are
-- NOT chatbots — they are operational AI systems with responsibilities,
-- workflows, permissions, memory, audit trails, and human-escalation
-- paths.
--
-- Tables sit empty until each agent's Phase 2+ implementation lands;
-- applying the migration now gives every future agent a stable identity
-- (agent enum value, runs audit table, permissions matrix) before any
-- agent code is written.
--
-- Strategic context: docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md
-- Architecture:      docs/ai-agents/ai-agent-architecture.md
-- Memory:            docs/ai-agents/ai-memory-strategy.md
-- Permissions:       docs/ai-agents/ai-agent-permissions.md
-- Events:            docs/ai-agents/ai-event-system.md
-- KPIs:              docs/ai-agents/ai-agent-kpis.md
--
-- Tables in this migration
--   ai_agents               · registry of the 9 future operational AI systems
--   ai_agent_runs           · per-invocation audit log
--   ai_events               · canonical event bus across the platform
--   ai_agent_permissions    · RBAC matrix: agent × resource × action
--   ai_memory               · shared long-term + session memory store
--   ai_tools                · catalogue of tools agents may call
--   ai_human_review         · queue of actions awaiting human approval
-- ============================================================================

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

do $$ begin
  create type ai_agent_id as enum (
    'cfo',
    'cmo',
    'customer_success',
    'underwriting',
    'market_intelligence',
    'data_ingestion',
    'report_generation',
    'crm_dealflow',
    'qa_monitoring'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_agent_status as enum ('planned','beta','active','disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_agent_run_status as enum (
    'queued','running','success','partial','failed',
    'awaiting_approval','cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_event_kind as enum (
    'news_ingested','valuation_created','valuation_updated',
    'tour_requested','user_signed_up','payment_received',
    'deploy_completed','health_check_failed','system_alert',
    'human_approval_needed','human_approved','human_rejected',
    'cron_fired','custom'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_permission_action as enum ('select','insert','update','delete','execute');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_memory_scope as enum (
    'agent_global','agent_org','agent_user','agent_session','shared'
  );
exception when duplicate_object then null; end $$;

-- ─── AI_AGENTS ──────────────────────────────────────────────────────────────
-- Registry of every operational AI system. Each row is the declarative
-- contract for that agent — responsibilities, KPIs, escalation rules.

create table if not exists public.ai_agents (
  id ai_agent_id primary key,
  display_name text not null,
  status ai_agent_status not null default 'planned',
  description text,
  responsibilities jsonb,             -- {"primary": [...], "secondary": [...]}
  workflows jsonb,                    -- declarative workflow definitions
  kpis jsonb,                         -- {"name": "...", "target": "...", "unit": "..."}
  escalation_rules jsonb,             -- when to invoke ai_human_review
  config jsonb,                       -- runtime config (model, temperature, etc.)
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── AI_AGENT_RUNS ──────────────────────────────────────────────────────────
-- Per-invocation audit log. Every agent execution gets a row at start,
-- updated to completion. The pattern mirrors `news_ingestion_runs`.

create table if not exists public.ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id ai_agent_id not null references public.ai_agents(id) on delete cascade,
  trigger_kind text not null check (trigger_kind in ('cron','event','manual','webhook','escalation','agent')),
  triggered_by uuid references public.users(id) on delete set null,
  triggering_event_id uuid,           -- references ai_events.id when trigger_kind='event'
  triggering_agent_id ai_agent_id,    -- when one agent invokes another
  run_started_at timestamptz not null default now(),
  run_completed_at timestamptz,
  status ai_agent_run_status not null default 'queued',
  input jsonb,
  output jsonb,
  steps jsonb,                        -- [{step, status, started_at, ended_at, output}, ...]
  tokens_in int default 0,
  tokens_out int default 0,
  cost_usd numeric(10,4) default 0,
  error_message text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_agent_runs_agent_idx on public.ai_agent_runs (agent_id, run_started_at desc);
create index if not exists ai_agent_runs_status_idx on public.ai_agent_runs (status);
create index if not exists ai_agent_runs_trigger_idx on public.ai_agent_runs (trigger_kind);

-- ─── AI_EVENTS ──────────────────────────────────────────────────────────────
-- The canonical event bus. Agents emit events, other agents subscribe.
-- Supabase Realtime broadcasts on insert for reactive consumers.

create table if not exists public.ai_events (
  id uuid primary key default gen_random_uuid(),
  kind ai_event_kind not null,
  source text not null,               -- 'system' | 'user:<uuid>' | 'agent:<id>' | 'external:<service>'
  payload jsonb not null,
  scope_org_id uuid references public.organizations(id) on delete cascade,
  scope_user_id uuid references public.users(id) on delete cascade,
  consumed_by uuid[] not null default array[]::uuid[],
  occurred_at timestamptz not null default now(),
  expires_at timestamptz,             -- agents can ignore expired events
  created_at timestamptz not null default now()
);
create index if not exists ai_events_kind_idx on public.ai_events (kind);
create index if not exists ai_events_occurred_idx on public.ai_events (occurred_at desc);
create index if not exists ai_events_scope_org_idx on public.ai_events (scope_org_id);

-- ─── AI_AGENT_PERMISSIONS ───────────────────────────────────────────────────
-- RBAC matrix. Read-side enforcement is by application code reading
-- this table before issuing queries. Write-side enforcement combines
-- this table with Postgres RLS (where the agent uses service-role, code
-- must still scope queries to its declared permissions).

create table if not exists public.ai_agent_permissions (
  id uuid primary key default gen_random_uuid(),
  agent_id ai_agent_id not null references public.ai_agents(id) on delete cascade,
  resource_type text not null check (resource_type in ('table','tool','endpoint','external_api')),
  resource_name text not null,
  actions ai_permission_action[] not null,
  scope jsonb,                        -- {org_id?, where?, columns?, rate_limit?}
  granted_by uuid references public.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  unique (agent_id, resource_type, resource_name)
);
create index if not exists ai_agent_permissions_agent_idx on public.ai_agent_permissions (agent_id);
create index if not exists ai_agent_permissions_resource_idx on public.ai_agent_permissions (resource_type, resource_name);

-- ─── AI_MEMORY ──────────────────────────────────────────────────────────────
-- Long-term + session memory. `embedding` column added in Phase 3 once
-- pgvector extension is enabled — for now the column is reserved but
-- not present.

create table if not exists public.ai_memory (
  id uuid primary key default gen_random_uuid(),
  agent_id ai_agent_id not null references public.ai_agents(id) on delete cascade,
  scope ai_memory_scope not null,
  scope_org_id uuid references public.organizations(id) on delete cascade,
  scope_user_id uuid references public.users(id) on delete cascade,
  scope_session_id text,
  content text not null,
  embedding_ready boolean not null default false,
  importance_score numeric(3,2) check (importance_score between 0 and 1),
  meta jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ai_memory_agent_scope_idx on public.ai_memory (agent_id, scope);
create index if not exists ai_memory_org_idx on public.ai_memory (scope_org_id);
create index if not exists ai_memory_user_idx on public.ai_memory (scope_user_id);

-- ─── AI_TOOLS ───────────────────────────────────────────────────────────────
-- Catalogue of tools agents may invoke. The id is the dotted-path
-- identifier: 'resend.emails.send', 'stripe.charges.list',
-- 'supabase.valuations.select'.

create table if not exists public.ai_tools (
  id text primary key,
  display_name text not null,
  description text,
  category text check (category in ('communications','financial','data','monitoring','content','external_api')),
  integration text,                   -- 'resend','stripe','supabase','vercel','linkedin','x','whatsapp'
  is_destructive boolean not null default false,
  requires_human_approval boolean not null default false,
  schema_in jsonb,                    -- JSON schema for the tool's input
  schema_out jsonb,                   -- JSON schema for the tool's output
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── AI_HUMAN_REVIEW ────────────────────────────────────────────────────────
-- Human-in-the-loop queue. When an agent proposes a destructive action,
-- it inserts a row here and pauses (run status = 'awaiting_approval').
-- A human approves or rejects; on approval the agent resumes.

create table if not exists public.ai_human_review (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_agent_runs(id) on delete cascade,
  agent_id ai_agent_id not null references public.ai_agents(id) on delete cascade,
  reason text,
  proposed_action jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  reviewer_id uuid references public.users(id) on delete set null,
  reviewer_notes text,
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ai_human_review_status_idx on public.ai_human_review (status);
create index if not exists ai_human_review_run_idx on public.ai_human_review (run_id);

-- ─── TRIGGERS ───────────────────────────────────────────────────────────────

do $$ begin
  create trigger ai_agents_updated_at before update on public.ai_agents
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger ai_tools_updated_at before update on public.ai_tools
    for each row execute procedure public.set_updated_at();
exception when duplicate_object then null; end $$;

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────────────────────
-- Catalogue tables (ai_agents, ai_tools) are public-read for transparency
-- about what the AI Ops Layer does. Operational tables (runs, events,
-- memory, permissions, human_review) are service-role only.

alter table public.ai_agents              enable row level security;
alter table public.ai_agent_runs          enable row level security;
alter table public.ai_events              enable row level security;
alter table public.ai_agent_permissions   enable row level security;
alter table public.ai_memory              enable row level security;
alter table public.ai_tools               enable row level security;
alter table public.ai_human_review        enable row level security;

create policy "ai_agents: public read" on public.ai_agents for select using (true);
create policy "ai_tools: public read"  on public.ai_tools  for select using (true);
-- All other tables: RLS enabled, no policies → service-role only.

-- ─── SEED AGENTS ────────────────────────────────────────────────────────────

insert into public.ai_agents (id, display_name, status, description, responsibilities, kpis) values
  ('market_intelligence', 'Market Intelligence Agent', 'planned',
   'Monitors hospitality news, normalises articles, classifies events, tracks investors and operators. Built ON TOP of the Hospitality Intelligence Engine (migration 0006).',
   '{"primary":["news ingestion","categorisation","entity extraction"],"secondary":["dossier maintenance","trend detection"]}'::jsonb,
   '[{"name":"coverage","target":">=10 sources/day"},{"name":"dedup_rate","target":">=99%"},{"name":"freshness","target":"<24h from publish to corpus"}]'::jsonb
  ),
  ('data_ingestion', 'Data Ingestion Agent', 'planned',
   'Parses Excel + CoStar files, normalises columns, validates payloads, detects schema drift, surfaces ingestion errors to operators.',
   '{"primary":["excel parsing","costar normalisation","schema mapping"],"secondary":["error reporting","data quality scoring"]}'::jsonb,
   '[{"name":"parse_success_rate","target":">=98%"},{"name":"manual_review_rate","target":"<=5%"}]'::jsonb
  ),
  ('qa_monitoring', 'QA / Monitoring Agent', 'planned',
   'Monitors deploys, APIs, uptime, Supabase advisor lints, Vercel cron failures, Resend delivery health. Pages operators on detected failures.',
   '{"primary":["uptime checks","deploy verification","advisor monitoring"],"secondary":["dependency drift","key rotation reminders"]}'::jsonb,
   '[{"name":"mttd","target":"<5min","unit":"mean time to detect"},{"name":"false_positive_rate","target":"<2%"}]'::jsonb
  ),
  ('underwriting', 'Underwriting Agent', 'planned',
   'STRATEGIC MOAT — generates institutional-grade hotel underwriting: DCF, sensitivity, risk scoring, operator fit, highest-and-best-use, investment memos. Requires the underwriting UX shell to be live first.',
   '{"primary":["dcf modelling","sensitivity analysis","investment memo drafting"],"secondary":["operator fit scoring","risk flagging"]}'::jsonb,
   '[{"name":"memo_acceptance_rate","target":">=80% institutional sign-off"},{"name":"manual_correction_rate","target":"<=15%"}]'::jsonb
  ),
  ('report_generation', 'Report Generation Agent', 'planned',
   'Produces PDFs, charts, maps, executive summaries from underwriting + intelligence inputs. Renders institutional formatting per tier (free / pro / premium).',
   '{"primary":["pdf generation","executive summary","chart rendering"],"secondary":["tier-based formatting","print-ready exports"]}'::jsonb,
   '[{"name":"generation_time","target":"<30s for a full report"},{"name":"render_fidelity","target":">=99% match vs UI"}]'::jsonb
  ),
  ('crm_dealflow', 'CRM / Dealflow Agent', 'planned',
   'Maintains investor + operator dossiers, tracks contacts, leads, tours, follow-ups, deal pipeline. Reads from Market Intelligence + CRM tables.',
   '{"primary":["contact enrichment","pipeline maintenance","reminder dispatch"],"secondary":["dossier updates from news","deal scoring"]}'::jsonb,
   '[{"name":"dossier_freshness","target":"<7d stale"},{"name":"reminder_accuracy","target":">=95%"}]'::jsonb
  ),
  ('customer_success', 'Customer Success Agent', 'planned',
   'WhatsApp / chat support, onboarding flows, FAQs, support routing, demo coordination, investor assistance. Escalates ambiguous tickets to humans.',
   '{"primary":["first-line support","onboarding flows","faq answering"],"secondary":["demo scheduling","churn signal detection"]}'::jsonb,
   '[{"name":"first_response_time","target":"<2min"},{"name":"resolution_rate","target":">=70% without escalation"}]'::jsonb
  ),
  ('cmo', 'CMO Agent', 'planned',
   'LinkedIn + X publishing, newsletter drafts, market reports, campaign automation, content repurposing. ALL outbound content goes through ai_human_review before publishing.',
   '{"primary":["content drafting","scheduled publishing","campaign orchestration"],"secondary":["repurposing","analytics"]}'::jsonb,
   '[{"name":"draft_approval_rate","target":">=85% on first review"},{"name":"engagement_lift","target":"+30% vs no-AI baseline"}]'::jsonb
  ),
  ('cfo', 'CFO Agent', 'planned',
   'Invoices, payments, taxes, subscriptions, cloud cost monitoring, burn rate, runway projection, reconciliation. All financial side-effects (transfers, refunds) require human approval.',
   '{"primary":["reconciliation","cost monitoring","runway forecasting"],"secondary":["invoice generation","tax prep"]}'::jsonb,
   '[{"name":"reconciliation_accuracy","target":"100%"},{"name":"forecast_variance","target":"<10% from actuals"}]'::jsonb
  )
on conflict (id) do update set
  display_name = excluded.display_name,
  status = excluded.status,
  description = excluded.description,
  responsibilities = excluded.responsibilities,
  kpis = excluded.kpis,
  updated_at = now();

-- ─── SEED TOOLS ─────────────────────────────────────────────────────────────

insert into public.ai_tools (id, display_name, description, category, integration, is_destructive, requires_human_approval) values
  ('supabase.market_news.select',          'Read market news',                 'Query market_news rows',                         'data',           'supabase', false, false),
  ('supabase.market_news.insert',          'Insert market news',               'Insert canonical news article rows',             'data',           'supabase', false, false),
  ('supabase.valuations.select',           'Read valuations',                  'Query valuations + joined entities',              'data',           'supabase', false, false),
  ('supabase.hotel_transactions.insert',   'Insert hotel transaction',         'Record a structured transaction event',          'data',           'supabase', false, false),
  ('supabase.hotel_projects.insert',       'Insert hotel project',             'Record a structured project event',              'data',           'supabase', false, false),
  ('resend.emails.send',                   'Send email via Resend',            'Transactional email through resend.com API',     'communications', 'resend',   false, true),
  ('linkedin.posts.publish',               'Publish to LinkedIn',              'Post to the HotelVALORA company page',           'content',        'linkedin', false, true),
  ('x.tweets.publish',                     'Publish to X',                     'Post to the HotelVALORA X account',              'content',        'x',        false, true),
  ('whatsapp.messages.send',               'Send WhatsApp message',            'Send a message via the WhatsApp Business API',   'communications', 'whatsapp', false, true),
  ('stripe.charges.list',                  'List Stripe charges',              'Read recent Stripe charge events',               'financial',     'stripe',    false, false),
  ('stripe.refunds.create',                'Create Stripe refund',             'Refund a Stripe charge',                         'financial',     'stripe',    true,  true),
  ('vercel.deployments.list',              'List Vercel deployments',          'Read recent deploys for monitoring',             'monitoring',    'vercel',    false, false),
  ('vercel.deployments.rollback',          'Rollback a Vercel deployment',     'Promote a previous deploy to production',        'monitoring',    'vercel',    true,  true),
  ('supabase.execute_sql',                 'Execute arbitrary SQL',            'Service-role SQL execution',                     'data',           'supabase', true,  true),
  ('costar.exports.parse',                 'Parse CoStar export',              'Parse a CoStar Excel export',                    'data',           'data_pipeline', false, false),
  ('reports.pdf.generate',                 'Generate institutional PDF',       'Render a tier-aware institutional report PDF',   'content',        'puppeteer', false, false),
  ('intelligence.dossier.refresh',         'Refresh dossier',                  'Re-aggregate dossier for an investor/operator',  'data',           'supabase', false, false),
  ('alerts.dispatch',                      'Dispatch user alerts',             'Send matching subscription alerts via Resend',   'communications', 'resend',    false, false),
  ('crm.contacts.upsert',                  'Upsert CRM contact',               'Insert or update a contact record',              'data',           'supabase', false, false),
  ('monitoring.escalate',                  'Escalate incident',                'Page on-call via PagerDuty / Slack webhook',     'monitoring',    'pagerduty', false, false)
on conflict (id) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  category = excluded.category,
  integration = excluded.integration,
  is_destructive = excluded.is_destructive,
  requires_human_approval = excluded.requires_human_approval,
  updated_at = now();

-- ============================================================================
-- END migration 0007
-- ============================================================================
