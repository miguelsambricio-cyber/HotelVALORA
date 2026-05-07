# Alias Registry

Manages the full lifecycle of hotel and operator name aliases, conflict detection, merge history, and resolution. Migration: `0003_alias_registry.py`.

---

## Tables

### `hotel_alias_entries`
One row per alias per hotel asset. A single hotel may have many active aliases of different types.

| Column | Type | Notes |
|---|---|---|
| `asset_id` | UUID FK → `hotel_assets` CASCADE | Nullable (orphan aliases allowed during import) |
| `alias_text` | VARCHAR(255) | Raw form as seen in source |
| `alias_key` | VARCHAR(255) | `_key()`-normalised; used for dedup lookups |
| `alias_type` | VARCHAR(50) | See types below |
| `language` | VARCHAR(10) | BCP-47 tag (`es`, `en`, `ca`, `fr`); null = language-agnostic |
| `source` | VARCHAR(100) | `costar` \| `excel_import` \| `manual` \| `etl` \| `merge` |
| `is_active` | BOOLEAN | False = soft-deleted; row kept for audit |
| `is_manual_override` | BOOLEAN | True = human-verified; wins all automated conflict resolution |
| `confidence` | NUMERIC(4,3) | 0.000–1.000 from scoring engine; null if manually added |
| `valid_from` / `valid_to` | DATE | Validity window; null = unknown / current |

**Partial unique index:** `(alias_key, asset_id)` WHERE `is_active = true` — prevents duplicate active aliases per hotel.

**`alias_type` values:**
- `canonical` — current official name (mirrors `hotel_assets.asset_name`)
- `common` — widely-used informal form
- `multilingual` — name in another language; see `language` field
- `operator` — name as used by the brand in their own systems
- `historical` — was valid in the past; `valid_to` is set
- `source_raw` — verbatim string from an import before normalisation

---

### `operator_aliases`
Portfolio-wide operator/brand name registry. Maps any raw operator string to a single canonical name.

| Column | Notes |
|---|---|
| `alias_text` / `alias_key` | Raw + normalised form |
| `canonical_operator` | Authoritative display name (e.g. `"Marriott International"`) |
| `brand_family` | Top-level loyalty programme (e.g. `"Marriott Bonvoy"`) |
| `chain_scale` | `luxury \| upper_upscale \| upscale \| upper_midscale \| midscale \| economy` |
| `parent_company` | Legal entity |
| `is_manual_override` | Skipped in auto re-seeding from static pipeline dict |

**Unique index on `alias_key`** — one canonical mapping per normalised form.

---

### `hotel_merge_history`
Append-only audit log of merge events (loser absorbed into winner).

| Column | Notes |
|---|---|
| `winner_asset_id` | FK → `hotel_assets` SET NULL |
| `loser_asset_id` | No FK — loser may be deleted post-merge |
| `loser_asset_name` / `loser_city` | Denormalised for audit independence |
| `merge_strategy` | `auto_exact \| auto_fuzzy \| manual` |
| `confidence_score` / `confidence_label` | Score at merge time |
| `snapshot_before` | JSONB — full winner asset state before merge |
| `aliases_transferred` | JSONB array — alias entry IDs moved from loser to winner |
| `is_reversed` / `reversed_at` / `reversed_by_id` | Reversal tracking |

---

### `alias_conflicts`
Open/resolved records where two or more assets share the same `alias_key`.

| Column | Notes |
|---|---|
| `alias_key` | The colliding normalised key |
| `conflicting_asset_ids` | `UUID[]` — all asset IDs that claimed this key |
| `status` | `open \| resolved_manual \| resolved_auto \| ignored` |
| `resolved_asset_id` | FK → `hotel_assets` — nominated winner |
| `resolution_strategy` | `manual \| confidence_winner \| override \| ignored` |

**Partial unique index:** `(alias_key)` WHERE `status = 'open'` — one open conflict per key at a time.

---

## Conflict Detection Logic

Runs inside `HotelAliasService.create()` and `update()` on every write:

1. Compute `alias_key = _key(alias_text)`
2. Query for any other **active** `HotelAliasEntry` with the same `alias_key` but a different `asset_id`
3. If found: create or update an `AliasConflict` record (merge the `conflicting_asset_ids` arrays if one already exists)
4. Conflict stays `open` until a human resolves or ignores it

`is_manual_override = True` on an alias entry means a human resolved this collision permanently — conflict resolution honours it without deleting competing entries.

---

## API Routes

All under `/api/v1/`:

```
GET    /aliases/hotels              list with filters
GET    /aliases/hotels/{id}
PATCH  /aliases/hotels/{id}         recomputes alias_key; re-runs conflict detection
DELETE /aliases/hotels/{id}         soft-delete (is_active=false, valid_to=today)

GET    /aliases/operators           list with filters
POST   /aliases/operators           create
POST   /aliases/operators/bulk      bulk create (skips existing keys)
GET    /aliases/operators/{id}
PATCH  /aliases/operators/{id}
DELETE /aliases/operators/{id}

GET    /aliases/conflicts           filter by status (default: open)
GET    /aliases/conflicts/{id}
POST   /aliases/conflicts/{id}/resolve
POST   /aliases/conflicts/{id}/ignore

GET    /aliases/merges              filter by winner/loser/reversed
GET    /aliases/merges/{id}
POST   /aliases/merges              record a merge event
POST   /aliases/merges/{id}/reverse
```

---

## Key Normalisation (`_key()`)

Used everywhere aliases are compared. Identical implementation in three places:
- `app/services/alias_service.py` (inlined — pipeline not importable)
- `app/services/dedup_service.py` (inlined)
- `services/data_pipeline/pipeline/cleaning/names.py` (canonical source)

```python
def _key(raw: str) -> str:
    nfd = unicodedata.normalize("NFKD", raw.strip().lower())
    stripped = "".join(c for c in nfd if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", stripped).strip()
```

NFKD + strip combining chars + collapse whitespace. No stopword removal, no prefix stripping — preserves structural words.
