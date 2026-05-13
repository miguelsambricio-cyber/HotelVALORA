# Feature · Administrator Section

Institutional Operations Center for HOTELVALORA. The visual layer of the AI Operations Layer plus the cross-platform supervisory dashboard.

**Last refreshed:** 2026-05-13
**Status:** 🟢 Shipped · live-state aggregator replaces compile-time registry · interactive article drawer · curated source roster · Hosteltur + Alimarket at operational parity with placeholder T2

> Institutional baseline state: `docs/SNAPSHOT_2026_05_12.md` § 3.3.

## A. `/user/admin/integrations` taxonomy (9-layer operational map · reconciled 2026-05-13 PM)

The integrations surface reconciled against the operator account inventory. Nine layers, rendered in operational order. Canonical reconciliation matrix lives in `docs/integrations/account-inventory.md`; the operator-provisioned account list lives in `memory/project_operator_accounts.md` (architectural source-of-truth).

| # | Layer | Source-of-truth registry |
|---|---|---|
| 1 | **Infrastructure** | `platform-registry.ts` § INFRASTRUCTURE (Supabase DB/Storage · Vercel · Vercel Cron · Mapbox · Namecheap) |
| 2 | **Auth & Identity** | `platform-registry.ts` § AUTH (Supabase Auth · Google Cloud Console OAuth · Auth.js parked) |
| 3 | **AI** | `platform-registry.ts` § AI (OpenAI API) |
| 4 | **Analytics & Observability** | `platform-registry.ts` § ANALYTICS (Vercel Analytics · Speed Insights · PostHog · Sentry) |
| 5 | **Communications** | `platform-registry.ts` § COMMUNICATIONS (Resend · Gmail Signals · Slack · Twilio) |
| 6 | **Intelligence Sources** | `lib/admin/integrations/registry.ts` + live merge via `live.ts` (rich card · session + credentials telemetry) |
| 7 | **Relationship Intelligence** | `platform-registry.ts` § RELATIONSHIP_INTELLIGENCE (Datasite · Google Contacts · Gmail Relationship Intelligence) |
| 8 | **Commercial / Monetization** | `platform-registry.ts` § COMMERCIAL (Subscription Engine · Campaign Attribution · Stripe) |
| 9 | **Developer Infrastructure** | `platform-registry.ts` § DEVELOPER_INFRASTRUCTURE (GitHub · Google Developer Program · Apple Developer) |

Every layer renders the same compact `IntegrationTile` (canonical visual contract = the `InfraIndicator` row in `/user/admin` Section 05 Infrastructure Monitoring). The tile is wrapped in `IntegrationDetailSheet` so a click opens the full technical dossier in a responsive Radix Dialog: bottom-sheet on mobile, right-side drawer on desktop. Two adapter components feed the tile + sheet pair: `PlatformIntegrationTile` for platform integrations (8 of 9 layers), `IntelligenceSourceTile` for the intelligence layer (T1 + T2 credential + session telemetry preserved inside the sheet, with an "Open full dossier" link to `/user/admin/integrations/[id]` for deeper drill-down).

The previous large card components (`IntegrationCard`, `PlatformIntegrationCard`) are no longer imported on this surface, but `IntegrationCard` still renders inside the Executive Control Room's Intelligence Sources section on `/user/admin`.

### Hero KPI buckets (executive control room · codified 2026-05-13)

The page opens with six glow KPI cards backed by `lib/admin/integrations/unified-status.ts`. The classifier rolls up **both** registries (intelligence + platform) onto one taxonomy so operators see one number per state — not two divergent counters.

| Bucket | Definition | Tone |
|---|---|---|
| **TOTAL** | All integrations across both registries · denominator for the hero | lime |
| **LIVE** | Fully operational + autonomous · refreshes without operator intervention | emerald |
| **PARTIAL** | Works end-to-end but depends on manual workflows, exports, BETA paths, or incomplete automation. Includes operator-managed integrations with no cron | amber |
| **NOT WIRED** | Operator account or env scaffolded · no active code path calls | sky |
| **FAIL** | `signal === "error"` or `connection === "failing"` | rose |
| **PLANNED** | Roadmap only · no account or no env | violet |

**Manual-workflow override** (single load-bearing rule): a platform integration with `operatorManaged: true` and no `cronDependencies` rolls up to **PARTIAL** even if its per-card status is `live`. Lives centrally in `classifyPlatformIntegration()` so the per-card label can keep saying "live" (correct for the layer detail) while the hero shows it as PARTIAL (correct for the executive read).

Underneath the hero, a slim telemetry ribbon (`OperationalStrip`) carries five static governance cells: platform layers · total integrations · operator controlled (100%) · access (Internal · restricted) · monitoring (24/7). On lg+ the ribbon collapses to a single horizontal status bar with hairline dividers between cells; on tablet/mobile it stacks as a tight 2/3-col rounded-cell grid.

**Density (post-2026-05-13 tightening):** the hero footprint is ~25% smaller than the first showcase pass. Cards use `rounded-xl` (not `2xl`), `p-2.5 sm:p-3` padding, `text-2xl sm:text-3xl` numerals, 11-px icons, `text-[8.5px]` labels, and a smaller `h-20 w-20 blur-2xl` glow. The outer hero is `p-3 sm:p-4` with `mb-3` between header block and KPI grid. Target feeling: Bloomberg terminal × Apple system dashboard × institutional observability panel — *not* a SaaS pricing page.

Full classifier pseudocode + worked examples in `docs/integrations/account-inventory.md` § Hero KPI counting logic.

### Status taxonomy

| Status | Meaning | Examples today |
|---|---|---|
| **LIVE** | Operational end-to-end in production | Supabase DB · Vercel · Mapbox · Resend · GitHub |
| **PARTIAL** | Wired in some surfaces, not others | Sentry (api yes · web no) · Supabase Auth (code ready · `AUTH_ENABLED` flag pending) |
| **CONFIGURED_NOT_WIRED** | Operator account exists · no code path calls | OpenAI · PostHog · Stripe · Sentry/web · Apple Dev · Google Dev Program · Auth.js |
| **PLANNED** | No account or no env yet | Slack · Twilio |

### Adding a new integration

- **Intelligence source** → extend `INTEGRATIONS_REGISTRY` in `registry.ts` (gets full session/credentials lifecycle for free).
- **Platform integration** (any other layer) → add a descriptor to the layer array in `platform-registry.ts`. The page auto-renders.
- **New operator account** → also update `memory/project_operator_accounts.md` and the reconciliation matrix in `docs/integrations/account-inventory.md`.

### Compact-tile + click-to-expand contract (codified 2026-05-13)

The integrations registry visually mirrors `/user/admin` Section 05 (Infrastructure Monitoring). The canonical sizing reference for **any new integration card** on this page is `components/admin/dashboard/infra-indicator.tsx`. Don't introduce a heavier card here; if a new piece of information doesn't fit one mono metadata line, put it inside the expanded detail sheet.

**Tile (default state) shows only:**
- provider/name (`text-[13px]` extrabold)
- status badge (Live · Partial · Not wired · Fail · Planned)
- region or provider chip (`text-[9.5px]` mono)
- 1-line truncated description
- one mono metadata line

**Sheet (click-to-expand) shows full dossier:** purpose paragraph, auth method, env vars, schema tables, cron jobs, consumed-by surfaces, operational notes, external links, next milestone, operator-managed flag. For intelligence sources also: Articles Today/7d/30d, reliability, last sync, connection + auth badges, "Open full dossier" link to `/user/admin/integrations/[id]`.

**Interaction:**
- Tile is a `<button>` (whole tile is the click target · keyboard-accessible · focus ring on lime-300)
- Radix Dialog with responsive positioning: mobile → bottom sheet (`inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl`) · desktop → right-side drawer (`sm:right-0 sm:top-0 sm:h-full sm:w-[30rem] sm:rounded-l-2xl`)
- ESC / overlay-click / close button dismiss

## 0. Status semantics — sidebar vs page header (codified 2026-05-13)

The sidebar carries **operational maturity only**. Access scope ("operator only", "internal infrastructure") is page-header secondary metadata, not a sidebar badge. The two concerns are deliberately split so the sidebar reads as a clean operational map.

### Sidebar badges · operational maturity

The sidebar answers one question — *is this module operational?*

| Badge | Tone | Meaning |
|---|---|---|
| **LIVE** | emerald | Operational end-to-end MVP · safe to use in production |
| **BETA** | amber | Partially connected · operational but with rough edges · expect polish gaps |
| **PLANNED** | slate | Not yet built · static affordance for the roadmap |

Current sidebar order (operational hierarchy · top → bottom):

| # | Module | Stage | Badge |
|---|---|---|---|
| 1 | Overview | (entry) | — |
| 2 | AI Operations | core intelligence | LIVE |
| 3 | **Hotels** | reference data backbone (scaffold · 2026-05-14) | BETA |
| 4 | Integrations | infrastructure | LIVE |
| 5 | Campaigns | growth | LIVE |
| 6 | Subscriptions | monetization | LIVE |
| 7 | Users | onboarded users | LIVE |
| 8 | Contacts | relationship graph · upstream acquisition / support | LIVE |

Hotels sits next to AI Operations because the COSTAR & Hotel Reference Agent is its owner. Planned section below the primary nav: Workspaces · Observability · Cost Controls · Audit Log.

Promoting BETA → LIVE requires: end-to-end happy path with audit · soft-delete posture where mutations exist · no caller-visible holes in the operator workflow.

### Page header secondary metadata · access scope

Where useful, a page's header chip strip surfaces *who uses this module and why*. The current vocabulary:

| Chip text | Where it appears | What it signals |
|---|---|---|
| Operator only · internal infrastructure | AI Operations, Integrations | This surface exists for operator infrastructure and has no customer-facing counterpart by design |
| (none) | Contacts, Users, Campaigns, Subscriptions | Default: operator console for customer-visible data |

Access scope is *additive context*. It never replaces the operational badge in navigation.

---

## B. `/user/admin/agents` · Executive AI Command Center · six-section hierarchy (codified 2026-05-13)

The agents surface is the institutional control room for HotelVALORA's autonomous intelligence infrastructure. Top-down, the page renders six sections — every one a separately anchored `<section>` so the drillable totems in §03 can jump to the right place without navigating away.

| # | Section | Anchor | Source / component |
|---|---|---|---|
| 01 | **AI Operation Center** (primary surface) | `#command-center` | `components/admin/agents/agent-orbit.tsx` — CEO + 9 orbital nodes |
| 02 | **Agent Roster by Tier** (operator management) | `#agent-roster` | `components/admin/ai-ops/agent-roster.tsx` — per-agent CTAs |
| 03 | **Operational Metrics** (drillable) | `#operational-metrics` | `TotalsStrip` + `TopSignalsSummary` re-exported from `operational-dashboard.tsx` |
| 04 | **Priority Intelligence Feed** (capped 5 + scroll) | `#priority-intel-feed` | `intelligence-feed-capped.tsx` |
| 05 | **Ingestion Monitoring** (compact) | `#ingestion-monitoring` | `RecentRunsTable` + `ThroughputCard` |
| 06 | **Alerts & Failures** (anchored bottom) | `#alerts-failures` | `DegradedPanel` + `AlertsFeed` |

The shared section header atom is `components/admin/ai-ops/section-shell.tsx` — numbered eyebrow + forest-900 title + slate subline + optional trailing badge, with `scroll-mt-20` so anchor drilldowns land below the sticky header.

### Drillable KPI contract

`TotalsStrip` totems accept an optional `href`. When set, the totem renders as a `<Link>` with a `drill ↓` hover reveal. Today's wiring:

| Totem | Target |
|---|---|
| Runs · 7d · Success Rate · Successful | `#ingestion-monitoring` |
| Partial · Failed | `#alerts-failures` |
| Articles · 7d | `/library` |
| Priority · 7d | `#priority-intel-feed` |

### Agent Roster CTAs

Each row carries four operator controls: **Open dashboard** + **View activity** (active links to `/user/admin/agents/<id>` and `…#runs`), **Edit** + **Pause/Resume** (rendered with `aria-disabled="true"` and explanatory tooltips because the `ai_agents` write surface is Phase-3 work). The disabled affordance is intentional — when the mutation layer lands, swap the `<button disabled>` for the server action.

### Priority feed cap

`IntelligenceFeedCapped` shows the top 5 ranked items above the fold (source-balanced + signal-ranked upstream by `loadAiOpsLive`), then a `max-h-[28rem] overflow-y-auto` panel labelled "Backlog · N more · scroll" for the remainder. Each row gains an agent-attribution chip ("Market Intelligence Agent") alongside the existing source / premium / authed / score / time chips.

---

## 1. What lives here

`/user/admin/*` is the operator-facing institutional operations center. It is NOT a customer-facing surface, NOT a chat UI, NOT a generic SaaS admin panel. The visual direction is Bloomberg Terminal × Palantir × MSCI Real Assets — dense, monospaced, tracked-out, dark canvas with lime-300 accents.

| Route | Surface | Build mode |
|---|---|---|
| `/user/admin` | Executive Control Room (6-section dashboard) | Static |
| `/user/admin/agents` | **Executive AI Command Center** · six-section operational hierarchy (orbital → roster → metrics → priority intel → ingestion → alerts) | Dynamic (`force-dynamic` · live aggregator) |
| `/user/admin/hotels` | **Hotel Reference Registry** · scaffolded 2026-05-14 · operator search + edit window onto the COSTAR hotel inventory backbone | Dynamic (`force-dynamic` · stub registry) |
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
