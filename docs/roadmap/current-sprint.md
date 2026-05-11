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
| **Public Beta / Showcase Mode** — `PROTECTED_PREFIXES = []` in `apps/web/src/middleware.ts`. Auth remains wired and operational (Google sign-in works, sessions persist) but no route redirects anonymous traffic. Documented in `docs/auth.md` § "Public Beta / Showcase Mode". | `722efb7` · `dpl_CVVn7…cLui` | ✅ |
| **GitHub → Vercel auto-deploy enabled** — `vercel git connect` on `prj_Kaujd1oQHrnWD1Oi790f1TmgCscQ`. Push to `main` → production; branches → preview URLs. CLI `vercel deploy` remains as escape hatch. | `4243cce` · `9c73722` · `1e263f4` | ✅ |
| **Resend leaves the sandbox** — `hotelvalora.com` verified in Resend (DKIM + SPF in Namecheap DNS); `RESEND_FROM_EMAIL` switched to `HotelVALORA <noreply@hotelvalora.com>`. Production delivery to any recipient. | `8d6f078` | ✅ |
| **Auth log noise eliminated** — `<SessionProvider>` removed from `providers.tsx` (legacy Auth.js scaffold polling `/api/auth/session` with no `AUTH_SECRET` produced 500s on every page load). | `32b1cd2` | ✅ |
| **Hospitality Intelligence Engine — Phase 1 foundation** — migration `0006` applied (9 tables · 5 enums · RLS public-read · 10 seeded sources). 6 strategic + technical docs in `docs/intelligence/`. Trackers updated. NO ingestion code yet — Phase 2 lands the pipeline. | `3158615` | ✅ |
| **AI Operations Layer — Phase 1 foundation** — migration `0007` applied (7 tables · 6 enums · 9 agents seeded · 20 tools catalogued). 8 strategic + technical docs in `docs/ai-agents/`. Establishes deterministic-shell + audit + permissions + memory + escalation philosophy for 9 future operational AI systems (NOT chatbots). | `7b841c5` | ✅ |
| **CEO / Orchestration Agent added as Tier 0** — migration `0008` applied (extends `ai_agent_id` enum + adds 3 new event kinds + seeds CEO agent + 10 supervisory tools). Tier 0 sits ABOVE the 9 operational agents. Hourly + daily supervisory cycles. NOT a chatbot — operations command center. Lands in Phase 3 alongside reactive orchestrator + pgvector + admin dashboard. | `e6ec45c` | ✅ |
| **Vercel Analytics installed** — `@vercel/analytics` 2.0.1 + `<Analytics />` mounted in `apps/web/src/app/layout.tsx`. Cookie-free, GDPR-compliant page-view + event tracking. Auto-enabled on production deploys. | *(this commit)* | ✅ |

## In flight

- 🟡 Architecture docs scaffolding (`docs/architecture/*`, `docs/roadmap/*`, `docs/features/*`, etc.)

## Up next (rough order of pull)

1. **AI Ops + Intelligence Engine Phase 2 together** — agent runtime core (`apps/web/src/lib/ai-agents/core/`) + Market Intelligence Agent (consumes the Intelligence Engine's daily ingestion) + Data Ingestion Agent + QA/Monitoring Agent. Combined because the Market Intelligence Agent IS the consumer of the Intelligence Engine's pipeline; building them together avoids two separate Phase 2s. See `docs/ai-agents/ai-agent-roadmap.md` § Phase 2 + `docs/intelligence/hospitality-intelligence-roadmap.md` § Phase 2.
2. Sign-up flow — today the only way to create an account is Google OAuth. Add `supabase.auth.signUp` (email/password) and `supabase.auth.resetPasswordForEmail`.
3. Realtime Library subscription — `supabase.channel("public:valuations").on("postgres_changes", …)` invalidates `libraryKeys.all`.
4. Wire "View full valuation" CTA from `FloatingHotelCard` to a future `/report/[id]` route.
5. Workspace switcher — read `public.user_roles` joined with `public.organizations`; surface in the AppHeader.
6. Linked-accounts unlink — server action that deletes the `oauth_accounts` row and revokes the provider token.
7. Library legend toggles + search wired to the table view too.
8. Swap static grayscale map background to Mapbox (Phase 4).

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
