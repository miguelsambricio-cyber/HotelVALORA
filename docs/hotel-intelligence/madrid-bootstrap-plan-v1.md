# Madrid Bootstrap Plan — v1

**Workstream:** `feature/hotel-enrichment-pipeline`.
**Status:** Planning — execution gated until operator sign-off on the RapidAPI dry-run output.
**Companion to:** [`madrid-enrichment-architecture-v1.md`](./madrid-enrichment-architecture-v1.md), [`madrid-enrichment-rapidapi-booking-v1.md`](./madrid-enrichment-rapidapi-booking-v1.md), [`institutional-feature-coverage-targets-v1.md`](./institutional-feature-coverage-targets-v1.md).

This document is the concrete day-by-day execution plan for taking Madrid from "no canonical hotels" to "≥ 70% of ~1,800 Madrid hotels at institutional 80% TIER-2 coverage." It assumes the foundation milestone (coverage targets · registries · migration 0024) is approved and the RapidAPI Booking dry-run has been reviewed.

---

## 1 · Phased structure

The bootstrap runs in 6 sequential phases, each with explicit entry conditions, success criteria, and rollback paths. No phase begins until the previous phase exits cleanly.

| Phase | Title | Sub-goal | Wall-clock |
|---|---|---|---|
| **A** | Schema landing | Apply migration 0024 to staging Supabase; verify views queryable | < 1 hour |
| **B** | RapidAPI procurement | Subscribe to Pro 25k tier on selected publisher; provision env vars; validate auth | < 1 day |
| **C** | Smoke pilot | 50-hotel Madrid sample, full pipeline live (with curator review of every row) | 1 day |
| **D** | First sweep | ~1,800 Madrid hotels via Booking E0+E1+E2; raw ingest only, no fallback | 5–7 days |
| **E** | Fallback enrichment | Critical-field gaps closed via Google Places + hotel websites + Wikidata | 5–7 days |
| **F** | Coverage drive | Targeted re-fetches + curator review queue clearance to reach 80% goal | 7–14 days |

**Total elapsed time, well-paced:** ~4 weeks from Phase A entry to goal-reached.

---

## 2 · Phase A — Schema landing

### Entry conditions
- Foundation milestone (this branch, commits `4aea2ff` + `29ff4c0`) reviewed and approved.
- Operator confirms migration 0024 may be applied to **staging only**, not prod.

### Execution
1. Apply migration via Supabase MCP `apply_migration` against staging project.
2. Verify table OIDs exist: `select to_regclass('public.hotel_canonical');` (and the other 7).
3. Verify enums: `select count(*) from pg_type where typname in ('hotel_type_enum', 'quality_tier_enum', ...);` returns 10.
4. Verify views: `select * from public.hotel_coverage_madrid_v;` returns one row with all zeros (no hotels yet, `goal_reached = false`).
5. Verify RLS: `select schemaname, tablename, rowsecurity from pg_tables where tablename like 'hotel_%' or tablename = 'rate_limit_state';` — all `rowsecurity = true`.
6. Verify PostGIS: `select postgis_version();` returns non-null.

### Success criteria
- All 8 tables present, all 10 enums present, all 4 views present.
- `hotel_coverage_madrid_v` returns a single zeroed row.
- No errors in Supabase log during apply.

### Rollback
- Migration is purely additive. To roll back: `drop view ... cascade; drop table ... cascade; drop type ... cascade;` in reverse-dependency order. Captured in a sibling rollback script if requested.

### Gate to next phase
- Operator confirms staging is healthy and the coverage view returns the empty-state shape.

---

## 3 · Phase B — RapidAPI procurement

### Entry conditions
- Phase A complete.
- Operator decision on publisher selection (recommendation: `booking-com15` per sidecar §0).
- Operator decision on plan tier (recommendation: **Pro 25k/month**, ≈ $40–80/mo per sidecar §3.3).

### Execution
1. Subscribe via RapidAPI dashboard with the operator's account.
2. Note `X-RapidAPI-Key` and `X-RapidAPI-Host` values.
3. Add env vars to Vercel staging environment:
   - `RAPIDAPI_BOOKING_KEY=<key>`
   - `RAPIDAPI_BOOKING_HOST=booking-com15.p.rapidapi.com`
   - `RAPIDAPI_BOOKING_BASE_URL=https://booking-com15.p.rapidapi.com`
   - `RAPIDAPI_BOOKING_TIER=pro_25k`
   - `RAPIDAPI_BOOKING_DAILY_BUDGET=833`
   - `RAPIDAPI_BOOKING_MONTHLY_BUDGET=25000`
4. Run smoke auth check against E0 (locations auto-complete for "Madrid"):
   - Expected: HTTP 200, JSON with at least one result whose `name = "Madrid"` and `dest_type = "city"`.
   - If 401/403: stop, escalate to operator.
   - If 429 immediately: stop, escalate to operator (plan/host misconfig).
5. Record the resolved `destination_id` for Madrid in a project-config file (constant).

### Success criteria
- E0 returns Madrid `destination_id`.
- No 401/403/429 on first call.
- Env vars present in Vercel.

### Rollback
- Cancel subscription (no charges roll back, but no further usage).
- Remove env vars.

### Gate to next phase
- Operator approves moving to live calls against a small Madrid sample.

---

## 4 · Phase C — Smoke pilot (50 hotels)

### Entry conditions
- Phase B complete.
- Curator (operator or designated reviewer) available for 1 day to verify rows.

### Execution
1. Trigger a `discover` job with scope `{ destination_id: <Madrid>, limit: 50, sort: "popularity" }`.
2. Pipeline emits 50 `enrich` jobs (one per hotel).
3. Worker processes them at Pro 25k rate (≈ 2 RPS practical): wall time ~25 seconds.
4. Each `enrich` job:
   - Fetches E2 details.
   - Conditionally fetches E3 facilities (if E2 didn't return granular amenities).
   - Parses, normalizes, applies confidence scoring, writes to `hotel_canonical` + `hotel_field_provenance` + `hotel_source_record`.
5. After all 50: run coverage view and snapshot results.

### Success criteria
- 50/50 hotels written to `hotel_canonical` (excluding any quarantined for TIER-0 failure — those should be < 5%).
- ≥ 95% of rows reach `bronze` tier (TIER-1 ≥ 90%).
- ≥ 50% of rows reach `silver` tier (TIER-2 ≥ 60% at conf 0.70).
- DLQ empty (or all entries operator-explained).
- Total RapidAPI budget burn: ≤ 150 calls (50 × 3 average).
- Operator review of first 10 rows confirms canonical fields look correct.

### Failure modes + responses
- **TIER-0 quarantine rate > 10%**: schema-drift signal; halt and inspect raw payloads in `hotel_source_record`.
- **No granular facilities in E2 OR E3**: amenity coverage will stall; flag — may indicate wrong endpoint family or wrong publisher.
- **Operator finds canonical_name normalization wrong on > 5 rows**: pause and revise `brands.ts` or normalization pipeline.
- **High duplicate-candidate rate (> 30%)**: investigate — Madrid sample shouldn't have many duplicates against an empty canonical table.

### Rollback
- `delete from hotel_canonical where created_at > <phase_c_start>;`
- `delete from hotel_source_record where fetched_at > <phase_c_start>;`
- `delete from hotel_field_provenance where created_at > <phase_c_start>;`
- All other rows untouched.

### Gate to next phase
- Operator signs off on Phase C output (review ≥ 10 sample rows manually).

---

## 5 · Phase D — First sweep (~1,800 hotels)

### Entry conditions
- Phase C clean and approved.

### Execution
1. Trigger one `discover` job with no row limit, paginated.
2. Pagination at page_size=60 yields ~30 pages → 30 E1 calls.
3. ~1,800 `enrich` jobs created.
4. Worker drains queue at Pro 25k tier (833/day budget) → ~5.5 days wall time.
5. Daily mini-reports: end-of-day coverage view snapshot.

### Success criteria
- ≥ 95% of discovered hotels reach `hotel_canonical` (some will quarantine for TIER-0 failure — accept up to 5%).
- ≥ 90% reach `bronze`.
- ≥ 50% reach `silver` (Booking-only ceiling ≈ 70% TIER-2; silver requires ≥ 60% TIER-2).
- 0 `gold` expected at this point (gold needs ≥ 2 corroborating sources — comes in Phase E).
- Daily budget burn stays ≤ 833 calls; no overage.
- DLQ < 50 rows; each one classified.

### Failure modes + responses
- **Daily 429 rate > 5%**: halve concurrency permanently for this phase; flag for operator.
- **Discover pagination loops** (same hotels appearing on multiple pages): hard-stop and revise sort/offset strategy.
- **One specific hotel re-failing on E2**: route to DLQ; do not block the queue.

### Rollback
- Same as Phase C, scoped to phase D timestamps.

### Gate to next phase
- ≥ 1,500 hotels in canonical; coverage view shows `t2_pct ≥ 0.50` for ≥ 50% of rows.

---

## 6 · Phase E — Fallback enrichment

### Entry conditions
- Phase D complete.
- Google Places API key provisioned (separate env var: `GOOGLE_PLACES_API_KEY`).

### Execution
1. Query `hotel_coverage_scored_v` for hotels at `t2_pct < 0.84` (i.e., not yet passing).
2. For each, identify missing TIER-2 fields per the coverage view.
3. Dispatch fallback jobs:
   - **Google Places**: phone, postal_code, address, neighborhood, google_place_id.
   - **Hotel website discovery**: year_opened, legal_name, meeting_space_sqm, website_url, operator clarification.
   - **Wikidata SPARQL** (batched): year_opened, operator inference, wikidata_qid.
4. Worker processes per provider rate budget (Google Places at 5 RPS; Wikidata batched; website 1 req/4–8s).
5. Each fallback fetch goes through the same parse → normalize → confidence → conflict-resolution path as Booking.
6. Cross-source agreement bonuses accrue → some rows graduate to `gold`.

### Success criteria
- ≥ 1,260 hotels at `institutional_passing = true` (workstream goal).
- `hotel_coverage_madrid_v.goal_reached = true`.
- ≥ 20% of rows at `gold` tier (≥ 2 corroborating sources on ≥ 3 fields).
- DLQ remains < 100 across all sources.

### Failure modes + responses
- **Goal still unreachable (passing rate < 70%)**: identify the binding constraint via `most-missing-field` query (coverage spec §5.3) and dispatch targeted source for that field only.
- **Cross-source conflicts > 200 rows**: pause fallback, drain conflict queue first.

### Rollback
- Same as Phase C, scoped to phase E timestamps.

### Gate to next phase
- `goal_reached = true`, OR explicit operator decision to enter Phase F with sub-goal scope.

---

## 7 · Phase F — Coverage drive

### Entry conditions
- Phase E complete (with or without goal reached).

### Execution (iterative until goal reached)
1. Run `coverage_v` queries; identify the smallest-N action that unblocks the most hotels.
2. Execute that action (targeted re-fetch / curator review / registry expansion).
3. Re-measure.
4. Repeat.

Common Phase F actions:
- Expand `brands.ts` to cover boutique chains seen in Madrid (auto-discovery via `select brand from hotel_canonical where brand_family is null group by brand;`).
- Drain the review queue (low-confidence + duplicate-candidates).
- Manual curator overrides on stubborn fields (`year_opened` is the typical stuck field).
- Force-refresh hotels at quality_tier `quarantined` to retry TIER-0 (often closed listings re-appearing).

### Success criteria
- `goal_reached = true`.
- Curator review queue drained (or operator-acknowledged backlog < 50 items).
- Documented learnings → roll into v2 of the registries and coverage targets.

### Gate to next phase (= post-bootstrap)
- Operator signs off on Madrid coverage. Workstream pivots to:
  - Madrid weekly refresh (sustained operation).
  - Barcelona / Valencia / Sevilla expansion (Phase 7+).

---

## 8 · Cross-phase invariants

These hold at every phase boundary:

1. **No underwriting / report-system / synchronization table is read or written.**
2. **No scraping outside the bounded Tier-Z policy** (sidecar §9.3): scraping only kicks in at Phase E for hotel website discovery, robots-compliant, ≤ 1 req / 4–8s per domain.
3. **Migration 0024 is the only schema change** during bootstrap. Subsequent migrations (e.g., for review queue UI, cross-source review table) are gated to post-bootstrap.
4. **`audit_log` records every canonical field mutation** via the existing `AuditService` pattern.
5. **DLQ inspection at every phase exit.** Each entry must be classified (network / quota / parse / etc.) and either resolved or operator-acknowledged.
6. **Rate limit state is monotonic per UTC day.** No reset hack.

---

## 9 · Operator touch points

Decisions that require operator input:

| Touch point | Phase | Decision | Default if no decision |
|---|---|---|---|
| Migration apply | A | Apply 0024 to staging? | Hold |
| Publisher | B | `booking-com15` vs alternative | `booking-com15` |
| Plan tier | B | Basic / Pro 10k / **Pro 25k** / Ultra | Pro 25k |
| 50-hotel sample review | C | Approve canonical-row quality | Hold |
| 1,800 sweep approval | D | Approve full sweep cost (~$40 + 1 week wall) | Hold |
| Fallback activation | E | Activate Google Places + scraping per §9.3 | Hold |
| Goal declaration | F | Mark workstream complete or extend | Default complete at first `goal_reached = true` |

---

## 10 · Reporting cadence

Per operator instruction (compact updates at milestones):

| Update | Triggered by | Form |
|---|---|---|
| Foundation landed | This branch already complete | Reported in milestone 1 summary |
| RapidAPI dry-run output ready | Milestone 2 complete | Operator-readable sample JSON for 3 fixtures + this plan |
| Phase A applied | Migration landed staging | One sentence + view snapshot |
| Phase C smoke complete | First 50 rows | Coverage snapshot + first 10 sample rows |
| Phase D sweep complete | ~1,800 rows | Coverage snapshot + DLQ classification |
| Phase E goal-or-close | Fallback exhausted | `goal_reached` boolean + remaining-gaps table |
| Phase F complete / workstream done | Goal reached | Final coverage report + lessons learned + v2 registry deltas |

No micro-decision updates. Operator stays in the loop at phase boundaries and only at phase boundaries.

---

## 11 · Risks tracked, not blocking

| Risk | Likelihood | Mitigation |
|---|---|---|
| Booking publisher schema drift mid-sweep | Medium | Defensive parsing; DLQ catches; pause + revise parsers (~2 hours typical fix) |
| Publisher endpoint not subscribed at our tier | Medium | E0 + E1 + E2 are baseline; E3 conditional. Resolved at Phase B smoke. |
| Google Places quota tighter than expected | Low-Medium | Phase E is fallback-light by design; Google Places hits only critical-field gaps |
| Madrid hotel inventory smaller than 1,800 anchor | Low | Plan scales linearly; smaller inventory = cheaper sweep |
| Madrid hotel inventory larger than 1,800 | Low-Medium | Pro 25k tier accommodates up to ~3,000 hotels with sub-monthly refresh; alert if E1 returns > 2,500 |
| Duplicate-candidate flood (apartment-block flooding per sidecar §7.2) | Medium | Auto-merge disabled for `accommodation_type ∈ {apartment, aparthotel}`; curator decides |
| Curator unavailable mid-phase | Medium | Phase C requires curator; D-F can run without curator if quality-tier thresholds are met automatically |

---

## 12 · Out of scope for this plan

- Barcelona / Valencia / Sevilla / any non-Madrid market.
- Photos gallery download (deferred to a sibling phase after Madrid Phase F completes).
- Reviews ingestion at scale (E5 — deferred per sidecar §1.1).
- Match Engine integration (consumes canonical reads; built later).
- Library UI showing canonical data (consumes via existing locked-cell pattern; built later).
