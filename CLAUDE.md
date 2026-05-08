# CLAUDE.md — HotelVALORA

Project-level instructions for Claude Code. These override defaults for every session in this repo.

---

## AI Documentation — Mandatory Maintenance

Documentation updates are **NOT optional**. After every completed feature, integrated page, architectural change, reusable component, routing update, report/print update, business logic change, API integration, or DB schema change — update all relevant docs before closing the task.

### Root AI docs (always check first)

| File | Update when |
|---|---|
| `AI_CONTEXT.md` | Stack changes, new domain, scoring/logic changes, new conventions |
| `RULES.md` | New constraints, changed patterns, new file-placement rules |
| `ENTRYPOINTS.md` | New files that are task entry points; remove stale paths |

Limits: `AI_CONTEXT.md` ≤ 300 lines, `RULES.md` ≤ 300 lines, `ENTRYPOINTS.md` ≤ 200 lines.

### `/docs` files (domain-specific, always in sync)

| File | Update when |
|---|---|
| `docs/architecture.md` | New service, topology change, app flow change |
| `docs/routing.md` | New route, layout shell change, navigation wiring |
| `docs/frontend.md` | New component area, data-fetching pattern, auth change |
| `docs/report-system.md` | New report section, section hierarchy change, shell change |
| `docs/print-pdf.md` | Print/PDF change, scale/zoom change, new print variant, browser fallback |
| `docs/maps.md` | Map system change (CompSet Mapbox or stylised pin map for Market Overview) |
| `docs/design-system.md` | New color token, typography rule, spacing convention |
| `docs/component-library.md` | New canonical primitive, prop API change on a primitive |
| `docs/business-rules.md` | New tier/gate rule, premium logic, workflow constraint |
| `docs/financial.md` | New metric, formula change, valuation display rule |
| `docs/workflows.md` | User flow change, new CTA wire-up, step added/removed |
| `docs/changelog.md` | After every task — one entry per feature/fix |
| `docs/database.md` | New table, column, migration, FK |
| `docs/api.md` | New endpoint, changed contract, new response shape |
| `docs/backend.md` | New service, middleware, config key |

### How to update

- Use `Edit` to patch only the changed section — never rewrite the full file.
- Never append duplicate information — check existing content first.
- One tight sentence per new fact — optimize for low-token future reads.
- Preserve structure and headings.
- At end of every implementation: update docs → summarize what changed → list modified files.

### When NOT to update

- Bug fixes with no structural change
- UI copy / style tweaks
- Test additions that mirror existing patterns
- Refactors that don't move or rename entry points

---

## Documentation Architecture

```
README.md          human / GitHub — executive overview, setup, ports
AI_CONTEXT.md      compressed AI context (≤300 lines)
RULES.md           Claude coding rules (≤300 lines)
ENTRYPOINTS.md     task → file map (≤200 lines)
docs/
  architecture.md     system topology, services, runtime infra, ports, app flow
  routing.md          all routes, layout shells, navigation wiring
  frontend.md         Next.js structure, components, data fetching, auth flow
  report-system.md    canonical report architecture: shell, sidebar, 5 implemented sections
  print-pdf.md        A4 portrait + landscape canvases, named-page rules, Firefox fallback
  maps.md             Mapbox CompSet map + stylised pin map (Market Overview)
  design-system.md    color tokens, typography, spacing, Tailwind conventions
  component-library.md  canonical primitives catalog (preferred for new pages)
  business-rules.md   premium tiers, locked gates, upgrade CTAs, gating logic
  financial.md        valuation metrics, KPIs, display formulas, report values
  workflows.md        user flows: Landing → CompSet → Report and beyond
  changelog.md        feature history — one entry per completed task
  database.md         schema reference — all tables, columns, conventions
  api.md              all REST endpoints, request/response shapes
  backend.md          FastAPI structure, service pattern, config, middleware
  financial-engine.md DCF engine internals, metrics, module map (Python)
  underwriting.md     valuation/underwriting models, DCF logic, sensitivity
  data-pipeline.md    ETL flow, import modes, staging tables, module map
  normalization.md    multilingual normalisation pipeline, _key(), geography
  alias-registry.md   alias tables, conflict detection, merge history, routes
  merge-engine.md     dedup scoring, FP signals, tiers, review UI
  imports.md          column mappings, validation rules, CLI reference
  deployment.md       Docker compose, env vars, volumes, migrations
  auth.md             JWT flow, token types, endpoints, frontend storage
  testing.md          pytest config, markers, test structure, fixtures
  observability.md    structlog, Sentry, middleware headers
  roadmap.md          planned features, tech debt
```

Maintain this structure. Do NOT add files to `docs/` without updating ENTRYPOINTS.md.  
`pipeline.md` has been split — content now in `data-pipeline.md`, `financial-engine.md`, `imports.md`.

## Code Exploration Order

**Before using Glob, Grep, or Read to explore the codebase, always read:**
1. `AI_CONTEXT.md` — compressed project mental model
2. `ENTRYPOINTS.md` — task-to-file map

Only reach for file search tools if the answer isn't in those two documents. This avoids redundant scanning and keeps context lean.

## Other Standing Rules

- `README.md`: executive-level only, max 300 lines. Update only on architecture or setup changes.
- No comments in code unless the WHY is non-obvious.
- No mocking the DB in integration tests.
