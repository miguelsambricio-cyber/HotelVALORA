# Admin UI Architecture

Technical architecture of the institutional Administrator surface at `/user/admin/*`.

**Last refreshed:** 2026-05-12
**Companion docs:** `docs/features/admin.md` (the feature dossier · what the operator sees) · `docs/routing.md` (route map)

---

## 1. Architectural goals

| Goal | How it's enforced |
|---|---|
| **Native to HOTELVALORA institutional UI** | Inherits SettingsLayout pattern (AppHeader + sticky sidebar + slim footer). Same `bg-[#f6f8f7]` canvas, same forest-900 / slate / lime-300 palette, same font-headline (Manrope). |
| **Mock data → realtime swap-target shape** | Mock data lives in `apps/web/src/lib/admin/{agents,dashboard}/`. Component contracts (`AgentDescriptor`, `KpiEntry`, etc.) match what `public.ai_agent_runs` / `INGESTION_LOG` will surface in Phase 3. Component code does not change at swap. |
| **No client/server boundary trickery** | All pages are RSC + Static where possible. `AgentOrbit` + `AgentNode` + `AgentDetailPanel` are `"use client"` because of `useState` + animation. Mock data is plain TS — no fetch, no hydration mismatch. |
| **Right-side detail panel for fast drill-in** | `AgentDetailPanel` slides over the orbital view without a route change · ESC closes · scroll-lock · 640px max-width. The full per-agent dashboard at `/user/admin/agents/[id]` remains as a shareable deep-link surface. |
| **Bloomberg-terminal aesthetic** | Dark slate-950 sub-surfaces inside white-canvas cards · monospaced timestamps · tracked-out uppercase micro-labels · 4-light status (ACTIVE/IDLE/WARNING/ERROR) · subtle pulse on operational dots only. |

## 2. Route + layout structure

```
apps/web/src/app/user/admin/
├── layout.tsx                       Shell (AppHeader + AdminSidebar + Footer)
├── page.tsx                         Executive Control Room (5-section dashboard)
└── agents/
    ├── page.tsx                     AI Operations Center (orbital + directory)
    └── [agentId]/
        └── page.tsx                 Per-agent dashboard · SSG with generateStaticParams
```

The shell mirrors `SettingsLayout` so the entire user-facing area shares a single chrome shape. The only differences:

| | SettingsLayout | AdminLayout |
|---|---|---|
| Sidebar brand block | `Valora Prime · User Settings` | `Administrator · Operations Center` (forest-900 + lime-300 tint) |
| Primary nav | Profile · Credentials · Investment | Overview · AI Operations (Live badge) |
| Planned nav | — | Workspaces · Observability · Cost Controls · Audit Log (Phase 3) |

## 3. Mock data layer

Two `lib/admin/*` modules, deliberately swap-target shaped.

### 3.1 · `lib/admin/agents/`

```ts
type AgentId       = "ceo" | "market_intelligence" | "costar_market_data"
                   | "compset_underwriting" | "data_ingestion" | "qa_monitoring"
                   | "underwriting" | "cfo" | "cmo" | "customer_success" | "crm_dealflow"
type AgentStatus       = "healthy" | "active" | "monitoring" | "running"
                       | "manual_mode" | "standby" | "error"
type AgentStatusGroup  = "ACTIVE" | "IDLE" | "WARNING" | "ERROR"

interface AgentDescriptor {
  id · name · shortName · tier
  status · statusLabel · workspace
  purpose · mission · responsibilities · integrations · workflow
  currentMode · lastExecution · nextExecution
  healthScore · successRate · cronSchedule
  kpis · mockLogs · roadmap
  linkedSystems · blockers · futureIntegrations
  infrastructureDeps · references
}
```

`AGENT_REGISTRY: Record<AgentId, AgentDescriptor>` is the single source of truth for the 11 agents. `ORBIT_ORDER: AgentId[]` is the deterministic placement of the 9 orbital agents (Tier 1 first, then Tier 2, then Tier 3) so the operator always finds the same agent in the same orbital slot. `ALL_AGENTS: AgentDescriptor[]` = CEO first + ORBIT_ORDER mapped. `crm_dealflow` lives in the registry but is intentionally omitted from `ORBIT_ORDER`.

`status.ts` exports `groupForStatus(s: AgentStatus): AgentStatusGroup` — the only place where the rich status enum maps to the 4-light readout. Plus `getGroupVisual(g)` returning `{ text, bg, ring, darkText, dot, pulse }` — light variants for badges on white, `darkText` for the orbital dots on slate-950.

### 3.2 · `lib/admin/dashboard/`

```ts
type SignalLevel = "ok" | "warn" | "error" | "neutral"

interface KpiEntry      { id, label, value, subline, trend?, trendLevel?, signal }
interface PipelineEntry { id, name, domain, lastUpdate, ingestionStatus, queueSize, successRate, signal, workspace }
interface InfraEntry    { id, name, scope, status, detail, region, signal }
interface ActivityEntry { id, ts, channel, title, detail, signal }
```

Four exported constants in `data.ts` — `EXECUTIVE_KPIS` (10), `PIPELINES` (6), `INFRA_SERVICES` (6), `RECENT_ACTIVITY` (8). All consume the same `SignalLevel` for the status rail / dot.

## 4. Component architecture

### 4.1 · Agents sub-tree (`components/admin/agents/`)

| Component | Role | Key props |
|---|---|---|
| `AgentNode` | Round chip in the orbital layout | `agent`, `variant: 'center' \| 'orbit'`, `onSelect?`, `active?` |
| `AgentOrbit` | Radial SVG layout · supervisory threads · panel state | `orbitRadius?` (default 240) |
| `AgentDetailPanel` | Right-side slide-out drawer with 9 sections | `agent`, `open`, `onClose` |
| `AgentDashboard` | Per-agent full page composition | `agent` |
| `AgentStatusBadge` | Pill with light-canvas tints | `status`, `label?`, `size?` |
| `AgentHealthRing` | SVG ring with stroke-dasharray progress | `score`, `status`, `size?`, `thickness?` |
| `AgentLogsPanel` | Bloomberg log feed (monospace) | `entries[]` |
| `AgentMetricsPanel` | KPI grid 2/4-col responsive | `kpis[]`, `title?` |

#### AgentNode dual-mode

When `onSelect` is provided, renders as a `<button>` triggering the detail panel. When omitted, renders as a Next.js `<Link>` to `/user/admin/agents/[id]`. This keeps the orbital surface fast-iteration while the SSG pages stay shareable.

#### AgentOrbit layout math

```ts
const positions = ORBIT_ORDER.map((id, i) => {
  const angle = -Math.PI / 2 + (i / ORBIT_ORDER.length) * Math.PI * 2;
  const x = Math.cos(angle) * orbitRadius;
  const y = Math.sin(angle) * orbitRadius;
  return { id, x, y };
});
```

First position is at the top (`-π/2`), walks clockwise. Each orbital node is absolutely positioned at `top: 50% + y`, `left: 50% + x`. CEO is centred. SVG threads draw from `(0, 0)` to each `(x, y)`.

The container minimum height = `orbitRadius * 2 + 220` so the orbital ring fits without clipping plus room for the header band.

### 4.2 · Dashboard sub-tree (`components/admin/dashboard/`)

| Component | Surface section | Style |
|---|---|---|
| `KpiCard` | Executive Overview tile | Dark slate-950 canvas + side rail (signal-coloured) + tracked-out label + headline value + subline + trend pill |
| `AiOpsFeatureCard` | Section 02 featured CTA | Dark gradient canvas + Bloomberg grid pattern + mini orbital glyph + lime CTA button |
| `PipelineCard` | Data Pipeline Center card | Dark slate-950 + side rail + status pill + 3-col cell strip (last update / queue / success) |
| `InfraIndicator` | Infrastructure Monitoring row | Dark slate-950 + animated dot + region pill |
| `ActivityTimeline` | Recent Activity timeline | Dark slate-950 + per-row signal dot + channel label + relative timestamp |

#### `signal-tints.ts` — the visual contract

```ts
SIGNAL_VISUAL: Record<SignalLevel, {
  text: string    // tailwind text class
  bg:   string    // tailwind bg class
  ring: string    // tailwind ring class
  rail: string    // side-rail bg
  dot:  string    // glyph (●, ◐, ▲, ○)
  pulse: boolean  // animate-pulse for the dot
}>
```

Used identically by `KpiCard` / `PipelineCard` / `InfraIndicator` / `ActivityTimeline` so the four-tile signal language is uniform.

## 5. Interaction state

The only stateful component is `AgentOrbit`:

```tsx
const [selected, setSelected] = useState<AgentDescriptor | null>(null);
```

Click any node → `setSelected(agent)` → `AgentDetailPanel` opens. Click backdrop / ESC / X → `setSelected(null)`.

The slide-out applies `useEffect` body-scroll lock + Escape listener. No state libraries (Zustand / Redux); the surface is small enough that React local state is correct.

## 6. Light-canvas vs dark-canvas

The Administrator surface lives on the `bg-[#f6f8f7]` light canvas (inherited from SettingsLayout) but the operational sub-surfaces (KPI tiles · pipeline cards · infra indicators · activity timeline · orbital frame · log feeds · detail panel) are **dark sub-canvases** (`bg-slate-950` / `bg-gradient-from-slate-950-via-forest-900-to-slate-950`).

This is deliberate: the light canvas keeps the section feel like the rest of the user area, while the dark sub-canvases mark "operational data" — the institutional convention from Bloomberg / Palantir / MSCI.

Status tints therefore come in **two flavours**:

| Use | Source | Example |
|---|---|---|
| Pill on white canvas (badges in the agent directory) | `getGroupVisual(g).text` → `text-emerald-700` | Light · readable on white |
| Dot on dark canvas (orbital node) | `getGroupVisual(g).darkText` → `text-emerald-400` | Dark-saturated · readable on slate-950 |

`signal-tints.ts` follows the same dual-variant pattern (`text`, `bg`, `ring`, `rail`) — though most signal usage lives on dark canvases so the variants are unified.

## 7. Phase 3 realtime swap plan

The mock data layer is shaped for a mechanical replacement:

| Today (mock) | Phase 3 (realtime) |
|---|---|
| `import { AGENT_REGISTRY } from "@/lib/admin/agents"` | `useAgentRegistry()` hook → Supabase read + Realtime subscription on `ai_agents` |
| `agent.status` from the registry | Derived from `ai_agents.status` + most recent `ai_agent_runs.status` |
| `agent.lastExecution` from the registry | `max(run_started_at)` per agent on `ai_agent_runs` |
| `agent.healthScore` from the registry | Aggregation of last-N run statuses + threshold logic |
| `agent.mockLogs[]` | `ai_agent_runs.steps` of latest run + recent `ai_events` for the agent |
| `EXECUTIVE_KPIS` from `data.ts` | Server-side aggregations across `ai_agent_runs` + per-workspace `INGESTION_LOG` |
| `PIPELINES` from `data.ts` | Realtime reads from `news_ingestion_runs` + `INGESTION_LOG` sheets via the audit-sync endpoint |
| `INFRA_SERVICES` from `data.ts` | Vercel deployments API + Supabase advisors + Resend status |
| `RECENT_ACTIVITY` from `data.ts` | Realtime channel on `ai_events` ordered by `occurred_at desc` |

**Component code does not change.** Only the data layer becomes async + subscribed.

## 8. Build characteristics

| Route | Mode | First Load JS |
|---|---|---|
| `/user/admin` | Static | 117 KB |
| `/user/admin/agents` | Static | 117 KB |
| `/user/admin/agents/[agentId]` | SSG · 11 paths | 117 KB |

11 paths in the SSG = 10 visible agents + `crm_dealflow` (registry entry, still pre-rendered for direct linking even though hidden from orbit). `generateStaticParams()` in `[agentId]/page.tsx` enumerates `ALL_AGENTS.map(a => a.id)`.

## 9. Edge cases handled

| Edge case | Behaviour |
|---|---|
| User types `/admin` | next.config `redirects()` returns 308 → `/user/admin` |
| User types `/settings/admin` | next.config 308 → `/user/admin` |
| User types `/user` | next.config 307 → `/user/admin` |
| User direct-links `/user/admin/agents/unknown_agent_id` | `notFound()` from `isAgentId()` guard |
| Operator on `/settings/profile` wants admin | Featured `Administrator · Operations Center` CTA card always visible in settings sidebar |
| Operator on `/library/favorites-map` wants admin | AppHeader pill `ADMIN` visible globally |
| Operator presses ESC while detail panel is open | Panel closes, body scroll restored |
| Orbital nav from a non-Next.js context (curl, crawler) | Routes are static · resolve as plain HTML · no JS needed for first paint |

## 10. Anti-patterns rejected

- ❌ Hash-based admin navigation (`/settings/profile#admin`) — broken UX, no real route, was the v1 mistake; fixed by migrating to `/user/admin` real route.
- ❌ Page-level `redirect()` from `next/navigation` — packs into RSC error digest, no HTTP Location header, breaks cold browser GETs. Replaced with `next.config.mjs redirects()`.
- ❌ Conversational AI surfaces — explicitly NOT a chat UI. The detail panel is read-only · institutional · no input fields.
- ❌ Per-agent fetch on click — the SSG pages pre-render. The slide-out reads from in-memory registry. Phase 3 introduces subscriptions; today is instant.
- ❌ Toast notifications for routine ops — operator drives from the dashboard; success is implicit via state changes. Toasts reserved for explicit operator actions (Phase 4).

## 11. File map

```
apps/web/src/app/user/admin/
├── layout.tsx
├── page.tsx                      Executive Control Room
└── agents/
    ├── page.tsx                  AI Operations Center
    └── [agentId]/page.tsx        Per-agent dashboard (SSG)

apps/web/src/components/admin/
├── admin-sidebar.tsx
├── index.ts                      Barrel re-export
├── agents/                       8 components (orbit · node · panel · dashboard · badge · ring · logs · metrics)
└── dashboard/                    6 components (signal-tints · kpi · ai-ops-feature · pipeline · infra · activity)

apps/web/src/lib/admin/
├── agents/                       Registry + types + status (4 files)
└── dashboard/                    Types + data + barrel (3 files)

apps/web/next.config.mjs          redirects() rules for /admin, /settings/admin, /user
apps/web/src/components/layout/app-header.tsx   ADMIN pill
apps/web/src/components/settings/settings-sidebar.tsx   Featured AdminCtaCard
```
