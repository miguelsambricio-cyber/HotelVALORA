# Architecture · Frontend

Canonical source: **`docs/frontend.md`** has the full file tree and conventions. This dossier focuses on the *shape* of the app — how shells, state and data flow connect.

## Stack

- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS (config in `apps/web/tailwind.config.ts`)
- TanStack Query v5 — server state, query key hierarchy `["domain", "sub", …params]`
- Zustand — local UI state + persisted auth + investment criteria
- TanStack Table — for the review queue tables
- Radix UI primitives (Dialog, Switch, Tabs, Tooltip) in `components/ui/`
- Lucide icons
- React Hook Form + Zod
- sonner for toasts
- mapbox-gl + react-map-gl v8 (Compset surface only today)

## Shell map

| Shell | File | Used by |
|---|---|---|
| Landing | inline in `app/page.tsx` | `/` |
| Login | inline in `app/login/page.tsx` | `/login` |
| Dashboard | `app/(dashboard)/layout.tsx` | `/(dashboard)/*` — assets, valuations, review, … |
| Settings | `components/settings/settings-layout.tsx` | `/settings/*` |
| **Library** | `components/library/library-shell.tsx` | `/library/*` (favorites-map/list + top-map/list) |
| Report | `components/report/shell/report-shell.tsx` | `/report/*` |
| Compset | inline (`LandingHeader` + `LandingFooter`) | `/compset` |

Every authenticated shell renders `AppHeader` (sticky, route-aware BIBLIOTECA active when path starts with `/library`). The `InstitutionalFooter` is shared between Settings + Library in `slim` variant.

## State stores (Zustand)

| Store | File | Persistence |
|---|---|---|
| Auth | `lib/auth/store.ts` | localStorage (mock — replace with NextAuth) |
| Investment criteria | `lib/investment/store.ts` | localStorage (v3 migration) |
| Library UI | `lib/library/store.ts` | in-memory (legend / layers / search / selection) |

The library `filterTab` slice was deleted on 2026-05-10 — replaced by route-driven nav (`usePathname` in `LibraryFilterTabs`).

## Data fetching pattern

All server state lives in `src/lib/api/<domain>.ts` as TanStack Query hooks. Today only `review.ts` and `dedup.ts` ship — the rest of the surface reads from mock files (see `system-overview.md` §What's mock vs real).

Mock files follow a strict naming pattern:
```
apps/web/src/lib/report/<section>-data.ts
apps/web/src/lib/library/mock-reports.ts
```

When real APIs arrive, the swap is local: replace the import in each consumer with `useXxxQuery()` and the rest stays put.

## Components, by feature

| Surface | Folder |
|---|---|
| Landing | `components/landing/` |
| Compset | `components/compset/` |
| Dashboard | `components/dashboard/` |
| Report (shell, primitives, 5 section families) | `components/report/{shell,primitives,…}/` |
| Settings | `components/settings/{investment,…}/` |
| Library | `components/library/` |
| Review | `components/review/` |
| Layout (cross-cutting) | `components/layout/` (`AppHeader`, `InstitutionalFooter`, `Sidebar`) |
| Radix-based UI primitives | `components/ui/` |

Full per-component map: **`docs/component-library.md`** and `UI_COMPONENTS.md` (root).

## Cross-references

| Topic | Doc |
|---|---|
| Route map | `docs/routing.md` |
| Report system | `docs/report-system.md` |
| Design tokens | `docs/design-system.md` |
| Library feature dossier | `docs/features/library.md` |
| Component catalog | `docs/component-library.md` |
| Workflows | `docs/workflows.md` |
