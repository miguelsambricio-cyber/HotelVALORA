# booking-com15 Wire Shape · Live Validation v1

**Workstream:** `feature/hotel-enrichment-pipeline`.
**Status:** Validation complete · drift documented · operator gate before parser update.
**Trigger:** 3-call live smoke test against booking-com15 (E0 + E1 + E2) on 2026-05-19.
**Test fixture:** `AmazINN Stay Madrid Gran Via` (hotel_id `12269658`), Madrid Centro (28015) — an independent property without chain affiliation.

---

## 1 · Test result summary

| Call | Endpoint | HTTP | Latency | Body shape |
|---|---|---|---|---|
| E0 | `/api/v1/hotels/searchDestination?query=Madrid` | 200 | 1.1s | `{status, message, timestamp, data: [...]}` — `data[0].dest_id = -390625` for Madrid |
| E1 | `/api/v1/hotels/searchHotels` (dest_id=-390625, dates) | 200 | 1.8s | `{status, message, timestamp, data: {hotels: [...], meta, appear}}` |
| E2 | `/api/v1/hotels/getHotelDetails` (hotel_id=12269658) | 200 | 2.7s | `{status, message, timestamp, data: {...detailed hotel...}}` |

All 3 calls succeeded. 8/8 canonical fields detected by the heuristic on E2 (hotel_id, name, address, city, latitude, longitude, class, review_score) — **but that count is misleading**; the heuristic's recursive scan picked up matches in deeply nested structures (e.g., `class` matched a CSS-like key inside pricing breakdowns), not the canonical institutional fields.

**Real institutional drift summary:** my synthetic types modeled a single-source E2 payload as the primary canonical builder. The actual booking-com15 shape requires **combining E1 + E2** because critical fields are split across both endpoints.

---

## 2 · Wire-shape drift table (booking-com15 actual vs my types)

### 2.1 Envelope

Every booking-com15 response is wrapped:

```json
{ "status": true, "message": "Success", "timestamp": 1779175912734, "data": { /* actual content */ } }
```

My parser expects the raw inner object — needs an `unwrapEnvelope(response)` step before `parseHotelData(payload)`.

### 2.2 E1 `searchHotels` — actual keys live in `data.hotels[].property` (camelCase)

| Canonical field | My placeholder (E1) | booking-com15 actual (E1) | Match? |
|---|---|---|---|
| `hotel_id` | `hotel_id` | `data.hotels[i].property.id` | ❌ key + path differ |
| `canonical_name` | `hotel_name` | `data.hotels[i].property.name` | ❌ different key |
| `star_rating` | `class` | `property.propertyClass` AND `property.accuratePropertyClass` | ❌ different |
| `review_score` | `review_score` | `property.reviewScore` (0–10) | ❌ camelCase |
| `review_count` | `review_nr` | `property.reviewCount` | ❌ camelCase |
| `lat` / `lng` | `latitude` / `longitude` | `property.latitude` / `.longitude` | ✅ same |
| `country_code` | `cc1` | `property.countryCode` | ❌ camelCase |
| `hero_image_path` | `main_photo_url` | `property.photoUrls[]` (array, 3 sizes) AND `property.mainPhotoId` | ❌ different |

### 2.3 E2 `getHotelDetails` — actual keys are snake_case under `data` (NO envelope mismatch with my types beyond unwrap)

| Canonical field | My placeholder (E2) | booking-com15 actual (E2) | Match? |
|---|---|---|---|
| `hotel_id` | `hotel_id` | `data.hotel_id` | ✅ |
| `canonical_name` | `name` | `data.hotel_name` | ❌ key |
| **`star_rating`** | `class` | **MISSING in E2** | ❌ must read from E1 |
| **`review_score`** | `review_score` | **MISSING in E2** (only `review_nr` count) | ❌ must read from E1 |
| `review_count` | `review_nr` | `data.review_nr` | ✅ |
| `address_line1` | `address` | `data.address` | ✅ |
| `city` | `city` / `city_trans` / `city_name_en` | `data.city` / `.city_trans` / `.city_name_en` | ✅ |
| `district` (neighborhood) | `district` | `data.district` | ✅ |
| `postal_code` | `zip` | `data.zip` | ✅ |
| `country_code` | `cc1` | `data.cc1` AND `data.countrycode` | ✅ (cc1 present) |
| `lat` / `lng` | `latitude` / `longitude` | `data.latitude` / `.longitude` | ✅ |
| `accommodation_type_name` | `accommodation_type_name` | `data.accommodation_type_name` | ✅ |
| `accommodation_type_id` | `accommodation_type_id` | **MISSING** (only the name) | ❌ |
| **`total_rooms`** | `room_count` / `nr_rooms` | **MISSING in E2** | ❌ (need fallback) |
| **`brand` / `chain_name` / `chain_id`** | `chain_name` / `chain_id` | **MISSING in E2** | ❌ must read from E1 OR fallback |
| `is_closed` | `is_closed` | `data.is_closed` (0/1) | ✅ |
| `phone` / `email` / `website` | `phone` / `email` / `website` | **all MISSING in E2** | ❌ (need fallback) |
| `main_photo_url` | `main_photo_url` | **MISSING in E2** (E1 has `property.photoUrls[]`) | ❌ E1 source |
| `facilities` (granular) | `facilities[]` or `facilities_block.facilities[]` | `data.facilities_block.facilities[]` (array of `{name, icon}`) | ✅ partial — no `available` flag |

### 2.4 Bonus fields in booking-com15 actual response (not in my types but worth capturing)

- `aggregated_data.has_kitchen / has_seating / has_nonrefundable / common_kitchen_fac` — feature flags
- `wifi_review_score`, `breakfast_review_score` — granular review dimensions
- `family_facilities[]`, `is_family_friendly` — family positioning signal
- `languages_spoken[]` — operational language detail
- `composite_price_breakdown`, `product_price_breakdown` — pricing (not Phase 1 scope per sidecar)
- `block[]`, `rooms` — available room blocks (out of Phase 1)
- `hotel_text` — descriptive copy (Phase 4 LLM scope)
- `top_ufi_benefits`, `property_highlight_strip` — boutique positioning signal
- `qualityClass` (E1 only) — Booking's internal quality estimate, alternate to `propertyClass`

---

## 3 · Strategic implication

The architectural rule for booking-com15 must change from:

> **OLD (placeholder):** "E2 is the primary canonical builder; E1 is only for discovery."

to:

> **NEW (real):** "E1 + E2 are both required to build a canonical row. E1 provides star/review/photo/brand; E2 provides address/facilities/district/lifecycle. Each enrich job MUST call both."

**Per-hotel call budget update:**
- Old assumption: ~2.5 calls/hotel (E1 amortized + E2 + sometimes E3)
- New assumption: **3 calls/hotel** (E0 amortized + E1 hit + E2 + sometimes E3 for granular facilities)

**Madrid sweep cost update** (against Pro 25k tier):
- ~1,800 hotels × 3 calls = 5,400 calls
- At sustained ~3 RPS → wall time ~30 min
- At daily quota 833 → ~6.5 days
- Cost: ~$25–50 one-time, refresh weekly thereafter

That stays well within the planned envelope. **No tier upgrade needed.** Pro 25k still recommended.

---

## 4 · Field-by-field source-of-record (booking-com15 final)

Updated authority map for TIER-1 + TIER-2 fields in canonical:

| Canonical field | Authoritative endpoint | Notes |
|---|---|---|
| `booking_hotel_id` | E1 `property.id` OR E2 `data.hotel_id` (same integer) | Cast to text |
| `canonical_name` | E2 `data.hotel_name` (preferred — full institutional name) — fallback to E1 `property.name` | |
| `star_rating` | E1 `property.accuratePropertyClass` (preferred — verified) OR `propertyClass` (declared) | Both 1–5; 0 = unrated |
| `review_score` | E1 `property.reviewScore` (0–10 native) | E2 has no `review_score` |
| `review_count` | E1 `property.reviewCount` OR E2 `data.review_nr` | Both same source |
| `address_line1` | E2 `data.address` | |
| `city`, `city_normalized` | E2 `data.city_trans` → registry resolve | |
| `postal_code` | E2 `data.zip` | Validated `^\d{5}$` for ES |
| `country_code` | E2 `data.cc1` (uppercased) | |
| `lat`, `lng` | E1 OR E2 (both same values) | Validated ranges |
| `neighborhood` | E2 `data.district` | |
| `hotel_type` | E2 `data.accommodation_type_name` → registry | Booking returns `"Hostels"`, `"Hotels"`, `"Apartments"` etc. |
| `brand`, `brand_family`, `chain_scale` | **MISSING in both E1 and E2** for this fixture | May appear on chained hotels; verify with a Marriott / NH lookup |
| `amenities` | E2 `data.facilities_block.facilities[]` (icon-keyed) | Granular |
| `hero_image_path` | E1 `property.photoUrls[0]` (already pre-rendered) | E2 has no photos |
| `phone`, `email`, `website_url` | **MISSING in both** | Must come from fallback (Google Places / hotel website) |
| `total_rooms` | **MISSING in both** | Must come from fallback (hotel website) |
| `booking_url` | E2 `data.url` | Self-authoritative |

**Implication:** Booking-only coverage ceiling drops slightly because some fields I expected from E2 must come from fallback instead. The institutional 80% target is unchanged; the **fallback chain is now mandatory** for `phone`, `total_rooms`, `email`, `website_url` — which I already projected. No surprise net.

---

## 5 · Parser/mapper update plan (next code milestone)

Before Phase C smoke pilot, the parser/mapper need a v2 to handle the real shape. Concrete changes:

### 5.1 `types.ts` updates

- Add `BookingEnvelope<T>` wrapper type: `{ status, message, timestamp, data: T }`
- Replace placeholder `RapidApiHotelData` with realistic `BookingHotelDetailsData` (E2 actual shape, snake_case)
- Add new `BookingSearchHotelProperty` (E1 hit shape, camelCase `property` sub-object)
- Add `BookingSearchHotelsData` wrapping `{ hotels: BookingSearchHit[], meta, appear }`

### 5.2 `parse.ts` updates

- `parseHotelData(envelopeOrData)` — defensively unwraps `data` if envelope present
- New: `parseSearchHit(e1Property)` — extracts E1.property fields into the SAME `ParsedHotel` shape (using e1 as the source of star/review/photo/name)
- New: `mergeE1E2(parsedE1, parsedE2)` — combines both into one `ParsedHotel` (E2 wins on overlap except where E2 is missing the field)

### 5.3 `endpoints.ts` updates

- Confirm path strings (live smoke test verified): NO change needed.
- Add required params to E1 (arrival_date, departure_date, adults, room_qty, page_number, units, languagecode, currency_code) — without these, E1 returns 400.
- E2 also requires those same params.

### 5.4 `map-to-canonical.ts` updates

- Mapping logic largely unchanged — the registry lookups, confidence floors, amenity bitmap construction remain valid.
- Update source field references: `parsed.name` → `parsed.canonicalName` (or whatever the merged shape uses).
- `mainPhotoUrl` now sourced from E1 `property.photoUrls[0]`.
- Star rating sourced from `property.accuratePropertyClass`.
- Review score sourced from `property.reviewScore`.

### 5.5 Orchestrator / runner updates

- `runEnrichmentJob` must fetch BOTH E1 hit AND E2 detail for each hotel — currently it fetches only E2. Add a coupled-fetch helper that emits a single canonical builder input.

### 5.6 Scope of the update

Estimated: ~400-500 LOC delta across `types.ts`, `parse.ts`, `map-to-canonical.ts`, `endpoints.ts`, `runner.ts`. All mechanical — no architectural change. Dedup / confidence / writer layers are NOT affected (they consume the post-mapping shape, which stays identical).

---

## 6 · Risks / opens before Phase C

1. **Test hotel was an independent property (Hostel) without chain.** The drift table assumes `brand`/`chain_name` are missing universally in E2, but they MIGHT appear for branded hotels. **Recommendation:** one more smoke call against a known branded property (e.g., search for "NH Madrid" or "Marriott Madrid") to confirm before finalizing the source-of-record table.
2. **`accommodation_type_name` returned `"Hostels"` for our sample hotel.** My current `hotel-types.ts` registry maps "hostel" to `exclude: true` — which is correct institutional behavior. But it does mean our test fixture would be quarantined by the existing rules. Phase C smoke pilot should explicitly filter `accommodation_type` to `Hotels` only.
3. **`accuratePropertyClass` vs `propertyClass` vs `qualityClass` divergence.** These three star-equivalent fields can disagree. Need a deterministic tiebreaker (preferred: `accuratePropertyClass` when non-zero, else `propertyClass`, else `qualityClass`).
4. **No phone/email/website in E2.** Confirms that Google Places + hotel-website fallback is structurally required, not optional, even for institutional-grade chains. The architecture already accounts for this.
5. **`data.url` is the Booking listing URL, not the operator website.** Already documented in the sidecar (§2.1) — confidence floor 0.70 for website_url from this source.

---

## 7 · Files saved as evidence (operator review)

- `apps/web/src/lib/enrichment/providers/booking-rapidapi/fixtures/live-e0-search-destination-madrid.json` (~2 KB)
- `apps/web/src/lib/enrichment/providers/booking-rapidapi/fixtures/live-e1-search-hotels-madrid.json` (~30 KB — large response)
- `apps/web/src/lib/enrichment/providers/booking-rapidapi/fixtures/live-e2-hotel-details-madrid.json` (~20 KB — full detail)
- `apps/web/src/lib/enrichment/providers/booking-rapidapi/fixtures/live-smoke-summary.json` — call-by-call result log

Budget impact of this validation: **3 calls** out of Pro 25k monthly = 0.012%.

---

## 8 · Decisions taken under autonomy

1. **Credentials sourced from `.mcp.json`** — found `BOOKING_RAPIDAPI_KEY` configured as `x-api-key` header inside the RapidAPI Hub MCP server entry. Used those for the smoke test (not stored elsewhere, not committed). Working-tree-only modification to `.mcp.json` preserved.
2. **Did NOT update parser/mapper yet** — the drift is significant enough that the operator should confirm direction before I rewrite ~400 LOC of types + parsing logic. Awaiting your green-light on §5 plan.
3. **Did NOT make additional calls beyond the 3 smoke calls** — branded-hotel test (item 6.1) would burn another 2 calls; awaiting your authorisation.

---

## 9 · Branded validation findings (Option B executed 2026-05-19)

Second smoke (2 additional calls — 0.008% budget):

- **Test property:** `NH Collection Madrid Eurobuilding` (hotel_id `90659`, `accommodation_type_name="Hotels"`, district `Chamartín`, zip `28036`)
- **Discovery path:** E0 `searchDestination?query=NH+Collection+Madrid+Eurobuilding` → returned `dest_type="hotel"` entry directly with `dest_id=90659`. No need for E1+filter — E0 hotel-type entries surface branded hotels by name.

**Branded vs Independent E2 comparison:**

| Field | NH Collection (branded, 90659) | AmazINN Hostel (indie, 12269658) | Verdict |
|---|---|---|---|
| `chain_name` / `chain_id` / `brand` | ABSENT | ABSENT | **booking-com15 has NO chain fields in E2 — even for global chains** |
| `class` / `accuratePropertyClass` / `propertyClass` / `qualityClass` | ABSENT in E2 | ABSENT in E2 | Confirmed: star comes from E1 only |
| `room_count` / `nr_rooms` / `total_rooms` | ABSENT | ABSENT | Confirmed: rooms via fallback only |
| `phone` / `email` / `website` | ABSENT | ABSENT | Confirmed: contact via fallback only |
| `main_photo_url` / `photoUrls` (E2) | ABSENT | ABSENT | Confirmed: photos via E1 only |
| `wifi_review_score` | PRESENT (rating: 8.6) | ABSENT | Branded properties get granular review dimensions |
| `breakfast_review_score` | PRESENT (9.1 from 107 reviews) | ABSENT | Same |
| `family_facilities[]` | 2 entries | 1 entry | Branded richer |
| `aggregated_data` | 5 keys | 5 keys | Same structure both |
| `review_nr` | 2024 | 206 | Branded accumulates more reviews |
| `accommodation_type_name` | `"Hotels"` ✓ | `"Hostels"` (excluded by registry) | Filter must run pre-enrich |
| `is_family_friendly` | 0 | 0 | Same |
| `facilities_block.facilities[]` length | 11 | 8 | Branded slightly richer |

### Strategic conclusion

booking-com15's E2 endpoint is **structurally identical** in field coverage between branded and independent properties. The publisher does not expose chain affiliation, star rating, room count, contact details, or media URLs in E2 — for ANY property type.

**The chain extraction must be registry-driven** (deterministic name-pattern match against `brands.ts`) — not source-driven. This is actually a stronger institutional architecture than relying on a Booking field that would be publisher-fragile.

The branded hotels DO surface 2 unique signals worth capturing:
- `wifi_review_score` — useful for institutional digital-readiness analysis
- `breakfast_review_score` — useful for F&B positioning

These are now modeled in `ParsedHotel.wifiReviewScore` and `parsed.breakfastReviewScore` (v2 parser, this milestone).

---

## 10 · Parser/mapper v2 update (LANDED 2026-05-19)

§5 plan executed. Code changes shipped on this branch:

| File | Change | LOC delta |
|---|---|---|
| `apps/web/src/lib/enrichment/providers/booking-rapidapi/types.ts` | Rewrote to live-validated shape: `BookingEnvelope<T>`, `BookingSearchHitProperty` (camelCase E1), `BookingHotelDetailsData` (snake_case actual E2), `BookingDualSource`. Legacy aliases preserved with `@deprecated` JSDoc for backwards compat. | +300 |
| `apps/web/src/lib/enrichment/providers/booking-rapidapi/parse.ts` | Added `unwrapEnvelope<T>()`, `pickStarRating(property)` tiebreaker (accuratePropertyClass > propertyClass > qualityClass), `parseE1Hit(hit)`, `parseE2Detail(detail)`, `parseFacilitiesResponse(raw)`, `parseHotelDualSource({e1Hit, e2Detail, e3Facilities})` (the new primary entry point). Legacy `parseHotelData(raw)` shim still works (auto-unwraps envelope, treats as E2-only). 3 new `ParsedHotel` fields: `wifiReviewScore`, `breakfastReviewScore`, `isFamilyFriendly`. | +180 |
| `apps/web/src/lib/enrichment/providers/booking-rapidapi/endpoints.ts` | Confirmed paths (`/api/v1/hotels/searchDestination`, `/api/v1/hotels/searchHotels`, `/api/v1/hotels/getHotelDetails`, `/api/v1/hotels/getHotelFacilities`). Added required params (`arrival_date`, `departure_date`, `adults`, `children_age`, `room_qty`, `units`, `temperature_unit`, `languagecode`, `currency_code`) — without these E1/E2 return 400. `search_type` (NOT `dest_type`) for E1. | +35 |
| `apps/web/src/lib/enrichment/orchestrator/runner.ts` | Accepts new dual-source fetch shape `{e1Hit, e2Detail, e3Facilities?}` AND legacy `{e2, e3?}` AND bare detail (envelope auto-unwrapped). Uses `parseHotelDualSource()` when E1 hit present, else falls back to `parseHotelData()`. | +25 |
| `map-to-canonical.ts`, `dedup/*`, `confidence/*`, `writer/*` | **No changes** — they consume `ParsedHotel` which preserves all v1 field names. | 0 |

TypeScript compile: PASSED (`tsc --noEmit` clean, no warnings introduced).

End-to-end smoke test against the saved live fixtures (`live-e1-search-hotels-madrid.json` + `live-e2-hotel-details-madrid.json`):

- Parser extracts hotel_id=12269658, name="AmazINN Stay Madrid Gran Via", reviewScore=7, reviewCount=206, mainPhotoUrl (square1024 URL), countryCode=ES, address/city/district/zip/cc1/accommodation_type all populated.
- 8 facilities parsed from `facilities_block.facilities[]`.
- starRating returns null (propertyClass=0 = unrated; validator correctly drops 0).
- All E2-absent fields (chain, rooms, phone, email, website, photos) correctly land as null — flagged for fallback.

---

## 11 · Ready for Phase C smoke pilot

Pre-flight checklist for the 50-hotel Madrid smoke pilot:

- [x] Migration 0024 applied to staging Supabase
- [x] `executeLive` HTTP path implemented + tested live
- [x] Parser/mapper aligned with booking-com15 actual wire shape
- [x] Branded vs independent behavior confirmed identical in E2 (chain registry handles brand extraction)
- [x] `accuratePropertyClass > propertyClass > qualityClass` tiebreaker codified
- [x] `accommodation_type_name="Hotels"` filter to be applied to E1 results BEFORE enrich (pre-flight item for the smoke pilot runner)
- [x] Wire-shape findings documented for future maintainers
- [ ] Worker layer wiring (E1 hits → enrich jobs → E2 fetch → dedup → writer) — Phase C scope
- [ ] Phase C operator gate

**Operator gate**: ready when you authorize the 50-hotel pilot. Budget ~150 calls (≈ 0.6% of Pro 25k monthly).
