# Database

Single source of truth for the HotelVALORA Postgres schema, hosted on Supabase project `twebgqutuqgonabvhzjk` (EU-Central — Frankfurt, Postgres 17).

**Last refreshed:** 2026-05-11
**Schema status:** ✅ applied — 41 public tables (all with RLS) + 5 Storage buckets with per-bucket RLS + Library demo seed live + Hospitality Intelligence Engine foundation. Migrations registered: `initial_schema` · `harden_security_definer_functions` · `storage_buckets_and_policies` · `restrict_avatar_listing` · `seed_library_demo_data` · `hospitality_intelligence_schema`.

## Layout

```
docs/database/
  README.md                              ← this file (ER summary + how-to)
  schema.sql                             ← thin pointer to migrations/
  migrations/
    0001_initial_schema.sql                       ← 32 tables · all 6 domains (applied)
    0002_harden_security_definer_functions.sql    ← pins search_path + revokes
                                                     RPC exposure (applied)
    0003_storage_buckets_and_policies.sql         ← 5 Storage buckets + 19 RLS
                                                     policies on storage.objects
                                                     (applied)
    0004_restrict_avatar_listing.sql              ← scopes avatar listing to
                                                     own namespace (applied)
    0005_seed_library_demo_data.sql               ← 1 demo user + 6 institutional
                                                     valuations + 2 active
                                                     top_promote rows + favourites
                                                     (applied — idempotent)
    0006_hospitality_intelligence_schema.sql      ← 9 tables (market_news,
                                                     hotel_transactions, etc.)
                                                     + 5 enums + 10 seeded sources
                                                     (applied — Phase 1 foundation)
```

Every future schema change ships as a numbered migration file under `migrations/` — never edit `0001_initial_schema.sql` after it has been applied.

### Postgres-specific deviations from the original draft (kept here for reference)

- `top_promote_reports.is_active` was originally drafted as a stored generated column `boolean generated always as (promoted_until > now()) stored`. Postgres rejects this — generation expressions must be `IMMUTABLE`. The column was removed; callers derive activeness inline as `promoted_until > now()`.
- The two `top_promote_*` indexes were originally drafted as partial indexes with `where promoted_until > now()`. Postgres rejects `now()` in index predicates for the same reason. They are now plain b-tree indexes; queries that filter on `promoted_until > now()` still get pruned efficiently.

## How to apply

### One-shot (Supabase SQL editor — recommended today)

1. Open the SQL editor for our project:
   `https://supabase.com/dashboard/project/twebgqutuqgonabvhzjk/sql/new`
2. Paste the entire contents of `migrations/0001_initial_schema.sql`
3. Click **Run** — should complete in < 10 seconds
4. Verify in `Database → Tables` that 30 tables appear, RLS on every one

### CLI (when the Supabase access token is provisioned)

```bash
pnpm dlx supabase login                            # OAuth flow
pnpm dlx supabase link --project-ref twebgqutuqgonabvhzjk
pnpm dlx supabase db push                          # applies the migrations/ dir
```

## Domains + ER summary

```
┌────────────────────── ① AUTH + USERS ──────────────────────┐
│  auth.users (Supabase)                                      │
│    └─ public.users    ─┬─ profiles                          │
│                        ├─ sessions                          │
│                        ├─ oauth_accounts                    │
│                        └─ user_roles  ←→  organizations     │
│                                              owner_id ──┐    │
│                                                          │    │
└──────────────────────────────────────────────────────────│────┘
                                                            │
┌─────────────── ② LIBRARY ─────────────────────────────────│────┐
│   valuations (owner_id, organization_id) ─────┐           │    │
│       ├─ saved_reports (versioned snapshots)  │           │    │
│       ├─ favorite_reports (N:M with users)    │           │    │
│       ├─ top_promote_reports (1:1, marketplace)│          │    │
│       ├─ report_visibility (audit log)        │           │    │
│       ├─ report_shares (link + per-user grants)│          │    │
│       └─ report_files (Storage metadata)      │           │    │
└────────────────────────────────────────────────│───────────│────┘
                                                 │           │
┌──────────── ③ INVESTMENT ENGINE (per-user) ───┴───┐       │
│   investment_requirements (1:1)                    │       │
│   market_preferences (N:1)                         │       │
│   valuation_preferences (1:1)                      │       │
│   revpar_scenarios (N:1)                           │       │
│   hotel_filters (N:1)                              │       │
└────────────────────────────────────────────────────┘       │
                                                              │
┌────────────────── ④ CRM ───────────────────────────────────┘
│   companies (external) ──┬─ contacts ──┬─ leads
│                          │              ├─ notes (polymorphic)
│                          │              └─ activity_log (polymorphic)
└────────────────────────────────────────────────────────────┘

┌────────────────── ⑤ FILES (Storage metadata) ─────────────┐
│   report_files       ← bucket `reports`                    │
│   generated_pdfs     ← bucket `pdfs`                       │
│   uploaded_excels    ← bucket `excel-uploads`              │
│   renders            ← bucket `renders`                    │
│   avatars            ← bucket `avatars`                    │
└────────────────────────────────────────────────────────────┘

┌────────────────── ⑥ SYSTEM ───────────────────────────────┐
│   audit_logs       (any actor, any entity)                 │
│   notifications    (per user, queue)                       │
│   feature_flags    (per user OR per organization)          │
│   subscriptions    (Stripe — per user, optional org)       │
│   payment_events   (Stripe webhook log)                    │
└────────────────────────────────────────────────────────────┘
```

## Ready-vs-placeholder map

After applying `0001_initial_schema.sql` the tables fall into three readiness buckets:

### 🟢 Wired today (will receive traffic from the frontend in Phase 3)

| Table | Frontend touchpoint |
|---|---|
| `users` · `profiles` | Auth.js callback hydrates session.user from these |
| `valuations` | Library map + list views (replaces `mock-reports.ts`) |
| `favorite_reports` | Library star column + filter |
| `top_promote_reports` | Library Top map + Top list |
| `report_shares` | Future "Share report" CTA |
| `oauth_accounts` | Settings → Credentials → Linked Accounts |

### 🟡 Forward-compat (typed shape exists today, no UI yet)

| Table | What ships when |
|---|---|
| `organizations` · `user_roles` | Team tier (Phase 5) |
| `saved_reports` | "Save scenario" — when underwriting engine UI lands |
| `report_visibility` | Audit surface (Phase 4) |
| `investment_requirements` · `market_preferences` · `valuation_preferences` · `revpar_scenarios` · `hotel_filters` | Persist the Zustand investment store server-side (Phase 3) |
| `report_files` · `generated_pdfs` · `uploaded_excels` · `renders` · `avatars` | When Storage buckets are configured + Settings → Imports UI ships |
| `audit_logs` · `notifications` · `feature_flags` | Cross-cutting (Phase 4–5) |
| `subscriptions` · `payment_events` | Stripe (Phase 5) |

### 🔵 Placeholder (entity defined, no UI in the roadmap yet)

| Table | When |
|---|---|
| `companies` · `contacts` · `leads` · `notes` · `activity_log` | CRM surface — not on the Phase 1–5 roadmap |
| `sessions` | App-level session log — opportunistic add when Sentry / PostHog land |

## RLS posture

Every public table has RLS enabled. The default policy template:

- **Own-only tables** (profiles, sessions, oauth_accounts, investment_*, CRM tables, …): `auth.uid() = user_id`
- **Public-readable** (valuations with `visibility in ('public','top-promote')`, top_promote_reports): `using (true)` or visibility check
- **Owner write, parent-derived** (saved_reports, report_files, report_shares): join through `valuations.owner_id`
- **Org-scoped** (organizations, user_roles): membership-derived
- **Service-role only** (payment_events): no `authenticated` policy — only Stripe webhook handler with service-role can write

Full per-policy list lives in `migrations/0001_initial_schema.sql` § ROW LEVEL SECURITY.

## Storage buckets (provisioned by migration 0003)

The five canonical buckets are created and RLS-locked by migration `0003_storage_buckets_and_policies.sql`. No manual dashboard step is required.

| Bucket | Public? | MIME allowlist | Size cap | Access pattern |
|---|---|---|---|---|
| `reports` | private | any | 50 MB | own namespace; share via server-minted signed URL |
| `pdfs` | private | `application/pdf` | 100 MB | own namespace; delivered via signed URL |
| `excel-uploads` | private | `xlsx`, `xls` | 25 MB | uploader-only |
| `renders` | private | `png` · `jpeg` · `webp` | 10 MB | requester-only; served via signed URL |
| `avatars` | **public** | `png` · `jpeg` · `webp` | 5 MB | own writes; reads via public CDN URL |

### Path convention

Every bucket follows the same layout:

```
{bucket}/{auth.uid()}/{rest...}
```

The first folder is always the caller's user id. `storage.objects` RLS enforces it via:

```sql
(storage.foldername(name))[1] = auth.uid()::text
```

Use the typed helpers at `apps/web/src/lib/supabase/storage.ts` (browser) and `apps/web/src/lib/supabase/storage-server.ts` (server) — they build paths, validate size/MIME, and mint signed URLs through the service-role client.

### Signed URLs

Every private bucket exposes objects to the UI through **time-limited signed URLs** minted server-side with the service-role key. Defaults:

- `DEFAULT_SIGNED_URL_TTL_SECONDS = 300` (5 minutes).
- Pass `downloadAs: "<filename>"` to force `Content-Disposition: attachment` (used by the "Download PDF" CTA).

### Avatar listing policy note

Migration `0003` originally issued a broad `avatars: public read` policy on `storage.objects`. The Supabase advisor (`0025_public_bucket_allows_listing`) flagged it — a `public=true` bucket already serves object URLs through the CDN without any SELECT policy, so a broad policy only granted the ability to **list** every user's avatars. Migration `0004` replaces that with an own-namespace listing policy. Anon clients can still hit a known avatar URL; they just can't enumerate the bucket.

## After applying — regenerate TS types

```bash
cd apps/web
pnpm dlx supabase gen types typescript \
  --project-id twebgqutuqgonabvhzjk    \
  --schema public                       \
  > src/lib/supabase/types.ts
```

`apps/web/src/lib/supabase/types.ts` currently contains a **hand-rolled** Database type that matches this schema 1:1 — replace it the moment the CLI access token is available.

## Cross-references

| Topic | Doc |
|---|---|
| Supabase integration overview | `docs/integrations/supabase.md` |
| Auth model (Auth.js + Supabase coexistence) | `docs/data-models/user-models.md` |
| Report shape — frontend mirror of `valuations` | `docs/data-models/report-models.md` |
| Tier system + RLS gating philosophy | `docs/business-rules/tier-system.md` |
| Per-service activation steps | `docs/infrastructure/integration-checklist.md` |
