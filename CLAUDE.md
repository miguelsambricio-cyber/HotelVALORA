# CLAUDE.md — HotelVALORA

Project-level instructions for Claude Code. These override defaults for every session in this repo.

---

## AI Documentation — Mandatory Maintenance

After any task that introduces a **significant architectural or feature change**, update the relevant AI docs before closing the task. Do this incrementally — edit only the sections that changed, never rewrite entire files.

**What counts as significant:**
- New API route group or prefix
- New DB model or migration
- New service or domain
- New frontend page or major component
- Changed response contracts or conventions
- New external dependency or integration
- Changed env vars or infrastructure topology

**Files to maintain:**

| File | Update when |
|---|---|
| `AI_CONTEXT.md` | Stack changes, new domain, scoring/logic changes, new conventions |
| `RULES.md` | New constraints, changed patterns, new file-placement rules |
| `ENTRYPOINTS.md` | New files that are task entry points; remove stale paths |

**How to update:**
- Use `Edit` to patch the specific section — do not rewrite the full file.
- Never append duplicate information — check the existing content first.
- Keep `AI_CONTEXT.md` under 300 lines, `RULES.md` under 300 lines, `ENTRYPOINTS.md` under 200 lines.
- Preserve the existing structure and headings.
- One tight sentence per new fact — optimize for low-token future reads.

**When NOT to update:**
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
  architecture.md     system topology, services, runtime infra, ports
  database.md         schema reference — all tables, columns, conventions
  api.md              all REST endpoints, request/response shapes
  frontend.md         Next.js structure, components, data fetching, auth flow
  backend.md          FastAPI structure, service pattern, config, middleware
  financial-engine.md DCF engine, metrics, module map
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
