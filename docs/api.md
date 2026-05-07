# API Reference

**Base URL:** `http://localhost:8000/api/v1`  
**Docs (dev only):** `http://localhost:8000/docs`  
**Auth:** `Authorization: Bearer <access_token>`

All responses wrap in `{ "data": ... }` or `{ "data": null, "errors": [...] }`.  
Paginated responses: `{ "data": [...], "meta": { total, limit, offset, has_next } }`.

---

## Auth — `/auth`

| Method | Path | Body / Notes |
|---|---|---|
| POST | `/auth/register` | `{ email, full_name, password, role }` → `UserRead` |
| POST | `/auth/login` | `{ email, password }` → `{ access_token, refresh_token }` |
| POST | `/auth/refresh` | `{ refresh_token }` → new token pair |
| GET | `/auth/me` | Current user profile |

---

## Hotel Assets — `/assets/hotels`

| Method | Path | Notes |
|---|---|---|
| GET | `/assets/hotels` | Paginated list |
| POST | `/assets/hotels` | Create |
| GET | `/assets/hotels/{id}` | Detail |
| PATCH | `/assets/hotels/{id}` | Partial update |
| DELETE | `/assets/hotels/{id}` | Delete |
| GET | `/assets/hotels/{id}/financials` | Financial history |

## Flex Living — `/assets/flex-living`

| Method | Path | |
|---|---|---|
| GET | `/assets/flex-living` | Paginated |
| POST | `/assets/flex-living` | Create |
| GET | `/assets/flex-living/{id}` | |
| PATCH | `/assets/flex-living/{id}` | |
| DELETE | `/assets/flex-living/{id}` | |

---

## Aliases — `/aliases`

### Hotel Aliases — `/aliases/hotels`

| Method | Path | Notes |
|---|---|---|
| GET | `/aliases/hotels` | Filters: `asset_id`, `alias_key`, `alias_type`, `language`, `active_only`, `confidence_max` |
| GET | `/aliases/hotels/{id}` | |
| PATCH | `/aliases/hotels/{id}` | Recomputes `alias_key` if `alias_text` changes; re-runs conflict detection |
| DELETE | `/aliases/hotels/{id}` | Soft-delete: sets `is_active=false`, `valid_to=today` |

### Operator Aliases — `/aliases/operators`

| Method | Path | Notes |
|---|---|---|
| GET | `/aliases/operators` | Filters: `canonical_operator`, `brand_family`, `active_only` |
| POST | `/aliases/operators` | Create |
| POST | `/aliases/operators/bulk` | Bulk create; skips existing keys |
| GET | `/aliases/operators/{id}` | |
| PATCH | `/aliases/operators/{id}` | |
| DELETE | `/aliases/operators/{id}` | Soft-delete |

### Alias Conflicts — `/aliases/conflicts`

| Method | Path | Notes |
|---|---|---|
| GET | `/aliases/conflicts` | Filter by `status` (default: `open`) |
| GET | `/aliases/conflicts/{id}` | |
| POST | `/aliases/conflicts/{id}/resolve` | `{ resolved_asset_id, resolution_strategy, resolution_notes, resolved_by_id }` |
| POST | `/aliases/conflicts/{id}/ignore` | `{ resolution_notes, resolved_by_id }` |

### Merge History — `/aliases/merges`

| Method | Path | Notes |
|---|---|---|
| GET | `/aliases/merges` | Filters: `winner_asset_id`, `loser_asset_id`, `is_reversed` |
| GET | `/aliases/merges/{id}` | |
| POST | `/aliases/merges` | Record a merge event |
| POST | `/aliases/merges/{id}/reverse` | Undo a merge |

---

## Valuations — `/valuations`

### DCF — `/valuations/dcf`

| Method | Path | |
|---|---|---|
| POST | `/valuations/dcf` | Run DCF; returns concluded value + cash flows |
| GET | `/valuations/dcf/{id}` | |
| GET | `/valuations/dcf/{id}/sensitivity` | Grid: discount_rate × terminal_cap_rate |

### Underwriting — `/valuations/underwriting`

| Method | Path | |
|---|---|---|
| POST | `/valuations/underwriting/{valuation_id}` | Create underwriting for a valuation |
| GET | `/valuations/underwriting/{valuation_id}` | |

---

## Market Intelligence — `/market`

| Method | Path | |
|---|---|---|
| GET | `/market/intelligence` | Overview by city/submarket |
| GET | `/market/intelligence/{submarket}` | Detail + time-series snapshots |
| GET | `/market/comparables` | Transaction comps (paginated) |
| POST | `/market/comparables` | Add comp |
| GET | `/market/comparables/{id}` | |

---

## Imports — `/imports`

| Method | Path | Notes |
|---|---|---|
| POST | `/imports/excel` | Multipart upload; `?template_type=hotels\|financials\|transactions` |
| POST | `/imports/costar` | Trigger CoStar sync |

---

## Dedup / Merge Engine — `/dedup`

| Method | Path | Notes |
|---|---|---|
| GET | `/dedup/summary` | Counts by tier: auto_merge, needs_review, etc. |
| POST | `/dedup/scan` | Run scan; `?city=Barcelona` to scope |
| GET | `/dedup/recommendations` | Filters: `status`, `recommendation`, `confidence_label` |
| GET | `/dedup/recommendations/{id}` | Full detail with score breakdown |
| POST | `/dedup/recommendations/{id}/accept` | `{ notes? }` |
| POST | `/dedup/recommendations/{id}/dismiss` | `{ notes? }` |

---

## Review Queue — `/review`

| Method | Path | Notes |
|---|---|---|
| GET | `/review/summary` | `{ open_conflicts, low_confidence_aliases, low_confidence_threshold, pending_merge_recommendations }` |

---

## Health

| Method | Path | |
|---|---|---|
| GET | `/health` | `{ status: "ok", env }` — always public |

---

## Middleware Headers

| Header | Set by |
|---|---|
| `X-Request-ID` | `RequestIDMiddleware` — UUID per request |
| `X-Process-Time` | `TimingMiddleware` — seconds elapsed |

---

## Audit Log — `/audit`

| Method | Path | Notes |
|---|---|---|
| GET | `/audit` | Paginated event list; filter by `entity_type`, `entity_id`, `event_type`, `actor_id` |
| GET | `/audit/{id}` | Full event detail including `before_state`, `after_state`, `meta` |
| POST | `/audit/{id}/rollback` | Reverse a `reversible=true` event; actor inferred from Bearer token |
