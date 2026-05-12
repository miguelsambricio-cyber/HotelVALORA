# AI Agents · Charter Index

**Last refreshed:** 2026-05-12

This directory holds the per-agent charters. Each charter is the **canonical operator-facing document** for what that agent does, what permissions it carries, what tools it can call, what KPIs measure its success.

Agent runtime / schema lives elsewhere (`docs/ai-agents/*` for the layer architecture, `docs/database/migrations/0007_*` and `0008_*` for the schema). This README is the index that ties it together.

For institutional baseline state of the agent fleet, see `docs/SNAPSHOT_2026_05_12.md` § 3.1.

---

## 1 · Agent registry (12 agents · 4 tiers)

### Tier 0 — Supervisory

| Slug | Charter | Status (2026-05-12) | Role |
|---|---|---|---|
| `ceo` | `ceo-agent-supervision-layer.md` | `planned` · Phase 3 activation | Operations command center · agent supervisor · escalation router · NOT customer-facing |

### Tier 1 — Operational (live)

| Slug | Charter | Status | Role |
|---|---|---|---|
| `market_intelligence` | (TBD · canonical role doc) | `planned` · runtime stub + 1 placeholder run | Daily hospitality news ingestion + categorisation + relevance scoring |
| `data_ingestion` | (TBD · canonical role doc) | `beta` · Python CLI live · cloud audit endpoint live | Operator-driven workspace ingestion (Excel/CSV → Postgres) · supervises 3 workspaces (transactions · costar · compset) |
| `qa_monitoring` | (TBD · canonical role doc) | `planned` · daily cron live | Hourly platform health probes (daily on Hobby plan) · Resend escalation |

### Tier 1 — Operational (deferred)

| Slug | Charter | Status | Role |
|---|---|---|---|
| `costar_market_data` | `costar-market-data-agent.md` | `planned` · Phase 2.3.d.1 | CoStar warehouse maintenance · 4 granularities (country · market · submarket · class) |

### Tier 2 — Operational

| Slug | Charter | Status | Role |
|---|---|---|---|
| `compset_underwriting` | `compset-underwriting-agent.md` | `planned` · Phase 2.4.1 | Per-hotel CompSet building · cross-workspace reader · feeds Underwriting workbench |
| `underwriting` | (TBD · Phase 6) | `planned` · Phase 6 | DCF · IRR · sensitivity orchestration · reads valuations + comps + criteria |
| `crm_dealflow` | (TBD · Phase 5) | `planned` · hidden from orbit | CRM + dealflow surface · post-PMF |

### Tier 3 — Internal Ops (pre-PMF)

| Slug | Charter | Status | Role |
|---|---|---|---|
| `cfo` | (TBD · Phase 5+) | `planned` | Internal financial ops · spend monitoring |
| `cmo` | (TBD · Phase 5+) | `planned` | Marketing automation · Top Promote insights |
| `customer_support` | (TBD · Phase 5+) | `planned` | Inbound · ticket triage · escalation |

### Legacy

| Slug | Status | Why retained |
|---|---|---|
| `report_generation` | `planned` · not in orbit | DB-enum backward compat · superseded by Tier 2 agents |

---

## 2 · Existing charter dossiers

| Charter | Topic |
|---|---|
| `ceo-agent-supervision-layer.md` | Tier 0 supervisor · hourly + daily cycles · escalation routing · NOT a chatbot |
| `costar-market-data-agent.md` | Tier 1 · CoStar warehouse · 4-granularity ingestion responsibilities |
| `compset-underwriting-agent.md` | Tier 2 · per-hotel CompSet construction · cross-workspace data flow |

**Outstanding charter work:**

The Tier 1 operational agents (`market_intelligence`, `data_ingestion`, `qa_monitoring`) and the rest of Tier 2/3 don't yet have per-agent dossier files. Their behaviour is encoded in:
- Code: `apps/web/src/lib/ai-agents/agents/<slug>.ts`
- Layer architecture: `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` § 7 (operational charters)
- DB seed: migration 0007 / 0008 rows in `public.ai_agents` (charter content lives in `description` + `responsibilities` jsonb)

A future pass (likely after Phase 2.5b stabilises) will extract each into a per-agent file in this directory. Until then, the **`ai_agents` table row is the canonical charter** for the four agents without dedicated files.

---

## 3 · Conventions for new charter files

When writing a new charter (or extracting one from the seed jsonb):

```markdown
# <Agent Display Name>

**Slug:** `<slug>`
**Tier:** <0..3>
**Status:** <planned / beta / active>
**Activation phase:** <Phase X.Y>
**Workspace:** `<schema.table or services/path>`

## Mission
One paragraph: what this agent exists to do.

## Responsibilities
Bulleted list — what the agent owns end-to-end.

## Integrations
Bulleted list — tables read, tables written, external APIs called.

## Workflow
Paragraph — how the agent runs · trigger (cron / reactive / manual) · what it produces.

## KPIs
| Metric | Target | Notes |
|---|---|---|
| (e.g., `success_rate`) | ≥ 95% | over 7-day window |

## Tools
List of tool slugs from `public.ai_tools` the agent may invoke.

## Permissions
Default-deny posture · explicit grants in `public.ai_agent_permissions`.

## Escalation
When does the agent escalate · to whom · via which channel (Resend / `ai_human_review`).

## Future state
What changes about this agent in subsequent phases.

## References
Cross-links to architecture docs · code paths · related migrations.
```

---

## 4 · Cross-references

- Layer architecture (deterministic shell · audit · permissions · memory · escalation): `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md`
- Phase roadmap: `docs/ai-agents/ai-agent-roadmap.md`
- Permissions model: `docs/ai-agents/ai-agent-permissions.md`
- Approval flow: `docs/ai-agents/ai-agent-approval-flow.md`
- Cost guardrails: `docs/ai-agents/ai-agent-cost-guardrails.md`
- Memory strategy: `docs/ai-agents/ai-memory-strategy.md`
- Event system: `docs/ai-agents/ai-event-system.md`
- Orchestration: `docs/ai-agents/ai-agent-orchestration.md`
- KPIs: `docs/ai-agents/ai-agent-kpis.md`
- Market-vs-Underwriting separation: `docs/architecture/market-vs-underwriting-separation.md`
- Current state baseline: `docs/SNAPSHOT_2026_05_12.md`
