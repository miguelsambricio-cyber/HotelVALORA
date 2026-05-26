# CATASTRO / PLANOS tabs → IMAGEN / MAPA · spec (PLANNED)

**Status**: 🟡 planned · NOT implemented
**Filed**: 2026-05-26
**Trigger**: operator note while verifying enrichment pilot · the existing
"Catastro" / "Planos" tabs under the Property Overview carousel in Asset
Analysis are placeholders without backing data.

---

## Purpose

Replace the inert `Catastro` + `Planos` tabs in Asset Analysis · right column
(`PropertyImageCard`) with two functional tabs:

- **IMAGEN** — current carousel of real hotel photos (already wired in this commit).
- **MAPA** — institutional cadastral map of the parcel, drawn from the
  Spanish Catastro (Sede Electrónica del Catastro / Open API).
  Shows the parcel outline + neighbour parcels + their cadastral
  references for the asset owner / appraiser to read at a glance.

## Data source

[Catastro Inspire API](https://www.catastro.minhap.es/INSPIRE/wfsCP.aspx)
+ Sede Electrónica del Catastro public services. Both are free for
institutional use with attribution.

Per-asset query:
- Input: `lat,lng` (already on `hotel_canonical`) → returns
  `referenciaCatastral` (the 20-char cadastral ID).
- Then: WFS query for parcel polygon + adjacent parcel polygons.
- Render: Mapbox layer with the polygons + small reference labels.

## Architecture sketch (when implementing)

1. New module `apps/web/src/lib/cadastre/spain/`:
   - `client.ts` — Catastro Inspire WFS client · GET request, XML response
     parsed to GeoJSON
   - `resolve-reference.ts` — `referenciaCatastral` from lat/lng
   - `fetch-parcel.ts` — parcel polygon + neighbours
   - `types.ts` — typed shapes
2. New canonical column `hotel_canonical.cadastral_reference text` (20 chars).
   Populated by enrichment when `country_code='ES'` · NULL otherwise.
3. New component `apps/web/src/components/report/asset-analysis/cadastre-map.tsx`
   · Mapbox GL with the parcel + neighbours layer.
4. `PropertyImageCard` tabs become:
   - "IMAGEN" → current carousel
   - "MAPA" → `<CadastreMap referencia={hotel.cadastral_reference} />`
5. Outside-Spain fallback: render the IMAGEN tab only · MAPA tab disabled
   with tooltip "Disponible para activos en España".

## Out of scope of this spec

- Worldwide cadastre integration (each country has its own format ·
  spec focuses on Spain because that's where the 224 baseline hotels live).
- Operator-edited overrides on the parcel polygon.
- Cadastral data ingestion in bulk (calls happen on-demand per-report).

## Dependencies

| Dependency | Status |
|---|---|
| `hotel_canonical.lat/lng` populated | ✅ shipped |
| Mapbox GL already wired in `/compset` + `/report/competitive-set` | ✅ shipped |
| Catastro API endpoints | public · no auth required for the layer types we need |

## Effort estimate

3-4 hours of focused work · low risk · Catastro API is stable +
well-documented + free. Defer until the operator surface this tab as a
priority.
