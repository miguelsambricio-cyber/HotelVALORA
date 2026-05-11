# Market Warehouse vs Underwriting Operations — architectural separation

Why HOTELVALORA formally separates two operational agent layers that on the surface look similar but are fundamentally different systems.

**Last refreshed:** 2026-05-11
**Status:** Live decision since this separation commit.

---

## 1. The decision

There are TWO distinct operational layers in HOTELVALORA. They are owned by TWO distinct agents. They live in TWO distinct workspaces. They are NEVER conflated.

| Dimension | A. Market Warehouse | B. Underwriting Operations |
|---|---|---|
| **Workspace** | `services/costar/` | `services/compset/` |
| **Agent owner** | CoStar Market Data Agent | CompSet Underwriting Agent |
| **Granularity** | Country / Market / Submarket / Class | Hotel-specific |
| **Operational rhythm** | Slow (monthly / quarterly) | On-demand (per deal / per quarter) |
| **Trigger model** | Scheduled cron + batch operator drops | Operator-triggered per hotel |
| **Volume** | High (thousands of rows/refresh) | Low (1–5 rows per hotel per quarter) |
| **Standardization** | Highly standardized (CoStar-shaped) | Hotel-shaped, contextual |
| **Risk profile** | Low per-row (warehouse aggregate) | High per-row (drives valuations) |
| **Audience** | Underwriting Engine + reports + AI agents | Specific deal teams + Underwriting Engine |
| **Business purpose** | Macro substrate + benchmarking | Per-asset valuation support |

## 2. Why we made this split

In the previous architecture (commit `fe00f6a`), compset datasets lived inside `services/costar/COMPSET/`. That mixing was wrong for four reasons:

### 2.1 · Different operational rhythms

A CoStar market refresh is monthly-batch. A compset refresh is deal-driven and on-demand. One agent supervising both would be optimised for neither — too slow for the deal-driven path, too eager for the warehouse path. Cron schedules, retry policies, escalation latencies all diverge.

### 2.2 · Different risk profiles

A wrong row in a country aggregate is annoying. A wrong row in a per-hotel compset directly distorts the assumptions inside a valuation that may underpin a €300M deal decision. The two surfaces deserve different validation rigour, different review queues, different operator approval flows.

### 2.3 · Different categorisation logic

Market warehouse rows aggregate from observable supply + demand + revenue. Compset rows are constructed: a peer set is chosen, restated, often re-categorised. Putting both under the same dedup / supersedence logic forces compromises that hurt both.

### 2.4 · Different downstream consumers

The market warehouse feeds: Underwriting Engine (substrate), Market Observatory report, AI narratives. The compset workspace feeds: Underwriting Engine (per-hotel inputs), `/report/competitive-set` (subject-specific), the deal pipeline (valuation anchors). The cardinality and the latency requirements differ.

## 3. What each agent owns

### A. CoStar Market Data Agent

- `services/costar/PAIS/` → `COSTAR_MASTER_PAIS.xlsx`
- `services/costar/MERCADO/` → `COSTAR_MASTER_MERCADOS.xlsx`
- `services/costar/SUBMERCADO/` → `COSTAR_MASTER_SUBMERCADOS.xlsx`
- `services/costar/CLASS/` → `COSTAR_MASTER_CLASS.xlsx`

Cadence: monthly / quarterly batch ingestion. Permissions: read CoStar / STR / Kalibri exports, write the four warehouse masters, emit `costar_ingestion_staged` events. Does NOT manage hotel-specific compsets. See `docs/agents/costar-market-data-agent.md`.

### B. CompSet Underwriting Agent

- `services/compset/MASTER/COMPSET_MASTER.xlsx`
- `services/compset/MASTER/HOTEL_POSITIONING_MASTER.xlsx`

Cadence: on-demand (operator-triggered) + quarterly per-hotel refresh. Permissions: read CoStar warehouse masters + `services/transactions/` + Library `public.valuations`, write the two compset masters, emit `compset_snapshot_ready` events. Does NOT ingest CoStar source exports — only consumes the warehouse's outputs. See `docs/agents/compset-underwriting-agent.md`.

## 4. How they collaborate

```
                        operator drops CoStar refresh
                                    │
                                    ▼
                  ┌──────────────────────────────────┐
                  │  CoStar Market Data Agent        │
                  │  (services/costar/)              │
                  └──────────────────────────────────┘
                                    │ emits costar_ingestion_staged
                                    ▼
                            ai_events
                                    │
                  ┌────────────────────────────────────┐
                  │ operator requests underwriting     │
                  │ refresh for hotel X (deal-driven   │
                  │ OR quarterly cron)                 │
                  └────────────────────────────────────┘
                                    │
                                    ▼
                  ┌──────────────────────────────────┐
                  │  CompSet Underwriting Agent      │
                  │  (services/compset/)             │
                  │                                  │
                  │  - reads COSTAR_MASTER_*         │
                  │    for market context            │
                  │  - reads public.valuations       │
                  │    for subject metadata          │
                  │  - builds compset row            │
                  │  - derives positioning snapshot  │
                  │  - emits compset_snapshot_ready  │
                  └──────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
        Underwriting Engine                  /report/competitive-set
        (Phase 6 read path)                  (Phase 5 read path)
```

The two agents communicate **only via DB events + the shared warehouse**. They never call each other directly. This is deliberate — keeps each agent independently testable, deployable, and supersedable.

## 5. The CEO Agent's role in the separation

The CEO / Orchestration Agent (Tier 0) supervises BOTH but executes NEITHER. Its responsibilities w.r.t. this separation:

- Hourly health probes of both workspaces (`services/costar/MASTER/INGESTION_LOG` freshness + `services/compset/MASTER/INGESTION_LOG` freshness)
- Detect "stale market data" (CoStar refresh > 45 days old) → escalate to operator
- Detect "stale positioning snapshots" (HOTEL_POSITIONING snapshot > 90 days old for active deal) → escalate
- Coordinate when both agents need to run in concert (e.g. a Q1 market refresh implies refreshing N positioning snapshots downstream)
- Verify cost caps for each agent independently

See `docs/agents/ceo-agent-supervision-layer.md` for the full charter.

## 6. The wrong way to merge them

Periodically there will be temptation to "simplify" by collapsing the two agents into one. Resist. Specifically:

| Symptom | Wrong fix | Right fix |
|---|---|---|
| "Both agents normalise CoStar dates the same way" | Merge into one agent | Share a `normalisation` library across both; keep agents separate |
| "Both agents write similar review queues" | Merge into one queue | Share `staging/` patterns; keep per-workspace queues |
| "We always run them together" | Merge into one cron | Two crons; CEO Agent coordinates dependencies |
| "Operators always invoke them in pairs" | Single CLI entry | Two CLIs; operator workflows document the dependency |

The shared primitives (ingestion-meta block, audit-chain unification, .gitignore posture, scripts/build_masters.py pattern) absorb the redundancy. The agents stay separate.

## 7. Scaling implications

The separation is a load-bearing architectural choice for geographic expansion. As HOTELVALORA expands from Spain to Europe, US, LatAm, MEA, APAC:

- The CoStar Market Data Agent scales **vertically** — more rows per master, no new agents needed, no new workspaces. New countries add rows to PAIS, new markets add rows to MERCADOS, etc.
- The CompSet Underwriting Agent scales **horizontally** — more hotels = more compset rows + positioning snapshots, no new agents needed.

If we had merged the two, every new geography would force a re-evaluation of the agent's responsibilities. With the separation, geography expansion is a data-volume problem, not an architecture problem.

## 8. Decision register

| Date | Decision | Owner |
|---|---|---|
| 2026-05-11 | Split agents 1:1 with workspaces. `costar_market_data` + `compset_underwriting` enum values added. | Architecture commit `<this commit>` |
| 2026-05-11 | Move COMPSET out of `services/costar/`; add CLASS in its place. Bump costar normalisation to v1.1. | Same commit |
| 2026-05-11 | Create `services/compset/` workspace with two masters (COMPSET_MASTER + HOTEL_POSITIONING_MASTER). | Same commit |
| (future) | Activate `costar_market_data` from `planned` → `beta` when Phase 2.3.d.1 ships the CLI pipeline. | Phase 2.3.d.1 migration |
| (future) | Activate `compset_underwriting` from `planned` → `beta` when Phase 2.4 ships the agent implementation. | Phase 2.4 migration |

## 9. Files

| File | Role |
|---|---|
| `services/costar/` (workspace) | Market Warehouse — owned by CoStar Market Data Agent |
| `services/compset/` (workspace) | Underwriting Operations — owned by CompSet Underwriting Agent |
| `docs/agents/costar-market-data-agent.md` | Agent A charter |
| `docs/agents/compset-underwriting-agent.md` | Agent B charter |
| `docs/agents/ceo-agent-supervision-layer.md` | Supervisor charter |
| `docs/intelligence/costar-{country,market,submarket,class}-schema.md` | Warehouse schemas |
| `docs/intelligence/compset-schema.md` + `hotel-positioning-schema.md` | Underwriting schemas |
| `public.ai_agents.id IN ('costar_market_data', 'compset_underwriting')` | Registry rows |
