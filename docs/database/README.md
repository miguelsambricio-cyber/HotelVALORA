# Database

Single source of truth for the HotelVALORA Postgres schema, hosted on Supabase project `twebgqutuqgonabvhzjk` (EU-West Ireland).

**Last refreshed:** 2026-05-11

## Layout

```
docs/database/
  README.md                              ← this file (ER summary + how-to)
  schema.sql                             ← thin pointer to migrations/
  migrations/
    0001_initial_schema.sql              ← 30 tables · all 6 domains · v1
```

Every future schema change ships as a numbered migration file under `migrations/` — never edit `0001_initial_schema.sql` after it has been applied.

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

## Storage buckets (configure separately, in the dashboard)

The migration ONLY creates the SQL metadata tables. The actual buckets live in Supabase Storage and must be created via the dashboard:

| Bucket | Access | Per-bucket RLS template |
|---|---|---|
| `reports` | public read | `(auth.uid() = (storage.foldername(name))[1]::uuid)` for write |
| `pdfs` | private (signed URLs) | owner write only |
| `excel-uploads` | private | owner write/read only |
| `renders` | public read | owner write only |
| `avatars` | public read | own write only |

See `docs/integrations/supabase.md` for the storage activation checklist.

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
