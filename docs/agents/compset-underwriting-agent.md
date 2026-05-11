# CompSet Underwriting Agent

**Agent id:** `compset_underwriting`
**Tier:** 2 (operational, hotel-specific, underwriting-critical)
**Workspace:** `services/compset/`
**Status:** `planned` — activation in Phase 2.4 when the agent implementation lands

---

## 1. Purpose

Generate underwriting-ready competitive intelligence for a SPECIFIC HOTEL. Operational, on-demand, dynamic, valuation-critical. The agent reads the slow-changing market warehouse (`services/costar/`) and produces per-hotel benchmark + positioning artefacts that flow directly into the Underwriting Engine.

**This is NOT a static warehouse process.** Compset analysis is hotel-specific, deal-driven, and underwriting-critical. The separation from the CoStar Market Data Agent is load-bearing — see `docs/architecture/market-vs-underwriting-separation.md`.

## 2. Responsibilities

| Category | What the agent owns |
|---|---|
| **Hotel-specific compsets** | Build / maintain `COMPSET_MASTER.xlsx` — one row per `(target_hotel, compset, period)` |
| **Benchmark KPIs** | Subject vs compset ADR / occupancy / RevPAR computation |
| **Performance indices** | MPI / ARI / RGI calculation + YoY deltas |
| **Market positioning** | Submarket / class / chain-scale context per hotel |
| **Underwriting assumptions** | Forward ADR / occupancy / RevPAR projections per `HOTEL_POSITIONING_MASTER` snapshot |
| **Valuation support** | Per-key valuation anchors + cap rate + revenue multiple assumptions |
| **Operating benchmark support** | GOP-per-key assumptions when derivable from brand + operator benchmarks |
| **P&L support** | Annualised room-revenue assumptions feeding valuation P&L models |
| **Institutional benchmarking** | Confidence scoring + assumptions_basis narrative + risk flags per snapshot |

## 3. What the agent does NOT do

- ❌ Ingest CoStar source exports (CoStar Market Data Agent)
- ❌ Write to `services/costar/` masters (read-only access)
- ❌ Ingest news / RSS (Market Intelligence Agent)
- ❌ Make valuation decisions or write to `public.valuations` directly — outputs are inputs to the Underwriting Engine
- ❌ Send emails to customers / move money (other agents)
- ❌ Build compsets without consulting the CoStar Market Data Agent's warehouse outputs

## 4. Operational characteristics

| Attribute | Value |
|---|---|
| **Trigger model** | Operator-driven (per deal) + quarterly per-hotel refresh cron |
| **Volume per run** | Low — 1 row per master (1 COMPSET row + 1 POSITIONING snapshot per hotel per refresh) |
| **Latency tolerance** | Low — deal teams expect snapshots within minutes of request |
| **Risk per row** | High — these rows directly anchor institutional valuations |
| **Standardization** | Hotel-shaped, contextual — every hotel may have a unique compset composition |
| **Cost per run** | < $0.20/day Phase 1 (regex + arithmetic); LLM use lands in Phase 4 |
| **Audit posture** | Full — INGESTION_LOG sheet per master + per-run jsonl + audit-sync to `ai_agent_runs` |

## 5. Workflow

```
1. Operator requests underwriting refresh for hotel X
   (deal-driven, valuation-update, or scheduled per-hotel cron)
2. Agent invocation via POST /api/agents/compset-underwriting
   OR `python services/compset/scripts/run.py --hotel <hotel_uid>` (Phase 2.4 CLI)
3. Agent loads market context:
   - COSTAR_MASTER_MERCADOS row for (country, market, period)
   - COSTAR_MASTER_SUBMERCADOS row for (country, market, submarket, period)
   - COSTAR_MASTER_CLASS row for (country, market, chain_scale, period)
4. Agent loads or constructs compset:
   - If COMPSET_MASTER has a recent row for (target_hotel, compset, period): reuse
   - Else: build a new compset from operator brief + market context
5. Agent normalises subject hotel KPIs (from operator-provided values + brand benchmarks)
6. Agent computes:
   - MPI = subject_occ / compset_occ * 100
   - ARI = subject_adr / compset_adr * 100
   - RGI = subject_revpar / compset_revpar * 100
   - YoY deltas vs prior canonical row
7. Agent appends row to COMPSET_MASTER
8. Agent derives forward underwriting assumptions:
   - ADR assumption based on subject trend + compset trend
   - Occupancy assumption based on RGI trajectory + pipeline pressure
   - Revenue / GOP / valuation anchor derived
   - Confidence scored (low / medium / high)
   - assumptions_basis narrative written
   - risks flagged from market_news + pipeline data
9. Agent appends POSITIONING snapshot to HOTEL_POSITIONING_MASTER
10. Agent emits custom event (payload.kind=compset_snapshot_ready)
11. Agent POSTs audit summary to /api/agents/data-ingestion-summary
12. Output JSON returned to caller — feeds Underwriting Engine / Library report
```

## 6. KPIs

| KPI | Target |
|---|---|
| Snapshot freshness (active hotels) | p95 < 90 days |
| Assumption revision rate per refresh | ≤ 25% (stability indicator) |
| Compset composition changes per quarter per hotel | < 2 |
| Time from operator request to snapshot | p95 < 60 seconds |
| Confidence distribution | ≥ 60% medium-high across the active book |
| Cost per snapshot | < $0.10 (Phase 4 LLM use raises this — adjust caps in migration) |

## 7. Escalation rules

| Condition | Severity | Action |
|---|---|---|
| Compset composition change detected | info | Resend escalation — operator decides: supersede prior row OR fork into new compset_name to preserve history |
| Assumption revision rate > 40% in one refresh | warning | Resend escalation — market may be volatile or compset wrong |
| Snapshot for active deal stale > 90d | warning | Resend escalation — proactive refresh required |
| `confidence=low` on a snapshot consumed by a live valuation | critical | Resend escalation — block valuation publish OR add explicit caveat |
| Required CoStar warehouse data missing | warning | Suspend run, escalate, await Market Data Agent refresh |

## 8. Permissions (planned for Phase 2.4 migration)

Read:
- `services/costar/MASTER/*.xlsx` (cross-workspace, read-only)
- `services/transactions/MASTER/*.xlsx` (transactions + projects context, read-only)
- `public.valuations` (subject hotel metadata)
- `public.market_news` (risk flag input — once Market Intelligence cross-link is live)
- `public.investors` · `public.operators` (entity context)
- `public.ai_memory` (own scope) · `public.ai_events` · own `ai_agent_runs`

Write:
- Filesystem: `services/compset/MASTER/COMPSET_MASTER.xlsx` (append-only)
- Filesystem: `services/compset/MASTER/HOTEL_POSITIONING_MASTER.xlsx` (append-only)
- Filesystem: `services/compset/staging/{failed,review,temp}/`
- Filesystem: `services/compset/old/`
- Filesystem: `services/compset/logs/<YYYY-MM>/<ingestion_id>.jsonl`
- DB: `public.ai_agent_runs` (via cloud audit-sync endpoint), `public.ai_events` (insert), `public.ai_memory` (own scope)

NO write access to:
- `services/costar/` (read-only consumer)
- `services/transactions/` (read-only consumer)
- `public.valuations` (consumer — Underwriting Engine writes there)

## 9. Integration with other agents

| Agent | Relationship |
|---|---|
| **CoStar Market Data Agent** | Upstream source — reads warehouse masters. NEVER writes to `services/costar/`. |
| **Market Intelligence Agent** | Risk flag source — reads `public.market_news` cross-linked to the hotel / market. |
| **Underwriting Engine (Phase 6)** | Downstream consumer — reads `HOTEL_POSITIONING_MASTER` (via future Supabase mirror) for valuation inputs. |
| **CEO Agent** | Supervisor. Monitors snapshot freshness across the active book. Coordinates quarterly refresh cadence. |
| **QA / Monitoring Agent** | Supervisor. Watches escalation channel, cost cap, confidence distribution. |

## 10. Future evolution

| Phase | Hook |
|---|---|
| 2.4 | Agent implementation + CLI + cloud route. Status: `planned` → `beta`. |
| 2.5 | Quarterly per-hotel refresh cron (Vercel Cron). |
| 4 | LLM-assisted assumption derivation — agent narrates positioning rationale + risks from market_news + pipeline context. Cost cap raised in migration. |
| 5 | XLSX masters mirrored into Supabase tables (`public.compset_periods`, `public.hotel_positioning_snapshots`). |
| 6 | Underwriting Engine reads `HOTEL_POSITIONING_MASTER` directly to seed every valuation. The agent's outputs become the substrate of every institutional report. |
| 7 | Cross-region scaling — adding hotels adds rows, not architecture. |

## 11. Activation checklist (when Phase 2.4 ships)

- [ ] Migration adding permission rows for `compset_underwriting` agent_id
- [ ] `services/compset/scripts/run.py` CLI (similar shape to transactions/costar CLIs but operator-driven not batch-driven)
- [ ] Cloud route `apps/web/src/app/api/agents/compset-underwriting/route.ts` (Supabase-auth gated)
- [ ] TS agent implementation at `apps/web/src/lib/ai-agents/agents/compset-underwriting.ts`
- [ ] Cross-workspace read helper that loads CoStar MASTER data
- [ ] Smoke test against the 5 portfolio hotels
- [ ] Flip `public.ai_agents.status` to `beta`, `enabled=true`
- [ ] Flip to `active` after 14 days of stable operation
