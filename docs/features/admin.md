# Feature · Administrator Section

Institutional Operations Center for HOTELVALORA. The visual layer of the AI Operations Layer plus the cross-platform supervisory dashboard.

**Last refreshed:** 2026-05-13
**Status:** 🟢 Shipped · live-state aggregator replaces compile-time registry · interactive article drawer · curated source roster · Hosteltur + Alimarket at operational parity with placeholder T2

> Institutional baseline state: `docs/SNAPSHOT_2026_05_12.md` § 3.3.

## 0. Status semantics — sidebar vs page header (codified 2026-05-13)

The sidebar carries **operational maturity only**. Access scope ("operator only", "internal infrastructure") is page-header secondary metadata, not a sidebar badge. The two concerns are deliberately split so the sidebar reads as a clean operational map.

### Sidebar badges · operational maturity

The sidebar answers one question — *is this module operational?*

| Badge | Tone | Meaning |
|---|---|---|
| **LIVE** | emerald | Operational end-to-end MVP · safe to use in production |
| **BETA** | amber | Partially connected · operational but with rough edges · expect polish gaps |
| **PLANNED** | slate | Not yet built · static affordance for the roadmap |

Current sidebar assignments (every operational module is LIVE):
- LIVE — Contacts · Users · Campaigns · Subscriptions · AI Operations · Integrations
- PLANNED — Workspaces · Observability · Cost Controls · Audit Log

Promoting BETA → LIVE requires: end-to-end happy path with audit · soft-delete posture where mutations exist · no caller-visible holes in the operator workflow.

### Page header secondary metadata · access scope

Where useful, a page's header chip strip surfaces *who uses this module and why*. The current vocabulary:

| Chip text | Where it appears | What it signals |
|---|---|---|
| Operator only · internal infrastructure | AI Operations, Integrations | This surface exists for operator infrastructure and has no customer-facing counterpart by design |
| (none) | Contacts, Users, Campaigns, Subscriptions | Default: operator console for customer-visible data |

Access scope is *additive context*. It never replaces the operational badge in navigation.

---

## 1. What lives here

`/user/admin/*` is the operator-facing institutional operations center. It is NOT a customer-facing surface, NOT a chat UI, NOT a generic SaaS admin panel. The visual direction is Bloomberg Terminal × Palantir × MSCI Real Assets — dense, monospaced, tracked-out, dark canvas with lime-300 accents.

| Route | Surface | Build mode |
|---|---|---|
| `/user/admin` | Executive Control Room (6-section dashboard) | Static |
| `/user/admin/agents` | AI Operations Center (orbital + agent directory) | Static |
| `/user/admin/agents/[agentId]` | Per-agent dashboard · `market_intelligence` renders the **Intelligence Terminal** | SSG · 11 pre-rendered paths |
| `/user/admin/integrations` | Integrations directory (10 hospitality intelligence sources · grouped by category) | Static |
| `/user/admin/integrations/[integrationId]` | Per-integration detail (connection · session · ingestion health) | SSG · 10 pre-rendered paths |

Plus three defensive HTTP redirects (`next.config.mjs` `redirects()`):

| Source | Destination | HTTP |
|---|---|---|
| `/admin` + `/admin/<path>` | `/user/admin[/path]` | 308 Permanent |
| `/settings/admin` + `/settings/admin/<path>` | `/user/admin[/path]` | 308 Permanent |
| `/user` | `/user/admin` | 307 Temporary |

## 2. Navigation entry points

The admin section is reachable from three places — all real Next.js routes (no hash navigation, no local tab state):

| Entry | File | UX |
|---|---|---|
| **AppHeader pill** | `apps/web/src/components/layout/app-header.tsx` | `ADMIN` pill with Shield icon, lime-yellow accent when active, sits between BIBLIOTECA and USUARIO. Visible globally. |
| **Settings sidebar featured card** | `apps/web/src/components/settings/settings-sidebar.tsx` → `AdminCtaCard()` | Institutional dark-canvas card at the bottom of every `/settings/*` sidebar. Lime-300 accent. Displays `● Live · 10 agents`. |
| **Direct URL** | (browser address bar) | `/user/admin`, or via redirects from `/admin`, `/settings/admin`, `/user` |

## 3. Executive Control Room (`/user/admin`)

Five sections, uniform `SectionHeader` atom (eyebrow numbered + forest-900 title + slate subline):

### Section 01 — Executive Overview

Ten institutional KPI tiles in a responsive `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`. Each tile = side rail (signal-coloured) + tracked-out label + headline value + subline + optional trend pill.

| KPI | Default value (mock) |
|---|---|
| Platform Status | Operational |
| AI Agents Active | 3 / 10 |
| Last Deploy | 3 min ago |
| Last Cron Run | 07:48 UTC |
| Data Freshness | < 4h |
| New Transactions Today | 0 |
| New Projects Today | 0 |
| Underwriting Jobs | 0 |
| Error Alerts | 0 |
| Infrastructure Health | 100% |

Data source: `apps/web/src/lib/admin/dashboard/data.ts` → `EXECUTIVE_KPIS`.

### Section 02 — AI Operations Center

Featured card (`AiOpsFeatureCard`) with a mini orbital SVG glyph + bright lime CTA into `/user/admin/agents`. The micro-orbit renders 9 nodes (status-tinted dots: 3 green, 2 amber, 4 slate) around the central CEO.

### Section 03 — Integrations

Highlight strip of the three most-relevant integrations (Hosteltur · Alimarket · HospitalityNet) rendered as `IntegrationCard`. Each card shows connection status, auth status, article volume (today / 7d / 30d), reliability score, and links into the per-integration detail page. Right-slot CTA ("View directory") links into `/user/admin/integrations`. See `docs/features/intelligence-terminal.md` and `docs/integrations/hosteltur.md` for the institutional architecture.

### Section 04 — Data Pipeline Center

Six pipeline cards (`PipelineCard`) covering the institutional ingestion surfaces:

| Pipeline | Status (mock) | Workspace |
|---|---|---|
| COSTAR Warehouse | Manual | `services/costar/` |
| Transactions | Active | `services/transactions/` |
| Projects | Idle | `services/transactions/` |
| Market Intelligence | Active | `public.market_news` |
| CompSet Builder | Manual | `services/compset/` |
| Reports | Idle | `public.saved_reports` |

Each card surfaces: name · domain subline · status pill · last update · queue size · success rate · workspace path.

### Section 05 — Infrastructure Monitoring

Six infrastructure indicators (`InfraIndicator`) with subtle operational pulse on the status dot:

| Service | Scope | Region |
|---|---|---|
| Vercel | Hosting + cron + functions | fra1 |
| Supabase | Postgres + auth + storage | eu-central |
| Resend | Transactional + alerts | global |
| Cron Jobs | 3 daily crons | vercel-cron |
| Storage | 5 buckets + RLS | eu-central |
| API Status | Cron + agent + auth routes | fra1 |

### Section 06 — Recent Operational Activity

Bloomberg-style timeline (`ActivityTimeline`) — channel-labelled rows with timestamps (relative: `just now` / `3m ago` / `2026-05-09`) and signal-coloured dots. Channel labels: `AGENT` / `INGEST` / `CRON` / `DEPLOY` / `AUDIT` / `INFRA`.

## 4a. Integrations directory (`/user/admin/integrations`)

Institutional hospitality intelligence sources surfaced as **integrated applications**, not feeds. Each integration shows: connection status, authentication status, last successful sync, ingestion health, session validity (when authenticated), article volume (today / 7d / 30d), source type, reliability score.

### Group structure on the directory

| Group | Sources | Status today |
|---|---|---|
| Authenticated · Spain Market Intelligence | Hosteltur · Alimarket | Awaiting credentials · Not configured |
| Public · European + Spain Market | HospitalityNet · Expansión | Operational |
| Public · Global Market + Research Houses | Skift · HVS · Reuters | Operational |
| Deferred · API / Vendor Pending | CoStar News · Hotel News Now · THP News | Not configured |

### Per-integration detail page

Lives at `/user/admin/integrations/[integrationId]`. Composes:

- **Hero** — name · region · language · ingestion kind · tagline · connection + auth badges · reliability score
- **Telemetry strip** — articles today / 7d / 30d + runs success/failed in last 7d
- **SessionStatusPanel** — when authenticated: T2 row · KEK identifier · refresh count · hours-to-expiry · last refresh · expires · last error · cookies / origins counts · post-login URL · **Real T2 vs Placeholder badge** (from `meta.placeholder`) · **Re-auth-required banner** when `hoursToExpiry ≤ 24` (copy-pasteable CLI command, no orchestration) · **Premium-access verification block** (last authed fetch timestamp + ok/fail badge + targets-passed counter + validation report table with anon-size / authed-size / Δ-bytes / verdict per target). When public: zero-credentials banner.
- **IngestionHealthPanel** — last run timestamp · success / failure counts · mean items per run
- **Operator notes** + **External links** (login portal · premium signup · public RSS hub · integration dossier)

Single source of truth: `apps/web/src/lib/admin/integrations/registry.ts` — shaped against `public.sources × intelligence_source_sessions × news_ingestion_runs` for Phase 3 mechanical swap.

## 4b. Market Intelligence Terminal (`/user/admin/agents/market_intelligence`)

The `market_intelligence` agent slug renders the **Intelligence Terminal** in place of the standard agent dashboard. Full spec: `docs/features/intelligence-terminal.md`.

Composition: hero · volume KPIs (6 tiles) · high-relevance alerts band · source coverage matrix · category breakdown + entity mentions (two-column) · extracted deals + projects tables · latest hospitality intelligence feed. Every item preserves its original source URL for institutional traceability.

## 4. AI Operations Center (`/user/admin/agents`)

Orbital layout (`AgentOrbit`) on a dark gradient canvas with Bloomberg grid background:

- **CEO Agent** at the centre — `Tier 0` caption, large halo, supervisory.
- **9 operational agents** evenly spaced on a 2π orbit:
  Market Intelligence · Data Ingestion · COSTAR Admin · CompSet Builder · QA Monitoring · Underwriting · CFO · CMO · Customer Support.
- **Supervisory threads** — SVG lines from each orbital position back to CEO, stroke colour mirrors the agent's status group.

### 4-light status readout

Every node renders ACTIVE / IDLE / WARNING / ERROR derived from the underlying richer `AgentStatus` enum via `groupForStatus()`:

| Group | Underlying statuses | Dot · pulse |
|---|---|---|
| **ACTIVE** | `healthy` · `active` · `monitoring` · `running` | ● · pulse |
| **IDLE** | `standby` | ○ · static |
| **WARNING** | `manual_mode` | ◐ · static |
| **ERROR** | `error` | ▲ · pulse |

COSTAR Admin + CompSet Builder render as **WARNING** (`statusLabel: "Configured · Manual"`) with currentMode explaining "Configured but not operational yet" — per the user specification.

### Interaction model

| Surface | Click behaviour |
|---|---|
| Orbital node | Opens `AgentDetailPanel` slide-out (no route change) |
| Agent directory row (below the orbit) | Navigates to `/user/admin/agents/[agentId]` SSG page |
| `AgentDetailPanel` footer CTA "Open full dashboard" | Navigates to the same SSG page |

The detail panel is right-side, 640px max, ESC closes, body scroll locked while open. Sections inside:

1. **Mission** — 1–2 sentence narrative
2. **Operational State** — current mode · success rate · last/next execution · cron schedule · health score
3. **Responsibilities** — bullet list
4. **Linked systems** — monospace list of integrations
5. **Operational metrics** — 4 KPI tiles
6. **Latest events** — Bloomberg log feed (level-coloured)
7. **Current blockers** — bulleted (often empty)
8. **Future integrations** — bulleted
9. **References** — external doc links

### Agent directory below the orbit

Grouped by Tier (0 / 1 / 2 / 3). Each row shows name + workspace + ACTIVE/IDLE/WARNING/ERROR pill + success rate + last run date. Click → per-agent SSG dashboard.

## 5. Component tree

```
apps/web/src/components/admin/
├── admin-sidebar.tsx                     Brand block + primary nav + planned nav + sign-out
├── agents/
│   ├── agent-orbit.tsx                   Radial SVG layout · 9 positions · supervisory threads
│   ├── agent-node.tsx                    Round chip · 4-light readout · onSelect OR Link
│   ├── agent-detail-panel.tsx            Right-side slide-out · sectioned content
│   ├── agent-dashboard.tsx               Per-agent full page composition
│   ├── agent-status-badge.tsx            Pill with light-canvas tints
│   ├── agent-health-ring.tsx             SVG ring · stroke-dasharray progress
│   ├── agent-logs-panel.tsx              Bloomberg log feed (monospace)
│   └── agent-metrics-panel.tsx           KPI grid 2/4-col responsive
└── dashboard/
    ├── signal-tints.ts                   OK / WARN / ERROR / NEUTRAL contract
    ├── kpi-card.tsx                      Dark-canvas KPI tile + side rail
    ├── ai-ops-feature-card.tsx           Featured CTA + mini orbital glyph
    ├── pipeline-card.tsx                 Pipeline status card
    ├── infra-indicator.tsx               Operational pulse indicator
    └── activity-timeline.tsx             Channel-labelled timeline
```

## 6. Mock data layer

```
apps/web/src/lib/admin/
├── agents/                               11-agent registry (CEO + 9 orbital + hidden CRM)
│   ├── types.ts                          AgentDescriptor · AgentStatusGroup · …
│   ├── status.ts                         groupForStatus() · light + darkText variants
│   ├── registry.ts                       Full registry with mission · cron · blockers
│   └── index.ts                          Barrel
└── dashboard/                            Executive Control Room mock data
    ├── types.ts                          KpiEntry · PipelineEntry · InfraEntry · ActivityEntry
    ├── data.ts                           10 KPIs + 6 pipelines + 6 infra + 8 activity
    └── index.ts
```

## 7. Layout shell

```
apps/web/src/app/user/admin/layout.tsx
└── div bg-[#f6f8f7] (same as /settings/*)
    ├── AppHeader (sticky, institutional)
    ├── max-w-1400 grid 240px + 1fr
    │   ├── AdminSidebar (sticky)
    │   └── <main>{children}</main>
    └── InstitutionalFooter (slim)
```

Inherits typography (font-headline = Manrope), spacing, and the institutional `bg-[#f6f8f7]` canvas from the existing user-settings layout pattern.

## 8. Status definition per agent (mock today)

| Agent | Status | Note |
|---|---|---|
| CEO | active | Tier 0 supervisor · activates in Phase 3 |
| Market Intelligence | healthy | Beta · daily cron live |
| Data Ingestion | healthy | Beta · transactions CLI live |
| COSTAR Admin | manual_mode | "Configured but not operational yet" · CoStar subscription not yet justified |
| CompSet Builder | manual_mode | "Configured but not operational yet" · awaiting underwriting MVP |
| QA Monitoring | monitoring | Beta · daily probes (was hourly, dropped on Hobby plan) |
| Underwriting | standby | Tier 2 · Phase 6 |
| CFO | standby | Tier 3 · Phase 6 |
| CMO | standby | Tier 3 · Phase 6 |
| Customer Support | standby | Tier 3 · Phase 6 |

`crm_dealflow` exists in the registry for DB enum backward compat but is hidden from the orbital roster.

## 9. Why this is institutional-grade

| Property | How it's enforced |
|---|---|
| **No chat UI** | Composition only — KPI tiles · cards · timeline · orbit · slide-out drawer. No conversation surfaces. |
| **No fake tabs** | Every navigation is a real Next.js route. Hash anchors are forbidden. |
| **Bloomberg-terminal aesthetic** | Dark forest-900 / slate-950 canvas · monospaced timestamps · tracked-out micro-labels · 4-light readout · subtle pulse on ACTIVE/ERROR only |
| **Inherits HOTELVALORA design language** | font-headline (Manrope) · forest-900 + lime-300 + slate vocabulary · same `bg-[#f6f8f7]` as `/settings/*` |
| **Mock data is swap-target shaped** | Phase 3 swaps `AGENT_REGISTRY` for a Supabase read + Realtime subscription · zero component changes |
| **Premium tier-readiness** | The institutional aesthetic, dense info, no toy elements — visually positioned for PREMIUM/INSTITUTIONAL tier audience |

## 10. Future evolution

| Phase | Hook |
|---|---|
| Phase 3 | Wire realtime reads from `public.ai_agent_runs` + `public.ai_events`. Drop mock fixture. Status auto-derived from latest run. |
| Phase 3 | `EXECUTIVE_KPIS` becomes aggregation queries (today's spend · agent success rate 7d · pipeline freshness). |
| Phase 3 | `RECENT_ACTIVITY` becomes a Supabase Realtime channel on `ai_events`. |
| Phase 4 | Actions surface on the `AgentDetailPanel` — manual trigger, pause/resume, manual escalation (all gated by `ai_human_review` where appropriate). |
| Phase 5 | XLSX-master `INGESTION_LOG` sheets surface as queryable rows alongside `ai_agent_runs`. The dashboard becomes the single audit lens across all 4 ingestion branches. |
| Phase 6 | Per-tier dashboards: Tier 0 (CEO) gets a strategic-review summary panel; Tier 2 (Underwriting + CompSet) gets per-deal valuation cards. |

## 11. Reference docs

| Topic | Doc |
|---|---|
| Technical architecture | `docs/architecture/admin-ui-architecture.md` |
| Routing | `docs/routing.md` (the `/user/admin/*` section) |
| Components | `docs/design-system/components.md` (signal-tints + Bloomberg patterns) |
| Agent charters | `docs/agents/{ceo,costar-market-data,compset-underwriting}-agent.md` |
| AI Operations Layer master | `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` |
| Architectural decision | `docs/architecture/market-vs-underwriting-separation.md` |
