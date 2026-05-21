# Library + Report Integrity Audit · 2026-05-21

**Scope** — verify the integrity of `hotel_report_library` and the canonical-backed `/report/*` sections. Identify and quantify the gap between "synthetic seed traffic" and "real engine renders". Propose a definitive classification (`report_origin`) so an investor never confuses a seeded record with an institutional analysis.

**Mandatory before any further migration** (B/C/D). No schema changes performed during this audit.

---

## 1 · Origin of the 224 current rows · empirical evidence

### 1.1 Render timing distribution

| Time window (UTC) | Rows created | Source |
|---|---|---|
| `13:02:46` | 1 | Manual SQL `INSERT` during smoke-test before the confidence-int fix (Mandarin Ritz) |
| `13:09:24` → `13:13:08` | 223 | Bulk seed `library-seed-bulk.mjs` · concurrency 3 |
| **Total** | **224** | **100 % synthetic traffic** |

### 1.2 Render-count distribution

| `render_count` | Rows | Meaning |
|---|---|---|
| 1 | 220 | Single bulk-seed render · never browsed since |
| 2 | 3 | Bulk seed + 1 QA render (voco Madrid Retiro · Vincci Vía-66 · VP SOGNIO) |
| 4 | 1 | Mandarin Ritz — seed INSERT + 3 QA passes (cap-rate diag · post-fix verification · bulk seed) |

**Conclusion · ZERO rows are "real institutional renders". Every row is synthetic seed traffic** initiated either by SQL `INSERT` (1) or by automated cURL against `/report/executive-summary` (223).

### 1.3 Why this matters

The library page today displays 224 institutional-looking hotel cards · an investor reading the surface assumes someone has analysed every property. In reality, no analyst has opened any of these reports yet. **The risk is reputational, not data-integrity** · the data is consistent, but the perceived signal is misleading.

---

## 2 · Integrity metrics · all checks PASS

### 2.1 Structural integrity

| Check | Result | Evidence |
|---|---|---|
| Total rows | 224 | `select count(*)` |
| Unique `canonical_id` | 224 (= total) | `UNIQUE` constraint enforced at DB level |
| Orphan rows (no matching `hotel_canonical`) | **0** | `select … where not exists` |
| `report_status = 'generated'` | 224 (100 %) | All snapshots produced a valuation |
| `null estimated_value_eur` | 0 | Engine ran for every hotel (heuristic when needed) |
| `null lat / lng` | 0 | Every row has geo from canonical |
| `report_url` well-formed (`/report/executive-summary?canonical_id=<uuid>`) | 224 (100 %) | Pattern check via SQL |
| `report_url` resolves to live canonical | 224 (100 %) | FK + URL inspection |

### 2.2 Cross-section consistency · 20-hotel sample

Sampled 20 hotels covering luxury (4) · upper_upscale (5) · upscale (5) · upper_midscale (2) · midscale (1) · independent (3). For each hotel · fetched the 4 canonical-backed `/report/*` sections in parallel and verified the rendered HTML mentions the canonical hotel name.

```
Sample:      20 canonical_ids × 4 sections = 80 fetches
Elapsed:     60.1 s · concurrency 3
Hotels with all 4 sections clean: 20 / 20
Sections OK:                       80 / 80 (100.0 %)
Failures:                          0
```

Cohorts × submarkets tested:
- Mandarin Ritz · luxury · Retiro
- Four Seasons · luxury · Madrid Centre
- Rosewood Villa Magna · luxury · Salamanca
- BLESS Hotel · luxury · Salamanca
- Madrid Marriott Auditorium · upper_upscale · Madrid Surrounding
- Hilton Madrid Airport · upper_upscale · Barajas/Hortaleza/San Blas
- Hyatt Centric Gran Vía · upper_upscale · Madrid Centre
- NH Collection Madrid Eurobuilding · upper_upscale · Chamartin & Plaza de Castilla
- Crowne Plaza Madrid · upper_upscale · Retiro
- AC Hotel Recoletos · upscale · Salamanca
- Barceló Torre de Madrid · upscale · Madrid Centre
- Meliá Castilla · upscale · Chamartin & Plaza de Castilla
- Catalonia Plaza España · upscale · Madrid Centre
- Novotel Madrid Center · upscale · Salamanca
- Sercotel Gran Hotel Conde Duque · upper_midscale · Arguelles & Chamberi
- Room Mate Collection Alba · upper_midscale · Madrid Centre
- Ibis Styles Las Ventas · midscale · Barajas/Hortaleza/San Blas
- 7 Islas Hotel · independent · Madrid Centre
- Exe Convention Plaza · independent · Fuencarral-El Pardo
- Urban Hive Madrid · independent · null

Every section (Executive Summary · Asset Analysis · Competitive Set · Market Overview) returned a 200 with the canonical hotel name visible in the rendered HTML. **No section showed a different hotel than the canonical name expected** · zero cross-section pollution.

### 2.3 List ↔ map sync

Both `/library/favorites-list` and `/library/favorites-map` consume the same `useLibraryReports()` hook + same `fetchLibraryReports()` SSR seed · same TanStack Query cache key. Verified by reading source: identical query · identical result set · zero divergence possible by design.

### 2.4 Marker animation

`hotel-map-marker.tsx` carries an explicit comment ("no continuous animation · institutional UX rule QA #001"). `animate-pulse` removed by commit `06cd9af`. Selected marker uses static `scale-125` + `ring-offset-2`. Zero blinking / pulsing / flashing.

---

## 3 · Risks identified

| Risk | Severity | Status |
|---|---|---|
| All 224 rows look institutional but are synthetic | **HIGH** | UNRESOLVED · today no way to distinguish |
| Investor can't tell "analysed" from "auto-generated" | **HIGH** | UNRESOLVED · requires `report_origin` |
| Operator triggers a real render → it's indistinguishable from the seed in the DB | **MEDIUM** | UNRESOLVED · `render_count` alone insufficient |
| Future automated seeds (e.g. nightly cron) could pollute the library invisibly | **MEDIUM** | UNRESOLVED · need source-tagging |
| Cross-section mismatch (sec A shows hotel X · sec B shows hotel Y) | LOW | ✅ Verified clean in 20-hotel sample |
| Broken report URLs | LOW | ✅ 100 % well-formed |
| Duplicate canonical_id | LOW | ✅ UNIQUE constraint at DB level |
| List ↔ map divergence | LOW | ✅ Shared hook · architecturally impossible to drift |

---

## 4 · Proposed classification · `report_origin`

### 4.1 Schema · single column on `hotel_report_library`

```sql
ALTER TABLE public.hotel_report_library
  ADD COLUMN report_origin text NOT NULL DEFAULT 'engine_render'
  CHECK (report_origin IN (
    'engine_render',     -- real /report/* render triggered by a human session
    'bulk_seed',         -- automated seed driver (library-seed-bulk.mjs)
    'manual_seed',       -- single SQL INSERT for testing / smoke / demo
    'imported',          -- CoStar / external CSV ingestion (future)
    'migrated'           -- moved from valuations or other legacy table (future)
  ));

CREATE INDEX hotel_report_library_origin_idx
  ON public.hotel_report_library (report_origin);
```

Plus an honest timestamp for the last **real** render (not synthetic):

```sql
ALTER TABLE public.hotel_report_library
  ADD COLUMN last_operator_render_at timestamptz NULL;
-- only set when report_origin = 'engine_render' on the active update.
-- bulk_seed / manual_seed renders update last_rendered_at but NOT this.
```

### 4.2 Backfill plan for the current 224 rows

```sql
UPDATE public.hotel_report_library SET report_origin = 'bulk_seed';
-- 223 rows
UPDATE public.hotel_report_library
  SET report_origin = 'manual_seed'
  WHERE canonical_id = 'dafc4073-ab60-43ec-91a0-ac1d7311232e'  -- Mandarin Ritz
    AND created_at < '2026-05-21 13:09:00+00';
-- The Mandarin row was the manual smoke-test INSERT pre-bulk-seed.
```

After backfill:
- 1 row tagged `manual_seed` (Mandarin Ritz · the test row)
- 223 rows tagged `bulk_seed`
- 0 rows tagged `engine_render` (truthful · no one has analysed anything yet)

### 4.3 Code changes required

| File | Change | Impact |
|---|---|---|
| `lib/report/library-persistence.ts` | Accept optional `origin: ReportOrigin` parameter · default `'engine_render'` · set `last_operator_render_at = NOW()` only when origin is `'engine_render'` · increment `render_count` always | Tiny · 4-5 lines |
| `/report/executive-summary/page.tsx` | No change · default `'engine_render'` is correct for human-driven renders | None |
| `scripts/library-seed-bulk.mjs` | Pass User-Agent header `HotelVALORA-LibrarySeed/1.0` · persistence helper sniffs UA and stamps `'bulk_seed'` IF the request comes from a known bot · OR — simpler — the script SKIPS the page render entirely and calls the persistence helper directly with `'bulk_seed'` | Tiny · 5-10 lines · explicit |
| `lib/library/queries/use-library-reports.ts` | Add `originFilter?: ReportOrigin[]` param · default `['engine_render']` so the library page shows ONLY real reports unless the operator toggles seeds in | Small · 10 lines |
| `components/library/favorites-table.tsx` | Add a small badge column showing origin (`✓ Engine` / `⚙ Seeded`) so the row history is honest | UI · 1 small column |

### 4.4 Library page UX after the change

- Default view → ZERO rows (today, because no one has actually analysed any hotel yet). The page shows an empty-state CTA: "No reports yet · go to /compset to analyse your first hotel."
- Toggle "Show seeded entries" → operator-only switch surfaces the 223 bulk_seed rows for inventory inspection.
- Per-row badge → "Engine" (green) for real renders · "Seeded" (slate) for seeds.

This change is **non-destructive** — every existing row is preserved · only its visibility default changes.

---

## 5 · Recommendation

### 5.1 What to do now (autonomous · within autonomy boundaries)

1. **Apply migration 0027** · `ALTER TABLE` add `report_origin` + `last_operator_render_at`.
2. **Backfill 224 current rows** as described (1 manual_seed · 223 bulk_seed).
3. **Update `library-persistence.ts`** to accept and propagate `origin`.
4. **Update `use-library-reports.ts`** to filter by `engine_render` by default · with operator toggle for the seeded rows.
5. **Add the badge column** to the favorites-table so origin is visible in the UI.

### 5.2 What NOT to do until operator approves

- ❌ No new bulk seeds.
- ❌ No new portfolio backfills.
- ❌ No migration B (`report_favourites`) / C (`report_promotions`) / D (`visibility` column) until 5.1 is shipped + verified.
- ❌ No deletion of the 223 bulk_seed rows (preserve audit history).

### 5.3 What this guarantees

After 5.1 ships, the library page will:
1. Show ZERO entries by default (truthful · no real analyses exist yet).
2. Surface seeded entries only when an operator explicitly opts in (inventory view).
3. Tag every future row with its true origin · no risk of seeded data masquerading as institutional.
4. Maintain `last_operator_render_at` as the honest "last analysed" timestamp · `last_rendered_at` keeps tracking all renders (including seed updates) but is no longer the user-facing freshness signal.

### 5.4 What's left for operator decision (gated)

- Migration B (personal favourites) — requires operator confirmation on the FK retarget plan.
- Migration C (top promote) — same.
- Migration D (visibility column) — same.
- 30-day post-deprecation DROP of legacy `valuations`/`favorite_reports`/`top_promote_reports` — only after B/C/D run successfully.

---

## 6 · Evidence files committed

| File | Purpose |
|---|---|
| `apps/web/scripts/library-integrity-qa.mjs` | Cross-section consistency QA · re-runnable · 80/80 today |
| `docs/hotel-intelligence/library-architecture-audit-2026-05-21.md` | Prior audit (A/B/C/D conceptual separation) |
| `docs/hotel-intelligence/library-integrity-audit-2026-05-21.md` | This document |

Audit complete · no production data touched · awaiting operator go-ahead on §5.1.
