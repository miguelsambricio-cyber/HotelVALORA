import type { AgentDescriptor, AgentId } from "./types";

/**
 * Mock registry for the HOTELVALORA AI Operations Center.
 *
 * The data here mirrors `public.ai_agents` schema. Phase 3+ replaces these
 * constants with a Supabase read + realtime subscription on agent runs.
 *
 * Display naming follows the institutional roster decided in
 * `docs/architecture/market-vs-underwriting-separation.md`:
 *   - costar_market_data   → "COSTAR Admin Agent"
 *   - compset_underwriting → "CompSet Builder Agent"
 *   - underwriting         → "Underwriting Agent" (returned to orbit; Phase 6)
 *   - crm_dealflow         → kept in registry for backward compat; removed from ORBIT_ORDER
 *
 * Initial states (per current operational reality, 2026-05-11):
 *   CEO              → active        (Tier 0 supervisor, planned activation Phase 3)
 *   Market Intel     → healthy       (Tier 1, beta — Phase 2 cron live)
 *   Data Ingestion   → healthy       (Tier 1, beta — transactions CLI live)
 *   COSTAR Admin     → manual_mode   ("Configured but not operational yet" per user spec)
 *   CompSet Builder  → manual_mode   ("Configured but not operational yet" per user spec)
 *   QA / Monitoring  → monitoring    (Tier 1, beta — hourly probes)
 *   Underwriting     → standby       (Tier 2 — Phase 6)
 *   CFO / CMO / CS   → standby       (Tier 3 — pre-PMF, planned)
 *   CRM / Dealflow   → standby       (Tier 2 — Phase 5, hidden from orbit)
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
    mission:
      "The institutional control point of the AI Operations Layer. Monitors all agents, verifies operational continuity, detects failures, coordinates escalations, supervises infrastructure, and maintains system integrity. The CEO Agent never moves money, sends communications, or writes to operational tables — it watches, reports, and pulls the right human into the loop when something drifts.",
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
    currentMode: "Planned · monitoring fixture (activates Phase 3)",
    lastExecution: HOUR_AGO,
    nextExecution: NEXT_HOUR,
    healthScore: 96,
    successRate: "—",
    cronSchedule: "0 * * * * UTC + 0 6 * * * UTC (Phase 3)",
    linkedSystems: ["Supabase", "Vercel API", "GitHub API", "Resend", "All workspaces (read-only)"],
    blockers: ["Phase 3 activation pending — requires Tier 1 telemetry stability over 30 days"],
    futureIntegrations: [
      "Phase 3 — pgvector embedding-similarity ranking on ai_memory",
      "Phase 4 — LLM-assisted daily strategic review",
      "Phase 4 — Circuit-breaker pattern (pause misbehaving agents)",
    ],
    kpis: [
      { label: "Agents in fleet", value: "10", hint: "1 supervisor + 9 operational (CRM hidden from orbit)" },
      { label: "Active beta+", value: "3", hint: "Market Intel · Data Ingestion · QA" },
      { label: "Stuck approvals", value: "0", hint: "Pending > 24h" },
      { label: "Daily fleet spend", value: "$0.00", hint: "of $0.35 aggregate cap" },
    ],
    mockLogs: [
      { ts: NOW, level: "ok", message: "Hourly health snapshot persisted (3 agents green · 2 manual · 5 standby)" },
      { ts: HOUR_AGO, level: "info", message: "No fleet failures last 24h" },
      { ts: TWO_HOURS_AGO, level: "info", message: "ai_human_review queue empty" },
      { ts: TWO_HOURS_AGO, level: "info", message: "Supabase advisors: 0 critical findings" },
    ],
    roadmap: [
      { phase: "Phase 3", description: "Activate ceo agent — runtime + hourly + daily crons + reactive subscribers", status: "planned" },
      { phase: "Phase 4", description: "LLM-assisted strategic review + circuit-breaker pattern", status: "planned" },
    ],
    infrastructureDeps: ["Vercel Cron", "Supabase Realtime (Phase 3)", "Resend"],
    references: [
      { label: "Charter", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/agents/ceo-agent-supervision-layer.md" },
      { label: "Architecture", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/architecture/market-vs-underwriting-separation.md" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TIER 1 — OPERATIONAL
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
    mission:
      "Maintain a continuous, deduplicated, institutional-quality hospitality intelligence corpus — the dataset advantage that compounds every other capability (Underwriting, Library, Maps, future CRM). Slow accumulation today; AI summaries + opportunity scoring in Phase 4.",
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
    currentMode: "Autonomous · daily cron",
    lastExecution: "2026-05-11T07:48:00Z",
    nextExecution: TOMORROW_MORNING,
    healthScore: 94,
    successRate: "98.4%",
    cronSchedule: "48 7 * * * UTC + 20 8 * * * UTC",
    linkedSystems: ["public.market_news", "news_tags", "news_ingestion_runs", "ai_memory (agent_global)"],
    blockers: [],
    futureIntegrations: [
      "Phase 3 — Reactive subscription on news_ingested",
      "Phase 4 — LLM summaries + opportunity scoring",
      "Phase 4 — pgvector embeddings for similarity search",
    ],
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
    name: "COSTAR & Hotel Reference Agent",
    shortName: "Hotel Ref",
    tier: 1,
    status: "manual_mode",
    statusLabel: "Configured · Manual",
    workspace: "services/costar/",
    purpose:
      "Own two datasets sourced from CoStar: Market Performance (country/market/submarket KPIs) AND Hotel-by-Market Inventory (per-hotel reference data). The hotel registry is the institutional reference backbone for compsets, valuations, benchmarks, and reports — its integrity is load-bearing.",
    mission:
      "Maintain the institutional hospitality reference layer for HOTELVALORA. Three granularities of market KPIs (occupancy · ADR · RevPAR · supply · demand · pipeline) PLUS the hotel-by-market inventory (name · brand · operator · facilities · category · rooms · geo · score). Every downstream surface — compset selection, valuation, benchmarking, report generation — ultimately resolves to a hotel_id this agent vouches for.",
    responsibilities: [
      "COSTAR_MASTER_PAIS — country market metrics + macro context (GDP · inflation · tourism)",
      "COSTAR_MASTER_MERCADOS — market metrics + revpar_index_vs_country + seasonality",
      "COSTAR_MASTER_SUBMERCADOS — submarket KPIs + chain_scale + segment_type axes",
      "COSTAR_MASTER_HOTELES_POR_MERCADO — hotel inventory (Dataset B) · reference backbone",
      "Hotel-reference integrity: dedup detection · missing-field flagging · stale-data monitoring",
      "Compset cross-references: validate that every compset target hotel_id exists in inventory",
      "Reconciliation queue: surface suspicious changes + hallucinated attributes for operator review",
      "Pipeline + openings + inventory tracking per granularity",
    ],
    integrations: [
      "CoStar Hospitality Export (Tier A source)",
      "STR Global (Tier A)",
      "Kalibri Labs (Tier B)",
      "services/costar/{PAIS,MERCADO,SUBMERCADO}/INPUT/ (Dataset A)",
      "services/costar/HOTELESperMARKET/INPUT/ (Dataset B)",
      "services/costar/MASTER/* (4 XLSX workbooks · hotels master ships in v1.2)",
      "/user/admin/hotels — operator read + edit surface (scaffolded 2026-05-14)",
    ],
    workflow:
      "Operator drops CoStar XLSX into the matching INPUT/ folder (market-data or hotel-inventory). CLI sweeps, parses, normalises (ISO codes · period kinds · sha256 dedup · currency check · hotel_id canonicalisation), routes failures to staging, archives to old.*/, writes INGESTION_LOG row, audit-syncs to ai_agent_runs. Hotel-inventory rows are validated against the compset target list and any orphan hotel_id is flagged in the reconciliation queue.",
    currentMode:
      "Configured · 2026-05-14 Madrid drop received (market-data + hotel-inventory + compset + transactions). Manual uploads during MVP; CoStar subscription not yet economically justified",
    lastExecution: null,
    nextExecution: null,
    healthScore: 100,
    successRate: "—",
    cronSchedule: null,
    linkedSystems: [
      "services/costar/MASTER/*",
      "Tier-A: CoStar / STR",
      "Tier-B: Kalibri Labs",
      "INGESTION_AUDIT_TOKEN (env)",
      "/api/agents/data-ingestion-summary",
    ],
    blockers: [
      "CoStar subscription cost not yet justified by MVP volume",
      "Phase 2.3.d.1 Python CLI pipeline not yet shipped",
    ],
    futureIntegrations: [
      "Phase 2.3.d.1 — Python CLI pipeline (4 granularities)",
      "Phase 2.3.d.2 — Monthly Vercel Cron sweeping operator inbox",
      "Phase 4 — LLM-assisted normalisation + ECB FX rates",
      "Phase 5 — XLSX → Supabase (public.market_periods)",
    ],
    kpis: [
      { label: "Datasets", value: "2", hint: "Market Performance + Hotel Inventory" },
      { label: "Streams", value: "4", hint: "PAIS · MERCADO · SUBMERCADO · HOTELESperMARKET" },
      { label: "Rows in MASTER", value: "—", hint: "Madrid drop ingested 2026-05-14 · waiting build_masters v1.2" },
      { label: "Cost cap (planned)", value: "$0.10/d", hint: "Per ai_agents.config" },
    ],
    mockLogs: [
      { ts: NOW, level: "info", message: "2026-05-14 · Madrid drop received: market-data (PAIS/MERCADO/SUBMERCADO) + hotel-inventory (HOTELESperMARKET) + compset + transactions" },
      { ts: NOW, level: "info", message: "CLASS granularity retired — chain_scale becomes attribute on hotel records" },
      { ts: HOUR_AGO, level: "info", message: "Reconciliation queue: 0 entries · awaiting build_masters v1.2 to populate" },
      { ts: TWO_HOURS_AGO, level: "info", message: "Workspace at services/costar/ — 4 streams active · hotels master pending generator bump" },
    ],
    roadmap: [
      { phase: "Phase 2.3.d.0", description: "Workspace + masters + schemas + 7 docs (substrate)", status: "shipped" },
      { phase: "Phase 2.3.d.1", description: "Python CLI pipeline (parser · normaliser · dedup · audit-sync)", status: "planned" },
      { phase: "Phase 2.3.d.2", description: "build_masters v1.2 · retire CLASS · add HOTELESperMARKET master", status: "planned" },
      { phase: "Phase 2.3.d.3", description: "Reconciliation queue surface in /user/admin/hotels", status: "planned" },
      { phase: "Phase 2.3.d.4", description: "Monthly Vercel Cron sweeping operator inbox", status: "planned" },
      { phase: "Phase 4", description: "LLM-assisted normalisation + FX conversion via ECB rates", status: "planned" },
      { phase: "Phase 5", description: "XLSX → Supabase mirror (market_periods + hotels_by_market tables)", status: "planned" },
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
    name: "CompSet Builder Agent",
    shortName: "CompSet Builder",
    tier: 2,
    status: "manual_mode",
    statusLabel: "Configured · Manual",
    workspace: "services/compset/",
    purpose:
      "Generate underwriting-ready competitive intelligence for a SPECIFIC HOTEL. On-demand, hotel-specific, valuation-critical. Reads the market warehouse; writes per-hotel benchmark + positioning snapshots.",
    mission:
      "Build per-hotel compsets + positioning snapshots — the bridge between the macro warehouse and the per-asset underwriting verdict. MPI / ARI / RGI + forward assumptions + valuation anchor + risks. Every institutional valuation HOTELVALORA produces rests on a snapshot from this agent.",
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
      "Configured but not operational yet — operator runs benchmarking manually until underwriting workflows stabilise",
    lastExecution: null,
    nextExecution: null,
    healthScore: 100,
    successRate: "—",
    cronSchedule: null,
    linkedSystems: [
      "services/compset/MASTER/*",
      "services/costar/MASTER/* (read)",
      "services/transactions/MASTER/* (read)",
      "public.valuations (read)",
    ],
    blockers: [
      "Underwriting MVP not yet stabilised",
      "Phase 2.4.1 agent implementation not yet shipped",
    ],
    futureIntegrations: [
      "Phase 2.4.1 — TS agent + cloud route + operator CLI",
      "Phase 2.4.2 — Quarterly per-hotel refresh cron",
      "Phase 4 — LLM-assisted assumption derivation + risk narrative from market_news",
      "Phase 5 — XLSX → Supabase (public.compset_periods + public.hotel_positioning_snapshots)",
    ],
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
      { phase: "Phase 4", description: "LLM-assisted assumption derivation + narrative from market_news", status: "planned" },
      { phase: "Phase 5", description: "XLSX → Supabase (public.compset_periods + public.hotel_positioning_snapshots)", status: "planned" },
      { phase: "Phase 6", description: "Underwriting Engine reads HOTEL_POSITIONING_MASTER directly", status: "planned" },
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
    mission:
      "Own the ingestion lifecycle for institutional transactions + projects datasets at services/transactions/. Operator-driven today (Python CLI + audit-sync); fully autonomous downstream when entity resolution + Supabase mirror land. Append-only · sha256 dedup · staging review · audit trail.",
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
    successRate: "100%",
    cronSchedule: null,
    linkedSystems: [
      "services/transactions/MASTER/*",
      "public.ai_agent_runs",
      "public.uploaded_excels",
      "/api/agents/data-ingestion-summary",
    ],
    blockers: [],
    futureIntegrations: [
      "Phase 4 — LLM-assisted entity resolution (investor + operator UID resolution)",
      "Phase 5 — XLSX → Supabase mirror (public.hotel_transactions + public.hotel_projects)",
    ],
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
      { phase: "Phase 4", description: "LLM-assisted entity resolution", status: "planned" },
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
    mission:
      "The platform's heartbeat watcher. Every hour, take a read-only snapshot of every agent's runs, every workspace's ingestion runs, every approval queue, every cost cap. Surface anomalies to the operator before they cascade.",
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
    successRate: "100%",
    cronSchedule: "0 * * * * UTC",
    linkedSystems: ["Supabase (ai_*)", "Resend", "ai_memory (agent_global)"],
    blockers: [],
    futureIntegrations: [
      "Phase 3 — Reactive subscription on health_check_failed events",
      "Phase 4 — Anomaly detection (rolling 7d baselines per agent)",
    ],
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
  // TIER 2 — STRATEGIC MOAT
  // ─────────────────────────────────────────────────────────────────────────
  underwriting: {
    id: "underwriting",
    name: "Underwriting Agent",
    shortName: "Underwriting",
    tier: 2,
    status: "standby",
    statusLabel: "Standby",
    workspace: null,
    purpose:
      "Produces the institutional valuation per hotel using DCF + comparable transactions + CompSet positioning. The moat of the platform. Today: human operator drives underwriting; agent activates in Phase 6.",
    mission:
      "Generate the institutional valuation for every hotel HOTELVALORA underwrites. Reads CompSet positioning + comparable transactions + market context. Proposes a valuation range with sensitivity. Operator approves; agent writes to public.valuations.",
    responsibilities: [
      "DCF valuation per asset (10-year hold)",
      "Cap-rate selection from comp transactions + class context",
      "Sensitivity analysis (ADR ± / occupancy ± / cap-rate ±)",
      "P&L line items (room revenue · GOP · NOI)",
      "Institutional report generation per valuation",
    ],
    integrations: [
      "services/compset/HOTEL_POSITIONING_MASTER (read)",
      "services/transactions/HOTEL_TRANSACCIONES_MASTER (read)",
      "services/costar/MASTER/* (read)",
      "public.valuations (write — human-approval gated)",
    ],
    workflow:
      "Operator drafts the deal context (asset metadata, intended structure). Agent fetches CompSet positioning + comparable transactions + market context. Agent proposes a valuation range with sensitivity bands. Operator approves; agent writes the final row to public.valuations + emits valuation_published event.",
    currentMode: "Standby — operator drives underwriting today",
    lastExecution: null,
    nextExecution: null,
    healthScore: 100,
    successRate: "—",
    cronSchedule: null,
    linkedSystems: [
      "public.valuations",
      "services/compset/MASTER/*",
      "services/transactions/MASTER/*",
      "services/costar/MASTER/*",
    ],
    blockers: [
      "Requires CompSet Builder active",
      "Requires CoStar Admin warehouse hydrated",
      "Requires transactions corpus seeded",
      "Phase 6 activation pending",
    ],
    futureIntegrations: [
      "Phase 6 — Agent implementation + sensitivity engine + DCF model",
      "Phase 7 — LLM-assisted valuation narrative + automated risk flags",
      "Phase 7 — Report Generation Agent renders institutional PDF per valuation",
    ],
    kpis: [
      { label: "Activation phase", value: "Phase 6", hint: "Requires Tier-1 + Tier-2 dependencies stable" },
      { label: "Memo acceptance target", value: "≥ 80%", hint: "On first generation" },
      { label: "Manual correction target", value: "≤ 15%", hint: "Per memo" },
      { label: "Cost cap (planned)", value: "$1.00/d", hint: "Tier 2 · LLM-bearing" },
    ],
    mockLogs: [
      { ts: NOW, level: "info", message: "Status: standby · operator drives underwriting today" },
      { ts: TWO_HOURS_AGO, level: "info", message: "Substrate ready: public.valuations + 3 institutional masters" },
    ],
    roadmap: [
      { phase: "Phase 6", description: "Agent implementation + DCF model + sensitivity engine", status: "planned" },
      { phase: "Phase 7", description: "LLM-assisted narrative + Report Generation Agent integration", status: "planned" },
    ],
    infrastructureDeps: [
      "Supabase (public.valuations)",
      "All three institutional masters (services/{transactions,costar,compset}/)",
    ],
    references: [
      { label: "Roadmap", href: "https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/ai-agents/ai-agent-roadmap.md" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TIER 3 — STRATEGIC (planned, pre-PMF)
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
    mission:
      "Own platform financial reconciliation end-to-end — Stripe charges, Holded invoices, banking transactions, cloud spend forecasting, monthly P&L draft. Activates when revenue + multiple payment surfaces justify the operational overhead.",
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
    successRate: "—",
    cronSchedule: null,
    linkedSystems: ["Stripe", "Holded / Xero", "Banking", "Vercel + Supabase usage APIs"],
    blockers: ["Pre-PMF — operator + spreadsheet faster", "Phase 6 activation pending"],
    futureIntegrations: [
      "Phase 6 — Stripe + Holded sync + monthly P&L",
      "Phase 7 — Anomaly detection on cloud cost",
    ],
    kpis: [
      { label: "Activation phase", value: "Phase 6", hint: "Requires revenue + multiple payment sources" },
      { label: "Reconciliation accuracy", value: "100%", hint: "Any error blocks promotion to active" },
      { label: "Integrations planned", value: "5+", hint: "Stripe · Holded · Xero · banking · cloud cost APIs" },
      { label: "Cost cap (planned)", value: "TBD", hint: "Tier 3 cap raised at activation" },
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
    mission:
      "Maintain HOTELVALORA's institutional voice across LinkedIn / X / Notion. Drafts grounded in actual platform data (market_news + valuation outcomes), never speculative. Every outbound goes through human approval — the agent drafts; the operator publishes.",
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
    successRate: "—",
    cronSchedule: null,
    linkedSystems: ["LinkedIn API (planned)", "X API (planned)", "Buffer / Notion", "ai_human_review (gate every outbound)"],
    blockers: ["Pre-PMF — operator voice is the authentic substitute", "Brand voice + cadence not yet defined"],
    futureIntegrations: [
      "Phase 6 — Content calendar + LinkedIn drafts (human-approval gated)",
      "Phase 7 — Performance attribution per post",
    ],
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
    name: "Customer Support Agent",
    shortName: "Customer Support",
    tier: 3,
    status: "standby",
    statusLabel: "Standby",
    workspace: null,
    purpose:
      "Customer ticket triage + first-line resolution. Routes WhatsApp / Intercom inbound, drafts responses grounded in product docs, escalates to human when ambiguous.",
    mission:
      "First-line institutional support. Triages WhatsApp / Intercom / email inbound, drafts grounded responses from product docs, escalates when ambiguous. Always under human supervision — the agent helps the human; it doesn't replace them.",
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
    successRate: "—",
    cronSchedule: null,
    linkedSystems: ["WhatsApp Business API (planned)", "Intercom (planned)", "Resend"],
    blockers: ["Pre-PMF — founders should do CS themselves to learn", "Phase 6 activation pending"],
    futureIntegrations: [
      "Phase 6 — Multi-channel triage",
      "Phase 7 — Resolution-rate tracking + auto-categorisation",
    ],
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

  // Kept in registry for backward compat with the ai_agent_id DB enum.
  // Hidden from ORBIT_ORDER — the institutional orbital roster is 9 agents
  // (Market Intel, Data Ingestion, COSTAR Admin, CompSet Builder, QA, CFO,
  //  CMO, Customer Support, Underwriting) per the user-facing spec.
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
    mission:
      "Hidden from the institutional orbital roster — kept registered for DB enum backward compatibility. Activates in Phase 5 alongside the CRM surface; until then this agent is invisible in the operator UI.",
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
    currentMode: "Hidden from orbit · Phase 5 activation",
    lastExecution: null,
    nextExecution: null,
    healthScore: 100,
    successRate: "—",
    cronSchedule: null,
    linkedSystems: ["public.investors", "public.operators", "public.subscriptions", "Resend"],
    blockers: ["CRM surface not yet populated", "Phase 5 activation pending"],
    futureIntegrations: [
      "Phase 5 — CRM Agent + alerts engine + tier gating",
      "Phase 6 — Stripe billing tied to alerts tier",
    ],
    kpis: [
      { label: "Activation phase", value: "Phase 5", hint: "Requires CRM surface populated with real data" },
      { label: "Dossier freshness", value: "< 7d", hint: "For top-50 investors" },
      { label: "Alert latency", value: "< 5 min", hint: "From hotel_transactions insert" },
      { label: "Cost cap (planned)", value: "TBD", hint: "Tier 2" },
    ],
    mockLogs: [
      { ts: NOW, level: "info", message: "Status: hidden from orbit · awaiting Phase 5 activation" },
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
 * Orbital placement — 9 agents around the CEO. Order is deliberate:
 *   Tier 1 first (operational ingestion + monitoring),
 *   then Tier 2 (strategic moat — CompSet Builder + Underwriting),
 *   then Tier 3 (CFO / CMO / Customer Support).
 *
 * CRM / Dealflow Agent is intentionally absent from the orbit — it's
 * still in the registry for DB enum compatibility, but the institutional
 * orbital roster shows exactly 9 agents.
 */
export const ORBIT_ORDER: AgentId[] = [
  "market_intelligence",
  "data_ingestion",
  "costar_market_data",
  "compset_underwriting",
  "qa_monitoring",
  "underwriting",
  "cfo",
  "cmo",
  "customer_success",
];

/** All visible agents — CEO first, then the 9-agent orbital roster. */
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
