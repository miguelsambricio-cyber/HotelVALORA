# Library Architecture Audit + Definitive Proposal · 2026-05-21

**Scope** — verify the current state of `hotel_report_library`, `/library/favorites-list`, `/library/favorites-map`, the relationship between Library and Favourites, identify conceptual ambiguity, and propose the definitive 4-layer separation: **A · Institutional Library · B · Personal Favourites · C · Top Promote · D · Community**.

No code changes performed during this audit.

---

## 1 · Current state · facts

### 1.1 `public.hotel_report_library` (created today · migration 0026)

| Metric | Value |
|---|---|
| Total rows | **224** |
| Unique `canonical_id` | 224 (perfect 1:1 with corpus) |
| `report_status = 'generated'` | 224 (100 %) |
| `report_status = 'partial' / 'archived'` | 0 |
| `null estimated_value_eur` | 0 |
| `null / empty report_url` | 0 |
| `null lat/lng` (missing geo) | 0 |
| Orphan rows (no matching `hotel_canonical.id`) | 0 |
| `report_url` well-formed (`/report/executive-summary?canonical_id=<id>`) | 224 (100 %) |
| `render_count = 1` | 220 |
| `render_count = 2` | 3 (voco Madrid Retiro · Vincci Vía-66 · VP SOGNIO Metropolitano · QA browsings) |
| `render_count = 4` | 1 (Mandarin Oriental Ritz · seed + multiple QA passes) |

**Verdict** — clean. Zero orphans. Zero broken URLs. Every row matches a live canonical hotel. 100 % of rows have a non-null valuation snapshot (engine ran on every hotel · heuristic keys when canonical lacked rooms).

### 1.2 `/library/favorites-list` · what it shows today

- **Data source**: `useLibraryReports()` hook → `select * from hotel_report_library order by last_rendered_at desc limit 100`. SSR'd via `fetchLibraryReports()` (limit 200).
- **Adapter**: `adaptReportLibraryToLibraryReport(row)` produces `LibraryReport[]`.
- **`favorited` flag**: when unauth (anonymous visitor) every row is marked favourited (`treatAllAsFavorited: true`). When auth, only rows present in `favorite_reports` for that user.
- **Render behaviour**: any hotel that has ever produced a report (all 224 today) appears. The route name says "favourites" but the surface shows the **full institutional corpus**.

### 1.3 `/library/favorites-map` · what it shows today

- **Data source**: same `useLibraryReports()` hook + same SSR prefetch.
- **Rendering**: `<HotelMap>` plots `coordinates.{lat,lng}` from each row.
- **Sync with list**: shared query key (`libraryKeys.reportsList()`) · 5-minute stale time · same cache. Both surfaces render the **same 224 rows**.
- **Markers**: static halo on selected · no `animate-pulse` anywhere (verified by audit + QA #001 commit `06cd9af`).

### 1.4 `public.favorite_reports` · per-user favourites

| Metric | Value |
|---|---|
| Total rows | 6 |
| Distinct users | 1 |
| FK target | `valuations.id` (LEGACY · marketplace seed) |
| Rows pointing to existing `valuations` | 6 (the 6 favourites match the 8 seed rows) |
| Rows pointing to `hotel_report_library.id` | 0 |

### 1.5 `public.valuations` · legacy marketplace · UNCHANGED

| Metric | Value |
|---|---|
| Total rows | 8 (manually-seeded demo content) |
| Visibility = `public` | 8 |
| Visibility = `top-promote` / `private` / `team` | 0 |
| Reference codes | HV-2024-001 to HV-2026-008 |
| Hotels covered | Mandarin Oriental Ritz · Four Seasons · The Ritz-Carlton · The Madrid EDITION · Hard Rock Marbella · W Barcelona · Hotel Indigo Madrid · Petit Palace Plaza |
| Canonical-linked | **0** (none of these rows reference `hotel_canonical.id`) |

### 1.6 `public.top_promote_reports` · marketplace promotions

| Metric | Value |
|---|---|
| Total rows | 4 |
| Active promotions (`promoted_until > now()`) | 4 |
| FK target | `valuations.id` (LEGACY) |

---

## 2 · The conceptual ambiguity

Three competing concepts have been collapsed onto a single route family and confused by naming:

| Concept | Where it lives today | Naming problem |
|---|---|---|
| **Institutional library** (every report HotelVALORA has produced) | `hotel_report_library` (NEW · 224 rows) | Route name says "favourites" → operator + investor read it as "starred by me" |
| **User favourites** (rows a user has starred) | `favorite_reports` (EXISTING · 6 · keyed by `valuation_id`) | Pointing to the LEGACY seed table · not to the new library |
| **Top promote** (paid placements) | `top_promote_reports` (EXISTING · 4 · keyed by `valuation_id`) | Also pointing to LEGACY · disconnected from `hotel_report_library` |
| **Community** (hotels visible to anonymous public) | No table · derived from `valuations.visibility = 'public'` | Effectively undefined for the new library · today the whole `hotel_report_library` is anon-readable so "community = library" |

**Risk of mixing concepts**

1. **Route name vs content**: `/library/favorites-list` displays the corpus, not user-specific favourites. An investor seeing 224 hotels labelled "favourites" assumes someone curated them → erodes credibility.
2. **Orphaned legacy tables**: `favorite_reports` + `top_promote_reports` reference 8 fake marketplace rows (`valuations.id` starting with `00000000-…`). Any UX that lets a user "star" a hotel from the new library currently has nowhere to write (the FK constraint would fail because `hotel_report_library.id` is not in `valuations.id`).
3. **No subset visibility model**: today every row is public-read. There is no way to mark a row as "only this user's saved view" vs "shared with team" vs "broadcast to community". The visibility tier is computed at adapter time from `confidence_score` (≥75 = institutional, ≥60 = verified, else community) — that's a quality classifier, not a permissioning model.
4. **Top promote unreachable from the new flow**: a promoted hotel can only be one of the 8 legacy seed rows. The 224 real institutional reports cannot be promoted today.

---

## 3 · Sync & integrity checks

| Check | Status |
|---|---|
| List ↔ map show the same hotels | ✅ Yes · shared `useLibraryReports` hook + SSR prefetch. Same row set, same order. |
| Each row opens a valid report URL | ✅ Yes · 100 % well-formed `/report/executive-summary?canonical_id=<uuid>`. |
| No orphan `hotel_report_library` rows | ✅ Zero. FK constraint to `hotel_canonical(id) ON DELETE CASCADE` enforces this. |
| `report_url` always points to a hotel that exists | ✅ Yes · the FK ensures the canonical_id in the URL maps to a live (`deleted_at IS NULL`) row. |
| `favorite_reports` references existing rows | 🟡 Yes (6/6 point at valuations) — but they reference the **wrong table** for the new library. |
| `top_promote_reports` references existing rows | 🟡 Yes (4/4 point at valuations) — same architectural mismatch. |
| Markers static (no blinking) | ✅ Verified by code audit + QA #001 `06cd9af`. |

**No data corruption, no integrity violations, no broken links** within `hotel_report_library`. The only architectural debt is the **conceptual overlap with the legacy `valuations` + `favorite_reports` + `top_promote_reports` triad**.

---

## 4 · Definitive 4-layer architecture proposal

### Principle
Each layer has a single responsibility, a single source-of-truth table, and a single route. Layers compose via JOINs, not by duplicating concepts.

```
HOTEL_CANONICAL                   (source of truth · physical hotel · 1 row per asset)
       │
       ▼
HOTEL_REPORT_LIBRARY (A)          (Institutional Library · 1 row per analysed hotel · auto-populated)
       │
       ├──► REPORT_FAVOURITES (B) (per-user star markers · N rows per user · references library)
       ├──► REPORT_PROMOTIONS (C) (paid marketplace placements · 1 row per active promotion)
       └──► REPORT_VISIBILITY (D) (community / private / team flags · embedded in library row)
```

### A · Institutional Library — `hotel_report_library`
**Status**: already shipped (migration 0026). **Action**: no schema change. **Route**: rename `/library/favorites-list` → `/library` (or `/library/all`) so the surface name matches what it shows. Keep the URL but de-emphasise "favourites" in the heading text.

**Responsibility**: every canonical hotel that has ever rendered a report appears here. Auto-populated by `upsertHotelReportLibrary` on `/report/*` render. Used by both the public showcase view and admin reviews.

### B · Personal Favourites — `report_favourites` (migrate from `favorite_reports`)
**Action required**: migration to switch FK target. New schema:

```sql
CREATE TABLE public.report_favourites (
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  library_id     uuid NOT NULL REFERENCES public.hotel_report_library(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  notes          text,
  PRIMARY KEY (user_id, library_id)
);
ALTER TABLE public.report_favourites ENABLE ROW LEVEL SECURITY;
-- policies: each user can SELECT/INSERT/DELETE only their own rows
```

**Responsibility**: per-user star markers on `hotel_report_library` rows. **Route**: `/library/saved` filtered subset for the signed-in user.

**Migration plan** for the 6 legacy `favorite_reports` rows: map each `valuation_id` → matching `hotel_canonical.id` by `hotel_name` ILIKE match → `hotel_report_library.id`. 1 user · 6 rows · ~5 min curation. After cutover, `favorite_reports` becomes deprecated.

### C · Top Promote — `report_promotions` (migrate from `top_promote_reports`)
**Action required**: same FK retarget.

```sql
CREATE TABLE public.report_promotions (
  library_id        uuid PRIMARY KEY REFERENCES public.hotel_report_library(id) ON DELETE CASCADE,
  promoted_by       uuid REFERENCES auth.users(id),
  promoted_at       timestamptz NOT NULL DEFAULT NOW(),
  promoted_until    timestamptz NOT NULL,
  boost_score       integer CHECK (boost_score BETWEEN 0 AND 100),
  sponsor_priority  integer DEFAULT 0,
  featured_region   text,
  impressions       integer NOT NULL DEFAULT 0,
  clicks            integer NOT NULL DEFAULT 0
);
ALTER TABLE public.report_promotions ENABLE ROW LEVEL SECURITY;
-- policies: public SELECT, service-role INSERT/UPDATE
```

**Responsibility**: 1:1 overlay on `hotel_report_library` rows currently being promoted. **Route**: `/library/top-list` + `/library/top-map` (existing surfaces · just retarget their data hook).

**Migration plan**: 4 legacy `top_promote_reports` rows · same hotel-name match procedure as Favourites. Probably 3 of the 4 promotions are Madrid hotels that exist in canonical · the W Barcelona promotion needs a Barcelona corpus expansion later.

### D · Community / Visibility — embedded flag on `hotel_report_library`
**Action required**: add a column to A.

```sql
ALTER TABLE public.hotel_report_library
  ADD COLUMN visibility text NOT NULL DEFAULT 'community'
  CHECK (visibility IN ('private', 'team', 'community', 'institutional'));
```

**Semantics**:
- `private` — only the owning operator sees the row (default for any new operator-uploaded valuation in the future).
- `team` — owning operator's organisation sees it.
- `community` — every anonymous visitor sees it (today's default · institutional public showcase).
- `institutional` — verified high-confidence row · surfaced first in lists / featured on map.

**Responsibility**: governs which subset of A each visitor type can see. RLS reads this column. **Route**: no dedicated route · filters list/map views.

**Migration plan**: all 224 existing rows default to `community` (current behaviour). Future operator-uploaded reports start `private`.

---

## 5 · Migration sequencing

| Step | Action | Risk | Reversible |
|---|---|---|---|
| 1 | `ALTER TABLE hotel_report_library ADD COLUMN visibility …` (D) | None · default backfills `community` | Yes (`DROP COLUMN`) |
| 2 | Create `report_favourites` table (B) · empty | None · new table | Yes |
| 3 | Create `report_promotions` table (C) · empty | None · new table | Yes |
| 4 | Backfill `report_favourites` from `favorite_reports` via name match | Low · 6 rows · operator can review | Yes |
| 5 | Backfill `report_promotions` from `top_promote_reports` via name match | Low · 4 rows | Yes |
| 6 | Switch hooks: `useFavouriteIds` reads from `report_favourites` · `useTopPromote` reads from `report_promotions` | Low · UI components untouched · adapter swap | Yes (git revert) |
| 7 | Rename `/library/favorites-list` → `/library` (institutional) and add `/library/saved` route for personal favourites | UX-naming only · no data move | Yes |
| 8 | Mark `valuations` + `favorite_reports` + `top_promote_reports` as deprecated (keep tables for now · readers stop using them) | None · tables linger as audit history | Yes |
| 9 | (Future · separate migration) DROP the deprecated trio once 30 days have passed without reads | Destructive · gated on `pg_stat_user_tables` confirming zero recent SELECTs | Manual rollback only |

---

## 6 · Recommendation

The current state of `hotel_report_library` is **clean, complete, and internally consistent**. The architectural debt is **not in the new layer** — it is in the **disconnect between the new institutional layer (A) and the legacy marketplace triad (B/C/D living on `valuations`)**.

The proposal above resolves this with:
- **A** unchanged (already correct).
- **B + C** migrated to FK against `hotel_report_library` (the canonical source).
- **D** absorbed as a column on A (no new table needed).
- Deprecation of the legacy triad without immediate deletion (preserves audit history).

**Effort estimate**: 4-6 hours of focused work to ship steps 1-6. Steps 7-8 are UX-naming + admin cleanup, ~2 hours. Step 9 is a 30-day-later janitorial migration.

**No code changes are pending operator authorisation** beyond this proposal. Awaiting your go/no-go on the 4-layer separation before scheduling the migration sequence.
