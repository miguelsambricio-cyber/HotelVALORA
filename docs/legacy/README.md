# Legacy documentation archive

**Frozen.** These files are kept for git-history continuity and one-off historical lookup. They are not maintained and may contradict current state — when in doubt, trust the live docs system instead.

Archived: 2026-05-12 (documentation stabilization wave). Moved from repo root to consolidate the root surface to five active AI-facing files (`AI_CONTEXT.md` · `CLAUDE.md` · `ENTRYPOINTS.md` · `README.md` · `RULES.md`).

## What replaced these files

| Legacy file | Current source of truth |
|---|---|
| `ARCHITECTURE.md` | `docs/architecture.md` · `docs/architecture/system-overview.md` · `docs/architecture/admin-ui-architecture.md` |
| `ARCHITECTURE_SCORECARD.md` | Folded into `docs/HOTELVALORA_MASTER_SYSTEM.md` §3 (Runtime reality) |
| `CHANGELOG.md` | `docs/changelog.md` (one entry per shipped feature, most recent first) |
| `COMPONENTS.md` | `docs/component-library.md` · `docs/design-system/components.md` |
| `NEXT_PHASE_PLAN.md` | `docs/roadmap/master-roadmap.md` · `docs/roadmap/current-sprint.md` · `docs/roadmap/backlog.md` |
| `REPORT_PAGES.md` | `docs/report-system.md` · `docs/print-pdf.md` |
| `ROADMAP.md` | `docs/roadmap/master-roadmap.md` |
| `TECH_AUDIT.md` | `docs/infrastructure/HOTELVALORA_TECH_STACK_MASTER.md` · `docs/infrastructure/INFRASTRUCTURE_MASTER_TRACKER.md` · `docs/infrastructure/security-audit.md` |
| `TODO.md` | `docs/roadmap/current-sprint.md` (active) + `docs/roadmap/backlog.md` (future/tech-debt) |
| `UI_COMPONENTS.md` | `docs/design-system/components.md` |

## Do not edit

Edits to files in this directory will not be reflected anywhere — the system has moved on. If you find yourself wanting to update a legacy file, the right move is to update its current source-of-truth in the table above.

## Reading order if you have to consult one

1. Check the matching current doc first.
2. Treat the legacy file as a snapshot of how the system was modelled at archive time — useful for understanding earlier decisions, not for current state.
