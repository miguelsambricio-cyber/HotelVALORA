# Integrations · Supabase

Supabase is the planned backing store for HotelVALORA — Postgres database, Auth (via the `@auth/supabase-adapter` when Phase 3 lands), and Storage for PDFs / Excel uploads / renders / avatars.

## Status today

- ✅ SDKs installed (`@supabase/supabase-js`, `@supabase/ssr`)
- ✅ Server + browser + middleware + admin clients written (`apps/web/src/lib/supabase/*`)
- ✅ Edge middleware composes `updateSupabaseSession()` before Auth.js
- ✅ SQL schema proposal (`docs/database/schema.sql`) — 7 tables + enums + triggers + RLS
- ✅ Connection-test page (`/dev/supabase-test`)
- ⏸ Project provisioning (waiting on Supabase URL + keys)
- ⏸ Migrations applied
- ⏸ Storage buckets created
- ⏸ Auth.js Supabase adapter wired

## File map

| Concern | File |
|---|---|
| Browser client (use in client components) | `apps/web/src/lib/supabase/client.ts` |
| Server client (RSC, server actions, route handlers) | `apps/web/src/lib/supabase/server.ts` |
| Middleware helper (session refresh) | `apps/web/src/lib/supabase/middleware.ts` |
| Admin / service-role client (server-only) | `apps/web/src/lib/supabase/admin.ts` |
| Auth helpers (`getSupabaseUser`, gate predicates) | `apps/web/src/lib/supabase/auth-helpers.ts` |
| Database types stub (regenerated after migrations) | `apps/web/src/lib/supabase/types.ts` |
| Barrel | `apps/web/src/lib/supabase/index.ts` |
| Connection probe surface | `apps/web/src/app/dev/supabase-test/page.tsx` |
| Edge middleware composition | `apps/web/src/middleware.ts` |
| Schema proposal | `docs/database/schema.sql` |

## Architecture decisions

### Why split client / server / middleware / admin?

- **Browser** lives in a `"use client"` context and reads + writes the auth cookie via `@supabase/ssr`'s `createBrowserClient`.
- **Server** lives in RSC / actions / route handlers — uses `next/headers` cookies (sync in Next 14). Cookie writes from RSC are silently swallowed; middleware is the canonical writer.
- **Middleware** runs on Edge and is the only place where cookies can be refreshed mid-request. The helper short-circuits when env is missing so the middleware stays a pure pass-through during scaffolding.
- **Admin** uses the service-role key and bypasses RLS. Guarded with `import "server-only"` so a wayward client import fails at build time.

### Why every client is a factory

`cookies()` from `next/headers` is request-scoped — a singleton would leak the wrong session across concurrent requests. The factory captures the current request's cookie store on construction.

### Why typed Database is a stub

Real types come from the Supabase CLI after the schema is applied:

```bash
pnpm dlx supabase gen types typescript \
  --project-id <YOUR_PROJECT_REF>      \
  --schema public                       \
  > apps/web/src/lib/supabase/types.ts
```

Until then, queries are untyped — fine while the schema is still evolving.

## Schema proposal — `docs/database/schema.sql`

Seven tables + supporting enums, triggers, and RLS:

| Table | Purpose |
|---|---|
| `user_profiles` | 1:1 with `auth.users`. Tier, role, organisation, avatar, Stripe customer id. |
| `valuations` | The institutional hotel-asset record. Mirrors frontend `LibraryReport`. |
| `valuation_reports` | Versioned snapshots — one row per "save scenario" or "publish". |
| `favorites` | N:M junction between users and valuations. |
| `top_promote` | Marketplace promotion record per valuation. |
| `subscriptions` | Stripe-backed billing record. |

Enums:
- `user_tier` — free / pro / premium / team / enterprise
- `user_role` — user / admin / owner
- `report_visibility` — private / team / public / top-promote
- `report_type_badge` — Premium / PRO / Public / Private
- `report_status` — draft / published / archived
- `report_role` — Principal / Broker / Lender / Developer
- `report_objective` — For Sale / Rent HMA / Lending / Develop / CoInvest

Triggers:
- `handle_new_user()` — auto-inserts a `user_profiles` row when Supabase auth creates a new `auth.users` record.
- `set_updated_at()` — bumps `updated_at` on every row update for the three mutable tables.

RLS — every table has policies (read public for `public` / `top-promote` visibility, write own for authenticated users, etc.). Storage policies live in the Supabase dashboard.

## Storage buckets (planned)

Configure these via the Supabase dashboard before Phase 3 ships:

| Bucket | Access | Purpose |
|---|---|---|
| `reports` | Public read | Published reports + public hero assets |
| `pdfs` | Private (signed URLs) | Generated PDF outputs |
| `excel-uploads` | Private (RLS: own only) | User-uploaded workbooks |
| `renders` | Public read | AI-generated CAPEX renders |
| `avatars` | Public read | Profile pictures (RLS: own write) |

## Environment (placeholders today)

```bash
# apps/web/.env.local — dev only
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Vercel — production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

### Where to find these

In the Supabase dashboard for the HotelVALORA project:

1. Open **Settings → API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys → anon (public)** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Project API keys → service_role (secret)** → `SUPABASE_SERVICE_ROLE_KEY` · **NEVER** expose to the browser
3. Open `/dev/supabase-test` — every row should turn green.

## Activation roadmap

| Step | Action |
|---|---|
| 1 | Provision Supabase project (Region: EU-West Ireland for `hotelvalora.com`) |
| 2 | Paste env vars per the table above |
| 3 | Run `docs/database/schema.sql` via Supabase SQL editor |
| 4 | Configure storage buckets per the table above |
| 5 | `pnpm dlx supabase gen types typescript --project-id <REF> > apps/web/src/lib/supabase/types.ts` |
| 6 | Add `@auth/supabase-adapter` and wire it into `auth.ts` (single line) |
| 7 | Drop the Zustand mock auth store; bind `useTier()` to the Supabase session |

## Cross-references

| Topic | Doc |
|---|---|
| Auth.js v5 (coexists today) | `docs/data-models/user-models.md` |
| Report shape (mirrors `valuations`) | `docs/data-models/report-models.md` |
| Backend architecture | `docs/architecture/backend-architecture.md` |
| Tier system | `docs/business-rules/tier-system.md` |
| Promoted reports (uses `top_promote`) | `docs/business-rules/promoted-reports.md` |
