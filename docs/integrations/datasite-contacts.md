# Integrations · Datasite Contacts (operational growth funnel)

**Last refreshed:** 2026-05-12
**Status:** 🟢 Phase 2.D.1 live · canonical contacts base wired into operational growth funnel · 6 tables (5 from 0014 + 2 new from 0015 minus the shared ones) · 4,547 contacts queryable · `/user/admin/contacts` + `/user/admin/users` consoles live · `/user/admin/campaigns` + `/user/admin/subscriptions` scaffolds live · `promote_to_supabase.py` remains idempotent

**Strategic framing (corrected 2026-05-12):** the contacts base is HOTELVALORA's **growth engine**, NOT a CRM, NOT a "relationship intelligence OS". The system relation is `contact → invited → onboarded user → active subscriber → premium/top-promote client`. The previous Phase 2.C framing leaned too far toward enterprise relationship intelligence; Phase 2.D.1 realigned the surface around operational conversion.

Datasite Outreach is the operator's deal-distribution platform. Its
Companies & Contacts and Buyer Tracking modules together hold the
canonical institutional relationship graph that powers HotelVALORA's
sourcing, underwriting, and outreach layers.

This integration is **export-driven** (not API-driven) because the
Datasite Claude MCP connector does not expose the Outreach CRM
endpoints. The operator drops a Full Report `.xlsm` export into
`CONTACTOS DATASITE/incoming/` and the ingester normalises, dedupes,
and merges into the canonical Master.

---

## 1 · Where this fits in the HotelVALORA data graph

```
                    ┌─────────────────────────────────────────────┐
                    │  DATASITE Outreach (external SaaS)          │
                    │  · Companies & Contacts                     │
                    │  · Buyer Tracking pipeline                  │
                    │  · Activities timeline                      │
                    └─────────────────┬───────────────────────────┘
                                      │ Full Report .xlsm export
                                      ▼
            ┌──────────────────────────────────────────────────────┐
            │  CONTACTOS DATASITE/incoming/   (operator drop zone) │
            └─────────────────┬────────────────────────────────────┘
                              │ python scripts/contactos/ingest.py
                              ▼
            ┌──────────────────────────────────────────────────────┐
            │  Ingester · parse · clean · normalise · join · dedupe │
            │  · classify (investor type · hotel focus · seniority) │
            └─────────────────┬────────────────────────────────────┘
                              ▼
            ┌──────────────────────────────────────────────────────┐
            │  CONTACTOS DATASITE/master/metcub-contacts-master    │
            │  + reports/                                          │
            │  + old/ (source archive)                             │
            └─────────────────┬────────────────────────────────────┘
                              ▼ (future)
            ┌──────────────────────────────────────────────────────┐
            │  Supabase · institutional contacts table (Phase 2.A) │
            │   → CompSet underwriting relationship lookup         │
            │   → Transaction enrichment (buyer/seller identity)   │
            │   → Outreach campaign deal sourcing                  │
            │   → Investor graph for hospitality intelligence       │
            └──────────────────────────────────────────────────────┘
```

The Master sheet is the **single canonical institutional dataset** for
person-level relationship data. It's the natural join target for:

- **Transactions ingestion** · match buyer/seller names → institutional master row → enrich the deal with investor type, fund size, prior bid history
- **CompSet underwriting** · when an asset competes with one of the institutional buyers in the dataset, surface their declined comments / latest bid range
- **Intelligence Engine** · when news articles mention institutional names (Blackstone, Brookfield, KKR, AXA, Allianz, etc.), join to the Master to derive contact-level outreach hooks
- **Future CRM layer** · the Master IS the institutional contact directory · the UI of any CRM feature reads from it

---

## 2 · Three architectural disciplines (shared with other ingesters)

The CONTACTOS DATASITE ingester mirrors the same architectural pattern
already used in HotelVALORA for transactions, CoStar warehouse, and the
hospitality intelligence pipeline:

| Discipline | How it shows up here |
|---|---|
| **Drop-zone workflow** | `incoming/` is the only operator interaction surface · drop the file and run · no UI · no flags · idempotent |
| **Provenance + lineage** | every Master row carries `source_file`, `first_seen_batch_id`, `last_seen_batch_id`, `last_updated_at` · history never lost |
| **Audit-grade reports** | every batch emits 3 CSVs + 1 JSONL line · dedup decisions are forensic-ready · schema changes are detected via the schema-mapping report |
| **Re-classifiability** | `--reclassify` rebuilds derived fields (investor type · hotel focus · seniority) when canonical rules change · no source re-ingest needed |
| **Append-only audit log** | `reports/ingestion-log.jsonl` grows forever · QA can replay history |
| **Encrypted/protected PII** | the whole folder is `.gitignore`'d except this doc and the operator README · nothing PII ever lands in git |

---

## 3 · Canonical institutional taxonomy

The classifier maps Datasite's free-text Spanish + English "Type of
Investor" + `Subtype` + Description fields to a stable canonical
taxonomy that reflects the hospitality investment universe:

| Canonical | Includes raw signal |
|---|---|
| REIT/SOCIMI | REIT, SOCIMI, inmobiliaria cotizada |
| Family Office | family office, FO, patrimonio familiar |
| Sovereign Wealth | sovereign, wealth fund, fondo soberano |
| Pension Fund | pension, pensiones |
| Insurance | insurance, asegurador, aseguradora |
| Fund | private equity, PE fund, venture capital, VC, fondo de inversión, investment fund |
| Lender | financiador, banco, prestamista, debt fund, mortgage, lender |
| Hotel Chain | cadena hotelera, cadenas hotel, hotel chain |
| Operator | operator, operador, gestor hotelero, management company |
| Brand | brand, marca, franchise, franchisor |
| Owner | propietario, owner |
| Broker | broker, intermediario, asesor inmobiliario, real estate advisor |
| Advisor | consultor, consultora, consultancy, advisory, asesoría |
| Developer | developer, promotor, desarrollador, promotora |
| Architect | architect, arquitecto, arquitectura |
| Service Provider | proveedor, provider, service provider, servicios |
| F&B Operator | F&B, food & beverage |
| Media | medios, media, press, prensa, periodista, publicación |
| Corporate | corporate, industrial |
| Institutional Investor | institutional, institucional |
| Investor | inversor, investor (general fallback) |

Distinct buckets are deliberate. **Hotel Chain ≠ Operator** (chains are
brand-affiliated networks; operators are management companies).
**Owner ≠ Investor** (owners hold equity in specific assets; investors
deploy capital across portfolios). Don't collapse these without an
explicit operator directive.

When Datasite invents a new label or imports a project with a new raw
type, the value falls through to the raw string (preserved verbatim).
The Summary sheet surfaces this as a non-canonical bucket so the
operator notices and decides whether to add a new canonical rule.

---

## 4 · Dedup priority + merge rules

Order applied when matching a new contact against the existing Master:

1. **exact email** (lowercase, mailto/whitespace stripped) — primary key
2. **LinkedIn URL** (protocol/www stripped, trailing slash trimmed)
3. **full_name (lowercase) + company_key (legal-suffix stripped, alphanumeric only)**
4. **fuzzy fallback** · Levenshtein ≥ 0.88 on full_name within same company_key

When a match is found:
- `master_id` is preserved (synthetic stable id, never re-keyed)
- `first_seen_batch_id` is preserved (lineage anchor)
- For every other field: **latest non-empty value wins** if it differs from the existing
- `notes_consolidated` is **concatenated** (dedup by lowercase substring, joined with ` | `)
- `last_seen_batch_id` + `last_updated_at` advance to current
- `source_file` updates to the most recent ingest filename

When no match is found:
- New row appended · `master_id` synthesised from the highest-priority discriminator present (email > LinkedIn > name+company hash)
- `first_seen_batch_id` = `last_seen_batch_id` = current batch

Every decision is logged to `reports/duplicate-resolution_<batch_id>.csv`
with the strategy used, the similarity score (for fuzzy), and the list
of fields that changed (for UPDATEs).

---

## 5 · Operational baseline (METCUB · 2026-05-12)

First production ingest · single Full Report (`20260512 - METCUB -
Full Report.xlsm` · 2.3MB · 4,828 contact rows · 3,000 company rows ·
3,000 activity rows).

**Master cardinality after dedup:** 4,547 contacts · 2,819 unique
companies (with at least one contact) · 2,990 company records · 2,990
activity timelines.

**Pipeline distribution:**

| Stage | Contacts |
|---|---|
| Teaser | 2,301 |
| Outreach | 1,176 |
| NDA | 729 |
| Investment Meetings | 267 |
| Warehouse | 52 |
| Bids | 22 |

**Top canonical investor types:**

| Type | Contacts |
|---|---|
| Investor (general) | 1,836 |
| Broker | 905 |
| Hotel Chain | 669 |
| Developer | 521 |
| Lender | 334 |
| Service Provider | 112 |
| Family Office | 59 |
| Operator | 40 |
| Owner | 17 |
| Media | 11 |

**Geography:** España 1,667 · USA 1,649 · Europa 1,190 · UK 15 · Portugal 11.

**Coverage:** 99.6% have email · 15% have phone · 0% have LinkedIn (Datasite export doesn't populate this field for this room).

**Top active institutional investors by Master contact count:** Colliers
(13) · BBVA (12) · Eastdil Secured (12) · Allianz Real Estate (11) ·
Anida-BBVA (11) · Morgan Stanley (11) · Credit Suisse (11) · AXA
Investment Managers (10) · Banca March (10) · Goldman Sachs (10) ·
Savills (10) · Deutsche Bank (9) · Wyndham Hotel Group (9) ·
Bankinter (8) · Carlyle (8).

---

## 6 · Forward roadmap

### Phase 2.A · Supabase relationship table (deferred)
Promote the Master sheet to a queryable Postgres table
(`relationship_contacts`) with proper indexes on email / LinkedIn /
company. Add columns for `master_id`, `investor_type`, `hotel_focus`,
`pipeline_state`, `last_activity_date`. The ingester gains a
`--push-to-db` flag that upserts after the local Master is rewritten.

### Phase 2.B · Cross-system joins
- **Transactions** · `hotel_transactions.buyer_id` / `seller_id` →
  `relationship_contacts.master_id` (when the deal counterparty matches
  a known institutional contact)
- **CompSet** · when an institutional contact has an active deal stage
  on a competing asset, surface in the CompSet underwriting panel
- **Intelligence Engine** · join news articles mentioning institutional
  names to the Master · drive outreach hooks

### Phase 2.C · Outreach intelligence UI · ✅ shipped 2026-05-12

The institutional relationship console at `/user/admin/contacts` is now
live and queries Supabase directly. Visual language matches AI
Operations / Integrations / Intelligence Feed (dark forest-900 →
slate-950 gradient cards, lime-300 accents, tracked-out uppercase
micro-labels).

**Schema (migration `0014_relationship_contacts`):**
- `relationship_companies` (unique by `company_key`)
- `relationship_contacts` (FK → companies · unique by `master_id` ·
  generated `email_lower` for case-insensitive search · indexed on band
  / bucket / investor_type / collab score / company_id)
- `relationship_interactions` (FK → companies · one timeline per company)
- `relationship_labels` (FK → contacts · unique on `(contact_id, label)`)
- `relationship_health` (FK → contacts · unique on `contact_id`)

RLS enabled · zero policies · anon + authenticated revoked. Only the
service-role server lib reads these tables.

**Ingester (`scripts/contactos/promote_to_supabase.py`):**
- stdlib `urllib` PostgREST client · `Bearer SERVICE_KEY`
- `upsert` with `on_conflict` + `Prefer: resolution=merge-duplicates`
- paginated `fetch_all()` (Range header) for FK resolution — fixed the
  first-run truncation at 1,000 IDs that lost company_id joins
- 5-step ingest: companies → fetch IDs → contacts (with FK) → fetch IDs
  → interactions + labels + health
- idempotent · re-runnable · final ingest:
  2,990 companies · 4,547 contacts · 2,990 interactions · 143 labels ·
  34 health records

**UI (`apps/web/src/app/user/admin/contacts/page.tsx`):**
- 14 KPI totems split across 2 rows · top row = bands + recency, bottom
  row = institutional-type breakdown
- 10-column table: Contact (name + title + email + LinkedIn) · Company
  (with geography) · Type (with hospitality badge) · Band · Strength ·
  Collab · Last email (with directionality) · Gmail labels (max 3 chips
  + count) · Email health · Strategic signal (inferred stage + Datasite
  stage + pipeline state when non-Active)
- URL-driven filter state — band chips · **Relationship Type chips
  (8 groups · Phase A · 2026-05-15)** · "Show invalid" + "Recently
  active · 90d" toggles · sort (Collab / Strength / Recent / A-Z) ·
  debounced search across name + email + company
- **Relationship Type taxonomy (Phase A · 2026-05-15):** ALL ·
  PRINCIPALS · BROKER · LENDER · OPERATOR · DEVELOPER · HOTEL SUPPLY ·
  IA SUPPLY. Each chip key explodes via `RELATIONSHIP_TYPE_GROUPS` in
  `live.ts` to a `.in("investor_type", [...])` query — single
  round-trip, no client-side filtering. Backward compat preserved: raw
  legacy values (`investor_type=Lender` etc.) still resolve via `.eq`
  for existing bookmarks / scripts. URL param key remains
  `investor_type` until Phase C renames the DB column. **IA SUPPLY**
  is wired but resolves to 0 today — its source-of-truth lives in
  Master `contact_category` (column 63 · classify_master.py · already
  uses TECH_DOMAINS heuristic) and will populate after Phase B
  promotes that column to `relationship_contacts`.
- Quality-first default filter active: `bucket = 'active'` AND
  `hide_invalid` AND no-Gmail-activity dormant rows hidden. Operator
  flips the toggle to widen.
- Server-side pagination (50/page) via PostgREST `Range`
- Sidebar entry added under "AI Operations" / "Integrations" with the
  Users icon and a `Live` badge

**Server lib:** `apps/web/src/lib/admin/contacts/live.ts`
- `loadContacts(filter)` · `loadContactKpis()` · `loadInvestorTypes()`
- `RELATIONSHIP_TYPE_GROUPS` (Phase A) · 7-key map exploding each
  chip key to a list of raw `investor_type` values. Same arrays
  power both filter `.in(...)` and KPI `countByGroup(...)` so
  filter ↔ totem counts can never drift.
- 18 parallel count queries for the KPI strip (no waterfall): 6 band
  + 7 group + 2 legacy-compat singletons (Family Office, REIT/SOCIMI)
  + 2 activity totems + 1 total
- joins `relationship_labels` for the visible page only (max
  `page_size` lookups)

**Out-of-scope (deferred):** realtime Supabase channel · auto Gmail
crawling · embeddings · graph visualizer · AI orchestration on contacts
table. The UI is read-only — mutations (merge / promote unmatched /
correct invalid) still happen via the Python ingester so provenance
stays auditable.

### Phase 2.C.1 (follow-up · same day) — security gate + intelligence drawer

**Operator allow-list (fail-closed).** Central guard at
`apps/web/src/lib/security/operator-guard.ts`. The layout RSC
(`/user/admin/layout.tsx`) calls `requireOperator()` so every admin
page is gated, not just mutation actions. Empty `ADMIN_OPERATOR_EMAILS`
+ empty `INTERNAL_ALERT_RECIPIENTS` with `AUTH_ENABLED=true` denies all
callers (the prior `assertAdminContext` was fail-open here — that was
the documented gap). Non-operator signed-in users hit an opaque 404 so
the existence of the admin section doesn't leak.

**Relationship intelligence drawer.** `?selected=<contact_id>` opens a
server-rendered side panel with 4 sections:

- **Header**: name + title + role + company + geography · 3 contact
  affordances (mailto · phone · LinkedIn) · 6 stat cells
  (Strength / Collab / Band / Email health / Directionality / Active
  threads)
- **Institutional context**: investor classification + subtype + tier
  + industry + hotel focus + fund size + ticket range + HQ +
  description · activity-density badge (high · moderate · low ·
  no events)
- **Strategic** (read-only · deterministic): suggested next action
  (correct email · re-engagement · maintain warm cadence · continue
  active dialogue · promote to active · initiate outreach · background)
  · warm-intro potential (peer count) · inferred relationship stage ·
  declined comments · consolidated relationship notes · derived tags
  (institutional-priority · bidirectional · collab-priority ·
  live-process · declined-history · email-fragile · hospitality-mandate)
- **Timeline**: chronological event list joining Gmail (last touch +
  bounces) + Datasite stage dates (15 distinct stage timestamps:
  buyer-added, initial contact, teaser sent, NDA initial/signed/executed,
  CIM sent, IOI process letter / received, LOI process letter /
  received, management presentation, revised bid, declined, last
  activity) + per-label `created_at` from `relationship_labels`.
  Source-tinted dots: Datasite emerald, Gmail amber, labels lime.
- **Peers**: up to 8 other contacts in the same company, sorted by
  collab score then strength.

Backed by `loadContactDetail(contactId)` — 5 parallel Supabase queries
(contact · company · interactions · labels · health · peers) composed
into a single typed `ContactDetail` shape.

### Phase 2.D.2 — Mutation workflows (PRIMERA OLA · shipped same day)

The contacts surface stops being read-only. Five operational growth
basics land with full audit:

| Action | Server action | Audit verb |
|---|---|---|
| Edit (identity bulk) | `updateContactAction` | `contact.updated` |
| Mark email invalid | `markContactInvalidAction` | `contact.invalid_marked` |
| Add operator tag | `addContactTagAction` | `contact.tag_added` |
| Remove operator tag | `removeContactTagAction` | `contact.tag_removed` |
| Assign relationship owner | `assignRelationshipOwnerAction` | `contact.owner_assigned` |
| Update relationship band | `updateRelationshipStatusAction` | `contact.status_updated` |

All gated by `requireOperator()` (fail-closed) and writing one row to
`public.activity_log` with diff/before/after in jsonb metadata.

**Schema additions:**
- Migration `0016` — `relationship_contacts.tags text[]` (operator-added,
  GIN-indexed, distinct from Gmail-derived `relationship_labels`) +
  `deleted_at timestamptz` (soft-delete column · all mutations filter
  by `deleted_at IS NULL`).
- Migration `0017` — `relationship_contacts.relationship_owner_email`
  (commercial owner across the funnel · distinct from the users.row
  field which only kicks in post-conversion).

**UX:** split drawer. `?selected=<id>` renders read view (gains an Edit
button + Operator tags section with inline +/− forms). `?selected=<id>&mode=edit`
renders the editable side panel with 4 form sections (Identity ·
Relationship status · Relationship owner · Email health override).
Form-wrapper actions redirect back to view mode with `?saved=1` or
`?error=<msg>` so the page reload surfaces outcome without client state.

**SEGUNDA OLA (next sub-push):** merge duplicates · soft-delete action ·
add contact manually. Bulk actions in Phase 2.D.3.

### Phase 2.D.3 — Bulk operational workflows (shipped same day)

Operator can act on N contacts at once. 9 actions follow the same shape:
gated by `requireOperator()`, soft-delete-aware, one `activity_log` row
written per affected contact, hard-capped at 500 rows per action.

| Action | Server action | Audit verb |
|---|---|---|
| Bulk invite (Resend send loop) | `bulkInviteAction` | `contact.bulk_invite_sent` / `_failed` |
| Bulk add tag | `bulkAddTagAction` | `contact.bulk_tag_added` |
| Bulk assign owner | `bulkAssignOwnerAction` | `contact.bulk_owner_assigned` |
| Bulk assign campaign | `bulkAssignCampaignAction` | `contact.bulk_campaign_assigned` |
| Bulk mark contacted | `bulkMarkContactedAction` | `contact.bulk_marked_contacted` |
| Bulk mark inactive | `bulkMarkInactiveAction` | `contact.bulk_marked_inactive` |
| Bulk mark invalid | `bulkMarkInvalidAction` | `contact.bulk_invalid_marked` |
| Bulk suppress outreach | `bulkSuppressOutreachAction` | `contact.bulk_outreach_suppressed` |
| Bulk export CSV | `bulkExportCsvAction` → `/api/admin/contacts/export` | (read-only) |

**Schema additions (migration `0018`):**
- `user_tier` enum extended with `top_promote` + `comped`
- `relationship_contacts.suppressed_outreach boolean` (partial-indexed)
- `relationship_contacts.archived_at timestamptz` (partial-indexed)
- `contact_invitations.default_subscription_tier text` (CHECK constraint
  · tier hint applied when contact accepts the invitation)

**Selection model:** client-side context with two modes — `explicit`
(operator ticked specific rows) and `filtered` (operator selected the
entire filter result; server re-applies the filter at action time so
the URL stays clean). Hard cap `MAX_BULK_BATCH = 500`.

**Resend bulk-invite loop:**
- Per contact: create `contact_invitations` row → send → flip status
  to `sent`+`resend_message_id` or `bounced` → bump
  `relationship_contacts.contact_invitation_status='invited'` +
  `last_contacted_at`
- 150 ms spacing keeps the loop under Resend's 10/s default
- Excludes contacts with no email · suppressed · invalid · flagged
- The invitation id IS the invite token (resolves at the future
  `/invite/<id>` landing route in Phase 2.D.5)

**CSV export** — route handler `/api/admin/contacts/export` streams a
25-column file with RFC 4180 quoting + ISO-8601 dates.
`Content-Disposition: attachment; filename="hotelvalora-contacts-<ts>.csv"`.

**Intentional non-features:** no automation engine, no sequence
builder, no AI outbound generation. Selection is in-page only (no
persistence across reloads). The operator pulls each trigger by hand.

### Phase 2.D.4 — Campaigns CRUD + Subscriptions admin + lifecycle joins (shipped same day)

The contacts layer becomes a real acquisition + subscription operations
system. Three surfaces work in concert:

| Surface | Role | What lands |
|---|---|---|
| `/user/admin/campaigns` | Activation source-of-truth | Full CRUD · create/edit/archive/restore · per-campaign invitation list · attributed-subs counter |
| `/user/admin/subscriptions` | Monetization source-of-truth | Assign tier · update tier/status/expires · expire-now quick action · joins users + campaigns |
| `/user/admin/contacts?selected=<id>` | Funnel intelligence | Lifecycle pill · subscription card · source campaign row · cross-links to all three surfaces |

**Schema additions (migration `0019`):**
- `subscription_status` enum gains `expired` (distinct from `canceled`)
- `campaigns` gains `target_audience` · `notes` · `conversion_target` ·
  `archived_at` · `created_by_email`
- `subscriptions` gains `expires_at` · `notes` · `assigned_by_email` ·
  `source_campaign_id` FK
- `subscriptions.stripe_customer_id` becomes nullable (comped/manual
  assignments don't have Stripe customers)

**Lifecycle layer (`lib/admin/lifecycle.ts`):** a single `deriveLifecycle()`
function takes `{ has_linked_user, contact_invitation_status,
subscription_status, subscription_expires_at, user_invitation_status }`
and returns `{ state, label, tone }`. States:
`contact_only · invited · onboarded · active_subscriber · expired · inactive`.

**Audit:** every mutation writes one `activity_log` row with
`entity_type ∈ { campaign, subscription }` and `action='<entity>.<verb>'`.

**Intentional non-features (carried forward):** no automation engine,
no drip campaigns, no AI outbound generation, no CRM pipelines, no
scoring engines. Each operator action is a manual trigger. Stripe-
backed subscriptions are operator-edit-only via the Stripe dashboard
so the webhook stays authoritative; admin UI shows them with a yellow
warning banner.

### Phase 2.D.5 — Invitation accept flow closes the funnel (shipped same day)

The bulk-invite Resend send loop from Phase 2.D.3 generates a
`contact_invitations.id` as the invite token. Phase 2.D.5 wires the
public `/invite/<token>` landing that:

| Layer | What it does |
|---|---|
| Token validation | uuid pre-check · single DB roundtrip joins `relationship_contacts` + `campaigns` |
| First-visit stamp | `sent`/`pending`/`delivered` → `opened` · one `activity_log` row · idempotent |
| Blocking states | revoked · declined · bounced · expired · already-accepted — each renders its own institutional card |
| Acceptance | One-click form when signed in · `/login?next=/invite/<token>` redirect when not |
| Funnel closure | `acceptInvitationAction` runs the contact↔user link, subscription bootstrap, and invitation status flip in sequence with 2 audit rows |

**Schema (migration `0020`):**
- `contact_invitations.accepted_at`, `converted_at`, `accepted_by_user_id`, `expires_at` (default 30 days)
- Status CHECK extended with `revoked` + `expired`

**Server-side:**
- `lib/invitations/live.ts` — token landing read + opened-stamp
- `lib/invitations/accept.ts` — the funnel-closer (`acceptInvitationAction`) + operator-only `revokeInvitationAction`

**Data Cache bug fix:** The Supabase admin client now passes
`cache: 'no-store'` on every roundtrip. Surfaced during the
invitation-state smoke test (stale snapshot of `status='sent'`
persisted even after a SQL `UPDATE status='revoked'`); fixing on the
shared client benefits every admin surface (contacts, users,
campaigns, subscriptions, invitations).

**Out of scope (deferred — explicit non-features per directive):**
billing automation · Stripe self-serve upgrades · referral systems ·
affiliate systems · lifecycle automation. Operator drives every
state flip.

### Phase 2.D.6 — Campaign-aware bulk subscription operations (shipped same day)

The bulk toolbar pattern from Phase 2.D.3 now covers the full
acquisition + monetization loop. Four new bulk actions ship in
`lib/admin/subscriptions/bulk.ts`:

| Action | Verb | Effect |
|---|---|---|
| Bulk assign tier | `subscription.bulk_assigned` | One `subscriptions` row per user with chosen tier/status/expires_at/source_campaign/notes |
| Bulk comp | `subscription.bulk_assigned` (tier=comped, status=active) | Shortcut wrapping the assign action |
| Bulk expire | `subscription.bulk_expired` | Flip latest sub to `status='expired'` + `expires_at=now()` · skips Stripe-backed |
| Bulk revoke invitations | `invitation.bulk_revoked` | Flip pending/sent/delivered/opened/clicked/bounced invites to `revoked` · accepted untouched |

**Tri-mode selection contract** (FormData fields):
- `sel_mode='explicit'` + `user_ids=<csv>` — operator-ticked user rows
- `sel_mode='filtered'` + `filter_qs=<encoded>` — re-runs the users-page filter at action time
- `sel_mode='contacts'` + `contact_ids=<csv>` — resolves each contact's `linked_user_id`, drops not-yet-onboarded

**Surfaces gained:**
- `/user/admin/users` — full selection system + sticky bulk toolbar (Assign · Comp · Expire). Amber expiration ring on rows whose subscription expires within 7 days.
- `/user/admin/contacts` — toolbar gains Subscribe + Revoke invite actions.
- `/user/admin/subscriptions` — table rows now tint amber (within 7 days) or rose (past expiry on still-active) with day-count suffix.

Audit trail rows preserve actor_email + actor_id + campaign attribution
on every action; the activity_log entity_type discriminates
`subscription` vs `relationship_contact` for filtering downstream.

### Phase 2.D · Incremental updates from additional projects
The architecture already supports this — drop a different project's
Full Report into `incoming/`, the dedup logic merges by email/LinkedIn
across projects. The `source_file` provenance preserves which export
each row came from.

---

## 7 · Google Contacts enrichment pipeline (Phase 2.A · shipped)

Operator's personal/professional Google address book is the second
relationship signal layer. The Google ingester cross-references it
against the Master and emits a 5-sheet workbook + 4 per-batch CSV
reports + a markdown analysis. **It does NOT mutate the Master** —
explicit operator approval is required to promote suggestions.

### Architecture (parallel to Datasite ingester)

```
incoming/google-contacts/<file.csv>
            │
            ▼ python scripts/contactos/ingest_google.py
            │
   ┌────────┴────────────────────────────────────────────┐
   │  parse Google CSV (multi-value columns tolerant)    │
   │  → GoogleContacts_Raw  (verbatim · UTF-8 BOM clean) │
   │  → GoogleContacts_Normalized (canonical shape)      │
   │  → classify (9-bucket Google taxonomy)              │
   │  → within-google duplicate detection                │
   │  → identity-resolve vs Master                       │
   │  → recommend action per row                         │
   └────────┬────────────────────────────────────────────┘
            ▼
   google-contacts/
     raw/google_raw_<batch>.csv
     normalized/google_normalized_<batch>.csv
     enriched/google_enriched_<batch>.xlsx   ← 5 sheets
     relationship-enrichment-report.md       ← single canonical analysis

   reports/
     google-ingestion-log.jsonl              (append-only)
     google-identity-resolution_<batch>.csv
     google-overlap-analysis_<batch>.csv
     google-within-duplicates_<batch>.csv
     google-suggested-joins_<batch>.csv

   old/google-contacts/<file.csv>            ← source archived
```

### Google classification taxonomy

Distinct from the Master's investor-type taxonomy because Google contacts
carry less structure. Nine high-level buckets:

| Bucket | Signal |
|---|---|
| investor | REIT/SOCIMI · Family Office · Fund · PE · VC · Asset Management · Capital Partners |
| lender | Bank · Banco · Financiador · Debt fund · Mortgage |
| broker | Colliers · JLL · Cushman · CBRE · Savills · Knight Frank · broker · intermediario |
| operator | Operador · Gestor hotelero · Management company · Cadena hotelera |
| brand | Brand · Marca · Franchisor · Franchise |
| consultant | Consultor · Consultancy · Consulting |
| advisor | Advisor · Advisory · Asesoría |
| personal | Personal email domain (Gmail · Hotmail · Yahoo · iCloud · etc.) without institutional company signal |
| unknown | No company AND no email AND no classification signal |

Matched contacts ALSO carry the canonical Master `investor_type` so the
operator can reason in either vocabulary.

### Identity resolution

Same priority order as the Master ingester:

1. exact email (primary + secondaries against `master.email`)
2. exact phone (digits-only, +-prefix-aware)
3. exact LinkedIn URL (protocol/www-stripped)
4. exact name + normalised company (legal-suffix stripped)
5. fuzzy fallback · Levenshtein ≥ 0.88 within same company_key

### Recommended actions (4-valued)

| Action | Condition | Operator response |
|---|---|---|
| MERGE | exact match found · safe field-level enrichment | review email/phone/LinkedIn deltas · approve specific fields |
| INSERT | institutional classification · no Master match | candidate for outreach + Master row creation |
| REVIEW | fuzzy match OR unclassified-with-company | 5-minute manual triage each |
| NO_OP | personal · no company · no institutional signal | skip |

### Privacy posture

The whole `CONTACTOS DATASITE/google-contacts/` subtree is `.gitignore`'d
in addition to the existing Datasite rules. Both `*.csv` and `*.xlsx`
patterns are excluded. The README is the only safe artifact under that
folder.

### Phase 2.A.2 · apply-tool (deferred)

When the operator has reviewed `google-suggested-joins_<batch>.csv` and
wants to promote some/all rows to the Master, the next planned tool is
a `scripts/contactos/apply_google_joins.py` that:

1. reads an operator-edited CSV (with a `decision` column · APPROVE/SKIP)
2. for each APPROVE row, calls the Master ingester's `upsertItem` /
   `merge_existing` logic directly
3. writes a new `google-applied_<batch>.jsonl` audit line
4. regenerates the Master + Summary

Until then, the operator cherry-picks manually.

---

## 8 · Cross-references

- `CONTACTOS DATASITE/README.md` — operator-facing workflow guide (Datasite + Google sections)
- `scripts/contactos/ingest.py` — Datasite ingester (`MASTER_SCHEMA` = canonical column order)
- `scripts/contactos/ingest_google.py` — Google Contacts enrichment ingester (read-only, no Master mutation)
- `.gitignore` — privacy rules (search "CONTACTOS DATASITE")
- `docs/changelog.md` — Phase 2.10 + Phase 2.A entries
