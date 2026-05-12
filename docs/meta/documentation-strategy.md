# Documentation Strategy

**Last refreshed:** 2026-05-12
**Authoritative for:** how HotelVALORA documentation is structured, who maintains it, what synchronisation rules apply, how the enforcement gate works.

This document explains the documentation system itself — the meta-layer. Operators · contributors · future AI agents read it to understand HOW the docs work, not WHAT they say.

---

## 1 · Why this discipline exists

HotelVALORA's docs are load-bearing: every architectural decision, security commitment, and operational shift is preserved in markdown rather than in personal memory. The system must survive operator turnover, AI-agent context resets, and multi-week pauses without losing fidelity.

**Three failure modes the docs strategy prevents:**

1. **Drift** — docs claim X is live · code shipped Y · operator can't trust either source
2. **Synchronisation debt** — N commits land · zero docs updates · accumulates until the audit becomes a project on its own
3. **Architectural amnesia** — old commitments (security posture · agent permissions · KEK rotation procedure) get re-litigated because nobody remembers what was decided

The strategy: **mandatory updates · enforcement gate · documented decisions · single sources of truth.**

---

## 2 · Document categories

| Category | Purpose | Examples | Update cadence |
|---|---|---|---|
| **Master system** | One-paragraph executive view of a major subsystem | `docs/HOTELVALORA_MASTER_SYSTEM.md`, `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md`, `docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` | After any structural shift to the subsystem |
| **Architecture** | Technical deep-dive on a topology / interaction model | `docs/architecture/admin-ui-architecture.md`, `docs/architecture/market-vs-underwriting-separation.md` | When the design changes |
| **Features** | Per-feature operator dossier | `docs/features/admin.md`, `docs/features/library.md`, `docs/features/intelligence-terminal.md` | When the feature gains/loses behaviour |
| **Integrations** | Per-source operational dossier | `docs/integrations/hosteltur.md`, `docs/integrations/alimarket.md`, `docs/integrations/costar.md` | When the integration state changes |
| **Agents** | Per-agent charter (mission · responsibilities · KPIs · permissions) | `docs/agents/<slug>.md` · index at `docs/agents/README.md` | When the agent's role evolves |
| **Roadmap** | Phase view · sprint view · backlog | `docs/roadmap/master-roadmap.md`, `current-sprint.md`, `backlog.md` | Sprint-cadence + every shipped feature |
| **Changelog** | One entry per shipped feature/fix, chronological | `docs/changelog.md` | On every merge to main |
| **Infrastructure** | Service-by-service operational status | `docs/infrastructure/HOTELVALORA_TECH_STACK_MASTER.md`, `service-status.md`, `environment-variables.md` | On every infra change |
| **Snapshots** | Frozen-in-time baseline state | `docs/SNAPSHOT_2026_05_12.md` | New file per snapshot · old files never edited |
| **Data models** | Typed shape reference per surface | `docs/data-models/<model>.md` | When the TS shape changes |
| **Business rules** | Tier / visibility / promotion logic | `docs/business-rules/*.md` | When rules change |
| **Meta** | The docs system itself | this file · `scripts/docs-audit.mjs` | When the docs policy changes |
| **Legacy** | Archived superseded documents | `docs/legacy/*.md` | Append-only · never edited |

---

## 3 · Update matrix · what to bump after each kind of change

**Source-of-truth lives in `CLAUDE.md`** at the repo root. The matrix below is the operator-facing version.

| If the change is… | Bump these |
|---|---|
| New integration | `docs/integrations/<slug>.md` · `docs/HOTELVALORA_MASTER_SYSTEM.md` § Modules · `docs/changelog.md` |
| New agent role | `docs/agents/<slug>.md` · `docs/agents/README.md` · `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` · `docs/changelog.md` |
| New table / column | `docs/database.md` · `docs/database/migrations/<NNNN>_<name>.sql` · `docs/changelog.md` |
| New route | `docs/routing.md` · `docs/features/<surface>.md` · `docs/changelog.md` |
| New env var | `docs/infrastructure/environment-variables.md` · `apps/web/.env.example` (names only · no values) · `docs/changelog.md` |
| Security posture change | `docs/infrastructure/security-audit.md` · `docs/changelog.md` |
| Phase status flip (planned → in-flight → shipped) | `docs/roadmap/master-roadmap.md` · `docs/roadmap/current-sprint.md` |
| Shipped feature | `docs/changelog.md` · relevant `docs/features/*.md` · `docs/roadmap/current-sprint.md` |

The exhaustive table lives in `CLAUDE.md`. This doc summarises the categories.

---

## 4 · Single sources of truth (SSoT)

Each cross-cutting question has exactly one document that gives the canonical answer. Other docs link to it but don't restate it.

| Question | SSoT |
|---|---|
| "What's running today / what's placeholder / what's planned?" | `docs/SNAPSHOT_<date>.md` (most recent) |
| "Which services are healthy / partial / not configured?" | `docs/infrastructure/service-status.md` |
| "What env vars exist · who consumes them · scope?" | `docs/infrastructure/environment-variables.md` |
| "What routes exist?" | `docs/routing.md` |
| "What agents are registered · status · tier?" | `docs/agents/README.md` (index) |
| "What's the AI Ops permission model?" | `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` |
| "What's the intelligence schema?" | `docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` |
| "What's the credential security model?" | `docs/integrations/hosteltur.md` § 3 (cross-applies to all paid sources) |

---

## 5 · Enforcement gate · `scripts/docs-audit.mjs`

A standalone Node script (no deps) detects synchronisation drift on every operator invocation and on CI (when wired).

### What it checks

1. **Changelog drift** — every commit on `main` since the last entry must appear in `docs/changelog.md` body (commit SHA referenced). Skips merge / version / docs-audit commits.
2. **Size caps** — `ENTRYPOINTS.md` ≤ 200 lines · `AI_CONTEXT.md` ≤ 300 · `RULES.md` ≤ 300
3. **Master docs freshness** — every master file's `Last refreshed: YYYY-MM-DD` must be ≤ 1 day behind the latest commit on main
4. **Sprint freshness** — `docs/roadmap/current-sprint.md` `Updated YYYY-MM-DD` must be ≤ 1 day behind the latest commit

### Run modes

```
node scripts/docs-audit.mjs          # human report · exit 1 on critical
node scripts/docs-audit.mjs --json   # JSON output for CI
node scripts/docs-audit.mjs --strict # exit 1 even on warnings (CI gate)
```

### Severity levels

- **❌ Critical** — must fix before merge (changelog drift)
- **⚠ Warning** — should fix soon (size caps · master freshness)
- **✅ OK** — no action

Run it as a pre-push hook locally or wire it into a GitHub Actions step that comments on PRs.

---

## 6 · Workflow

### When shipping a feature

1. Implement the feature
2. **Update the relevant SSoT(s)** per the matrix in § 3
3. Add one changelog entry (`docs/changelog.md`) with the commit SHA and a 1-2 sentence summary
4. Bump `docs/roadmap/current-sprint.md` (move from "Up next" → "Just shipped")
5. Run `node scripts/docs-audit.mjs` — fix anything red before pushing
6. Commit · push

### When pausing for an architectural snapshot

1. Create a new `docs/SNAPSHOT_<date>.md` (this strategy doc explains the template implicitly · see the 2026-05-12 file)
2. Refresh master-system docs and feature dossiers to match the snapshot's view
3. Surface any documentation debt the snapshot uncovered
4. Commit · push the entire pass as one logical change

### When activating a new integration

1. Create `docs/integrations/<slug>.md` mirroring the `hosteltur.md` structure
2. Add the slug to the registry (`apps/web/src/lib/admin/integrations/registry.ts`)
3. If authenticated: provision credentials via the admin UI · run the refresh script · run the first ingestion
4. Update `docs/changelog.md` + `docs/roadmap/current-sprint.md`

### When deprecating a document

Never delete · move to `docs/legacy/<name>.md` with a `[Frozen — see X]` banner pointing at the replacement.

---

## 7 · Tone and length

- **Master system docs:** ≤ 300 lines · exec-grade · cross-link, don't restate
- **Architecture docs:** any length · technical · diagrams welcome
- **Feature dossiers:** ≤ 500 lines · per-surface · "what · why · how"
- **Changelog entries:** 5-30 lines · one entry per shipped task · most recent first
- **Sprint:** ≤ 300 lines · Just shipped · In flight · Up next · Blocked

Avoid:
- Marketing tone in technical docs
- Code blocks for things that should be a link to actual code
- "TODO" or "FIXME" — file a `docs/roadmap/backlog.md` item instead
- Personal pronouns in formal docs (use "the operator", "the agent")

---

## 8 · For AI agents reading the docs

Future Claude / GPT instances landing in this repo with no memory:

1. **Read first:** `AI_CONTEXT.md` · `ENTRYPOINTS.md` (root-level) for the compressed mental model
2. **For status questions:** `docs/SNAPSHOT_<most-recent>.md`
3. **For "what should I touch when I do X":** `CLAUDE.md` § "AI Documentation — Mandatory Maintenance"
4. **For "is feature X live":** check `docs/SNAPSHOT_<date>.md` § 3 · cross-reference with the relevant feature dossier
5. **Never write to** `docs/legacy/*` — those are frozen historical artefacts

---

## 9 · Audit cadence

| Trigger | What runs |
|---|---|
| Every commit / push | Operator runs `scripts/docs-audit.mjs` |
| Every PR | CI runs `scripts/docs-audit.mjs --strict` (when wired) |
| End-of-sprint review | Operator reviews `docs/roadmap/current-sprint.md` |
| Architectural milestone | New `docs/SNAPSHOT_<date>.md` |
| Quarterly | Full read-through of master-system docs · prune stale links |
