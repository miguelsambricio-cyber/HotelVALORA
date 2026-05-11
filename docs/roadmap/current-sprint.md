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
| **Supabase initial schema applied to production project** — 32 tables, all RLS, advisor warnings closed (`harden_security_definer_functions`) | `f7e40b4` | ✅ |
| **Supabase TS types regenerated** from the live schema — replaced the hand-rolled `types.ts` shim with the CLI-generated `Database` surface (1750 lines, all enums + FKs accurate) | *(this commit)* | ✅ |
| **Supabase Storage buckets provisioned** via migration — 5 buckets (`reports`/`pdfs`/`excel-uploads`/`renders`/`avatars`) with 19 own-namespace RLS policies + size + MIME caps. Advisor warning on broad-public-read fixed by `0004` | *(this commit)* | ✅ |
| **Typed Storage helpers** — `lib/supabase/storage.ts` (browser: `BUCKETS`, `uploadOwnFile`, `validateForBucket`, `getPublicUrl`) + `lib/supabase/storage-server.ts` (signed URLs, admin move/delete) | `2d891c2` | ✅ |
| **Library surfaces wired to Supabase** — all four `/library/*` routes read `valuations` + `top_promote_reports` + `favorite_reports` via TanStack Query (`lib/library/queries/*` + `lib/library/adapters/valuation-to-report.ts`). Optimistic ⭐ toggle, loading/error/empty states, `mock-reports.ts` deleted. Bundle architecture fix: `@/lib/supabase` barrel split into browser-only re-exports | `d754a69` | ✅ |
| **Production authentication — Supabase Auth (Google OAuth-ready)** — `useAuth()` rewritten as a dual-source picker (Supabase Auth when `NEXT_PUBLIC_AUTH_ENABLED=true`, Zustand mock otherwise). `/auth/callback` route handler exchanges OAuth codes for HttpOnly session cookies. Middleware enforces protected routes when `AUTH_ENABLED=true`. RLS resolves naturally via `auth.uid()`; no schema changes. Auth.js v5 scaffold stays parked. | `5c3ef91` | ✅ |
| **Google OAuth activated end-to-end** — Google Cloud OAuth client created, Supabase Dashboard provider enabled, URL allowlist configured, Vercel env vars set, production deployed. Verified: `/auth/v1/settings` reports `"google": true`; `/auth/callback` exchanges codes correctly. | manual + `dpl_GcD2jM47icS8KzWDRNdYcyZY6iZF` | ✅ |
| **Public Beta / Showcase Mode** — `PROTECTED_PREFIXES = []` in `apps/web/src/middleware.ts`. Auth remains wired and operational (Google sign-in works, sessions persist) but no route redirects anonymous traffic. Restores Library + Report access for everyone during financial-engine + underwriting validation. Documented in `docs/auth.md` § "Public Beta / Showcase Mode". | *(this commit)* | ✅ |

## In flight

- 🟡 Architecture docs scaffolding (`docs/architecture/*`, `docs/roadmap/*`, `docs/features/*`, etc.)

## Up next (rough order of pull)

1. Sign-up flow — today the only way to create an account is Google OAuth. Add a `supabase.auth.signUp` surface (email/password) and `supabase.auth.resetPasswordForEmail` (forgot password).
2. Realtime Library subscription — one `supabase.channel("public:valuations").on("postgres_changes", …)` invalidates `libraryKeys.all`.
3. Wire "View full valuation" CTA from `FloatingHotelCard` to a future `/report/[id]` route.
4. Workspace switcher — read `public.user_roles` joined with `public.organizations`; surface in the AppHeader.
5. Linked-accounts unlink — server action that deletes the `oauth_accounts` row and revokes the provider token.
6. Library legend toggles + search wired to the table view too.
7. Swap static grayscale map background to Mapbox (Phase 4).
8. Verify a domain in Resend.

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
