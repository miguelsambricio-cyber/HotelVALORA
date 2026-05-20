# Wikidata SPARQL re-sweep · 2026-05-20

**Task #49** · re-sweep Wikidata against the 67 Madrid canonical hotels that already had `wikidata_qid` populated. Target properties: `P1106` (max capacity → rooms), `P571` (inception), `P1619` (date of official opening).

## Method

Single batched `VALUES { wd:Q1 wd:Q2 … }` SPARQL query against `query.wikidata.org` · institutional UA · 1 request total · ~3s response time.

## Result

| Metric | Count |
|---|---|
| QIDs queried | 67 |
| SPARQL bindings returned | 66 |
| Hotels with `P1106` (rooms) | **0** |
| Hotels with `P571` or `P1619` (year) | **2** |
| Hotels with both | 0 |
| Hotels with neither | 64 (96 %) |

Only matches:
- Canopy by Hilton Madrid Castellana (Q112011952) · year_opened = 2021
- DoubleTree by Hilton Madrid-Prado (Q72172868) · year_opened = 1992

## Root cause

Most of the Madrid hotel QIDs (Q111388xxx / Q111389xxx / Q111516xxx / Q11187xxxx range) were created in 2022-2023 in bulk by Wikidata bots seeded from OpenStreetMap / Booking.com listings without populating the material data properties. Only iconic / historically-notable hotels (Q1471562 Mandarin Ritz · Q72172868 DoubleTree Madrid-Prado · Q26702361 Hotel Fénix etc.) have curated capacity/inception fields.

## Path forward · canonical underwriting fields

Wikidata SPARQL re-sweep is **EXHAUSTED** for Madrid as a backfill mechanism. Remaining viable paths in priority order:

1. **Targeted manual operator backfill** for the institutional luxury / upper_upscale subset (~40 hotels) using public press kits + Wikipedia narrative content + operator brochures. ~30-90 min per hotel · 100 % accuracy · full provenance. Highest-value subset to underwriting.
2. **CoStar Inmuebles re-ingest** · CoStar Excel exports natively carry `Habitaciones` + `Año de construcción`. When the operator drops a fresh export, the existing ingestion pipeline absorbs these via supersede pattern. Bulk solution.
3. **Booking.com JSON-LD via existing rapidapi provider** · technically available but operator policy ("NO aggressive scraping") parks this path for the showcase corpus.

## Impact on underwriting readiness

After this round:
- `hotel_underwriting_ready_v` still shows **1 ready / 113 partial / 224 total** (Mandarin Oriental Ritz only). The 2 year-only backfills don't cross the underwriting_ready threshold on their own without rooms.
- The remaining 222 hotels render via `engine heuristic rooms` (chain_scale defaults: luxury 150 · upper_upscale 220 · upscale 180 · midscale 110), which is now surfaced in the scenario label as `"... · keys heurístico"` (provenance honest).

## Verdict

Wikidata path closed for Madrid. Manual operator backfill for luxury / upper_upscale ~40 hotels is the practical next workstream. The cap-rate engine + KPI resolver + provenance layer all gracefully degrade · reports keep rendering institutional values regardless · the only cost of unpopulated rooms is the heuristic flag in scenario label.
