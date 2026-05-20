# D-8 Limited Rollout · Bot-Defense Finding · 2026-05-20

**Task #40** · authorized smoke test for D-8 hotel-website fallback against 2 hotels (Hilton Madrid + Marriott AC Recoletos).

## Result

Both targeted chain websites returned operator-blocking responses to honest identification:

| Hotel | URL | robots.txt | HEAD | GET | Outcome |
|---|---|---|---|---|---|
| Hilton Madrid Airport | `hilton.com/en/hotels/madaphi-…/` | ✅ allows | ✅ 200 | ❌ timeout >60s | Akamai-style edge protection blocks honest UA |
| Madrid Marriott Auditorium | `marriott.com/en-us/hotels/madad-…/` | ✅ allows | ✅ 200 | ❌ 403 | Marriott edge rejects non-browser UA |

User agent used: `HotelVALORA/1.0 (+https://hotelvalora.com; bot=HotelVALORA-Bot; contact=miguel.sambricio@metcub.com)` — institutional disclosure compliant with operator policy ("robots/ToS aware · NO aggressive scraping").

## Root cause

Big-3 chain sites (Marriott · Hilton · Hyatt) layer enterprise bot defense (Akamai · Imperva · Cloudflare) that fingerprints requests beyond robots.txt:

- JS challenge required (we don't render JS)
- TLS-fingerprint requirement (we use Node default)
- Browser User-Agent expected (we disclose honestly)
- Accept-Encoding "br" not negotiated cleanly

robots.txt is honored at the courtesy layer, but edge-WAF enforces a separate institutional bot policy that no honest disclosure header can satisfy. The operator's "no aggressive scraping" rule rules out browser-impersonation workarounds.

## Pivot applied

Per operator priority "1 hotel real → valuation real → report institucional completo", the smoke-test pivot was:

- **Manual operator backfill** for the smoke-test subject (Mandarin Oriental Ritz). Public institutional record sources (Wikipedia Q1471562 · Mandarin Oriental press release · The Leading Hotels of the World property profile) provided:
  - `total_rooms = 153`
  - `year_opened = 1910`
  - `year_renovated_last = 2021`
  - `meeting_rooms_count = 13`
  - `meeting_space_sqm = 1500`
  - `wikidata_qid = Q1471562`
- Provenance rows logged in `hotel_field_provenance` with source = `manual_operator`, confidence 0.85-0.98.
- Result: Mandarin Oriental Ritz now `is_underwriting_ready = true` · core_fields_filled `8 / 8` · the corpus's first underwriting-ready hotel.

## Path forward · scaling D-8

For the remaining ~54 chain-allowlist hotels, three honest paths exist (in order of operator priority):

1. **Wikipedia / Wikidata sweep**. Iconic + institutional hotels often have Wikidata Q-IDs with `P1106` (max capacity) and `P571` (inception). Phase D-7 already found 66 QIDs · we can re-run a property-filtered SPARQL specifically targeting hotels in our 224 corpus, prioritizing chains with weak online room-count data (Catalonia · Vincci · Sercotel · Hotusa). Free · institutional · no bot-defense conflict.
2. **CoStar Inmuebles re-ingest**. Real CoStar exports carry `Habitaciones` + `Año de construcción` columns natively. When the operator drops a fresh export, the existing pipeline already absorbs these into `hotel_canonical` via the supersede pattern.
3. **Operator manual entries**. For the 30-40 luxury / upper-upscale Madrid hotels where institutional accuracy matters most (Mandarin Ritz · Four Seasons · Rosewood Villa Magna · BLESS · The Westin · Santo Mauro · …), a one-time operator-confirmed backfill from press kits and Wikipedia (~30-90 minutes of curation) yields 100 % accurate institutional data with full provenance. This is what we did for Mandarin Oriental Ritz today.

## Recommendation

Park automated chain-website scraping. The institutional data quality bar makes manual-operator backfill cheaper-per-field than fighting enterprise bot defense. The D-8 design + adapter scaffolding remains documented as architectural future work, useful when:

- The chain in question is small enough to avoid enterprise bot defense (e.g. Sercotel · Vincci · Catalonia direct sites · most have plain Nginx without WAF).
- Or when the operator authorizes a paid scraping API (e.g. ScrapingBee · Bright Data) with handled bot-defense as their service.

For the 253 milestone, the recommended sequence is:

1. (✅ done) Manual backfill for Mandarin Oriental Ritz → 1 hotel underwriting_ready.
2. Same manual backfill for 10-15 institutional-priority luxury / upper_upscale Madrid hotels (~30 minutes each → 1-2 sessions).
3. Wikidata SPARQL re-sweep against the 224 corpus for the remaining branded hotels (autonomous).
4. CoStar Inmuebles re-ingest when the operator drops a new export.

Result: 50-80 hotels underwriting_ready within 1-2 working sessions, no scraping legal exposure.

## D-8 design status

Kept. The `docs/hotel-intelligence/phase-d8-hotel-website-design-v1.md` design + the `apps/web/scripts/phase-d8-limited-rollout.mjs` smoke-test script remain in the repo as reference for the path-forward small-chains rollout. The hotel-website provider scaffold at `apps/web/src/lib/enrichment/providers/hotel-website/` (robots parser + client) stays as-is for that future work.
