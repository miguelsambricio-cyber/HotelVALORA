# Design System · Components

> **Scope clarification · 2026-05-19**
>
> This file is the **cross-cutting component index** organised by family (Layout · Library · Settings · Admin / Operations Center · UI primitives). Use it when you need to discover what exists across the whole product.
>
> For **report-domain primitives with prop signatures + composition examples**, the canonical reference is `docs/component-library.md`. The Report family section here is intentionally minimal and points there.

Index of every canonical component grouped by import surface.

## Layout (cross-cutting)

| Component | File | Notes |
|---|---|---|
| `AppHeader` | `components/layout/app-header.tsx` | Sticky global header. Route-aware BIBLIOTECA active when `pathname.startsWith("/library")`. Inverts USUARIO button styling on library routes. |
| `InstitutionalFooter` | `components/layout/institutional-footer.tsx` | `variant: "default" \| "slim"`. Shared by `/settings/*` and `/library/*`. |
| `Sidebar` | `components/layout/sidebar.tsx` | Old dashboard sidebar — pre-Library era. |

## Library family

| Component | File | Notes |
|---|---|---|
| `LibraryShell` | `components/library/library-shell.tsx` | `h-screen` kiosk shell. Body row capped at `max-w-[1600px]`. |
| `LibrarySidebar` | `components/library/library-sidebar.tsx` | Props: `title` / `subtitle` / `searchPlaceholder`. Reused by all 4 library routes. |
| `MapLegendCard` | `components/library/map-legend-card.tsx` | Legend (3 categories) + layers (Heatmap / Metro / Centro Histórico). |
| `MapLayerToggle` | `components/library/map-layer-toggle.tsx` | 28×16 rail switch, slate-300 → blue-700 on. |
| `LibraryFilterTabs` | `components/library/library-filter-tabs.tsx` | Route-driven FAVORITOS ⇄ TOP (`activePaths[]`). |
| `HotelMap` | `components/library/hotel-map.tsx` | Mock institutional map. Takes `listViewHref`. |
| `HotelMapMarker` | `components/library/hotel-map-marker.tsx` | Generic — `dotClassName` / `tipClassName` / pulse. |
| `InstitutionalMapControls` | `components/library/institutional-map-controls.tsx` | Zoom +/-, optional list-view Link, layers. |
| `FloatingHotelCard` | `components/library/floating-hotel-card.tsx` | Bottom-right preview. Reads selected report. |
| `FavoritesListContent` | `components/library/favorites-list-content.tsx` | Header bar (badge / title / actions) + table. |
| `TopReportsListContent` | `components/library/top-reports-list-content.tsx` | Same as above with Top Reports copy and REF column on. |
| `FavoritesTable` | `components/library/favorites-table.tsx` | 39/40-column institutional table. Prop `showReferenceColumn`. |
| `AmenityIconCell` | `components/library/amenity-icon-cell.tsx` | One of 8 amenities. forest-700 active / slate-300 inactive. |
| `ReportTypeChip` | `components/library/report-type-chip.tsx` | Premium / PRO / Public / Private + flame / edit / private indicators. |
| `LockedCell` | `components/library/locked-cell.tsx` | Tier-gated cell pill (blue lock). |
| `ContactCell` | `components/library/contact-cell.tsx` | Mail icon + portal popover (top-promoted only). |

## Report family

> 🔀 **Canonical: [`docs/component-library.md`](../component-library.md)** — full prop signatures, composition examples and import patterns for every report primitive. The list below is a navigation pointer only.

- **Shell**: `ReportShell` · `ReportPaper` · `ReportSidebar` · `ReportTopNav` · `ReportFooter` (`components/report/shell/`)
- **Primitives**: `ReportSection` · `ReportHeader` · `MetricRow` · `MetricTable` · `StatCard` · `StatGrid` · `UpgradeGate` · `UpgradeCard` · `ImageGallery` · `ReportMap` · `PrintPage` · `PdfExportButton` (barrel: `components/report/primitives/index.ts`)

## Settings family

| Component | File |
|---|---|
| `SettingsLayout` | `components/settings/settings-layout.tsx` |
| `SettingsSidebar`, `SettingsHeader`, `ProfileForm`, `ProfileCompletionCard` | siblings |
| `InstitutionalToggle` | `components/settings/investment/institutional-toggle.tsx` — canonical ON/OFF switch |
| Investment cards: `MasterToggle`, `DisplayModeToggle`, `LabeledSlider`, `UnderwritingSlider`, `BasicPremiumPicker`, `CapRatePicker`, `SavedScenarioList`, `AcquisitionCostTable`, `FfeReserveYears` | `components/settings/investment/*` and `value/*` |

## UI primitives (Radix-based)

`components/ui/*.tsx` — `Button`, `Card`, `Badge`, `Dialog`, `Switch`, `Tabs`, `Tooltip`, `SearchBar`, `PricingCard`. Prefer these over rolling new primitives.

## Admin / Operations Center family

Institutional operations surface at `/user/admin/*`. Bloomberg-terminal aesthetic on dark sub-canvases inside the light HOTELVALORA shell. Two sub-trees plus the shell sidebar.

| Component | File | Notes |
|---|---|---|
| `AdminSidebar` | `components/admin/admin-sidebar.tsx` | Mirrors `SettingsSidebar` pattern: brand block + pill nav with lime-yellow active rail. Forest-900 + lime-300 tint for the brand block. Includes "Planned" section listing future Phase 3 admin surfaces (Workspaces · Observability · Cost Controls · Audit Log). |

### Agents sub-tree

| Component | File | Notes |
|---|---|---|
| `AgentOrbit` | `components/admin/agents/agent-orbit.tsx` | Radial SVG layout — CEO Agent at the centre, 9 operational agents on a 2π orbit, supervisory threads from each orbital position back to CEO with stroke colour mirroring agent status. Bloomberg-style grid background. Manages selected-agent state for the slide-out panel. |
| `AgentNode` | `components/admin/agents/agent-node.tsx` | Round chip · 4-light readout (ACTIVE / IDLE / WARNING / ERROR) + success rate. Dual-mode: renders as `<button>` when `onSelect` is provided (opens detail panel), as Next.js `<Link>` otherwise (navigates to SSG page). |
| `AgentDetailPanel` | `components/admin/agents/agent-detail-panel.tsx` | Right-side slide-out drawer · 640px max · ESC closes · body scroll-lock. 9 sections: Mission · Operational State · Responsibilities · Linked systems · Operational metrics · Latest events · Current blockers · Future integrations · References. |
| `AgentDashboard` | `components/admin/agents/agent-dashboard.tsx` | Full-page composition for `/user/admin/agents/[agentId]` SSG. Composes header (badge + ring + breadcrumb) + workflow card + KPIs + cards + logs + roadmap + references. |
| `AgentStatusBadge` | `components/admin/agents/agent-status-badge.tsx` | Pill with light-canvas tints for use on white surfaces. Reads `getStatusVisual(status)`. |
| `AgentHealthRing` | `components/admin/agents/agent-health-ring.tsx` | SVG ring · stroke-dasharray progress · inner numeric score + status hint. |
| `AgentLogsPanel` | `components/admin/agents/agent-logs-panel.tsx` | Monospace dark log feed — timestamp + level prefix (ok/info/warn/error · level-coloured) + message. |
| `AgentMetricsPanel` | `components/admin/agents/agent-metrics-panel.tsx` | KPI grid 2/4-col responsive · uniform across all per-agent dashboards. |

### Dashboard sub-tree (Executive Control Room)

| Component | File | Notes |
|---|---|---|
| `KpiCard` | `components/admin/dashboard/kpi-card.tsx` | Dark slate-950 canvas + side rail (signal-coloured) + tracked-out label + headline value + subline + trend pill. The atomic tile of the 10-KPI Executive Overview grid. |
| `AiOpsFeatureCard` | `components/admin/dashboard/ai-ops-feature-card.tsx` | Featured CTA into `/user/admin/agents`. Dark gradient canvas + Bloomberg grid pattern + mini orbital glyph (SVG · 9 dots round a central CircuitBoard icon) + lime CTA button. |
| `PipelineCard` | `components/admin/dashboard/pipeline-card.tsx` | One card per ingestion pipeline. Dark canvas + side rail + status pill (ACTIVE / MANUAL / IDLE / DEGRADED) + 3-col cell strip (last update / queue size / success rate) + workspace path. |
| `InfraIndicator` | `components/admin/dashboard/infra-indicator.tsx` | One row per infrastructure service. Animated dot + service name + status pill (OPERATIONAL / DEGRADED / MAINTENANCE / OUTAGE) + region pill + scope subline + detail mono. |
| `ActivityTimeline` | `components/admin/dashboard/activity-timeline.tsx` | Bloomberg-style timeline. Per-row: signal dot + channel label pill (AGENT / INGEST / CRON / DEPLOY / AUDIT / INFRA) + title + detail line + relative timestamp (`just now` / `3m ago` / `2026-05-09`). |

### Signal-tints contract (`components/admin/dashboard/signal-tints.ts`)

Four-light visual contract shared across `KpiCard`, `PipelineCard`, `InfraIndicator`, `ActivityTimeline`. Mirrors the Bloomberg / Palantir convention.

| Signal | Tailwind tokens | Dot | Pulse | Use case |
|---|---|---|---|---|
| `ok` | `text-emerald-400` · `bg-emerald-500/10` · `ring-emerald-500/20` · rail `bg-emerald-400` | ● | yes | Operational, within SLA |
| `warn` | `text-amber-400` · `bg-amber-500/10` · `ring-amber-500/20` · rail `bg-amber-400` | ◐ | no | Manual mode, drift, needs attention |
| `error` | `text-rose-400` · `bg-rose-500/10` · `ring-rose-500/20` · rail `bg-rose-500` | ▲ | yes | Failure state |
| `neutral` | `text-slate-400` · `bg-slate-500/10` · `ring-slate-500/20` · rail `bg-slate-500` | ○ | no | Idle, no current activity |

**Agent-status group contract** (`lib/admin/agents/status.ts`) maps the richer 7-state `AgentStatus` enum to a 4-light `AgentStatusGroup` (ACTIVE / IDLE / WARNING / ERROR). Two visual variants per group:

| Variant | Used on | Example |
|---|---|---|
| Light (`text`, `bg`, `ring`) | White / `bg-[#f6f8f7]` surfaces (badges in the agent directory) | `text-emerald-700 bg-emerald-50 ring-emerald-200` |
| Dark (`darkText`) | Slate-950 surfaces (orbital nodes, detail panel, logs feed) | `text-emerald-400` |

This double-variant pattern lets a single status decision drive consistent UI on both the institutional light canvas AND the Bloomberg-style dark sub-canvases without one-off colour overrides per surface.

### Bloomberg-terminal patterns (applied throughout admin)

| Pattern | Where it shows up |
|---|---|
| **Tracked-out uppercase micro-labels** | `tracking-[0.22em]` to `tracking-[0.32em]` · `text-[9px]` to `text-[11px]` · `font-headline` (Manrope) bold. Applied to section eyebrows, KPI labels, status pills, sidebar nav badges. |
| **Monospace timestamps + identifiers** | `font-mono text-[10px] uppercase tracking-widest` for ISO timestamps, deploy SHAs, agent IDs, log channel labels. |
| **Side rails on cards** | 3px-wide vertical bar on the left edge of `KpiCard` and `PipelineCard`, coloured by signal. Reinforces signal at a glance without dominating the card. |
| **Subtle pulse on operational dots only** | `animate-pulse` on `ok` + `error` dots; static on `warn` + `neutral`. Avoids animation noise; pulse is the live-state signal. |
| **Dark gradient canvases for operational data** | `bg-gradient-to-br from-slate-950 via-forest-900 to-slate-950` for the orbital frame + AI Ops feature card. Inset `shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]` for the polished look. |
| **Grid pattern overlay** | Faint lime-300 grid (`opacity-[0.06]` to `0.08`) on dark canvases · Bloomberg convention · adds depth without competing with content. |
| **Section eyebrow numbering** | `Section 01` / `Section 02` etc. in tracked-out mono above each main section header. Reinforces the "operations manual" feel. |

## Selection guide

When building a new surface:
1. **Reach for a `LibraryShell` / `SettingsLayout` / `ReportShell` / `AdminLayout`** — never roll a shell yourself.
2. **For institutional table-like surfaces** — reach for `components/library/*` primitives — they already enforce density.
3. **For institutional operational surfaces** — reach for `components/admin/dashboard/*` primitives (KpiCard / PipelineCard / InfraIndicator / ActivityTimeline) + the `signal-tints.ts` contract.
4. **For data-rendering pages that may print** — reach for the report primitives barrel.
5. **Only add to `components/ui/`** if no existing Radix-based primitive fits.
