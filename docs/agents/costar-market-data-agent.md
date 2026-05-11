# CoStar Market Data Agent

**Agent id:** `costar_market_data`
**Tier:** 1 (operational warehouse maintenance)
**Workspace:** `services/costar/`
**Status:** `planned` — activation in Phase 2.3.d.1 when the CLI pipeline lands

---

## 1. Purpose

Maintain the institutional hospitality market WAREHOUSE. Slow-cadence, batch-style, warehouse-oriented. The agent's job is to keep four canonical XLSX masters fresh, normalised, and ready for consumption by downstream agents (CompSet Underwriting, Market Intelligence, Underwriting Engine).

**This agent does NOT manage hotel-specific compsets.** That responsibility belongs to the CompSet Underwriting Agent (`docs/agents/compset-underwriting-agent.md`). The split is load-bearing — see `docs/architecture/market-vs-underwriting-separation.md`.

## 2. Responsibilities

| Category | What the agent owns |
|---|---|
| **Country data** | Maintain `COSTAR_MASTER_PAIS.xlsx` — supply, demand, occupancy, ADR, RevPAR + macro (GDP, inflation, tourism arrivals) |
| **Market data** | Maintain `COSTAR_MASTER_MERCADOS.xlsx` — market-level KPIs + revpar_index_vs_country + seasonality |
| **Submarket data** | Maintain `COSTAR_MASTER_SUBMERCADOS.xlsx` — submarket KPIs |
| **Class data** | Maintain `COSTAR_MASTER_CLASS.xlsx` — chain-scale aggregates at country or market level |
| **Supply/demand KPIs** | RevPAR / ADR / Occupancy normalisation across all four masters |
| **Pipeline tracking** | pipeline_rooms / pipeline_hotels columns kept current per refresh |
| **Inventory** | room_count_total / hotel_count snapshots at period boundaries |
| **Macro benchmarking** | Country macro context columns feed Underwriting Engine valuation defenses |

## 3. What the agent does NOT do

- ❌ Build hotel-specific compsets (CompSet Underwriting Agent)
- ❌ Derive underwriting forward assumptions (CompSet Underwriting Agent)
- ❌ Ingest news / RSS (Market Intelligence Agent + Hospitality Intelligence Engine)
- ❌ Ingest hotel transactions / projects (Data Ingestion Agent for `services/transactions/`)
- ❌ Send emails / publish content / move money (other agents)

## 4. Operational characteristics

| Attribute | Value |
|---|---|
| **Trigger model** | Monthly cron + on-demand operator drops |
| **Volume per refresh** | High — hundreds to thousands of rows per master per refresh |
| **Latency tolerance** | High — a 24h delay in CoStar refresh is normal; no real-time path |
| **Risk per row** | Low — warehouse aggregates rarely affect single-deal decisions |
| **Standardization** | Very high — CoStar-shaped XLSX layouts are stable |
| **Cost per run** | < $0.10/day (no LLM use; regex normalisation only — Phase 1) |
| **Audit posture** | Full — INGESTION_LOG sheet per master + per-run jsonl + audit-sync to `ai_agent_runs` |

## 5. Workflow

```
1. Operator drops file into services/costar/<GRANULARITY>/INPUT/
   (or scheduled cron sweeps the inbox monthly)
2. Agent identifies granularity from path (PAIS / MERCADO / SUBMERCADO / CLASS)
3. Agent reads file (xlsx or csv)
4. Agent folds raw headers to canonical column names
5. Agent normalises per docs/intelligence/costar-normalization-rules.md:
   - country -> ISO-3166-1 alpha-2
   - period_kind / period_start / period_end normalised
   - currency check (Phase 1: non-EUR -> staging/review)
   - KPI sanity bounds
6. Agent computes dedup_key
7. Routing:
   - missing required column -> staging/failed/
   - dedup match same content -> silent skip
   - dedup match different content -> staging/review/ (likely CoStar restatement)
   - else -> append MASTER
8. Agent moves source file to old.<granularity>/
9. Agent writes INGESTION_LOG row
10. Agent emits custom event (payload.kind=costar_ingestion_staged)
11. Agent POSTs audit summary to /api/agents/data-ingestion-summary
```

## 6. KPIs

| KPI | Target |
|---|---|
| Rows inserted per month per granularity | ≥ 200 at steady state |
| Parse failure rate | < 2% |
| Manual review rate | < 5% |
| Time from operator drop to ingested | p95 < 5 minutes |
| Restatement detection latency | within the same refresh run |
| Cost per refresh run | < $0.10 |

## 7. Escalation rules

| Condition | Severity | Action |
|---|---|---|
| Parse failure rate > 5% over 7d | warning | Resend escalation via `monitoring.escalate.email` |
| Manual review rate > 15% over 7d | warning | Resend escalation |
| Currency mismatch within file | info | Route rows to `staging/review/` — Phase 1 refuses silent FX |
| Compset composition detected (cross-workspace signal) | info | Notify the CompSet Underwriting Agent via event |
| MASTER unsaveable (filesystem error) | critical | Resend escalation + run aborts |

## 8. Permissions (planned for Phase 2.3.d.1 migration)

Read:
- `public.ai_memory` (own scope) · `public.ai_events` · own `ai_agent_runs`
- Filesystem: `services/costar/<GRANULARITY>/INPUT/`

Write:
- Filesystem: `services/costar/MASTER/COSTAR_MASTER_*.xlsx` (append-only)
- Filesystem: `services/costar/staging/{failed,review,temp}/`
- Filesystem: `services/costar/<GRANULARITY>/old.<granularity>/`
- Filesystem: `services/costar/logs/<YYYY-MM>/<ingestion_id>.jsonl`
- DB: `public.ai_agent_runs` (via cloud audit-sync endpoint), `public.ai_events` (insert), `public.ai_memory` (own scope)

NO write access to:
- `services/compset/` (different agent's workspace)
- `services/transactions/` (different agent's workspace)
- `public.market_news` / `public.valuations` / any cross-domain table

## 9. Integration with other agents

| Agent | Relationship |
|---|---|
| **CompSet Underwriting Agent** | Downstream consumer. Reads COSTAR_MASTER_* to build per-hotel positioning. NEVER calls this agent directly — reads the warehouse outputs after they're stable. |
| **Market Intelligence Agent** | Downstream consumer. Reads COSTAR_MASTER_* alongside `public.market_news` for narrative positioning. |
| **CEO Agent** | Supervisor. Hourly health probes on `INGESTION_LOG` freshness. Coordinates monthly refresh cadence. |
| **QA / Monitoring Agent** | Supervisor. Watches escalation channel, cost cap, parse failure rate. |
| **Underwriting Engine (Phase 6)** | End consumer. Reads COSTAR_MASTER_* via the future Supabase mirror (`public.market_periods`). |

## 10. Future evolution

| Phase | Hook |
|---|---|
| 2.3.d.1 | CLI pipeline (`services/costar/scripts/ingest.py`) wires the agent operationally. Status: `planned` → `beta`. |
| 2.3.d.2 | Monthly cron scheduling (Vercel Cron + operator-side fallback). |
| 4 | LLM-assisted normalisation — CoStar code resolution, submarket disambiguation, FX conversion via ECB rate at period midpoint. |
| 5 | XLSX masters mirrored into Supabase tables (`public.market_periods` with granularity discriminator). |
| 7 | Cross-region scaling — adding countries adds rows, not architecture. |

## 11. Activation checklist (when Phase 2.3.d.1 ships)

- [ ] Migration adding permission rows for `costar_market_data` agent_id
- [ ] `services/costar/scripts/ingest.py` CLI (mirrors `services/transactions/scripts/ingest.py`)
- [ ] `services/costar/scripts/{dedup,normalization,master_io,staging_io,source_readers,audit_sync}.py` modules (mostly forks of the transactions versions)
- [ ] Smoke test with all four granularities
- [ ] Flip `public.ai_agents.status` to `beta`, `enabled=true`
- [ ] Flip `public.ai_agents.status` to `active` after 14 days of stable operation
