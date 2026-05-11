import type { AgentDescriptor, AgentId } from "./types";

/**
 * Mock registry for the HOTELVALORA AI Operations Center.
 *
 * The data here mirrors `public.ai_agents` schema. Phase 3+ replaces these
 * constants with a Supabase read + realtime subscription on agent runs.
 *
 * Initial states (per current operational reality, 2026-05-11):
 *   CEO              → active        (Tier 0 supervisor, planned activation Phase 3)
 *   Market Intel     → healthy       (Tier 1, beta — Phase 2 live)
 *   CoStar Market    → manual_mode   (operator uploads CoStar exports until subscription justifies automation)
 *   CompSet Underw   → manual_mode   (operator runs benchmarking until MVP stable)
 *   Data Ingestion   → healthy       (Tier 1, beta — transactions CLI live)
 *   QA / Monitoring  → monitoring    (Tier 1, beta — hourly probes)
 *   CFO / CMO / CS / CRM → standby   (Tier 3, planned)
 */

const NOW = "2026-05-11T10:00:00Z";
const HOUR_AGO = "2026-05-11T09:00:00Z";
const TWO_HOURS_AGO = "2026-05-11T08:00:00Z";
const TOMORROW_MORNING = "2026-05-12T07:48:00Z";
const NEXT_HOUR = "2026-05-11T11:00:00Z";

export const AGENT_REGISTRY: Record<AgentId, AgentDescriptor> = {
  // ─────────────────────────────────────────────────────────────────────────
  // TIER 0 — SUPERVISORY
  // ─────────────────────────────────────────────────────────────────────────
  ceo: {
    id: "ceo",
    name: "CEO / Orchestration Agent",
    shortName: "CEO",
    tier: 0,
    status: "active",
    statusLabel: "Active",
    workspace: null,
    purpose:
      "Supervisory orchestration layer above the operational ecosystem. Watches, coordinates, escalates. Never executes heavy ingestion.",
    responsibilities: [
      "Hourly health probes across Vercel + Supabase + Resend",
      "Verify all agents are within SLA (success rate ≥ 95%)",
      "Detect ingestion + cron failures across the fleet",
      "Coordinate cascading refreshes (market → positioning)",
      "Monitor aggregate spend vs per-agent + global cost caps",
      "Surface stuck approvals (ai_human_review > 24h)",
      "Resend escalations to operator on freshness violations",
    ],
    integrations: [
      "public.ai_agent_runs / ai_events / ai_human_review (read)",
      "Supabase advisors API",
      "Vercel deployments API",
      "Resend (monitoring.escalate.email)",
      "All services/*/MASTER/INGESTION_LOG sheets (read)",
    ],
    workflow:
      "Hourly cron writes a health snapshot to ai_memory. Daily cron writes a strategic review. Reactive subscribers on human_approval_needed + health_check_failed events fire ad-hoc.",
    currentMode: "Planned · monitoring fixture (will activate in Phase 3)",
    lastExecution: HOUR_AGO,
    nextExecution: NEXT_HOUR,
    healthScore: 96,
    kpis: [
      { label: "Agents in fleet", value: "10", hint: "1 supervisor + 9 operational" },
      { label: "Active (beta+)", value: "3", hint: "Market Intel · Data Ingestion · QA" },
      { label: "Stuck approvals", value: "0", hint: "Pending > 24h" },
      { label: "Daily fleet spend", value: "$0.00", hint: "of $0.35 aggregate cap" },
    ],
    mockLogs: [
      { ts: NOW, level: "ok", message: "Hourly health snapshot persisted (3 agents green · 2 manual · 4 standby)" },
      { ts: HOUR_AGO, level: "info", message: "No fleet failures last 24h" },
      { ts: TWO_HOURS_AGO, level: "info", message: "ai_human_review queue empty" },
      { ts: TWO_HOURS_AGO, level: "info", message: "Supabase advisors: 0 critical findings" },
    ],
    roadmap: [
      { phase: "Phase 3", description: "Activate ceo agent — runtime + hourly + daily crons + reactive subscribers", status: "planned" },
      { phase: "Phase 4", description: "LLM-assisted daily strategic review + circuit-breaker pattern (pause misbehaving agents)", status: "planned" },
    ],
    infrastructureDeps: ["Vercel Cron", "Supabase Realtime (Phase 3)", "Resend"],
    references: [
      { label: "Charter", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/agents/ceo-agent-supervision-layer.md" },
      { label: "Architecture", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/architecture/market-vs-underwriting-separation.md" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TIER 1 — OPERATIONAL INGESTION
  // ─────────────────────────────────────────────────────────────────────────
  market_intelligence: {
    id: "market_intelligence",
    name: "Market Intelligence Agent",
    shortName: "Market Intel",
    tier: 1,
    status: "healthy",
    statusLabel: "Healthy",
    workspace: "public.market_news",
    purpose:
      "Daily hospitality news ingestion. Reads RSS / scrape / API sources, dedups via sha256, categorises by news_category enum, emits intel_daily_summary_ready events.",
    responsibilities: [
      "Daily cron ingestion of 10 catalogued sources",
      "Regex categorisation (13 news_category values)",
      "URL canonicalisation + content-hash dedup",
      "Tag taxonomy enrichment (news_tags)",
      "Cursor-driven aggregation window per run",
    ],
    integrations: [
      "Hospitality Intelligence Engine (Branch A)",
      "public.market_news / news_tags / news_ingestion_runs",
      "RSS feeds (Hosteltur · HVS · Skift · Reuters · etc.)",
    ],
    workflow:
      "Cron at 07:48 UTC fetches all enabled sources serially → parse → normalise → dedup → upsert market_news. Then market-intel cron at 08:20 UTC aggregates new rows into a daily summary in ai_memory.",
    currentMode: "Autonomous (Phase 2 cron live)",
    lastExecution: "2026-05-11T07:48:00Z",
    nextExecution: TOMORROW_MORNING,
    healthScore: 94,
    kpis: [
      { label: "Sources enabled", value: "10", hint: "6 RSS · 2 scrape (stubbed) · 2 api (stubbed)" },
      { label: "Rows/day (avg)", value: "~28", hint: "Steady state target ≥ 10" },
      { label: "Success rate (7d)", value: "98%", hint: "Per news_ingestion_runs" },
      { label: "Daily cost", value: "$0.00", hint: "Cap $0.20 — regex-only, no LLM yet" },
    ],
    mockLogs: [
      { ts: NOW, level: "ok", message: "Daily summary aggregated · 31 new rows · top tag: madrid (8)" },
      { ts: "2026-05-11T07:50:30Z", level: "ok", message: "hosteltur: 14 inserted · 0 failed" },
      { ts: "2026-05-11T07:49:18Z", level: "ok", message: "reuters-hospitality: 7 inserted · 0 failed" },
      { ts: "2026-05-11T07:48:42Z", level: "info", message: "skift-hospitality: 3 skipped (dedup match) · 5 inserted" },
      { ts: "2026-05-11T07:48:08Z", level: "info", message: "alimarket: 0 inserted (scrape_not_implemented_phase2)" },
    ],
    roadmap: [
      { phase: "Phase 2", description: "Cron live · regex-only categorisation · sha256 dedup", status: "shipped" },
      { phase: "Phase 3", description: "Reactive subscription on news_ingested → trigger downstream agents", status: "planned" },
      { phase: "Phase 4", description: "LLM-assisted summaries + entity resolution + opportunity scoring", status: "planned" },
    ],
    infrastructureDeps: ["Vercel Cron (48 7 * * * UTC)", "Supabase (market_news)", "RSS sources"],
    references: [
      { label: "Roadmap", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/intelligence/hospitality-intelligence-roadmap.md" },
    ],
  },

  costar_market_data: {
    id: "costar_market_data",
    name: "CoStar Market Data Agent",
    shortName: "CoStar Market",
    tier: 1,
    status: "manual_mode",
    statusLabel: "Manual Mode",
    workspace: "services/costar/",
    purpose:
      "Maintain the institutional hospitality market WAREHOUSE — country / market / submarket / class time-series of supply, demand, occupancy, ADR, RevPAR. Slow-cadence, batch-style.",
    responsibilities: [
      "COSTAR_MASTER_PAIS — country aggregates + macro context (GDP · inflation · tourism arrivals)",
      "COSTAR_MASTER_MERCADOS — market positioning + revpar_index_vs_country + seasonality",
      "COSTAR_MASTER_SUBMERCADOS — submarket KPIs + chain_scale + segment_type axes",
      "COSTAR_MASTER_CLASS — chain-scale aggregates (country OR market level)",
      "Pipeline + openings + inventory tracking per granularity",
    ],
    integrations: [
      "CoStar Hospitality Export (Tier A source)",
      "STR Global (Tier A)",
      "Kalibri Labs (Tier B)",
      "services/costar/{PAIS,MERCADO,SUBMERCADO,CLASS}/INPUT/",
      "services/costar/MASTER/* (4 XLSX workbooks)",
    ],
    workflow:
      "Operator drops CoStar XLSX into the relevant INPUT/ folder. CLI sweeps, parses, normalises (ISO codes · period kinds · sha256 dedup · currency check), routes failures to staging, archives to old.*/, writes INGESTION_LOG row, audit-syncs to ai_agent_runs.",
    currentMode:
      "Manual Mode — operator uploads CoStar exports manually until CoStar subscription is economically justified and Phase 2.3.d.1 CLI ships",
    lastExecution: null,
    nextExecution: null,
    healthScore: 100,
    kpis: [
      { label: "Workbooks", value: "4", hint: "PAIS · MERCADOS · SUBMERCADOS · CLASS" },
      { label: "Pipelines", value: "4", hint: "Strictly separated by granularity" },
      { label: "Rows in MASTER", value: "0", hint: "Substrate ready · awaiting first manual upload" },
      { label: "Cost cap (planned)", value: "$0.10/d", hint: "Per ai_agents.config" },
    ],
    mockLogs: [
      { ts: NOW, level: "info", message: "Status: substrate live (v1.1 normalisation) · awaiting Phase 2.3.d.1 CLI" },
      { ts: "2026-05-11T09:30:00Z", level: "info", message: "Reason: operator uploads CoStar exports manually until subscription is justified" },
      { ts: TWO_HOURS_AGO, level: "info", message: "Workspace at services/costar/ — 4 masters generated (PAIS 39c · MERCADOS 40c · SUBMERCADOS 41c · CLASS 41c)" },
    ],
    roadmap: [
      { phase: "Phase 2.3.d.0", description: "Workspace + masters + schemas + 7 docs (substrate)", status: "shipped" },
      { phase: "Phase 2.3.d.1", description: "Python CLI pipeline (parser · normaliser · dedup · audit-sync)", status: "planned" },
      { phase: "Phase 2.3.d.2", description: "Monthly Vercel Cron sweeping operator inbox", status: "planned" },
      { phase: "Phase 4", description: "LLM-assisted normalisation + FX conversion via ECB rates", status: "planned" },
      { phase: "Phase 5", description: "XLSX → Supabase mirror (public.market_periods)", status: "planned" },
    ],
    infrastructureDeps: [
      "services/costar/ filesystem",
      "openpyxl",
      "Vercel Cron (Phase 2.3.d.2+)",
      "INGESTION_AUDIT_TOKEN env var",
    ],
    references: [
      { label: "Agent Charter", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/agents/costar-market-data-agent.md" },
      { label: "Workspace README", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/services/costar/README.md" },
    ],
  },

  compset_underwriting: {
    id: "compset_underwriting",
    name: "CompSet Underwriting Agent",
    shortName: "CompSet Underw.",
    tier: 2,
    status: "manual_mode",
    statusLabel: "Manual Mode",
    workspace: "services/compset/",
    purpose:
      "Generate underwriting-ready competitive intelligence for a SPECIFIC HOTEL. On-demand, hotel-specific, valuation-critical. Reads the market warehouse; writes per-hotel benchmark + positioning snapshots.",
    responsibilities: [
      "COMPSET_MASTER — subject + compset KPIs + MPI / ARI / RGI per period per target hotel",
      "HOTEL_POSITIONING_MASTER — forward underwriting assumptions per hotel snapshot",
      "Derive ADR / occupancy / RevPAR forward assumptions",
      "Compute valuation anchor (per-key) + cap rate + revenue multiple",
      "Confidence scoring + assumptions_basis + risks narrative",
      "Cross-link snapshots to public.valuations when consumed",
    ],
    integrations: [
      "services/costar/MASTER/* (read warehouse context)",
      "services/transactions/MASTER/* (read pipeline + transaction context)",
      "public.valuations (subject hotel metadata)",
      "public.market_news (risk flags via cross-link)",
      "services/compset/MASTER/* (write)",
    ],
    workflow:
      "Operator requests refresh for hotel X (deal-driven OR quarterly cron). Agent loads warehouse context · loads or builds compset · normalises subject KPIs · computes indices · derives forward assumptions · writes COMPSET row + POSITIONING snapshot · emits compset_snapshot_ready event.",
    currentMode:
      "Manual Mode — operator runs benchmarking manually until MVP stabilises and Phase 2.4.1 implementation ships",
    lastExecution: null,
    nextExecution: null,
    healthScore: 100,
    kpis: [
      { label: "Masters", value: "2", hint: "COMPSET_MASTER · HOTEL_POSITIONING_MASTER" },
      { label: "Active hotels (target)", value: "5", hint: "Portfolio compset hotels" },
      { label: "Snapshots persisted", value: "0", hint: "Substrate ready · awaiting Phase 2.4.1" },
      { label: "Cost cap (planned)", value: "$0.20/d", hint: "Per ai_agents.config (Tier 2)" },
    ],
    mockLogs: [
      { ts: NOW, level: "info", message: "Status: substrate live · awaiting Phase 2.4.1 agent implementation" },
      { ts: "2026-05-11T09:30:00Z", level: "info", message: "Reason: underwriting workflows stabilising; operator runs benchmarking manually for now" },
      { ts: TWO_HOURS_AGO, level: "info", message: "Workspace at services/compset/ — 2 masters generated (COMPSET 48c · POSITIONING 55c)" },
    ],
    roadmap: [
      { phase: "Phase 2.4.0", description: "Workspace + 2 masters + schemas + 2 agent docs (substrate)", status: "shipped" },
      { phase: "Phase 2.4.1", description: "TS agent + cloud route + operator CLI (cross-workspace read)", status: "planned" },
      { phase: "Phase 2.4.2", description: "Quarterly per-hotel refresh cron", status: "planned" },
      { phase: "Phase 4", description: "LLM-assisted assumption derivation + narrative generation from market_news", status: "planned" },
      { phase: "Phase 5", description: "XLSX → Supabase (public.compset_periods + public.hotel_positioning_snapshots)", status: "planned" },
      { phase: "Phase 6", description: "Underwriting Engine reads HOTEL_POSITIONING_MASTER directly to seed valuations", status: "planned" },
    ],
    infrastructureDeps: [
      "services/compset/ filesystem",
      "services/costar/ (warehouse — read-only)",
      "Supabase public.valuations (read-only)",
      "INGESTION_AUDIT_TOKEN env var",
    ],
    references: [
      { label: "Agent Charter", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/agents/compset-underwriting-agent.md" },
      { label: "Workspace README", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/services/compset/README.md" },
    ],
  },

  data_ingestion: {
    id: "data_ingestion",
    name: "Data Ingestion Agent",
    shortName: "Data Ingestion",
    tier: 1,
    status: "healthy",
    statusLabel: "Healthy",
    workspace: "services/transactions/",
    purpose:
      "Operational ingestion of institutional transactions + projects datasets. Operator-driven CLI · cloud-runtime endpoint · audit-chain unified.",
    responsibilities: [
      "HOTEL_TRANSACCIONES_MASTER — institutional deals corpus",
      "HOTEL_PROYECTOS_MASTER — pipeline + projects corpus",
      "URL canonicalisation + sha256 dedup",
      "Geographic + currency + entity normalisation",
      "Audit-sync to ai_agent_runs via /api/agents/data-ingestion-summary",
    ],
    integrations: [
      "services/transactions/INPUT_*/ (operator drops)",
      "services/transactions/MASTER/* (write)",
      "Supabase public.uploaded_excels",
      "Cloud cross-reference via INGESTION_AUDIT_TOKEN",
    ],
    workflow:
      "Operator drops XLSX/CSV into INPUT_TRANSACCIONES/ or INPUT_PROYECTOS/. CLI sweeps · parses · normalises · dedups · routes failures + reviews · archives to old.*/ · writes INGESTION_LOG row · POSTs audit summary to cloud.",
    currentMode: "Beta · operator-triggered + on-demand",
    lastExecution: "2026-05-10T16:42:18Z",
    nextExecution: null,
    healthScore: 92,
    kpis: [
      { label: "Workspaces owned", value: "1", hint: "services/transactions/ (compset moved to its own agent)" },
      { label: "Rows in MASTER", value: "0", hint: "Awaiting first production drop" },
      { label: "Success rate (smoke)", value: "100%", hint: "9-row fixture: 5/1/2/1 routing" },
      { label: "Daily cost", value: "$0.00", hint: "Cap $0.10 — no LLM" },
    ],
    mockLogs: [
      { ts: "2026-05-10T16:42:18Z", level: "ok", message: "smoke_test.csv: 5 ingested · 1 skip · 2 review · 1 failed" },
      { ts: "2026-05-10T16:42:15Z", level: "info", message: "audit-sync POST → /api/agents/data-ingestion-summary · receipt ai_agent_run=c0c4ebf8" },
      { ts: "2026-05-10T16:42:08Z", level: "ok", message: "MASTER saved (.tmp + rename) · +5 canonical rows" },
      { ts: "2026-05-10T16:42:05Z", level: "warn", message: "smoke_test row 8: non_eur_currency:GBP → routed to staging/review" },
    ],
    roadmap: [
      { phase: "Phase 2.3.a", description: "Workspace + masters + schemas + workflow docs", status: "shipped" },
      { phase: "Phase 2.3.b", description: "Python CLI pipeline (full sweep / parse / route / archive)", status: "shipped" },
      { phase: "Phase 2.3.c", description: "Audit-chain unification (cloud endpoint + audit_sync module)", status: "shipped" },
      { phase: "Phase 4", description: "LLM-assisted entity resolution (investor + operator UID resolution)", status: "planned" },
      { phase: "Phase 5", description: "XLSX → Supabase (public.hotel_transactions + public.hotel_projects)", status: "planned" },
    ],
    infrastructureDeps: [
      "services/transactions/ filesystem",
      "openpyxl",
      "Cloud cross-ref via /api/agents/data-ingestion-summary",
      "INGESTION_AUDIT_TOKEN env var",
    ],
    references: [
      { label: "CLI", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/services/transactions/scripts/README.md" },
      { label: "Audit chain", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/apps/web/src/app/api/agents/data-ingestion-summary/route.ts" },
    ],
  },

  qa_monitoring: {
    id: "qa_monitoring",
    name: "QA / Monitoring Agent",
    shortName: "QA Monitoring",
    tier: 1,
    status: "monitoring",
    statusLabel: "Monitoring",
    workspace: null,
    purpose:
      "Hourly read-only probes across the platform. Detect ingestion failures · agent run failures · stuck approvals · cost-cap headroom. Escalate via Resend with 15-min cooldown.",
    responsibilities: [
      "Hourly snapshot of news_ingestion_runs failures (last 24h)",
      "Hourly snapshot of ai_agent_runs failures (last 24h)",
      "Stuck-approval detection (ai_human_review pending > 24h)",
      "Per-agent cost cap headroom (80% warning · 100% critical)",
      "Resend escalation via monitoring.escalate.email tool",
    ],
    integrations: [
      "Supabase (ai_agent_runs · ai_events · ai_human_review · news_ingestion_runs — read)",
      "Resend (monitoring.escalate.email — env-pinned recipients)",
      "ai_memory (own scope — health_snapshot:<iso>)",
    ],
    workflow:
      "Cron at 0 * * * * UTC takes a snapshot, derives escalations from thresholds, applies 15-min cooldown via ai_memory check, emits Resend mails for tripped thresholds.",
    currentMode: "Autonomous · hourly probes",
    lastExecution: NOW,
    nextExecution: NEXT_HOUR,
    healthScore: 98,
    kpis: [
      { label: "Probes (24h)", value: "24", hint: "Hourly cron firings" },
      { label: "Escalations (24h)", value: "0", hint: "Cooldown protected" },
      { label: "Severity ladder", value: "info / warn / critical", hint: "Per threshold" },
      { label: "Daily cost", value: "$0.00", hint: "Cap $0.05 — pure SQL, no LLM" },
    ],
    mockLogs: [
      { ts: NOW, level: "ok", message: "Hourly snapshot · 0 ingestion failures · 0 agent failures · 0 stuck approvals" },
      { ts: HOUR_AGO, level: "ok", message: "Cost-cap headroom: market_intel 0% · data_ingestion 0% · qa_monitoring 0%" },
      { ts: TWO_HOURS_AGO, level: "info", message: "ai_memory snapshot persisted · scope=agent_global · importance=0.6" },
    ],
    roadmap: [
      { phase: "Phase 2", description: "Cron live · severity ladder · Resend escalation", status: "shipped" },
      { phase: "Phase 3", description: "Reactive subscription on health_check_failed events", status: "planned" },
      { phase: "Phase 4", description: "Anomaly detection — rolling 7d baselines per agent", status: "planned" },
    ],
    infrastructureDeps: ["Vercel Cron (0 * * * * UTC)", "Supabase", "Resend"],
    references: [
      { label: "Source", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/apps/web/src/lib/ai-agents/agents/qa-monitoring.ts" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TIER 3 — STRATEGIC (planned)
  // ─────────────────────────────────────────────────────────────────────────
  cfo: {
    id: "cfo",
    name: "CFO Agent",
    shortName: "CFO",
    tier: 3,
    status: "standby",
    statusLabel: "Standby",
    workspace: null,
    purpose:
      "Financial operations agent. Reconciles revenue (Stripe · Holded · banking), monitors cloud costs (Vercel · Supabase · Resend), surfaces variance against budget.",
    responsibilities: [
      "Stripe charge / refund reconciliation",
      "Holded / Xero invoice + cash position sync",
      "Banking transaction categorisation",
      "Cloud cost forecasting (Vercel + Supabase + Resend)",
      "Monthly P&L draft",
    ],
    integrations: ["Stripe", "Holded", "Xero (planned)", "Banking APIs", "Vercel Cost API", "Supabase Usage API"],
    workflow:
      "Activates when revenue + multiple payment surfaces justify operational overhead. Today: standby — operator + spreadsheet faster pre-PMF.",
    currentMode: "Standby — Phase 6 activation",
    lastExecution: null,
    nextExecution: null,
    healthScore: 100,
    kpis: [
      { label: "Activation phase", value: "Phase 6", hint: "Requires revenue + multiple payment sources" },
      { label: "Reconciliation accuracy target", value: "100%", hint: "Any error blocks promotion to active" },
      { label: "Integrations planned", value: "5+", hint: "Stripe · Holded · Xero · banking · cloud cost APIs" },
      { label: "Cost cap (planned)", value: "TBD", hint: "Tier 3 cap raised when activated" },
    ],
    mockLogs: [
      { ts: NOW, level: "info", message: "Status: standby · awaiting Phase 6 activation" },
      { ts: TWO_HOURS_AGO, level: "info", message: "Pre-PMF; operator + spreadsheet is the right alternative today" },
    ],
    roadmap: [
      { phase: "Phase 6", description: "Activate when revenue + payment surfaces exist", status: "planned" },
    ],
    infrastructureDeps: ["Stripe", "Holded / Xero", "Banking integration", "Vercel + Supabase usage APIs"],
    references: [
      { label: "Roadmap", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/ai-agents/ai-agent-roadmap.md" },
    ],
  },

  cmo: {
    id: "cmo",
    name: "CMO Agent",
    shortName: "CMO",
    tier: 3,
    status: "standby",
    statusLabel: "Standby",
    workspace: null,
    purpose:
      "Brand voice + content cadence agent. Drafts LinkedIn / X posts grounded in market_news + valuation outcomes. Outbound goes through human approval gate.",
    responsibilities: [
      "Weekly content calendar draft",
      "LinkedIn / X / Buffer / Notion drafts",
      "Cross-link drafts to market_news + valuations for grounding",
      "Performance attribution per post",
    ],
    integrations: ["LinkedIn (planned)", "X (planned)", "Buffer (planned)", "Notion (planned)"],
    workflow:
      "Activates when brand voice + content cadence are defined. Today: standby — operator's authentic voice > LLM-drafted content pre-PMF.",
    currentMode: "Standby — Phase 6 activation",
    lastExecution: null,
    nextExecution: null,
    healthScore: 100,
    kpis: [
      { label: "Activation phase", value: "Phase 6", hint: "Requires defined brand voice + cadence" },
      { label: "Draft approval target", value: "≥ 85%", hint: "On first review" },
      { label: "Channels planned", value: "4", hint: "LinkedIn · X · Buffer · Notion" },
      { label: "Cost cap (planned)", value: "TBD", hint: "Tier 3" },
    ],
    mockLogs: [
      { ts: NOW, level: "info", message: "Status: standby · awaiting Phase 6 activation" },
      { ts: TWO_HOURS_AGO, level: "info", message: "Pre-PMF; operator voice is the authentic substitute today" },
    ],
    roadmap: [
      { phase: "Phase 6", description: "Activate when brand voice + content cadence proven", status: "planned" },
    ],
    infrastructureDeps: ["LinkedIn API", "X API", "Buffer / Notion", "ai_human_review (gate every outbound)"],
    references: [
      { label: "Roadmap", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/ai-agents/ai-agent-roadmap.md" },
    ],
  },

  customer_success: {
    id: "customer_success",
    name: "Customer Success Agent",
    shortName: "Customer Success",
    tier: 3,
    status: "standby",
    statusLabel: "Standby",
    workspace: null,
    purpose:
      "Customer ticket triage + first-line resolution. Routes WhatsApp / Intercom inbound, drafts responses grounded in product docs, escalates to human when ambiguous.",
    responsibilities: [
      "Inbound triage (WhatsApp Business · Intercom · email)",
      "First-response drafting grounded in /docs",
      "Escalation routing to deal team / engineering / billing",
      "Resolution-rate tracking",
    ],
    integrations: ["WhatsApp Business (planned)", "Intercom (planned)", "Resend (for replies)"],
    workflow:
      "Activates when customer volume justifies the operational overhead. Today: standby — founders should be doing CS themselves to learn.",
    currentMode: "Standby — Phase 6 activation",
    lastExecution: null,
    nextExecution: null,
    healthScore: 100,
    kpis: [
      { label: "Activation phase", value: "Phase 6", hint: "Requires customer volume" },
      { label: "Resolution target", value: "≥ 70%", hint: "Without escalation" },
      { label: "Channels planned", value: "3", hint: "WhatsApp · Intercom · email" },
      { label: "Cost cap (planned)", value: "TBD", hint: "Tier 3" },
    ],
    mockLogs: [
      { ts: NOW, level: "info", message: "Status: standby · awaiting Phase 6 activation" },
      { ts: TWO_HOURS_AGO, level: "info", message: "Pre-PMF; founders should be doing CS themselves to learn" },
    ],
    roadmap: [
      { phase: "Phase 6", description: "Activate when customer volume justifies overhead", status: "planned" },
    ],
    infrastructureDeps: ["WhatsApp Business API", "Intercom", "Resend"],
    references: [
      { label: "Roadmap", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/ai-agents/ai-agent-roadmap.md" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TIER 2 — STRATEGIC MOAT (planned)
  // ─────────────────────────────────────────────────────────────────────────
  crm_dealflow: {
    id: "crm_dealflow",
    name: "CRM / Dealflow Agent",
    shortName: "CRM",
    tier: 2,
    status: "standby",
    statusLabel: "Standby",
    workspace: null,
    purpose:
      "Dossier maintenance per investor + operator. Alerts subscribers when matching transactions land. Pipeline stage transitions inferred from market_news + transactions.",
    responsibilities: [
      "Per-investor dossier refresh (top-50 institutional players)",
      "Per-operator dossier refresh (top-50 brands)",
      "Alert dispatch via Resend on hotel_transactions inserts",
      "Pipeline-stage tracking + transition detection",
      "Tier-gated alerts (free 30d / pro 12m / premium full+alerts)",
    ],
    integrations: ["Supabase (investors · operators · subscriptions)", "Resend", "Stripe (Phase 6+ — tier billing)"],
    workflow:
      "Activates after CRM surface is built + populated. Reactive subscriber on hotel_transactions insert → match against subscriptions → dispatch alerts < 5min.",
    currentMode: "Standby — Phase 5 activation",
    lastExecution: null,
    nextExecution: null,
    healthScore: 100,
    kpis: [
      { label: "Activation phase", value: "Phase 5", hint: "Requires CRM surface populated with real data" },
      { label: "Dossier freshness target", value: "< 7d", hint: "For top-50 investors" },
      { label: "Alert latency target", value: "< 5 min", hint: "From hotel_transactions insert" },
      { label: "Cost cap (planned)", value: "TBD", hint: "Tier 2" },
    ],
    mockLogs: [
      { ts: NOW, level: "info", message: "Status: standby · awaiting Phase 5 activation" },
      { ts: TWO_HOURS_AGO, level: "info", message: "Substrate ready: public.investors · operators · subscriptions schemas exist" },
    ],
    roadmap: [
      { phase: "Phase 5", description: "CRM Agent + alerts engine + tier gating + dossier surfaces", status: "planned" },
    ],
    infrastructureDeps: ["Supabase Realtime (hotel_transactions)", "Resend", "Stripe (billing)"],
    references: [
      { label: "Roadmap", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/ai-agents/ai-agent-roadmap.md" },
    ],
  },
};

/**
 * Orbit ordering — visual placement around the CEO at the center.
 * Returns the 9 operational agents in a stable orbital order (Tier 1 first,
 * then Tier 2, then Tier 3) so the orbital layout is institutional + deterministic.
 */
export const ORBIT_ORDER: AgentId[] = [
  "market_intelligence",
  "costar_market_data",
  "compset_underwriting",
  "data_ingestion",
  "qa_monitoring",
  "crm_dealflow",
  "cfo",
  "cmo",
  "customer_success",
];

/** All agents as an ordered list — CEO first, then orbital order */
export const ALL_AGENTS: AgentDescriptor[] = [
  AGENT_REGISTRY.ceo,
  ...ORBIT_ORDER.map((id) => AGENT_REGISTRY[id]),
];

export function getAgent(id: AgentId): AgentDescriptor | undefined {
  return AGENT_REGISTRY[id];
}

export function isAgentId(s: string): s is AgentId {
  return s in AGENT_REGISTRY;
}
