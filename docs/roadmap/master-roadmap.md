# Master Roadmap

The product moves through five visible phases. Each ships independently; later phases assume prior phases are stable.

---

## Phase 1 — Institutional UI scaffold · ✅ Done

Establish the visual language and key shells before any backend wiring.

- ✅ Landing + auth shells, OAuth provider registry (mock)
- ✅ Dashboard shell with global `AppHeader` (route-aware BIBLIOTECA active)
- ✅ Settings shell with sub-sidebar (Profile / Credentials / Investment criteria)
- ✅ Report shell with 5 of 6 sections, PDF print pipeline (Phase 6 sections deferred to v2)
- ✅ Library shell (4 sub-routes: favorites & top × map & list)
- ✅ Design system tokens (`forest` palette, Manrope + Inter, density target 1440 × 900 @ 100%)

---

## Phase 2 — Library + valuation flows · 🟡 In progress

Make the Library a real institutional surface with marketplace primitives in place.

- ✅ Favoritos map · `/library/favorites-map`
- ✅ Favoritos list · `/library/favorites-list` (39-column Bloomberg-grade table)
- ✅ Top Reports map · `/library/top-map`
- ✅ Top Reports list · `/library/top-list` (+REF column)
- ✅ Contact card popover (portal-based, top-promoted only)
- ✅ FAVORITOS ⇄ TOP route-driven nav; map ⇄ list per-branch nav
- 🟡 Investment criteria full coverage (Asset + Market + Value tabs shipped; HMA + lender-side criteria pending)
- ⏸ Comparison view (multi-report side-by-side)
- ⏸ Saved searches + saved filters
- ⏸ Marketplace promoted-slot purchase flow (frontend)

---

## Phase 3 — Real backend wiring · ⏸ Planned

Replace every mock-data file with TanStack Query hooks against `apps/api`.

- ⏸ `/api/v1/library/*` — Library reports resource (new)
- ⏸ `/api/v1/reports/{id}/sections/*` — wire the 5 shipped report sections
- ⏸ Auth swap: NextAuth or Supabase — drop the in-memory mock store, keep the same `useAuth()` surface
- ⏸ Investment-criteria persistence to user profile
- ⏸ Contact-card data sourced from `users` + `report_listings`

---

## Phase 4 — Map provider swap · ⏸ Planned

Move the institutional map from the static grayscale image to a real Mapbox/MapLibre surface.

- ⏸ Replace `HotelMap` background with `<Map>` (react-map-gl)
- ⏸ Drop `mockPosition`; project from `coordinates.lat/lng`
- ⏸ Implement `MapProviderHandles` (`flyTo`, `fitToVisible`)
- ⏸ Real overlays: heatmap (deck.gl), metro lines (vector tile), historic-centre polygon
- ⏸ Clustering for dense markets

---

## Phase 5 — Marketplace + paid promotion · ⏸ Planned

Activate the "Top Promote" revenue surface.

- ⏸ `/api/v1/promotions/*` — payment + `promotedUntil` + impression / click telemetry
- ⏸ Frontend purchase flow (existing tier UI extension)
- ⏸ Sponsor priority + ranking score wiring (`ReportRanking` already typed)
- ⏸ Email integration for contact-card "Schedule a Tour"

---

## Phase 6 (future) — Institutional analytics + AI

- Cross-portfolio analytics dashboards
- AI ranking + AI valuation suggestions
- Excel export across all surfaces
- Multi-tenant team workspaces

---

## Status legend

| Symbol | Meaning |
|---|---|
| ✅ | Shipped to production (`hotelvalora.com`) |
| 🟡 | In progress this sprint |
| ⏸ | Planned, not started |
| 🔴 | Blocked (with reason in `docs/roadmap/backlog.md`) |
