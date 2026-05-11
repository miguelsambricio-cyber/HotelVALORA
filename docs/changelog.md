# Changelog

One entry per completed feature or significant task. Most recent first.

---

## 2026-05-11 — Supabase initial schema applied to production project

Applied `0001_initial_schema.sql` to project `twebgqutuqgonabvhzjk` via the Supabase MCP server (`apply_migration`). 32 tables created, all with RLS enabled. Registered as migration `20260511015418_initial_schema`.

Two Postgres-driven edits to the drafted SQL were required (now reflected in the source file):

- `top_promote_reports.is_active` — removed; was a stored generated column using `now()`, which Postgres rejects (`generation expression is not immutable`). Derive in queries as `promoted_until > now()`.
- `top_promote_active_idx` / `top_promote_priority_idx` — dropped the `where promoted_until > now()` predicate; Postgres rejects mutable functions in index predicates. They are now plain b-tree indexes.

Follow-up migration `0002_harden_security_definer_functions.sql` applied to close every WARN-level lint surfaced by `get_advisors`:

- Pinned `search_path = public, pg_temp` on `set_updated_at()` and `handle_new_user()`.
- Revoked `EXECUTE` on `handle_new_user()` from `public` / `anon` / `authenticated` (trigger-only; should not be RPC-callable).

The only remaining advisory is the **intentional** `payment_events: rls_enabled_no_policy` (INFO) — service-role-only writes from the Stripe webhook handler.

### Files

- `docs/database/migrations/0001_initial_schema.sql` — patched, applied
- `docs/database/migrations/0002_harden_security_definer_functions.sql` — new, applied
- `docs/database/README.md` — status flipped to ✅ applied
- `.mcp.json` — added so Claude Code auto-loads the Supabase MCP server next session

---

## 2026-05-11 — Comprehensive Supabase schema drafted (30 tables, 6 domains)

Expanded the v1 schema proposal from 7 tables to a production-grade 30-table surface across six domains. Migration file ready to apply via the SQL editor; hand-rolled `Database` type already in repo so frontend queries compile against the future shape.

### Domains shipped in the migration

| Domain | Tables |
|---|---|
| ① Auth + users | `users` · `profiles` · `organizations` · `user_roles` · `sessions` · `oauth_accounts` |
| ② Library | `valuations` · `saved_reports` · `favorite_reports` · `top_promote_reports` · `report_visibility` · `report_shares` |
| ③ Investment engine | `investment_requirements` · `market_preferences` · `valuation_preferences` · `revpar_scenarios` · `hotel_filters` |
| ④ CRM | `companies` · `contacts` · `leads` · `notes` · `activity_log` |
| ⑤ Files (Storage metadata) | `report_files` · `generated_pdfs` · `uploaded_excels` · `renders` · `avatars` |
| ⑥ System | `audit_logs` · `notifications` · `feature_flags` · `subscriptions` · `payment_events` |

### Files

- `docs/database/migrations/0001_initial_schema.sql` — single-file migration (~720 lines)
- `docs/database/README.md` — ER summary, ready-vs-placeholder map, apply instructions
- `docs/database/schema.sql` — deprecation pointer (replaced by migrations folder)
- `apps/web/src/lib/supabase/types.ts` — hand-rolled `Database` type matching all 30 tables + 15 enums

### Schema features

- **15 enums** (`user_tier`, `org_role`, `oauth_provider`, `report_visibility_t`, `report_type_badge`, `report_status`, `report_role`, `report_objective`, `share_permission`, `lead_status`, `pdf_status`, `excel_status`, `subscription_status`, `notification_kind`, `user_role`)
- **30 RLS policies** — every table enabled with own-only / public-read / parent-derived / org-scoped patterns
- **Triggers**:
  - `handle_new_user()` — auto-creates `public.users` + `public.profiles` on Supabase auth signup
  - `set_updated_at()` — bumped on update across 13 mutable tables
- **Indexes** on every FK + common query paths (`visibility`, `city`, `status`, partial indexes for active rows)
- **Generated column** `top_promote_reports.is_active` (boolean derived from `promoted_until > now()`)
- **Polymorphic notes + activity log** via `(entity_type, entity_id)` index pattern

### Architecture decisions

- `public.users` is split from `public.profiles` — auth-adjacent fields (tier, current_org) live separately from display fluff (avatar, locale, bio). Cuts churn surface on tier reads.
- `public.organizations` carries the multi-tenant boundary. `user_roles` is the N:M junction.
- `report_visibility` is an **audit log of transitions**, not a column duplication (`valuations.visibility` is the current state).
- `report_shares` supports both link-shares (anonymous, token-based) and per-user grants.
- `payment_events` has NO authenticated RLS policy by design — only the service-role Stripe webhook writes there.
- `feature_flags` is scoped to EITHER a user OR an organization (XOR check constraint).

### Apply path

The migration is not yet applied — DDL execution needs either the database password or a personal access token, neither of which is in the env today. The user will paste the file into the Supabase SQL editor manually. Once applied:

```bash
pnpm dlx supabase gen types typescript \
  --project-id twebgqutuqgonabvhzjk    \
  --schema public                       \
  > apps/web/src/lib/supabase/types.ts
```

regenerates the type surface; until then the hand-rolled types in `types.ts` match the migration 1:1.

### Build

Typecheck clean. No runtime change (no frontend code consumes Supabase tables yet — Phase 3 wiring is the next milestone).

---

## 2026-05-11 — Supabase architecture initialized

Production-grade scaffold for the Supabase layer: Postgres + Storage + (future) Auth.js adapter. Architecture lands today; project provisioning + credential paste-in lands on the user's next action.

### SDKs
- `@supabase/supabase-js@2.105.4`
- `@supabase/ssr@0.10.3`

### Files (`apps/web/src/lib/supabase/*`)
- `client.ts` · `createBrowserSupabaseClient()` — for `"use client"` components
- `server.ts` · `createServerSupabaseClient()` — RSC / actions / route handlers (Next 14 sync cookies)
- `middleware.ts` · `updateSupabaseSession()` — Edge middleware session refresh; no-op when env missing
- `admin.ts` · `getSupabaseAdmin()` — service-role, `import "server-only"` guard
- `auth-helpers.ts` · `getSupabaseUser`, `requireSupabaseUser`, `isSupabaseConfigured`, `isSupabaseAdminConfigured`
- `types.ts` · `Database` stub (regenerated after migrations)
- `index.ts` · barrel

### Middleware composition
`apps/web/src/middleware.ts` now composes `updateSupabaseSession(request)` → `auth()` (Auth.js). Both gated by their own env; the file is a pure pass-through until credentials are provisioned.

### Schema proposal
`docs/database/schema.sql` — NOT yet applied. Contains:
- 7 tables: `user_profiles`, `valuations`, `valuation_reports`, `favorites`, `top_promote`, `subscriptions` (six populated, ready for one more domain)
- 7 enums: `user_tier`, `user_role`, `report_visibility`, `report_type_badge`, `report_status`, `report_role`, `report_objective`
- Two triggers: `handle_new_user()` (auto-profile on auth signup), `set_updated_at()`
- Row Level Security policies on every table (own-read / public-read / owner-write)
- Documented storage buckets (`reports`, `pdfs`, `excel-uploads`, `renders`, `avatars`) — configured via dashboard, not SQL

### Connection probe
`/dev/supabase-test` — server-rendered checklist:
- Env vars present?
- Server client constructable?
- Service-role admin configured?
- Current session (anonymous expected today)
- "Where to find credentials" panel when env is empty

### Env placeholders (apps/web/.env.example)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Build
- 34 routes (33 static + `/dev/supabase-test` dynamic + Auth.js handler).
- Middleware bundle 79.4 kB → **134 kB** (+55 kB for `@supabase/ssr` on Edge).
- First Load JS on protected routes: 138 kB (+1 kB).
- Typecheck + production build clean.

### Activation steps (next action — user)
1. Provision Supabase project — `https://supabase.com/dashboard` (Region: EU-West Ireland recommended)
2. Settings → API → copy `Project URL`, `anon key`, `service_role key`
3. Paste into `apps/web/.env.local` + `vercel env add … production` for each
4. Run `docs/database/schema.sql` via Supabase SQL editor
5. Configure storage buckets per the dossier
6. Regenerate types: `pnpm dlx supabase gen types typescript --project-id <REF> > apps/web/src/lib/supabase/types.ts`
7. Visit `/dev/supabase-test` — every row should turn green

### Out of scope (deferred)
- No `@auth/supabase-adapter` wire-up (Phase 3)
- No Stripe integration (Phase 5)
- No OAuth provider configuration on Supabase side (Auth.js handles OAuth today)
- No migration applied / no real DB queries from the app surface yet

---

## 2026-05-11 — Resend wired for tour-request CTA

The Library "Schedule a Tour" button on top-promoted contact-card popovers now sends a real institutional email via Resend.

### Files
- `apps/web/src/lib/email/client.ts` — singleton Resend client + `import "server-only"` guard
- `apps/web/src/lib/email/templates/tour-request.ts` — typed `renderTourRequest()` returning `{ subject, html, text }` (forest-900 header, slate body, escaped interpolation)
- `apps/web/src/lib/email/actions.ts` — server action `sendTourRequestAction` with zod payload validation, replyTo wiring, Resend tags
- `apps/web/src/components/library/contact-cell.tsx` — button now calls the action via `useTransition`, shows `Loader2` spinner while sending, toasts success / error
- `docs/integrations/resend.md` — full integration dossier

### Env
- `RESEND_API_KEY` — required. Set in `apps/web/.env.local` (dev) and Vercel project env (prod)
- `RESEND_FROM_EMAIL` — optional. Defaults to Resend sandbox (`HotelVALORA <onboarding@resend.dev>`)

### Sandbox note
While the from address is the Resend sandbox, deliveries only land in the Resend account owner's verified inbox. To deliver to arbitrary recipients (e.g., the account manager on each report), verify a custom domain in Resend and set `RESEND_FROM_EMAIL=HotelVALORA <noreply@hotelvalora.com>`.

### Build
33 routes static. /library/{favorites,top}-list 158 B / 137 kB (+1 B for the contact-cell delta). Typecheck + production build clean.

---

## 2026-05-11 — Auth.js v5 institutional scaffold

Wires Auth.js v5 (`next-auth@5.0.0-beta.31`) into Next.js 14 App Router with the production-ready split-config pattern. Google + LinkedIn + Apple providers configured (env-driven; placeholders today). Route-protection middleware ships behind an `AUTH_ENABLED` env flag — no behavioural change today, single env flip activates `/settings`, `/library`, `/report`, `/dashboard` gating once OAuth credentials land.

### Files
- `apps/web/src/auth.config.ts` — edge-safe config (providers, callbacks, JWT session, cookies, `authorized()` route gate, `PROTECTED_PREFIXES` constant)
- `apps/web/src/auth.ts` — `NextAuth(authConfig)` instance; exports `handlers` / `auth` / `signIn` / `signOut`
- `apps/web/src/app/api/auth/[...nextauth]/route.ts` — `{ GET, POST } = handlers`
- `apps/web/src/middleware.ts` — re-exports `auth` as middleware; matcher excludes `api/auth`, Next internals, static assets
- `apps/web/src/types/next-auth.d.ts` — module augmentation: `Session.user.{tier,role}` and `JWT.{tier,role,provider}`

### Tier system extension
- `UserTier`: dropped `institutional`, added `team` + `enterprise`. The legacy `institutional@…` email handle still infers `enterprise` for back-compat demos.
- New `UserRole = "user" | "admin" | "owner"`.
- `AppHeader` `TIER_LABELS` + `TIER_STYLES` extended (indigo for team, amber for enterprise).
- `lib/report/financials/types.ts` `Tier` alias updated to match.
- `useTier` + `canEditAssumptions` updated for the new tier set.

### UI wire-up
- `Providers` wraps the app in `<SessionProvider>` from `next-auth/react`.
- `useOAuth.signInWithProvider` body now calls `signIn(provider.nextAuthId, { callbackUrl, redirect: true })`.
- `OAUTH_PROVIDERS.{google,linkedin,apple}.enabled = true`; `microsoft` remains disabled (deferred to enterprise SSO surface).
- `LinkedInstitutionalAccounts` (rendered under the login card) and any future Settings → Credentials surface now routes to real Auth.js handshake.

### Env placeholders (apps/web/.env.example)
```
AUTH_SECRET=
AUTH_URL=
AUTH_ENABLED=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
```

### Build
- Production build clean. 33 routes static; `+ ƒ Middleware  79.4 kB` (Auth.js edge bundle). First Load JS on protected routes: ~137 kB (+5 kB for SessionProvider context).
- Two `jose` CompressionStream warnings on Edge — Auth.js Core dependency, harmless when JWE encryption is unused (we use JWS / signed JWTs only).

### Phase 3 swap (not in this commit)
- Add `@auth/supabase-adapter` to `auth.ts` (single line — `adapter: SupabaseAdapter(...)`)
- Mint OAuth apps and populate the env placeholders
- Set `AUTH_ENABLED=true` in Vercel
- Drop the Zustand mock auth store; bind `useTier()` to `useSession().data?.user.tier`

---

## 2026-05-10 — Library: contact card popover for top-promoted reports

The Contact column in both `/library/favorites-list` and `/library/top-list` now exposes an institutional contact card on hover — but only for rows whose `indicators.topPromote` flag is true AND which carry `contactInfo`. Everywhere else the icon stays grey and no popover renders.

### Component
- `apps/web/src/components/library/contact-cell.tsx` — `<ContactCell report />`.
- Renders the Mail glyph (forest-700 when active, slate-300 when inactive).
- Hover triggers a popover rendered via `React.createPortal` into `document.body`, pinned with `position: fixed` at coordinates captured from the icon's `getBoundingClientRect()`. The portal escapes the table's `overflow:auto` clip rect — without it, the popover would be cropped at the table's right edge.
- Layout matches Stitch: forest-900 header with "Account Manager" eyebrow / name / ID — listing.role, body with Asunto (computed from hotel name + stars + rooms + city), 2-col Objective / Role from listing data, mail + phone rows, and a "Schedule a Tour" pill CTA.
- Hover-leave clears the coords (popover unmounts). Re-entering the popover itself keeps it open.

### Data model
- `types/library.ts` — new `ReportContactInfo` (accountManager / accountManagerId / email / phone). `LibraryReport.contactInfo: ReportContactInfo | null`.
- Mock dataset: only the two top-promoted hotels carry contact info today: Ritz-Carlton Madrid (Carlos Velasco) and Mandarin Oriental Ritz (Marina López). The other four report `contactInfo: null`.

### Build
33 routes static. /library/favorites-list and /library/top-list 154 B / 133 kB First Load (+1 kB for the portal + popover). Typecheck + production build clean.

---

## 2026-05-10 — Library: `/library/top-list` (Top Reports institutional list)

Sibling list view of `/library/top-map`. Reuses the same `FavoritesTable` introduced for `/library/favorites-list` with one new toggle: `showReferenceColumn` inserts a REF column (HV-2024-NNN) just before the Report Type chip. Header copy swaps to "TOP REPORTS".

### Page
- `apps/web/src/app/library/top-list/page.tsx` — `LibrarySidebar` (Top Reports copy) + new `TopReportsListContent`.
- Header: "INSTITUTIONAL GRADE" badge, "Top Reports" title, "Promoted institutional hotel opportunities and underwriting intelligence." subtitle, three action icons (Map → /library/top-map, Filters, Settings).

### Table reuse
- `FavoritesTable` learned an optional `showReferenceColumn` prop. When set, renders an additional REF column header (`rowSpan=2`) and a monospace REF cell per row between IRR Equity and Report Type. Empty-state colSpan adapts (36 vs 37). No duplication, single canonical institutional table.

### Map ↔ list toggle generalized
- `HotelMap` now accepts an explicit `listViewHref` prop. /library/favorites-map passes `/library/favorites-list`; /library/top-map passes `/library/top-list`. The list-view button in `InstitutionalMapControls` only renders when an href is provided.
- TOP segmented tab is route-aware for both `/top-map` and `/top-list` (`activePaths`).

### Data model
- `LibraryReport` extended with `referenceCode` ("HV-2024-001" through "HV-2024-006") and `visibilityTier` (existing `VisibilityTier` union: promoted/institutional/community/verified — distinct from the Report Type chip; positions each hotel for the future Top Promote ranking engine).

### Build
32 → 33 routes static. /library/top-list 155 B / 132 kB First Load. Typecheck + production build clean.

---

## 2026-05-10 — Library: `/library/favorites-list` (institutional list view)

Bloomberg-grade table sibling of `/library/favorites-map`. Same `LibraryShell` and `LibrarySidebar`, swap the map for a 39-column technical terminal table over the same six mock reports.

### Page
- `apps/web/src/app/library/favorites-list/page.tsx` (LibraryShell + sidebar + new content column).
- Header bar: lime-on-forest "Institutional Grade" chip, "Favoritos" headline, subtitle, three-icon action group (map view link → `/library/favorites-map`, filters and settings as toast mocks today).
- Pagination footer: "SHOWING N OF M HOTELS".

### Table architecture (`favorites-table.tsx`)
- 39 visible cells per row (sticky-left "Hotel Name" + Category stars + Rooms + Market + 8 amenities + 9 listing/location columns + CAPEX + Total Invest 3-col group + Cap Rate + Market Value TTM 3-col group + Exit Year + Exit Price 3-col group + Yield + IRR Project + IRR Equity + Report Type chip + Contact + Star + PDF).
- `min-w-[4500px]` horizontal scroll; sticky `<thead>` survives both axis scroll; sticky first column with subtle right shadow.
- Accent column tints: blue for CAPEX / IRR Equity, emerald for Cap Rate / Market Value TTM.
- Locked-cell pattern: `LockedCell` renders a small blue lock pill for any null financial value (tier-gated).
- Memoized `<FavoritesRow>` (React.memo) so future virtualization drops in without prop reshuffles.
- Filters wired to the existing library store: search + legend toggles drive `visible` rows. Hover row highlight + cursor pointer + onSelect action (today: toast, future: open report detail).

### Cell primitives
- `AmenityIconCell` — single amenity, `forest-700` active / `slate-300` inactive. Lucide map: Bar→Coffee, Restaurant→UtensilsCrossed, Rooftop→Wine, Meet→Users, Gym→Dumbbell, Spa→Sparkles, Pool→Waves, Parking→Car.
- `ReportTypeChip` — Premium / PRO / Public / Private chip plus optional indicators row (Flame for top-promote, Edit3 for user-modified, EyeOff for private).
- `LockedCell` — small lock pill for tier-gated cells.

### Map ↔ list toggle on /library/favorites-map
- `InstitutionalMapControls` learned an optional `listViewHref` prop that renders a `LayoutList` link button between zoom-out and layers. `HotelMap` passes `/library/favorites-list`. The list page mirrors the toggle via the Map icon in its header.

### Sidebar tab routing
- `LibraryFilterTabs` now uses `activePaths[]` per tab, so the FAVORITOS pill stays active on both `/library/favorites-map` and `/library/favorites-list`.

### Data model (types/library.ts)
- New shapes: `ReportAmenities` (8 keys), `ReportLocation` (address/zip/subMarket/locationScore), `ReportListing` (role/objective/openYear/classLabel), `ReportPriceBlock` (total/perRoom/perM2), `ReportFinancials` (capex/totalInvest/capRate/marketValueTtm/exitYear/exitPrice/yield/irrProject/irrEquity — all nullable except capRate + marketValueTtm to express tier-gated cells), `ReportTypeBadge`, `ReportIndicators` (topPromote/userModified/private).
- `LibraryReport` extended with `amenities`, `location`, `listing`, `financials`, `reportType`, `indicators`, `hasContact`, `favorited`, `hasPdf`. The legacy `estValueEur` and top-level `capRate` stay for the favorites-map floating card.
- All six mock reports populated with realistic financial blocks per tier (Premium = full data, PRO = capex+irrEquity locked, Public/Private = most premium fields locked).

### Build
30 → 32 routes static. `/library/favorites-list` 154 B / 132 kB First Load. Typecheck + production build clean.

---

## 2026-05-10 — Library: `/library/top-map` (Top Reports map)

Sibling page to `/library/favorites-map`. Same institutional language (LibraryShell + LibrarySidebar + HotelMap + FloatingHotelCard) — no duplicated chrome, no parallel components. Visual deltas vs favorites-map are limited to title, subtitle, search placeholder.

### Architecture
- `LibrarySidebar` accepts `title` / `subtitle` / `searchPlaceholder` props with defaults that preserve favorites-map behaviour byte-for-byte.
- `LibraryFilterTabs` becomes route-aware: `<Link>`-based segmented control (FAVORITOS → `/library/favorites-map`, TOP → `/library/top-map`); active state from `usePathname()`. Clicking either tab now navigates between the two pages.
- Removed `filterTab` slice from the library Zustand store (replaced by URL truth). `LibraryFilterTab` type retired.
- Forward-compat types added to `types/library.ts` for the future Top Promote marketplace + ranking engine: `VisibilityTier` (`promoted` / `institutional` / `community` / `verified`), `MapMarkerType`, `AssetType`, `AccessTier`, `InvestmentBand`, `ReportRanking`, `TopReport`, `PromotedReport`, `TopReportsLegendState`, `TopReportsFilters`, `TopReportsViewMode`. No render touches today — purely the typed surface.

### Page
- `apps/web/src/app/library/top-map/page.tsx` — composes `LibrarySidebar` (top-map copy) + the existing `HotelMap`. Mock dataset and store are shared with favorites-map: legend toggles, search, layer overlays and selection persist across the FAVORITOS/TOP swap (institutional UX).

### Build
30 → 31 routes static. `/library/top-map` 155 B / 126 kB First Load. Typecheck + production build clean.

---

## 2026-05-10 — Library v1: `/library/favorites-map` (Favoritos map)

First page of the institutional Library surface. Saved-reports + community + TOP PROMOTE markers over a mock institutional grayscale map of Madrid. No backend, no Mapbox — fully mock.

### Route + shell
- `/library/favorites-map` — `apps/web/src/app/library/favorites-map/page.tsx`
- `app/library/layout.tsx` wraps every `/library/*` page in a new `LibraryShell` (AppHeader + `h-screen` body row + slim institutional footer).
- `AppHeader.libraryHref` default updated from `/library` → `/library/favorites-map`. New active-state logic: when `usePathname()` starts with `/library`, BIBLIOTECA renders as a black-fill button and USUARIO inverts to a white-with-border button — matches the Stitch reference.
- Extracted the previously-private `SettingsFooter` into `components/layout/institutional-footer.tsx` (`variant: "default" | "slim"`); `SettingsLayout` now imports it. Single source of truth for the institutional bottom chrome.

### Components shipped (`components/library/`)
- `LibraryShell` — outer kiosk shell
- `LibrarySidebar` — 300 px, FAVORITOS title + subtitle, legend card, search input, segmented filter, bottom CTA
- `MapLegendCard` — 3 category toggles (Saved / Comunidad / Top Promote) + 3 layer toggles (Heatmap / Líneas de Metro / Centro Histórico)
- `MapLayerToggle` — 32×18 institutional rail switch (slate-300 → blue-700 on)
- `LibraryFilterTabs` — FAVORITOS / TOP segmented control
- `HotelMap` — provider-agnostic mock map (grayscale aerial bg, percentage markers, optional overlays for heatmap / metro / historic centre); ready for Mapbox swap (records carry real `lat/lng`)
- `HotelMapMarker` — category-coloured dot + hover tip; TOP PROMOTE pulses
- `InstitutionalMapControls` — top-right zoom +/- + layers stack
- `FloatingHotelCard` — bottom-right glass preview (hotel name, classification, room count, TOP PROMOTE / tier badges, EST. VALUE + CAP. RATE tiles, "View Full Valuation" CTA)

### State & data
- `lib/library/store.ts` — Zustand UI state (legend, layers, filterTab, search, selectedReportId). In-memory by design.
- `lib/library/mock-reports.ts` — 6 institutional reports with real coordinates: Ritz-Carlton Madrid, Mandarin Oriental Ritz, Four Seasons Madrid, The Madrid EDITION, Hard Rock Marbella, W Barcelona. Each carries `category`, `visibility`, valuation, cap rate, rooms, owner, full `ReportPromotion` block (`promoted`, `promotedUntil`, `boostScore`, `featuredRegion`, `impressions`, `clicks`).
- `types/library.ts` — `LibraryReport`, `ReportCategory`, `ReportVisibility`, `ReportStatus`, `ReportPromotion`, `LibraryLegendState`, `LibraryLayerState`, `LibraryFilterTab`, `MapBounds`, `MapProviderHandles`.

### Architecture notes
- Future-ready map abstraction: real `lat/lng` already on every record; `mockPosition` (top%/left%) is the temporary projection layer the Mapbox swap drops.
- Bottom CTA + map controls + "View Full Valuation" emit sonner toasts today (mock actions).
- Search filters in-memory by hotel name; legend toggles hide/show markers by category live.
- Report taxonomy supports `private` / `team` / `public` / `top-promote` visibility ready for the future sharing & marketplace flows.

### Build
Typecheck clean. No backend / no DB / no Mapbox added.

---

## 2026-05-10 — Investment Requirements / Hotel Value: investor financial criteria

Replaced the `/settings/investment/value` placeholder with the full Hotel Value criteria engine — third tab in the Investment Requirements surface. Captures investor underwriting preferences across 5 sections that feed the future DCF / IRR / debt sizing / exit yield pipeline.

### Sections (5)
- **Site Acquisition** — Asking Price slider (€/$ currency selector + Total/Per Room/Per m² display), Acquisition Cost (Basic/Premium gate; Premium reveals editable 5-line table: Notary & Registry, AJD Stamp Duty, ITP Property Tax, Acquisition Fee, Key Money Operator), Total Investment slider with `Guardar` action, collapsible Saved Scenarios list with delete
- **Exit Investment** — Exit Price slider with `Guardar`, Saved Scenarios, Cap Rate Scenario (flat segmented Conservador/Mercado/Optimista — distinct from RevPAR Scenario card style per Stitch), Yield Target / IRR Project / IRR Equity sliders
- **Rent Factor** — `enabled=false` by default. € Rent input, % Fixed Rent + % Variable Rent each with slider + numeric input + basis select (% Revenue / % GOP / % EBITDAR)
- **Finance Structure** — 8 institutional sliders in 2-col grid (Acquisition Debt, Capex Debt, Interest Rate, Amortization Asset, Grace Period, Amortization Capex, Bullet Payment, Opening Fee) — each with range hint
- **P&L Forecast** — TTM slider, Management Fee Basic/Premium gate (Premium reveals Base + Incentive fee with basis segmented), Marketing — Royalty %, FF&E Reserve Y1-Y4 grid

### Right sidebar
- `PremiumSubscriptionCard` — dark-forest gradient + yellow accents, 8 features (Hotel Personalizado, CompSET Premium, CAPEX & Renders, P&L Forecast, Financial Strategy, Underwriting & IRR Equity, AI Imágenes, Chatbot P&L Premium), "Valora Prime" footer, ACTIVATE CTA
- `ProSubscriptionCard` — white card, 7 PRO features (Hotel Asset Info, CompSET PRO, Market Overview, Hotel Transactions Comparable, Local Hotel Projects, IRR Project, Informe Privado), disabled INCLUDED CTA

### Store extension (`lib/investment/store.ts`)
- New `ValueAssumptions` slice with 5 sub-blocks; persist version bumped to v3 with chained migration (v1 → market hydrate, v2 → value hydrate)
- 30+ granular mutations for all field types
- Saved scenarios — `addSiteScenario` / `addExitScenario` capture the current slider value + mode and append to the scenarios list

### Reusable architecture
- New shared `InstitutionalToggle` extracted from market's inline `MasterToggle` — now the canonical ON/OFF switch across both market + value surfaces; `forecast-growth-card` refactored to import it
- New `ACQUISITION_COST_LINES` taxonomy (`lib/investment/value-acquisition.ts`) — Excel-mappable line ids for future workbook ingestion
- `CapRatePicker` is a new primitive (the spec said reuse RevPAR style but Stitch shows a flatter segmented pill — built per Stitch)

### Components shipped
14 new files in `components/settings/investment/value/`: 7 primitives (DisplayModeToggle, UnderwritingSlider, LabeledSlider, BasicPremiumPicker, CapRatePicker, SavedScenarioList, AcquisitionCostTable, FfeReserveYears), 5 sections (Site/Exit/Rent/Finance/PL), 2 sidebar cards.

### Build
`/settings/investment/value` 8.12 kB / 130 kB First Load. 28 routes total. Typecheck clean.

---

## 2026-05-10 — Investment Requirements / Hotel Market: ADR + OCC growth, RevPAR scenario, target

New authenticated route `/settings/investment/market` — second tab inside the criteria engine. Captures market-level assumptions that feed the future P&L / DCF / IRR re-projection pipeline.

### Routing refactor
- `InvestmentTabs` converted from Zustand `activeTab` state to real Next.js routes (`/settings/investment` = Asset · `/settings/investment/market` · `/settings/investment/value`). Active state derived from `usePathname()` so analysts can deep-link / refresh into any tab and the back button works.
- Removed `activeTab` + `setTab` from `useInvestmentStore`; `partialize` and store version bumped to v2 with a `migrate` function that hydrates the new `market` slice on existing v1 localStorage.
- `/settings/investment/value` shipped as a minimal placeholder page so the third tab doesn't 404.

### Sections (Hotel Market)
- **ADR Forecast Growth** — master ON/OFF + CONSTANT (slider 0–10%) / CUSTOM (Year 1–4 inputs) modes
- **OCC Forecast Growth** — same pattern
- **RevPAR Scenario** — reuses the canonical 3-button selector from `@/components/report/financials` (DOWN/BASE/UP, decorative top labels Conservador/Mercado/Optimista)
- **RevPAR Target** — €/room thesis hurdle

### Scenario KPI tables (`lib/investment/market-scenarios.ts`)
Hand-curated mock keyed by `UnderwritingScenario`. Distinct from the P&L's own scenarios — these capture *market-level* growth assumptions:
- DOWN: OCC +2/+1/+0/+0 pp · ADR +1.5/+1.0/+1.0/+1.5%
- BASE: OCC +3/+2/+1/+0 pp · ADR +3.6/+2.9/+1.5/+2.4%
- UP:   OCC same as BASE · ADR +5.0/+4.0/+3.5/+5.0%

Tables intentionally NOT rendered in the segmented selector — used internally for downstream re-projection. v2 hydrates from CoStar / STR exports.

### Right sidebar
Four cards: `MarketCoverageCard` (compact country pills — distinct from the asset-tab tree variant), `MarketPrimeCard` (dark forest premium tier with PRIME badge + ACTIVATE), `MarketOverviewCard` (white feature gate with INCLUDED CTA), `ExtraPackagesCard` (yellow add-on stacker with auto-recomputing total).

### Components
- `components/settings/investment/market/` — 6 new files (ForecastGrowthCard, RevparTargetCard, MarketCoverageCard, MarketPrimeCard, MarketOverviewCard, ExtraPackagesCard) + barrel
- `SectionHeader` extended with optional `rightSlot` for the inline ON/OFF toggle on Market sections
- `RevparScenarioCard` reused from `@/components/report/financials` per spec — no new component

### Store
- `MarketAssumptions` type added to `InvestmentCriteria` (adrGrowth, occGrowth, revparScenario, revparTargetEur)
- New mutations: `setAdrGrowth`, `setOccGrowth`, `setRevparScenario`, `setRevparTarget`, `resetMarket`

---

## 2026-05-10 — Investment Requirements: criteria engine + match-engine architecture

New authenticated page `/settings/investment` — the canonical engine that defines what hotels the user wants to acquire. Drives the future GREEN / YELLOW / RED match indicator that will surface on every analytical surface (Executive Summary, CompSet, Underwriting, Deal Screening, IC reports).

### Page composition (3-col layout)
- Top sub-tabs: Hotel Asset (active, shipped) / Hotel Market / Hotel Value (registered, no-op v1)
- Main column (editorial card): 6 sections — MyProperty Parameters · Capacity & Operation · Location Targets · Property Specs · CAPEX Settings · Renders/AI Image
- Right sidebar (sticky `lg:top-24`): MyProperty Facilities · CompSet Facilities · Global Coverage tree
- Bottom centered SAVE PREFERENCES CTA

### Data layer — `lib/investment/`
- `types.ts` — `InvestmentCriteria`, `MatchTier`, `MatchResult`, `CapexUnit`, `FacilityId`, `CoverageNode`
- `capex.ts` — `CAPEX_TREE` (Hard/Soft/Project Costs) Excel-mappable by line `id`
- `facilities.ts` — 8 canonical facility ids (bar/restaurant/rooftop/meetings/parking/gym/spa/pool)
- `coverage.ts` — Spain (Madrid + Barcelona) + Italy (Rome/Milan) hand-curated tree
- `match-engine.ts` — `evaluateHotel(hotel, criteria)` stub returning hardcoded "strong" result; `tierFromScore()` thresholds (≥0.75 strong / ≥0.50 partial / <0.50 weak)
- `store.ts` — Zustand persist (key `hv-investment-v1`) — every input survives reload
- `index.ts` — public surface

### Components — `components/settings/investment/`
- 14 files: `InvestmentTabs`, `SectionHeader`, 6 section cards, `CapexTable` (collapsible Hard/Soft/Project + per-line value+unit selectors), `FacilitiesCard` (reusable for MyProperty + CompSet via `bottomSlot`), `CoverageCard` + `CoverageTree`, `DualRangeSlider` (custom thumb styling via styled-jsx), `SliderField`, `MatchIndicator` (🟢🟡🔴 placeholder primitive for downstream surfaces)

### Architecture notes
- Match engine is a stub today; v2 wires per-category scoring (location, size, facilities, financials, capex, strategy)
- CAPEX line ids align with the future Excel underwriting workbook for 1:1 hydration
- `MatchIndicator` ships unused on the page itself — it's the primitive every downstream report will render

---

## 2026-05-09 — 5-Year P&L Forecast: Year 1 monthly expansion + seasonality engine

The Year 1 column in the USALI table is now expandable. Clicking `▸ Year 1` in the header replaces the single column with 12 month sub-columns (Jan–Dec) inline within the same table; chevron flips to `▾`.

### Seasonality engine
New module `lib/report/financials/seasonality.ts`:
- `SeasonalityProfile` contract — 12 occupancy + 12 ADR multipliers + source id
- `MADRID_UPSCALE_SEASONALITY` default (Q2/Q3 strong, Aug weak, Jan/Feb soft)
- `getSeasonalityProfile(market, class)` lookup — returns Madrid default in v1
- `expandYear1ToMonthly(assumptions, computed, profile)` — pure monthly pipeline
- `adapterFromCoStarMonthlyRows` — adapter stub for future Excel ingestion

### Mathematical guarantees
Sum of monthly = annual Year-1 value, exactly:
- Variable lines: ratio × monthly revenue (sums to ratio × annual)
- Inflated lines: annual amount × days[m] / 365
- Hybrid dept fixed payroll portion: same pro-rata by days

EBITDA % margin varies month-to-month (low-occupancy months bear same fixed costs against lower revenue).

### UI / table layout
- `FinancialTable` renders 1-row header when collapsed (current), 2-row header when expanded:
  - Row 1: Label / Assump / `▾ Year 1` (colSpan=12) / Year 2 / Year 3 / Year 4 / Year 5
  - Row 2: 12 month abbreviations under the Year-1 span; Y2-Y5 carry rowSpan=2
- `getTableColCount(expanded)` → 7 collapsed, 18 expanded
- `PLRow` accepts optional `year1Monthly: number[]` — when provided, replaces the single Y1 cell with 12 read-only monthly cells
- `FinancialResultRow` same pattern (incl. EBITDA `% Margin` sub-row)
- Monthly cells render compact (smaller padding + font) so 12 columns fit reasonably; horizontal scroll in narrow viewports

### Architecture for future CoStar Excel ingestion
Adapter pattern in place — `getSeasonalityProfile` is the swap point. Replace the body with a CoStar query / Excel adapter when the dataset ships.

### Print
Expansion state survives print — analyst's choice respected. No auto-collapse for PDF. With 18 columns the table may overflow A4 portrait (acceptable trade-off).

### Files
- `NEW`  `apps/web/src/lib/report/financials/seasonality.ts`
- `EDIT` `apps/web/src/lib/report/financials/index.ts` (exports)
- `EDIT` `apps/web/src/components/report/financials/financial-table.tsx` (header variants, toggle)
- `EDIT` `apps/web/src/components/report/financials/pl-row.tsx` (monthly cells branch)
- `EDIT` `apps/web/src/components/report/financials/financial-result-row.tsx` (monthly cells branch)
- `EDIT` `apps/web/src/components/report/financials/pl-section.tsx` (forwarding)
- `EDIT` `apps/web/src/components/report/financials/pl-table.tsx` (state owner + memo)

---

## 2026-05-09 — 5-Year P&L Forecast: hybrid departmental + payroll inflation activated

Fixed a residual rounding artifact: at 1 decimal place, EBITDA margin Y3-Y5 displayed identically (~31.4%) because the year-to-year deltas were sub-0.1pp. Root cause: departmental expenses were 100% variable (ratio × revenue), so they captured no payroll cost pressure independent of revenue growth.

### What changed in `computePL`
Departmental expenses (Rooms / F&B / Other Dept) refactored to hybrid 70 / 30 split:
- 70% variable: ratio × dept revenue (labour productivity scales with the business)
- 30% fixed-inflating: Y1 base × `payroll inflation` compounded

`DEPT_PAYROLL_FIXED_SHARE = 0.3` hard-coded in `calculations.ts` (institutional default for full-service hotels). The `payroll` field on `expenseInflation` now drives the model — previously decorative.

### Effect on BASE preset (default 4.5% payroll, 2.5%/3.5% other/utilities)
Year-by-year EBITDA margin trajectory (visible variation at 1 decimal):
- Y1 ~29.6% (no inflation compounded yet)
- Y2 ~31.2%
- Y3 ~32.0% ← peak (operating leverage maximises at stabilization)
- Y4 ~31.9%
- Y5 ~31.6% (revenue growth Y5 +2.4% < payroll 4.5% → mild compression)

Y3 ≠ Y4 ≠ Y5 ✓. Pattern matches the canonical institutional hotel model (peak at stabilization, gentle plateau / late-cycle compression).

### Scenario sensitivity
- DOWN: revenue grows ~3%/year < payroll 4.5% → margin contracts from Y2 onwards
- BASE: revenue ~5%/year ≈ payroll → peak then mild contraction
- UP: revenue ~7-8%/year > payroll → sustained expansion

---

## 2026-05-09 — 5-Year P&L Forecast: operating leverage (margin expansion)

Fixed a model bug where every USALI expense line was modelled as `ratio × revenue` (variable). Result: EBITDA margin was identical across all 5 years — no operating leverage at all.

### What changed in `computePL`
Undistributed lines (Admin, S&M, Property maint, Utilities) + Property tax & insurance now compound from their Year-1 base by the `expenseInflation` rates from the second top card:
- Admin / S&M / Property maint / Property tax → `other` (2.5%)
- Utilities → `utilities` (3.5%)

Departmental expenses + Mgmt fee + FF&E reserve stay variable (ratio × revenue) — labour-driven and contract-priced lines respectively.

### Effect
Year 1 EBITDA margin unchanged (no inflation has compounded yet). Year 2-5 margin expands when scenario RevPAR growth > inflation rate. For BASE preset: Year 1 30.6% → Year 5 ~32% (institutional operating leverage realism).

The `expenseInflation` card values now drive the model — previously they were captured on `PLAssumptions` but had no effect.

---

## 2026-05-09 — 5-Year P&L Forecast: scenario presets (Down/Base/Up)

Replaced the single-rate scenario model with three full underwriting presets. Each preset is a complete (occupancy pp-deltas + ADR YoY growth) tuple per year — switching the active scenario re-projects ADR, RevPAR, Revenue, GOP, EBITDA, and EBITDA margin in one `computePL` pass.

### Preset table (committee spec)
| Scenario | Y2 Occ Δ | Y3 Occ Δ | Y4 Occ Δ | Y5 Occ Δ | Y2 ADR | Y3 ADR | Y4 ADR | Y5 ADR |
|---|---|---|---|---|---|---|---|---|
| DOWN | +1.0pp | +1.0pp | +0.5pp | +0.5pp | +1.5% | +2.0% | +2.0% | +2.5% |
| BASE | +3.0pp | +2.0pp | +1.0pp | 0pp | +3.6% | +2.9% | +1.5% | +2.4% |
| UP   | +3.0pp | +2.0pp | +1.0pp | 0pp | +5.0% | +4.5% | +4.0% | +3.5% |

BASE preset reproduces the Stitch table figures (Year 5 RevPAR ≈ €137.68 vs €138.69, within rounding).

### UI
RevparScenarioCard is now a 3-button preset selector (Down / Base / Up) styled as institutional input-tiles. Active button = forest-900 + white. Inactive = white + slate. PRO renders disabled, PREMIUM clickable.

### Data layer
- `PLAssumptions.scenarioGrowth` and `occupancyGrowth` removed.
- `PLAssumptions.activeScenario: UnderwritingScenario` added.
- `SCENARIO_PRESETS: Record<UnderwritingScenario, { occDeltas[4]; adrGrowth[4] }>` lives in `lib/report/financials/assumptions.ts`.
- `SCENARIO_LABELS` updated to short institutional form: `Down / Base / Up`.

---

## 2026-05-09 — 5-Year P&L Forecast: Lectura A scenario architecture

Refactored `/report/financials/pl` so each underwriting scenario is an independent committee growth parameter instead of a globally-selected lens. Removed the global `ScenarioToggle` from the report header and the Zustand store under `lib/underwriting/scenario.ts` (kept the type + display labels for reuse).

### Changes
- **Sidebar**: `Financials → P&L` → `Financials → 5-Year P&L`.
- **RevparScenarioCard**: 3-tile readout → 3 editable inputs (Conservador / Mercado / Optimista). Each one a constant RevPAR growth rate.
- **EbitdaStabilizedCard**: assumption value `50.5%` → derived from `computed.results.ebitdaMargin[2]` (Year 3 % margin). Auto-tracks edits.
- **Header**: `ScenarioToggle` removed from header actions.
- **Calc model change**: `computePL(a, scenario)` → `computePL(a)`. Uses `a.scenarioGrowth.base` as a constant year-over-year multiplier (no more yr2/yr3/yr4-5 differentiation). Year 5 RevPAR ≈ €143.59 (vs prior €138.69 from differentiated growth).

### Data layer
- `PLAssumptions.revparGrowth { yr2; yr3; yr4to5 }` and `PLAssumptions.revparScenario` removed.
- New: `PLAssumptions.scenarioGrowth: Record<UnderwritingScenario, number>` — 3 independent constant growth rates.
- Defaults: `{ downside: 0.085, base: 0.060, upside: 0.030 }` (preserves Stitch reference values).

### Tier behaviour (unchanged)
FREE → page-level upgrade gate. PRO → all inputs (including the 3 scenario rates) render `readOnly`. PREMIUM → editable.

### Files
- `EDIT` `apps/web/src/lib/report/financials/{types,assumptions,calculations,index}.ts`
- `EDIT` `apps/web/src/lib/underwriting/scenario.ts` (drop store, keep type + labels)
- `EDIT` `apps/web/src/components/report/financials/pl-top-cards.tsx`
- `EDIT` `apps/web/src/app/report/financials/pl/{page,pl-content}.tsx`
- `EDIT` `apps/web/src/lib/report/sections.ts`
- `DELETE` `apps/web/src/components/report/scenario-toggle.tsx`

---

## 2026-05-09 — Projects page (sub-route under Market Overview)

Second sub-route under Market Overview. Mirrors Transactions structure with project-specific extensions.

### New page — `/report/market-overview/projects`
- Sub-route, sidebar two-pass detection picks it via Pass 1.
- Same shell pattern as Transactions: `<ReportShell>` → `<ReportPaper closed headerLayout="stacked">` → KPI row + projects table + gallery → `<ActionBar>`.

### Sidebar
- `sections.ts` Market Overview: `Projects` switched from `#projects` hash anchor → `/report/market-overview/projects` real sub-route.

### Reuse — no duplicate components built
- `TransactionsKpiCard` (cross-folder import) — same dual-metric shape; renders projects pipeline KPIs.
- `TransactionHotelCard` (cross-folder import) — same gallery card.
- `DualMetric`, `TransactionClass`, `TransactionHotelGalleryItem` types — re-imported.

### New section family — `components/report/market-overview/projects/`
- `ProjectsTable` — 19-column institutional table (one more than Transactions: STATUS pill column). Renames `Buyer→Owner`, `Seller→Developer`, `CAPEX→Construction Type`.
- `StatusBadge` — emerald (Complete) / blue (Under Construction) pill.

### Data layer — `lib/report/projects-data.ts`
- `ProjectRow` adds `status: ProjectStatus` and `constructionType: ConstructionType` discriminated unions.
- 5 mock projects (same Madrid hotels for cross-page consistency).
- 4 gallery items using real Stitch CDN URLs.

### Side-effect
- `TransactionsKpiCardData.scope` widened from union literal to `string` so `ProjectsKpiCardData.scope` (`"market" | "category"`) flows through the same component without TypeScript variance complaints. Component only uses `scope` as a DOM id key.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/market-overview/projects` and on every other report route.
- SSR confirms: 2 KPI titles, 5 status badges (3 Complete + 2 Under Construction), 5 construction types (3 Conversion + 2 New Development), all owner/developer fields. Sidebar Projects active.

---

## 2026-05-09 — Transactions page (sub-route under Market Overview)

New report sub-section integrated. Web layout + responsive shipped per priority order; print compaction will be the next pass.

### New page — `/report/market-overview/transactions`
- Sub-route under Market Overview (sidebar two-pass detection picks it via Pass 1 — sub-route match).
- `<ReportShell>` (default portrait) → `<ReportPaper closed headerLayout="stacked" actions={<HotelLabel + HotelToggle>}>` → KPI row + comp-set table + gallery → `<ActionBar>`.

### Sidebar
- `sections.ts` Market Overview sub-items updated:
  - `Market overview` → `/report/market-overview` (sub-route, was `#overview` hash anchor)
  - **`Transactions` → `/report/market-overview/transactions`** (NEW sub-route, was `#transactions` hash anchor)
  - `Projects` and `Market dynamics` remain hash-anchor placeholders.

### New section family — `components/report/market-overview/transactions/` (4 components)
- `TransactionsKpiCard` — header + `InsightBadge` + 2×2 dual-metric grid. Same chrome as Market Overview insight cards.
- `DualMetricCell` — twin label+value pair via `flex justify-between` (replaces Stitch's whitespace-padding hack).
- `TransactionsTable` — institutional 18-column comp-set table with sticky-style header bar, "Add" placeholder CTA, divide-y rows, soft hover, asset-name highlight on row hover, local checkbox state for the Inc. column.
- `TransactionHotelCard` — 4:3 image card with dark gradient, white headline caption (bottom-left) + glass arrow button (bottom-right).

### Data layer — `lib/report/transactions-data.ts`
- 2 KPI cards × 4 dual metrics, 5 table rows (Madrid luxury hotels), 4 gallery items.
- Discriminated union `TransactionClass`. Numeric values pre-formatted strings (`€130,000,000`, `€849,673`).

### Reuse
- `ReportShell`, `ReportPaper`, `HotelToggle`, `InsightBadge`, `ActionBar` — all canonical, no changes.
- Print canvas portrait by default (no orientation prop on this page).

### Web priority — done
- ✅ Layout web: KPI row 2-col + table + gallery 4-col.
- ✅ Responsive: KPI `grid-cols-1 md:grid-cols-2`, gallery `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, table `overflow-x-auto whitespace-nowrap`.
- ✅ Visual integration: same badge styling, same card chrome, sub-route under Market Overview.

### Print — basic only (next-pass focus)
- `print:break-inside-avoid` on KPI cards and table rows; `print:hidden` on Inc. checkbox column, "Add" CTA, gallery arrow button.
- Pending: column subset for portrait OR landscape opt-in, thead repeat (`display: table-header-group`), font-size compaction.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/market-overview/transactions` and all other report routes.
- SSR: 2 KPI cards · 2 badges · table title · 5 table rows · 4 gallery cards. Sidebar `Transactions` active (`text-emerald-900 font-bold`), `Market overview` inactive (`text-slate-500`).

---

## 2026-05-08 — Documentation pass (state-of-the-system refresh)

Full sweep refreshing every architecture / report / print / map doc to reflect the post-Phase-0 + 4-section-integration state. No code changes.

### Updated
- `TECH_AUDIT.md` — status banner at the top with per-finding resolution markers; original audit body preserved as snapshot.
- `NEXT_PHASE_PLAN.md` — per-phase status table (Phases 0, 1, 2, 3, 5, 8 ✅ Done; 6 / 10 🟡 Partial; 4, 7, 9 ⏸ Outstanding); updated next-step recommendations.
- `ARCHITECTURE_SCORECARD.md` — full re-score with delta column. Composite **6.42 → 7.42 / 10**. Heaviest movement: frontend architecture (6.3 → 7.8), report system (6.0 → 8.0), documentation (7.3 → 8.7).
- `docs/architecture.md` — application flow updated with all 5 implemented routes and 2 planned.
- `docs/report-system.md` — full rewrite covering canonical shell, registry, sub-anchor href contract, two-pass active-detection, page composition patterns (standard / stacked / carousel), per-page orientation.
- `docs/print-pdf.md` — extended with portrait + landscape canvases, named-page rules, carousel ↔ static-grid print logic, per-page print profiles, interactive-control print policy.
- `AI_CONTEXT.md` — Report Module section refreshed (5 of 6 sections, primitives barrel + section families, two-pass sidebar, carousel pattern, both canvas variants, all current mock files).
- `ENTRYPOINTS.md` — added page entries for Asset Analysis × 2 + Market Overview, all section family folders, `maps.md` doc reference, root-level `REPORT_PAGES.md` / `UI_COMPONENTS.md` references.
- `CLAUDE.md` — `docs/` tree updated with `maps.md`; doc-update mandate table extended with maps.md trigger.

### Created
- `docs/maps.md` — canonical doc covering both map systems: Mapbox CompSet map (`/compset` + `/report/competitive-set`) and stylised pin map (`SharedMapCard` for Market Overview demand generators), with reuse pattern, data shapes, print behaviour, and outstanding items.

### Decisions captured

| Decision | Source iteration | Rationale |
|---|---|---|
| Single canonical report shell (no parametric `[reportId]`) | Phase 0 | Eliminate dual-architecture risk identified in audit |
| `sections.ts` is the only registry | Phase 0 | One source of truth for sidebar + page-break + status |
| Sub-item href: absolute path OR hash anchor | Asset Analysis ports | Real sub-routes coexist with in-page anchors |
| Two-pass sidebar active detection | Market Overview | Prevent "all hash-anchors active" bug |
| Stacked header layout for Asset Analysis / CAPEX / Market Overview | Stitch ports | Matches Stitch reference (PDF button on its own row) |
| `closed` paper variant | Stitch ports | Fully bordered card for sections without trailing ActionBar attachment |
| `printOrientation` prop on ReportShell | Market Overview iteration | Two A4 canvases; default portrait; landscape opt-in |
| `@page { margin: 10mm }` (was `8mm 10mm`) | Market Overview iteration | Institutional symmetric margin |
| Market Overview portrait (was landscape) | Market Overview revision | Institutional report standard; landscape variant remains wired but unused |
| Carousel: paged desktop + free swipe mobile + static grid print | Market Overview integration | Three modes, one DOM render, media-query driven |
| Stitch-verbatim Submarket / Class investment metrics | Second Stitch screen | Honour source of truth even when Stitch reuses Country/Market labels |
| Population footer as vertical KPI tile in column 3 | Footer revision | Future-proofing for 2 additional metrics in cols 1+2 |

### Problems detected and resolution adopted

| Problem | Solution |
|---|---|
| Audit identified two parallel report shells | Phase 0 deleted `layout/`, `report-context.tsx`, `[reportId]` route tree |
| `report-nav.ts` (6 items) + `sections.ts` (15 items) both alive | Phase 0 deleted `report-nav.ts`; rewrote `sections.ts` to match the canonical 6-section visible structure |
| `pdf-export-button.tsx` (window.print()) + `export-button.tsx` (full API) + `pdf-export.ts` (named function) | Consolidated into `lib/report/pdf-export.ts` (`exportReport(metadata?)`) and a single `PdfExportButton` primitive |
| Repo-root Vite cruft (`index.html`, `vite.config.js`, root `src/`, root `node_modules`) | Phase 0 cleanup: `git rm` tracked + `rm` untracked + `git mv backup.ps1 scripts/` |
| Sidebar showed all 4 hash-anchors as active on Market Overview | Replaced per-sub-item check with section-level two-pass selection |
| Population footer spanning the full row blocked future metrics | Switched to `grid grid-cols-3` with `col-start-3`; cols 1+2 reserved |
| Stitch reference uses different content for Submarket / Class | Updated `lib/report/market-overview-data.ts` to match second Stitch HTML byte-for-byte (Spain / Madrid investment context labels) |
| Print canvas was Chromium-only (`zoom: 0.74`) | Added `@-moz-document` Firefox fallback using `transform: scale()` for both portrait and landscape |
| First Market Overview attempt rendered in landscape A4 | Reverted to portrait; landscape canvas variant remains wired in shell + globals.css |
| Per-card content too tall for 2 × 2 print grid | Aggressive `print:` compaction across MarketInsightCard + nested primitives (paddings, gaps, chart heights, font sizes) |

### Recommended next steps

1. **Phase 4 — Data layer.** `lib/api/reports.ts` with TanStack Query hooks; backend stub at `apps/api/app/api/v1/reports/router.py`.
2. **Section 5 — Financials page.** Compose from existing primitives; reuse SVG chart pattern from Market Overview / CAPEX.
3. **Section 6 — Methodology page.** Lighter — typography + locked tiers list. Reuse `MethodologicalNote`.
4. **Phase 6 — Cross-browser print matrix.** Capture Chromium / Firefox / Safari PDF screenshots; store under `docs/_screenshots/print/`.
5. **Phase 7 — Mapbox state sharing.** Lift `useCompset` into `<CompsetProvider>` so layer toggles persist across `/compset` ↔ `/report/competitive-set`.
6. **Phase 9 — Bundle audit.** Drop `recharts` and `numeral` if unused; replace `<img>` with `next/image` for hotel photos.
7. **Auth gating** on report routes once role enforcement is wired.

### Verification

- `pnpm typecheck` passes (verified earlier in this session).
- All 5 implemented report routes return HTTP 200.
- Doc set: every file referenced by `ENTRYPOINTS.md` exists and is current.

---

## 2026-05-08 — Market Overview footer KPI → vertical 3-col tile

The card footer (Población / Premium Inventory) was a horizontal strip (label left, value right). It now renders as a vertical KPI tile inside a 3-column grid so future metrics can fill the left and centre columns without a layout change.

### Change
- Footer container: `flex items-center justify-between` → `grid grid-cols-3 gap-4`.
- Población / Premium Inventory tile placed in **column 3** via `col-start-3`. Adding new metrics before this block in JSX will auto-flow into columns 1 and 2.
- Tile styling now matches the investment metric tiles (label `text-[9px] font-bold uppercase tracking-wider`, value `text-sm font-bold text-slate-800`, print sizes `print:text-[7px]` / `print:text-[9px]`).

### Preserved
- Web layout proportions (carousel, card size, charts, spacing).
- PDF behavior — same card height budget; the only footer change is the internal label / value stacking.
- All 4 cards render the change uniformly: España (47.4M), Madrid (6.7M), Madrid Centro (1.4M) all show **Población** vertically; Luxury (18.5%) shows **Premium Inventory** vertically.

### Verification
- `pnpm typecheck` passes. HTTP 200 on `/report/market-overview`.
- SSR confirms 8× `grid grid-cols-3` + `col-start-3` (4 cards × 2 RSC payload), 0× old horizontal layout, 3× Población + 1× Premium Inventory still rendered.

---

## 2026-05-08 — Market Overview print → A4 portrait, single page

Print mode reverted from landscape to portrait per the institutional report standard. The 4 insight cards now compact aggressively in print so the 2 × 2 grid lives on one A4 portrait page. Web / mobile layouts are untouched — the changes are entirely behind `print:` modifiers.

### Page-level
- `<ReportShell>` no longer carries `printOrientation="landscape"` — falls back to canonical portrait canvas.
- Page padding tightened in print: `print:px-3 print:py-2 print:space-y-2`.

### Carousel
- `.market-carousel-track` in print now carries `break-inside: avoid` so the 2 × 2 grid stays on one A4 page.
- Print grid gap tightened to **6 px** (was 16 px).

### Per-card compaction (web unchanged)
- Outer container: `p-6 → print:p-2`, `gap-6 → print:gap-1.5`, `print:rounded-md`.
- Title: `text-2xl → print:text-sm`.
- `MetricGrid`: `py-4 → print:py-1`, `gap-y-4 → print:gap-y-1`, value `text-sm → print:text-[9px]`.
- `MiniBarChart`: `p-3 → print:p-1`, bar area `h-16 → print:h-7`.
- `TrendBars`: `p-3 → print:p-1`, bar area `h-12 → print:h-6`.
- `InvestmentChart`: `h-24 → print:h-9`.
- `InsightBadge`: `text-[10px] → print:text-[6px]`, `px-2 py-1 → print:px-1 print:py-0.5`.
- `SplitBar`: bar height `h-1.5 → print:h-1`.
- Investment metric grid: `gap-4 → print:gap-x-2 print:gap-y-0.5`. Footer: `pt-4 → print:pt-1`.

### Global @page
- Margin updated to `10mm` uniform (was `8mm 10mm`) per spec.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/market-overview` and every other report page (no regression).
- SSR: 0 instances of `report-print-canvas-landscape` (reverted to portrait), portrait `report-print-canvas` applied on `<main>`. Carousel still 4 slides + 2 arrows on web. Print compaction classes (`print:p-2 print:gap-1.5`, `print:py-1`, `print:h-7`, `print:h-9`, …) all in DOM.

---

## 2026-05-08 — Market Overview integration

New report section consolidating the previous two Stitch pages (Country/Market and Submarket/Class) into a single horizontal-scroll experience that collapses to a 2 × 2 print grid for A4 export.

### New page — `/report/market-overview`
- One canvas, 4 insight cards in a horizontal snap-scroller (web) → static 2 × 2 grid (print).
- `sections.ts` entry flipped to `implemented: true`; sub-anchors updated to `#country / #market / #submarket / #class`.
- `ActionBar` rendered below the paper.

### New section family — `components/report/market-overview/` (13 components)
- `HorizontalInsightScroller`, `MarketInsightCard`.
- Visual primitives: `MetricGrid`, `SplitBar`, `MiniBarChart`, `TrendBars`, `InvestmentChart`, `InsightBadge`.
- Shared modules: `CorporateSportsCard`, `SharedMapCard`, `DemandGeneratorsBlock`, `DemandGeneratorCard`, `DemandGeneratorsGallery`.

### Data layer — `lib/report/market-overview-data.ts`
- Fully data-driven. `getMockMarketOverview()` populated from both Stitch pages.
- Discriminated unions `InsightScope` and `DemandGeneratorCategory`.

### Global utility
- `.scrollbar-hide` added to `globals.css` — consumed by the horizontal scroller.

### Verification
- `pnpm typecheck` passes. HTTP 200 on `/report/market-overview`.
- SSR confirms: page title, all 4 insight titles + badges, scroller class chain, print 2 × 2 fallback, 4-col gallery, 16 map pins, Corporate & Sport block.

---

## 2026-05-08 — Top-grid rebalance (~68 / 32) for A4 vertical alignment

Adjusted the CAPEX & Renders top-grid proportions so the Property Gallery's last tile (Spa) lands close to the bottom of the CAPEX Schedule block on the A4 page.

- Top grid right column: **250 px** (was 316 px). Roughly a 68 / 32 split with the CAPEX content on lg+.
- Property Gallery card padding: **14 px** (was 12 px).
- Tile height: **92 px** (was 115 px), fixed via inline style.
- Tile width: 100 % of card content area (no fixed pixel width — `tileWidth` prop removed; the gallery's column controls the tile width).
- Tile radius: `rounded-[10px]` (was `rounded-[12px]`).
- Tile gap: **10 px** (`gap-2.5`, was `gap-3` = 12 px).
- Caption unchanged (`text-[14px] font-semibold`, white, drop-shadow, bottom-left).
- All 8 tiles render identical dimensions in SSR (`style="height:92px"` × 8).

CAPEX Schedule card unchanged — already a symmetric 6-cell grid with paired sliders, paired tick labels, and the visible "¿Hotel abierto…?" / "Porcentaje operativo…" labels removed in the previous pass.

`pnpm typecheck` passes. SSR confirms: top grid `grid-cols-[minmax(0,1fr)_250px]`, 8× `height:92px`, card `padding:14px`, schedule grid still `grid-cols-1 lg:grid-cols-2 ... gap-x-12 gap-y-4 items-center`.

---

## 2026-05-08 — Property Gallery fixed-size tiles

Per spec, every gallery tile is now strictly the same dimensions — no responsive variation, no auto-height.

- Tile width: **290 px** (explicit `style={{ width: "290px" }}`).
- Tile height: **115 px** (explicit `style={{ height: "115px" }}`).
- Border radius: `rounded-[12px]` (was `rounded-[8px]`).
- Tile gap: **12 px** (`gap-3`, was `gap-2.5`).
- Caption: **14 px / 600** (was 12 px / 600).
- Tile carries `shrink-0` so it never shrinks under flex/grid constraints.
- Top grid right column: **316 px** (was 220 px) to fit 290 px tiles + 12 px card padding + 1 px borders without overflow.

`pnpm typecheck` passes. SSR confirms 8× `height:115px;width:290px` + caption at `text-[14px]`. All 8 captions still render in order: Lobby · Room · Bar · Restaurant · Exterior · Meeting Room · Pool · Spa.

---

## 2026-05-08 — CAPEX Schedule symmetric paired-slider rebuild

The CAPEX Schedule card is now a perfectly symmetric 2-column control with paired sliders sitting on the same grid row.

### Layout
- Card body padding bumped to **32 px** (`p-8`).
- Inner row rebuilt as a 6-cell CSS grid (2 cols × 3 rows, `gap-x-12 gap-y-4 items-center`).
  - Row 1: LEFT label + emerald pill / RIGHT Abierto-Cerrado toggle.
  - Row 2: LEFT months `RangeTrack [0, 36]` / RIGHT percent `RangeTrack [0, 100]`. Both sit on the same grid row → identical Y-position.
  - Row 3: LEFT "0 MESES / 36 MESES" / RIGHT "0% / 100%" tick labels.

### Component changes
- New `RangeTrack` primitive — bare slider track + fill + thumb + invisible `<input type="range">` overlay. Used twice in the schedule row to guarantee both sliders share the exact same row geometry.
- `CapexScheduleRow` rebuilt as a 6-cell grid that owns `months`, `mode`, `pct` state. Toggle ↔ % wiring: Cerrado → 0 %; Abierto → 100 %. Manual slider drag is independent.
- `CapexScheduleCard` body padding `px-5 py-4` → `p-8` (32 px); title margin `mb-4` → `mb-6`.

### Removed UI text per spec
- Eliminated visible label "¿Hotel abierto o cerrado durante el CAPEX?".
- Eliminated visible label "Porcentaje operativo durante CAPEX" + `OperationalPercentInput` numeric component (deleted file). The percentage is now controlled exclusively by the right-column slider; "Porcentaje operativo durante CAPEX" remains only as the slider's `aria-label` for screen readers.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/asset-analysis/capex`.
- SSR confirms: 6-cell grid `grid-cols-2 gap-x-12 gap-y-4 items-center`, card `p-8`, both `RangeTrack` instances with `aria-label="Duración del CAPEX"` + `aria-label="Porcentaje operativo durante CAPEX"`, all 4 tick labels (`0 MESES`, `36 MESES`, `0%`, `100%`), no visible "Hotel abierto" / "Porcentaje operativo" labels.

---

## 2026-05-08 — CAPEX Schedule structural rebuild + operational %

The schedule card now reads as a compact operational-assumptions module: both column titles align on the same top line, the duration badge tracks the slider thumb, and a new operational-percentage field is wired in.

### Data
- `CapexSchedule.operationalPercentage: number` — added to the contract; mock value 100. Designed to feed the future financial engine's revenue / GOP / EBITDA scaling during CAPEX (UI-local state for now).

### Component additions
- `OperationalPercentInput` — labelled numeric % field (0–100 clamp). Same border / sizing as the financial inputs in `CostInputRow`. Local React state.

### Component changes
- `CapexTimeline` gained a `floatingBadge` mode: the emerald pill is positioned absolutely above the slider thumb and follows it (transition-[left]) instead of sitting in the header row. `showBadge` and `floatingBadge` are now mutually exclusive (floating wins).
- `CapexScheduleRow` rebuilt as a 2-column grid `1.2fr 1fr` (`align-items: start`, gap 48 px). LEFT carries title + slider with floating badge + min/max ticks. RIGHT carries title + Abierto/Cerrado toggle + operational % field.

### Visual contract
- Both internal titles ("Duración del CAPEX" and "¿Hotel abierto o cerrado durante el CAPEX?") sit on the same top line.
- Card itself unchanged — same chrome, padding, and the "CAPEX Schedule" h4 title remain.
- Renders block, gallery, page header, shell — untouched.

### Verification
- `pnpm typecheck` passes.
- SSR confirms: schedule grid `grid-cols-[1.2fr_1fr]` (×2 lg + print), all 3 labels rendered, floating-badge selector present, operational % input rendered with `value="100"` and matching `aria-label`.

---

## 2026-05-08 — CAPEX Schedule moved into the left CAPEX stack

CAPEX Schedule is no longer a standalone full-width section below the grid — it now sits as the 5th card in the LEFT column, sharing the same chrome as Hard / Soft / Project Costs. This naturally balances the left stack height with the Property Gallery height.

### Component additions
- `CapexScheduleCard` — card wrapper that renders `CapexScheduleRow` inside the same `bg-white border-slate-200 rounded-xl shadow-sm` chrome used by `CapexCategory`. Accepts `id`, `title`, `className`. `print:break-inside-avoid` baked in.

### Component changes
- `CapexScheduleRow` inner grid gap tightened to 24 px (`gap-6`) per spec.

### Page restructure (`app/report/asset-analysis/capex/page.tsx`)
- Removed the standalone `<section id="schedule">` block.
- Added `<CapexScheduleCard schedule={...} />` as a sibling of `<CapexTable>` inside the LEFT column, wrapped in `space-y-4` so the gap matches the inter-category rhythm.
- Renders block stays full-width below the 2-column grid (`mt-8 pt-6 border-t`).

### Vertical balance check
- Left stack ≈ 933 px (TOTAL + 3 categories + Schedule card).
- Right gallery ≈ 927 px (8 × 92 px tiles + gaps + chrome).
- Bottom edges now align within ~6 px.

### Verification
- `pnpm typecheck` passes.
- SSR confirms: 1× `id="schedule"`, 1× h4 "CAPEX Schedule" inside the card, schedule grid at `gap-6`, renders block still rendered below.

---

## 2026-05-08 — Property Gallery vertical balance

Single proportional adjustment to balance the gallery's bottom edge with the bottom of CAPEX Schedule.

- Tile height: **92 px** (was 72 px).
- Tile gap: **10 px** (was 8 px).
- Card padding unchanged at 12 px; column width unchanged at 220 px; tile radius / overlay / caption / order unchanged.

`pnpm typecheck` passes. SSR confirms `height:92px` × 8 tiles and `gap-2.5` on the tile stack.

---

## 2026-05-08 — CAPEX & Renders strict alignment pass

Tight institutional proportions across the page. No component redesign — only dimension, spacing and alignment changes.

### Property Gallery Sidebar — compact 220 px column
- Top grid right column: **220 px** (was 240 px). Top grid gap: **20 px** (was 24 px).
- Tile height: **72 px** (was 86 px). Tile radius: **8 px** (was 10 px).
- Tile gap: **8 px** (was 12 px). Card padding: **12 px** (was 16 px).
- Caption: **12 px / 600** (was 14 px / 600).
- Title text-sm; "8 items" badge text-[10px]; "View All Photos" footer text-xs.

### Top grid + tables
- Top grid: `grid-cols-[minmax(0,1fr)_220px] gap-5 items-start`.
- TOTAL CAPEX: `px-5 py-3`, inputs `h-8`, label `text-base` — total ≈ 64 px row.
- Category header: `md:h-11 px-5` — 44 px row, 20 px horizontal padding.
- Line items inside categories: `h-11` (44 px) with `pl-8` indent.

### CAPEX Schedule row — 3-column grid
- Switched outer container from flex to **grid**: `grid-cols-[1.4fr_120px_1fr] items-center gap-8`.
- Slider max-width tightened to **360 px** (was 420 px).
- Operational toggle buttons: **38 px tall × 100 px wide**, strictly equal width.

### Vertical rhythm
- Section dividers tightened to `mt-8 pt-6` (was `mt-10 pt-8`) — schedule sits closer to Project Costs; renders block starts higher.
- H3 bottom margin: `mb-6` (was `mb-8`).

### Verification
- `pnpm typecheck` passes.
- All four routes return 200.
- SSR confirms: top grid `minmax(0,1fr)_220px` (×2), 8 tiles at `height:72px` + `rounded-[8px]`, all 8 captions at `text-[12px]`, schedule grid `1.4fr_120px_1fr`, 12 cost rows at `h-11`, both toggle buttons at `h-[38px] w-[100px]`.

---

## 2026-05-08 — CAPEX & Renders layout polish

### Property Gallery — fixed-width institutional sidebar
- Top grid switched from `lg:grid-cols-3` to `grid-cols-[minmax(0,1fr)_240px]` with `gap-6` and `items-start`. Gallery column is exactly 240 px on `lg+`; on narrower widths it wraps below the table.
- Tiles now stack vertically (1 per row) with a fixed 86 px height and `rounded-[10px]`. Dark gradient + bottom-left white caption (14 px / 600).
- "View All Photos" CTA pinned to the card's bottom edge via `mt-auto`.
- 8 captions render in the institutional order: Lobby · Room · Bar · Restaurant · Exterior · Meeting Room · Pool · Spa.

### CAPEX Schedule — three-block horizontal row
- New `CapexScheduleRow` (client) composes the row and owns the duration state — keeps the slider and the badge in sync.
- LEFT block (`flex: 1.2`) hosts a re-used `CapexTimeline` with `showBadge={false}` and `sliderMaxWidth={420}`.
- CENTER block (`width: 110px`) renders the new `CapexDurationBadge` atom — same emerald pill as the inline badge, lifted to a standalone column.
- RIGHT block (`flex: 1`, `justify-end`, `gap-4`) hosts the question text + `ToggleSelector size="lg"`.
- `ToggleSelector` lg variant updated to `h-10 min-w-[92px] px-6` so the operational buttons hit the spec exactly.

### Section rhythm
- Project Costs → CAPEX Schedule and CAPEX Schedule → Renders gaps standardised to 40 px (`mt-10` + `border-t` + `pt-8`).

### Component additions
- `CapexDurationBadge` — emerald pill atom.
- `CapexScheduleRow` — schedule composite owning duration state.
- `CapexTimeline` extended with `value` / `onChange` / `showLabel` / `showBadge` / `sliderMaxWidth` (all backward compatible).

### Verification
- `pnpm typecheck` passes.
- All four routes (executive-summary, competitive-set, asset-analysis, asset-analysis/capex) return 200.
- SSR output confirmed: `grid-cols-[minmax(0,1fr)_240px]` on the top row, `height:86px` + `rounded-[10px]` on every gallery tile, `flex-[1.2]` + `w-[110px]` + `h-10 min-w-[92px]` in the schedule row.

---

## 2026-05-08 — Asset Analysis · CAPEX & Renders integration

### New page — `/report/asset-analysis/capex`
- Stitch design replicated inside the canonical architecture (no shell, sidebar, print, or PDF changes).
- Combines CAPEX breakdown + property gallery + CAPEX schedule + AI render configurator on a single canvas; the renders block carries `id="renders"` so the sidebar's `Renders` sub-anchor lands correctly.
- Page does not use `ActionBar` — its terminal CTA is the in-section "Generar Variación IA" button.

### New section family — `components/report/asset-analysis/capex/`
Eleven components, all consumed through one barrel `index.ts`:
- `CapexTable` — composes `CapexTotalRow` + per-category breakdown.
- `CapexTotalRow` — headline TOTAL CAPEX band with editable amount + unit selector.
- `CapexCategory` — collapsible category block with editable category total + line items.
- `CostInputRow` — single label/value/unit row used inside categories.
- `CapexTimeline` — slider + duration badge with an accessible `<input type="range">` overlay (so the visual track + dragging both work).
- `ToggleSelector<T>` — generic segmented control (`size: "md" | "lg"`) reused for both CAPEX BÁSICO/PERSONALIZADO and Abierto/Cerrado.
- `PropertyGallerySidebar` — right-rail gallery with item-count badge + "View All Photos" CTA.
- `RenderConfigurator` — wraps preview + tag groups + final CTA row; whole block is `print:hidden`.
- `RenderPreviewCard` — hero render image with caption overlay.
- `RenderTagGroup` — one labelled row of pill buttons with single-select state.

### Data layer — `lib/report/capex-renders-data.ts`
- Fully data-driven: every CAPEX category, line item, render tag group, gallery item, and operational mode lives in the data file.
- Discriminated unions for future engine integration: `CapexUnit`, `CapexMode`, `OperationalMode`.
- `formatCapexAmount(n)` is the single Intl-based formatter for monetary display.
- `getMockCapexRenders()` mirrors Stitch reference values exactly.

### Sidebar sub-item migration — `hash` → `href`
- `ReportSubItem.hash: string` replaced by `ReportSubItem.href: string`. Sub-items can now point at full routes (`/report/asset-analysis/capex`) or page-relative anchors (`#renders`); the sidebar resolves either form.
- `sections.ts` updated for all sections; Asset Analysis now points its sub-anchors at the new sub-routes.
- `components/report/shell/report-sidebar.tsx` resolves sub-item href and adds an active-highlight rule (matches the Stitch bold-emerald sub-anchor when on a sub-route).

### Architecture invariants preserved
- Reused: `ReportShell`, `ReportPaper` (with `closed` + `headerLayout="stacked"`), `HotelToggle`, primitives barrel, print canvas, PDF pipeline.
- No edits to existing pages (`/report/executive-summary`, `/report/competitive-set`, `/report/asset-analysis`).

### Documentation
- Updated: `REPORT_PAGES.md` (added Page 2a layout block + sidebar wiring + future-proofing notes).
- Updated: `UI_COMPONENTS.md` (added CAPEX & Renders family table).
- Updated: `docs/print-pdf.md` (interactive-control print policy + the new `print:break-inside-avoid` schedule rule).
- This entry.

### Verification
- `pnpm typecheck` passes.
- All four routes return 200 on the dev server: `/report/executive-summary`, `/report/competitive-set`, `/report/asset-analysis`, `/report/asset-analysis/capex`.
- 26 canonical Stitch strings render in the new page's SSR output.

---

## 2026-05-08 — Asset Analysis (Hotel personalizado) integration

### New page — `/report/asset-analysis`
- Stitch design replicated inside the canonical architecture (no shell, sidebar, print, or PDF changes).
- Page composes `<ReportShell>` → `<ReportPaper closed headerLayout="stacked">` → 60/40 grid → `<ActionBar>`.
- `sections.ts` entry flipped to `implemented: true`; sidebar updates automatically.

### New section family — `components/report/asset-analysis/`
- `AssetMetricsTable` — left-column 12-row metrics with fixed-height label/value pairs.
- `FacilitiesCard` — 2-column availability checklist (Lucide `Check` / `Minus`).
- `RoomMixCard` — Type/Units/Size table with bolded totals row + thin spacer.
- `GuestInsightsCard` — slate-50 card with `tone: "positive" | "negative"` (Lucide `ThumbsUp` / `ThumbsDown`, filled).
- `PropertyImageCard` — square hero image + caption tabs (Catastro / Planos), client-side active-tab state.
- `PropertyGallery` — vertical labelled gallery with arrow-button `altSrc` swap (replaces Stitch inline `onclick`).
- `MethodologyNote` — compact inline variant of the methodology block, fits inside column layouts.
- Single barrel `index.ts` for the import surface.

### Page-local — `app/report/asset-analysis/`
- `page.tsx` — server component wiring data + composition.
- `hotel-toggle.tsx` — client toggle next to "Hotel personalizado" label (decoupled from `PrimeToggle` to avoid changing the Competitive Set toggle visual).

### Data layer
- `lib/report/asset-analysis-data.ts` — types (`AssetAnalysisData`, `AssetMetricsRow`, `FacilityItem`, `RoomMixRow`, `GalleryImage`, `PropertyMedia`, `GuestInsights`) + `getMockAssetAnalysis()` matching Stitch values.

### Canonical primitive extensions (backward-compatible)
- `ReportHeader` gains `layout?: "inline" | "stacked"` — `stacked` puts the PDF button on its own row above the section label / title row, matching Stitch. Default `inline` preserves Executive Summary + Competitive Set visuals unchanged.
- `ReportPaper` and `ReportSection` gain `closed?: boolean` — when `true`, the paper has full `border + rounded-xl` (Stitch Asset Analysis); default `false` preserves the rounded-top-only paper used by other pages.
- `ReportPaper` and `ReportSection` also gain pass-through `headerLayout?` and `hideExportButton?` for symmetry.

### Documentation
- New: `REPORT_PAGES.md` (root) — page-level reference for every report page (route, status, file path, component composition).
- New: `UI_COMPONENTS.md` (root) — catalog grouped by import surface (primitives → section families → shell).
- This entry.

### Verification
- `pnpm typecheck` passes.
- Existing `/report/executive-summary` and `/report/competitive-set` visuals unchanged (canonical defaults preserved).

---

## 2026-05-08 — Phase 0 architecture stabilization

### Canonical report architecture
- One shell, one sidebar, one paper, one PDF pipeline, one section registry.
- `lib/report/sections.ts` rewritten as the single canonical registry (6 sections, sub-anchors, `printPageBreak`, `implemented`).
- `types/report/index.ts` reworked to match the new section taxonomy.
- `shell/report-sidebar.tsx` refactored to consume `sections.ts` (Stitch visual preserved).
- `shell/report-paper.tsx` refactored to compose `ReportHeader` from primitives (eliminated internal duplicate).

### Canonical primitives — `components/report/primitives/`
- `MetricRow`, `MetricTable` — atomic table units for sections 4-15.
- `ReportSection` — page-level wrapper with section-metadata-driven page-breaks.
- `ReportHeader` — header bar primitive (extracted from internal `PaperHeader`).
- `StatCard` / `StatGrid` — re-exports `KPICard` / `KPIGrid` under canonical names.
- `UpgradeGate` / `UpgradeCard` — re-exports `LockedGate` / `LockedUpgradeCard`.
- `ImageGallery` / `ImageGalleryCard` — re-exports `HotelGalleryGrid` / `HotelGalleryCard`.
- `ReportMap` — re-exports from `ui/report-map.tsx`.
- `PrintPage` — declarative wrapper for inside-section page-break control.
- `PdfExportButton` — routes through canonical `exportReport()`.
- Barrel `primitives/index.ts` is the single import surface for new section pages.

### Print / PDF system
- `globals.css` print rules consolidated into a single block: `@page`, `.report-print-canvas`, generic utilities (`.print-break-before`, `.print-break-after`, `.print-keep`).
- Firefox fallback: `@-moz-document url-prefix() { @media print { transform: scale(0.74) } }` for older Firefox where `zoom` is a no-op.
- `lib/report/pdf-export.ts` simplified to a single `exportReport(metadata?)` entry; legacy `exportReportToPDF` aliased and marked deprecated.

### Deletions
- `components/report/layout/` (3 files — duplicate shell, replaced by `shell/`).
- `components/report/sections/` (3 files — only used by deleted parametric routes).
- `components/report/report-context.tsx` (only used by deleted layout).
- `components/report/ui/export-button.tsx` (dead code).
- `components/report/ui/pdf-export-button.tsx` (replaced by canonical primitive).
- `app/report/[reportId]/` (entire parametric tree — 4 files; will return under a single canonical pattern when multi-tenant data layer ships).
- `lib/report/mock-data.ts` (only used by deleted parametric layout).
- `lib/report/report-nav.ts` (replaced by canonical `sections.ts`).
- Repo root: `index.html`, `vite.config.js`, `vite.err.log`, `vite.out.log`, `src/` (Vite app leftovers), root `node_modules/`, `function hotelvalora {.txt`.
- `backup.ps1` moved to `scripts/backup.ps1` via `git mv`.

### Documentation
- New: `docs/print-pdf.md` — canonical print/PDF system reference.
- New: `docs/component-library.md` — canonical primitives catalog.
- Rewritten: `docs/report-system.md` — single-architecture reference, no parametric mentions.
- Updated: `docs/architecture.md` — registry pointer + primitives reference.
- Updated: `ENTRYPOINTS.md` — primitives table + canonical files.
- Updated: `AI_CONTEXT.md` — Phase 0 report module description.
- Audit artefacts: `TECH_AUDIT.md`, `NEXT_PHASE_PLAN.md`, `ARCHITECTURE_SCORECARD.md` (root).

### Verification
- `pnpm typecheck` passes (after clearing stale `.next/` types from deleted parametric routes).
- Visible pages (`/report/executive-summary`, `/report/competitive-set`) render unchanged.

---

## 2026-05-07 (continued)

### Navigation link — Sidebar item 3 "CompSET" → `/report/competitive-set`
- `report-nav.ts` item 3 `href` changed from `/report/compset` to `/report/competitive-set`
- `ReportSidebar` active-state highlight now lands correctly on the Competitive Set page

### Competitive Set — Distance column in comparison table
- Added `distance: string | null` to `CompetitorProperty` interface; `null` for the subject property itself (renders as `—`)
- Added **Distance** column to `CompetitiveSetTable` (rightmost, after Location Score); displays `"400 m"`, `"1.1 km"`, etc.
- Mock distances: Ritz-Carlton 650 m, Four Seasons 400 m, Rosewood Villa Magna 1.1 km, Westin Palace 320 m

### Competitive Set — gallery layout update
- `HotelGalleryGrid` restructured: top block = 2×2 images (left, `col-span-5`) + full CompSet map (right, `col-span-7`); bottom block = remaining 16 images in 4-per-row grid
- `HotelGalleryCard` updated: added optional `className` prop (`twMerge` handles conflict with `aspect-[4/3]`); top-4 images pass `h-full aspect-auto` to fill 2×2 cells; bottom images unchanged
- Parent block uses `min-h-[460px]` to satisfy map's `min-height: 450px` CSS constraint; `print:min-h-0 print:h-80` for PDF
- `ReportMap` reused exactly — same hooks (`useCompset`, `useMapViewport`), same overlays (`MapControls`, `MapLegend`), same layer toggles (heatmap/metro/histórico)

### Competitive Set report page — `/report/competitive-set`
- Created `src/app/report/competitive-set/page.tsx` — ReportShell + ReportPaper + ActionBar
- Created `CompetitiveSetTable` — 6-col table: property name (dot + name), stars, keys, submarket, facility icons, location score bar. Subject property row: emerald. Competitors: amber stars + slate bars
- Created `HotelGalleryGrid` — 4-col `aspect-[4/3]` image grid, `print:grid-cols-4`
- Created `HotelGalleryCard` — image with hover scale + frosted-glass arrow button bottom-right
- Created `PrimeToggle` — client component toggle switch (emerald-700 when on), `print:hidden`
- Updated `ReportPaper` — added `titleSize?: "2xl"|"4xl"` and `headerRight?: ReactNode` props; backward compatible
- Created `src/lib/report/competitive-set-data.ts` — `CompetitorProperty`, `GalleryImage`, `getMockCompetitiveSet()`
- Facility icons via Lucide: `Wine`, `UtensilsCrossed`, `Sun`, `Users`, `Dumbbell`, `Leaf`; unavailable = `opacity-30`

---

## 2026-05-07

### Navigation wiring — Landing ↔ CompSet ↔ Executive Summary
- `ReportTopNav`: "HotelVALORA" logo is now `<Link href="/">` (was inert `<div>`)
- `CompetitorPanel`: "Confirmar CompSet →" is now `<Link href="/report/executive-summary">` (was inert `<button>`)
- Establishes full 3-step flow: `/` → `/compset` → `/report/executive-summary`

### Mandatory documentation system
- Expanded `CLAUDE.md` with full docs maintenance rule (triggers, file list, process)
- Created 8 new `/docs` files: `routing.md`, `report-system.md`, `print-system.md`, `design-system.md`, `components.md`, `business-rules.md`, `financial.md`, `workflows.md`, `changelog.md`
- Updated `docs/frontend.md` and `ENTRYPOINTS.md` with report module + print system entries

---

## 2026-05-06 (prior session)

### Executive Summary — Professional A4 print system
- `globals.css`: `@page { size: A4 portrait; margin: 8mm 10mm }`, `.report-print-canvas { width: 960px; zoom: 0.74 }`, `compset-map-container { min-height: 0 }` in print
- `ReportShell`: added `report-print-canvas` class to `<main>`
- All 3 sections (`AssetSection`, `MarketSection`, `ValuationSection`): added `print:grid-cols-12`, `print:col-span-7`, `print:col-span-5` — fixes Chrome print grid collapse below 768px viewport
- `LockedGate` + `LockedUpgradeCard`: added `print:hidden`
- `MarketSection` map: `print:aspect-auto print:h-36` to cap height

### Hotel photo carousel
- Created `HotelPhotoCarousel` (client component) — `aspect-[4/3]`, 5 photos, prev/next arrows bottom-right, `1/5` counter
- Replaced static photo in `AssetSection`

### Full CompSet map in Market Overview
- Created `ReportMap` (`components/report/ui/report-map.tsx`) — uses `useCompset` + `useMapViewport`, renders `CompsetMapGL` + `MapControls` + `MapLegend`, no competitor panel
- Embedded in `MarketSection` right column

### Report shell infrastructure
- Created `ReportShell`, `ReportPaper`, `ReportTopNav`, `ReportSidebar`, `ReportFooter`, `ActionBar`
- Created `/report/executive-summary` standalone route
- `ActionBar`: 3 text-only buttons (FAVORITOS, GUARDAR, UPGRADE), positioned below ReportPaper

### Map size revert
- Map in MarketSection reverted to `aspect-video` (16:9) after carousel was added — user preferred original map proportions

---

## 2026-05-05 (initial build)

### Monorepo scaffold
- Next.js 14 + FastAPI monorepo initialized
- PostgreSQL domain schema established
- Core models: HotelAsset CRUD routes, service, schemas

### Executive Summary data layer
- `executive-summary-data.ts`: types (`AssetData`, `MarketMetricsData`, `ValuationData`, `ChartSeriesData`), formatters, mock data
- `SparklineBar`, `SparklineLine` SVG chart components
- `AssetSection`, `MarketSection`, `ValuationSection`, `SparklineGroup` components
- `LockedGate`, `LockedUpgradeCard`, `SubSectionHeading`, `MethodologicalNote` UI primitives

### CompSet map
- Mapbox GL integration with `react-map-gl` v8
- `CompsetMapGL`, `CompetitorPanel`, `CompetitorCard`, `MapControls`, `MapLegend`
- `useCompset`, `useMapViewport` hooks
- `/compset` route with full competitor selection flow

### Report navigation
- `report-nav.ts`: 6-section registry, 15 items
- `ReportSidebar` renders section links
