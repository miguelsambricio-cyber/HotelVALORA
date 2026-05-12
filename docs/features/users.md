# Feature dossier · `/user/admin/users`

**Phase:** 2.D.1 · live since 2026-05-12
**Owner surface:** Operational growth funnel
**Role in the system:** second stage of the conversion arc

---

## 1 · Where this fits

HOTELVALORA's contacts base is the **growth engine**, not a CRM. The
canonical relation across the operator console is:

```
contact ─▶ invited ─▶ onboarded user ─▶ active subscriber ─▶ premium / top-promote client
```

The four admin surfaces map directly to this arc:

| Stage | Surface | Status |
|---|---|---|
| Universe | `/user/admin/contacts` | Live (Phase 2.C) |
| Real users | `/user/admin/users` | **Live (this surface)** |
| Activation | `/user/admin/campaigns` | Scaffold (full UI in Phase 2.D.4) |
| Monetization | `/user/admin/subscriptions` | Scaffold (full UI in Phase 2.D.4) |

This page is the post-funnel cut: real users who actually onboarded.

---

## 2 · Data model

Lives in `public.users` (extended by migration `0015_users_growth_layer`):

| Column | Purpose |
|---|---|
| `id`, `email`, `created_at`, `updated_at` | base identity |
| `tier` (`user_tier` enum) | free / pro / premium / team / enterprise |
| `role` (`user_role` enum) | user / admin / owner |
| `current_organization_id` | FK → `organizations` |
| `stripe_customer_id` | monetization link |
| **`full_name`** | display name (Phase 2.D.1) |
| **`last_seen_at`** | activity recency (Phase 2.D.1) |
| **`invitation_status`** | invited / onboarding / active / inactive / churn_risk (Phase 2.D.1) |
| **`promo_code`** | referral / activation code (Phase 2.D.1) |
| **`relationship_owner_email`** | commercial owner inside HOTELVALORA team (Phase 2.D.1) |
| **`linked_contact_id`** | FK → `relationship_contacts` · provenance back to the contact that became this user (Phase 2.D.1) |

The reverse FK `relationship_contacts.linked_user_id` closes the
bidirectional link so either surface resolves the other in a single
roundtrip.

Subscriptions are read from `public.subscriptions` and merged into
each row via a per-user "latest by `created_at`" selection.

---

## 3 · Page composition

```
apps/web/src/app/user/admin/users/page.tsx        — orchestrator
apps/web/src/lib/admin/users/live.ts              — loadUsers + loadUserKpis
apps/web/src/components/admin/users/
  users-kpis.tsx       11 totems · state (top row) + plan (bottom row)
  users-filters.tsx    URL-driven · client island
  users-table.tsx      11-column institutional table
```

### KPIs (11 totems)

Top row (invitation state):
- Active · Invited · Onboarding · Inactive · Churn risk · Linked from contacts

Bottom row (plan):
- Free · Pro · Premium · Team / Enterprise · Active subs

### Filters (URL-driven)

- **Status** chips: All / Invited / Onboarding / Active / Inactive / Churn risk
- **Plan** chips: All / Free / Pro / Premium / Team / Enterprise
- **Linked from contacts only** toggle
- **Sort**: Recent · Last seen · A–Z · Tier
- **Search**: name + email (350 ms debounce)

### Table (11 columns)

1. User (name + email)
2. Company / Org (from `organizations.name` via `current_organization_id`)
3. Role
4. Linked contact (click-through to `/user/admin/contacts?selected=<id>`)
5. Status badge
6. Tier badge
7. Subscription (tier + status)
8. Promo
9. Last seen
10. Created
11. Owner

---

## 4 · Contact ↔ User integration

The drawer on `/user/admin/contacts?selected=<id>` now carries a
**Conversion status** section showing:

- The stage chip (Active user · Onboarding · Invited · Inactive · Churn risk · Not invited · etc.)
- A linked-user card with click-through to `/user/admin/users?search=<email>` when a user exists
- Contact-invite state + invitation history count

The drawer's "Suggested next action" was rewritten with **growth verbs**
to match the new product framing — see `docs/integrations/datasite-contacts.md`
§ Phase 2.D.1.

---

## 5 · What this page is NOT

- **Not a CRM** — no contact ownership rules, no automation, no email sequences
- **Not relationship-intelligence-OS** — no graph visualization, no AI orchestration
- **Not Salesforce-style enterprise** — no complex automation workflows
- **Not realtime** — the page is server-rendered with `force-dynamic`; mutations land in 2.D.2 onwards

---

## 6 · Forward roadmap

| Phase | Deliverable |
|---|---|
| 2.D.2 | Contact mutation workflows (edit · add · delete · merge · mark invalid · tags · owner · status) |
| 2.D.3 | Bulk actions on contacts (row selection + bulk invite via Resend + bulk promo / tags / export / contacted / inactive / campaign assign) |
| 2.D.4 | Campaigns + Subscriptions full UIs (CRUD · execution · conversion tracking · grant Comped · mark Expired) |

---

## 7 · Cross-references

- `docs/integrations/datasite-contacts.md` — contacts base + Phase 2.D framing
- `docs/database/migrations/0015_users_growth_layer.sql` — schema source-of-truth
- `docs/routing.md` — all admin routes + visual contract
- `docs/changelog.md` 2026-05-12 Phase 2.D.1 entry — full diff log
