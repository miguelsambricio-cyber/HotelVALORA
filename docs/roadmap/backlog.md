# Backlog

Three buckets: **Future ideas** · **Blocked** · **Technical debt**. Anything else lives in `master-roadmap.md` or `current-sprint.md`.

---

## Active pending (post 2026-05-26 sweep)

Captured at end-of-day shutdown. Ordered roughly by tomorrow's working order — PASO 4 first.

1. **PASO 4 · facility-aware P&L rule** — 3-factor by hotel type (urban 2% · mixed 3% · resort 4%) configurable in `/user/admin/financials`. Includes F&B uplift + drop absent facilities + proportional redistribution to 100%. **Tomorrow's session**.
2. **PASO 4 sub-task · MICE parser fix** — sweep produced **0/226** `meeting_rooms_count` because the parser doesn't catch the Booking pattern. Decision firmed: presence of *any* event space → MICE P&L line activates (no minimum count). Parser must extract this binary signal correctly.
3. **PASO 4 sub-task · F&B point-weighting** — open question, decided with the P&L document in hand. F&B + MICE both expanded in methodology.
4. **PASO 4 sub-task · `restaurants_count` empty fallback** — only 19/226 hotels surface `accommodationHighlights "N restaurants"`. Decide rule for the other 207 (default to 1? infer from amenities bitmap? hide line?).
5. **Methodology page 404** — `/methodology` (or equivalent route) returns 404. Page exists in concept but not in routing. Restore.
6. **Catastral map / floor-plan on Asset Analysis** — institutional surface for parcel imagery + cadastral overlay. Spec already filed at `docs/features/catastro-imagen-mapa-spec.md`.
7. **Rebrand policy** — 3-layer infrastructure shipped (`hotel_name_alias` + `hotel_canonical_history` + `same_building_rebrand` enum + 2 seeded). **Untouched today.** Future: same-building detector + admin UI for operator-curated merges + cross-border behaviour once CoStar mundial lands.
8. **Vercel Pro pre-demo** — current Hobby plan limits (1024MB function memory · 300s maxDuration · 2-4 daily crons) tight under demo load. Upgrade before institutional demo.
9. **Integrations key management** — `/user/admin/integrations` needs a clean operator UI for provisioning / rotating / invalidating API keys (RapidAPI · Google Places · Resend · CRON_SECRET · INGESTION_AUDIT_TOKEN). T1 credentials currently encrypted in Supabase; expose via admin without leaking values.
10. **Agents system review** — 9 operational agents + CEO seeded but mostly dormant. Review status of each, decide which to activate post-Paso 4.
11. **SSL apex cert** — `hotelvalora.com` apex Let's Encrypt cert only covers `www.hotelvalora.com`. Windows schannel rejects bare apex with `SEC_E_WRONG_PRINCIPAL` even though Vercel 307-redirects → www. Browsers tolerate it; institutional clients on strict TLS won't. Re-issue or extend cert to apex. Bundle with Vercel Pro upgrade pre-demo.
12. **CoStar full API integration** — replace the single Upper-Upscale Madrid Centro template currently loaded with the real CoStar dataset: full hotel inventory by market + USALI percentages segmented by country/market/submarket/class/segmentation_type + STR for real compsets. When complete: (a) engine starts reading the matching percentages per asset, no code change; (b) the "plantilla provisional" flag (added 2026-05-28) auto-retires for covered assets; (c) facility-aware rule keeps operating on the correctly segmented base. See `VALUATION_METHODOLOGY.md` annex "Alcance actual de cobertura CoStar" for full scope.
13. **Card admin editable de factores facility-aware** (urban/mixed/resort). Requiere persistencia server-side de overrides (no solo localStorage). Hoy los 3 factores son configurables editando `FACILITY_AWARE_FB_FACTORS` en `lib/admin/financials/defaults.ts` + redeploy. Estimación: 2-3h. Bloqueante: NO. Prioridad: media.
14. **Añadir columna `segmentation_type` a `hotel_canonical`** (`hotel` | `apartahotel` | `hostel`). Necesario para que el motor del P&L (`isProvisionalTemplate` + futuro lookup de % USALI segmentados) diferencie tipos de activo cuando lleguen datos CoStar segmentados. Hoy todos los hoteles se tratan como `'hotel'` por defecto en `coverage.ts`. Estimación: 1-2h (migración + backfill desde Booking property_type o manual). Bloqueante: cuando se rellenen datos CoStar segmentados de Madrid (ej. apartahoteles con sus % propios).
15. **Backfill `chain_scale` para los 111 hoteles `unknown`** — 49% del corpus tiene `chain_scale='unknown'` (problema preexistente, no introducido por el Paso 4). Implicaciones: (a) hoy esos 111 hoteles muestran banner "plantilla provisional" por `classLabel=null` → comportamiento correcto y conservador pero excesivo · varios pertenecen a clases conocidas que solo necesitan ser pobladas en BD; (b) el **Paso 5** (ajuste por tamaño/clase · tramos 0-75 / 76-200 / 201+ habs · wiring pendiente en `/user/admin/financials`) requiere `chain_scale` poblado en TODOS los hoteles para diferenciar tramos por clase + tamaño · sin backfill el Paso 5 queda parcialmente bloqueado. Fuentes razonables: Booking `class` field + Google Places `priceLevel`. Estimación: 1-2h.

---

## Future ideas

### Library

- Multi-report comparison view (side-by-side underwriting deltas)
- Saved searches + saved filters (per user, sync to backend)
- Folders / tags inside Favorites
- Team collaboration: comments on reports, shared folders
- Export selected rows to Excel / PDF
- AI-ranked "Best match for your investment criteria" surface

### Top Promote marketplace

- Sponsor analytics dashboard (impressions / clicks / lead conversions per promotion)
- Auction-style boost bidding for premium map slots
- Geo-targeted promoted regions (`featuredRegion` ISO codes)
- Auto-expiration emails 7d / 1d before `promotedUntil`

### Report engine

- Section 5 (Financials) implementation — P&L, Underwriting & IRR, Sensitivity
- Section 6 (Methodology) implementation
- Server-side PDF rendering via Puppeteer (replace `window.print()`)
- Multi-currency support across sections

### Settings + Investment criteria

- HMA / lender-side investment criteria tabs
- Scenario import from Excel workbook
- Criteria-vs-asset match score on every Library row

### Cross-cutting

- Notifications system (sonner today is local-only; need persistent + filterable)
- Mobile-responsive Library list (today: optimised for desktop terminals)
- Dark mode (tokens exist but never tested)

---

## Blocked

- 🔴 *(none today)*

---

## Technical debt

| Item | Severity | Notes |
|---|---|---|
| Library map uses static grayscale image | Low | Acceptable for MVP; Phase 4 swaps to Mapbox |
| Mock `MOCK_LIBRARY_REPORTS` duplicated between map markers and table rows | Low | Single source today; will move to API in Phase 3 |
| `FavoritesTable` is named after favorites but used by both lists | Low | Considered rename to `LibraryReportsTable`; kept for commit-history continuity |
| `apps/web/src/lib/library/store.ts` carries no persistence | Low | By design — UI ephemeral state. Re-evaluate if users complain |
| Audit-log rollback paths only cover alias + merge mutations | Medium | Extend coverage when valuation mutations land |
| No type-tests on `LibraryReport` shape | Medium | Add `vitest` + type-only assertions in Phase 3 |
| `pdf-export.ts` is a `window.print()` wrapper | Medium | Replace with server-side render before institutional rollout |
| Auth store is mock-only, tier inferred from email | High | Replace with NextAuth + DB tier in Phase 3 |
| No CI yet — typecheck only via local `pnpm typecheck` | Medium | Add GitHub Actions before opening contributions |
| `ENTRYPOINTS.md` over 200-line cap (357 lines as of 2026-05-12) | Low | Surfaced by `scripts/docs-audit.mjs`. Compress entries that are derivable from `docs/HOTELVALORA_MASTER_SYSTEM.md`; rule is in `CLAUDE.md` |

---

## Promotion criteria

An item moves from this file to `current-sprint.md` when:
- It has a clear shape (no open design questions)
- It unblocks revenue, user retention, or a Phase milestone
- It fits in ≤ 2 days of focused work
