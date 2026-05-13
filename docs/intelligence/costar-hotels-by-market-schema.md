# CoStar Hotels-by-Market Schema (Dataset B · Hotel Reference Inventory)

Full column reference for `services/costar/HOTELESperMARKET/` ingest stream and the planned `COSTAR_MASTER_HOTELES_POR_MERCADO.xlsx` master.

**Last refreshed:** 2026-05-14
**Status:** Provisional — schema captures the institutional intent before the build_masters generator materialises the workbook. Column finalisation lands once the v1.2 normalisation version of `services/costar/scripts/build_masters.py` ships against the first Madrid drop.
**Replaces:** the legacy class master (`costar-class-schema.md` · v1.1 chain-scale aggregates) which is retired as a separate granularity. `chain_scale` becomes a column on each hotel record here.

---

## 0. Spanish-language CoStar export headers (Phase 2.3.d.6c · 2026-05-14)

Real CoStar "Inmuebles" exports for ES markets ship Spanish headers without a `country` column. Our normalisation layer maps each source header through a case-insensitive, diacritic-stripped, underscore-folded key. The canonical aliases:

| Source column (CoStar ES) | Folded key | Canonical field |
|---|---|---|
| `Nombre del edificio` | `nombre_del_edificio` | `name` |
| `Operador del hotel` | `operador_del_hotel` | `operator` |
| `Propietario real` | `propietario_real` | `owner` |
| `Empresa matriz` | `empresa_matriz` | `owner` (fallback) |
| `Marca` | `marca` | `brand` |
| `Mercado` | `mercado` | `market_name` |
| `Submercado` | `submercado` | `submarket_name` |
| `Ciudad` | `ciudad` | `city_es_costar` → fallback for `market_name` |
| `Dirección` | `direccion` | `address_line` |
| `Código postal` | `codigo_postal` | `postal_code` |
| `Clase` | `clase` | `chain_scale` (canonical tier: Luxury / Upscale / …) |
| `Escala` | `escala` | `chain_scale` = `independent` when value is "Independiente" (affiliation axis) |
| `Habitaciones` | `habitaciones` | `rooms_count` |
| `Año de construcción` | `ano_de_construccion` | `year_opened` |
| `Año de reform.` | `ano_de_reform` | `year_last_renovated` |
| `Fecha de apertura del hotel` | `fecha_de_apertura_del_hotel` | `year_opened` (fallback) |
| `Espacio de reunión total` | `espacio_de_reunion_total` | `meeting_space_sqm` |
| `Tipo de ubicación del hotel` / `Tipo secundario` | `tipo_de_ubicacion_del_hotel` / `tipo_secundario` | `segment_type` (CoStar values like "Hotel" / "Urbano" not in our canonical enum — surface as `segment_type_unrecognised` in `_meta.needs_review`) |

### `country` fallback

CoStar ES "Inmuebles" / "Transacciones" exports have no `country` column. The normaliser defaults to `DEFAULT_COUNTRY = "ES"` and tags the row with `country_defaulted:ES` in `_meta.needs_review`. Override by adding an explicit `country` column to the source XLSX. Widen `DEFAULT_COUNTRY` if/when the pipeline expands beyond Spain.

### `market_name` fallback

When `Mercado` is empty but `Ciudad` is set, the city is promoted to `market_name`. Tagged `market_defaulted_from_city`.

## 1. Why this is its own dataset (not part of MERCADO)

The market-data masters (`PAIS` · `MERCADO` · `SUBMERCADO`) carry **aggregated time-series KPIs** — occupancy / ADR / RevPAR / room nights / pipeline — that change every period. The hotel inventory carries **slowly-changing dimensional facts** about each property — name, brand, operator, facilities, rooms, score. The two share a market-name foreign key but never share a row shape.

Forcing them into the same master would create:

- Heavy column nullability (every market KPI is null on hotel rows; every hotel attribute is null on market rows)
- Confused dedup keys (one master would need both `(country, market, period)` and `(country, market, hotel_id)` PKs)
- Operator friction in Excel (the analyst editing a hotel's facilities does not want to see ADR columns)

Separate masters preserve institutional legibility for the operator and keep every column meaningful in its workbook.

## 2. Primary key

`(country, market_name, hotel_id)`

`hotel_id` is the canonical CoStar property identifier (the "INMUEBLE ID" in the export). When unavailable, the ingest pipeline falls back to a deterministic sha256 of `(country, market_name, address_line, name)` lowercased — recorded as `hotel_id_synthetic = true` in the ingestion-meta block.

## 3. Domain columns (planned · provisional)

### 3.1 · Identification

| Column | Type | Required | Notes |
|---|---|---|---|
| `country` | text | ✅ | ISO-3166-1 alpha-2 uppercase. |
| `market_name` | text | ✅ | Canonical market — matches `COSTAR_MASTER_MERCADOS.market_name`. |
| `submarket_name` | text |  | Optional — canonical submarket where the hotel sits. |
| `hotel_id` | text | ✅ | CoStar INMUEBLE ID. Falls back to deterministic sha256 — see § 2. |
| `hotel_id_synthetic` | boolean | ✅ | `true` when `hotel_id` was computed because the export lacked it. |
| `name` | text | ✅ | Hotel display name. |
| `brand` | text |  | Brand affiliation (e.g. "Marriott", "NH Collection"). `null` for independent. |
| `operator` | text |  | Operating company. May differ from brand (white-label management). |
| `owner` | text |  | Ownership entity when disclosed in the CoStar export. |

### 3.2 · Property characteristics

| Column | Type | Required | Notes |
|---|---|---|---|
| `chain_scale` | text |  | `luxury` / `upper_upscale` / `upscale` / `upper_midscale` / `midscale` / `economy` / `independent`. Canonical enum lives in `costar-normalization-rules.md`. |
| `category` | text |  | Star rating or local equivalent (e.g. "5-star", "4-star superior"). |
| `segment_type` | text |  | `business` / `leisure` / `extended_stay` / `resort` / `convention`. |
| `rooms_count` | integer |  | Total guest rooms. |
| `year_opened` | integer |  | Original opening year. |
| `year_last_renovated` | integer |  | Most recent renovation. |
| `total_floors` | integer |  | Building floors. |

### 3.3 · Location

| Column | Type | Required | Notes |
|---|---|---|---|
| `address_line` | text |  | Street + number. |
| `postal_code` | text |  | Local postal code. |
| `latitude` | numeric(9,6) |  | Decimal degrees. |
| `longitude` | numeric(9,6) |  | Decimal degrees. |
| `neighborhood` | text |  | Free-text neighborhood name when finer than submarket. |

### 3.4 · Facilities · amenities · scoring

| Column | Type | Required | Notes |
|---|---|---|---|
| `facilities` | text[] |  | Normalized facility codes — `meeting_space`, `pool`, `spa`, `fitness`, `restaurant`, `bar`, `parking`, `pet_friendly`, `business_center`, `accessibility`, `kids_club`. |
| `amenities` | text[] |  | Free-text amenities not in the canonical facility enum. |
| `meeting_space_sqm` | numeric |  | Total meeting/event space when reported. |
| `parking_spaces` | integer |  | Total parking spaces. |
| `score_costar` | numeric(4,2) |  | CoStar property score when present. |
| `score_external` | jsonb |  | External-platform scores (Booking, Tripadvisor) keyed by source. |

### 3.5 · Commercial context

| Column | Type | Required | Notes |
|---|---|---|---|
| `competitive_set_ids` | text[] |  | Sibling `hotel_id`s flagged by CoStar as the property's competitive set. Used by the CompSet Builder Agent. |
| `transactions_history_ref` | text |  | Optional foreign key into `HOTEL_TRANSACCIONES_MASTER` when the hotel has known transaction history. |
| `notes` | text |  | Operator-curated free-text notes. |

## 4. Ingestion-meta block (shared with the other COSTAR masters)

Every row carries the standard `ingestion_id`, `ingestion_ts`, `source_path`, `source_sha256`, `normalization_version`, `supersedes_id`, `is_active` block. The append-only / supersede pattern from `costar-master-dataset-architecture.md` applies identically.

## 5. Operator-edit surface · institutional correction lifecycle (Phase 2.3.d.6)

The `/user/admin/hotels/<hotel_id>` detail page is the operator's read + edit window onto this dataset. When an operator corrects a hallucinated or stale attribute (e.g. wrong `rooms_count` or missing `chain_scale`):

1. The Node server action `submitHotelCorrection()` appends a pending row to `services/costar/corrections/<YYYY-MM>.jsonl`.
2. The next `python services/costar/scripts/ingest.py` run delegates to `corrections.py` — validates the row, applies it as a supersede, pushes a provenance entry into the hotel record's `_corrections` array, and rewrites the JSONL with `status: applied | rejected`.
3. Every applied row is also appended to `corrections-applied/<YYYY-MM>.jsonl` for the cumulative audit trail.

The supersede never overwrites the original ingest in place — the canonical XLSX retains the raw row and the snapshot carries the override; the provenance array preserves both values + the operator's reason + confidence-before.

### `_corrections` array (per hotel record · snapshot only)

```json
{
  "correction_id": "corr_...",
  "applied_at": "ISO timestamp",
  "applied_in_batch": "batch_...",
  "submitted_at": "ISO timestamp",
  "submitted_by": "operator email or id",
  "field": "chain_scale | rooms_count | ...",
  "original_value": "midscale",
  "corrected_value": "upscale",
  "reason": "Operator-supplied free text",
  "confidence_before": 0.85
}
```

The `_corrections` array is emitted into `snapshot.json` so the admin UI can render the audit trail without re-reading the JSONL. The snapshot also carries a top-level `corrections` summary block: `{pending_before, applied, rejected, applied_total_in_master}`.

## 7. Compset modelling — two distinct entities (Phase 2.3.d.6c · 2026-05-14)

After ingesting the operator's Madrid drop we discovered that the CoStar export labelled "INMUEBLES COMPSET DATOS" (file 3.2) is **not a membership list** — it is aggregated time-series KPIs for a set of competitor hotels (period · supply · demand · ADR · RevPAR · …). The actual membership (which 4 hotels make up the compset) lives in the print-template PDF (file 3.1) which has not been parsed yet.

To model this correctly we split the compset concept into three snapshot entities:

| Entity | What it carries | Source | Status (2026-05-14) |
|---|---|---|---|
| `compset_membership` | Operator-confirmed list of `{target_hotel_id, member_hotel_ids[]}` | 3.1 Costar Analytics Print Template Service · PDF | 🟡 **pending source** — PDF parser not yet shipped |
| `compset_performance` | Aggregated time-series KPIs (period · ADR · RevPAR · occupancy · supply · demand) for the operator's compset | 3.2 INMUEBLES COMPSET DATOS · XLSX | 🟡 **deferred** — dedicated ingestion path planned for Phase 2.3.d.8 |
| `synthetic_compsets` | Algorithmic top-4 inference per hotel based on similarity | `compset_inference.py` v1 | 🟢 **shipped** — populates today, replaced by real membership when it lands |

### Synthetic compset inference algorithm (transitional)

While real membership is missing, the pipeline generates one synthetic compset per hotel:

| Factor | Weight | Logic |
|---|---|---|
| `submarket` | 0.30 | 0 same · 1 different · 0.5 unknown |
| `chain_scale` | 0.30 | 0 same · 0.33/0.67/1.0 by tier distance · 0.5 unknown |
| `rooms` | 0.20 | abs(Δrooms) / max(rooms_a, 200), clamped 0..1 |
| `segment` | 0.10 | 0 same · 1 different · 0.5 unknown |
| `geo` | 0.10 | Haversine(km) / 5km, clamped 0..1 (0.5 when lat/lon missing) |

Lower composite score = more similar. Top-4 candidates within the same `(country, market)` win.

Every synthetic compset is tagged:
- `provenance: "synthetic_inference"`
- `needs_operator_confirmation: true`
- `algorithm: { version, weights, top_n, geo_normaliser_km }`

The admin UI surfaces synthetic compsets on `/user/admin/hotels/<id>` with an explicit amber banner clarifying they are inferred and will be replaced once the 3.1 PDF is parsed.

### Validation on the Madrid drop (2026-05-14)

- 364 synthetic compsets generated (one per hotel)
- Members restricted to same market (Madrid)
- Score distribution typical: 0.10 – 0.35 (lower = strongly similar)
- Sample target "Edificio Eurobuilding 2" → AC Aitana (0.104), Sercotel Togumar (0.133), NH Paseo Habana (0.149), Barceló Imagine (0.150)

## 6. Relational links

```
hotels_by_market
  ├── market_name   → COSTAR_MASTER_MERCADOS (Dataset A) · KPIs by period
  ├── submarket_name → COSTAR_MASTER_SUBMERCADOS · neighborhood KPIs
  ├── hotel_id       ← services/compset/MASTER/COMPSET_TARGET.xlsx · target hotel reference
  ├── competitive_set_ids → self-FK · the compset graph
  └── transactions_history_ref → HOTEL_TRANSACCIONES_MASTER · sale history
```

The hotel registry is therefore the **reference data backbone**: every downstream surface (compset, valuations, market reports, underwriting) ultimately points to `hotel_id` values defined here. The COSTAR & Hotel Reference Agent is the owner of this integrity.
