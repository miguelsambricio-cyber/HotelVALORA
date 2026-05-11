# Current Sprint

> Updated 2026-05-10 — bump after every shipped task.

## Just shipped (last 7 days)

| Feature | Commit | Status |
|---|---|---|
| Library v1 — `/library/favorites-map` | `f7ea4c3` | ✅ |
| Responsive scaling for 1440×900 | `d3f9b00` | ✅ |
| `/library/top-map` (sibling sidebar copy) | `429446e` | ✅ |
| Subtitle tightening on top-map | `92d5c67` | ✅ |
| `/library/favorites-list` (Bloomberg-grade 39-col table) | `ced6f2e` | ✅ |
| `/library/top-list` (40-col with REF) | `fb03160` | ✅ |
| Contact card popover (portal-based, top-promoted only) | `f2136e0` | ✅ |
| Mandarin contact → Sara Smith + aligned email | `144f8fb` + `5c00c14` | ✅ |
| Architecture docs initialization | `19fdf49` | ✅ |
| Auth.js v5 institutional scaffold (Google + LinkedIn + Apple, middleware gated by `AUTH_ENABLED`) | `8c66542` | ✅ |
| Resend wired for "Schedule a Tour" — server action + typed template | `e2ba909` | ✅ |
| Supabase architecture initialized — clients + middleware + schema proposal + probe page | `407599f` | ✅ |
| Comprehensive Supabase schema drafted — 30 tables · 6 domains · RLS on every table · hand-rolled `Database` type | `b326f0b` | ✅ |
| Supabase MCP wiring (`.mcp.json`) for in-editor schema ops | *(this commit)* | ✅ |
| **Supabase initial schema applied to production project** — 32 tables, all RLS, advisor warnings closed (`harden_security_definer_functions`) | *(this commit)* | ✅ |

## In flight

- 🟡 Architecture docs scaffolding (`docs/architecture/*`, `docs/roadmap/*`, `docs/features/*`, etc.)

## Up next (rough order of pull)

1. Regenerate `apps/web/src/lib/supabase/types.ts` from the live schema (`pnpm dlx supabase gen types typescript --project-id twebgqutuqgonabvhzjk --schema public`) and replace the hand-rolled shim.
2. Configure Supabase Storage buckets (`reports`, `pdfs`, `excel-uploads`, `renders`, `avatars`) with per-bucket RLS.
3. Wire the Library legend toggles + search to the table view too (currently only the map honours them).
4. Marketplace placeholder — "Activate Top Promote" CTA inside the report shell (mock checkout).
5. Replace mock auth with NextAuth (keep the `useAuth()` surface).
6. Start `/api/v1/library/*` resource backed by the existing `LibraryReport` shape.

## Decisions made this sprint

- **One canonical table** (`FavoritesTable` with `showReferenceColumn` prop) instead of forking favorites-list vs top-list.
- **Route-driven FAVORITOS / TOP segmented nav** — moved out of Zustand into `usePathname()`.
- **Portal-based popover** for the contact card to escape the table's `overflow:auto` clip rect.

## Maintenance reminders

After shipping any feature:
1. Add an entry to `docs/changelog.md`
2. Move the line up here under "Just shipped"
3. Update `docs/HOTELVALORA_MASTER_SYSTEM.md` (§State and §Next priorities if relevant)
4. Touch `docs/features/<surface>.md`
5. If a new business rule appears → `docs/business-rules/*`
6. If a new model field → `docs/data-models/*`
