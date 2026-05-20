# Snapshot Dedup Audit · 2026-05-20

**Source:** `services/costar/MASTER/snapshot.json` (530 hotels post Phase D + previous CoStar ingest)
**Method:** 3-axis fuzzy match — (postal_code + normalized name prefix) · (postal_code + address prefix) · (name-only cross-postal)
**Result:** **498 unique hotels confirmed** · 9 duplicate groups (18 hotels) requiring consolidation · 32 hotels flagged for operator review.

---

## 1 · Confirmed duplicate groups (9 pairs · 18 hotels)

Each pair represents the same physical property ingested twice under slightly different names. The "linked" row carries `canonical_id_supabase` (richer Supabase canonical data); the "not-linked" row is the older Booking-truncated name that was never re-superseded.

| # | Postal | Long name (KEEP · linked) | Short name (DROP · not linked) |
|---|---|---|---|
| 1 | 28001 | `BLESS Hotel Madrid - The Leading Hotels of the World` (`h_cfec0fa7…`) | `BLESS Hotel Madrid` (`h_180f6fcd…`) |
| 2 | 28007 | `Crowne Plaza Madrid - Centre Retiro by IHG` (`h_97f2579a…`) | `Crowne Plaza Madrid - Centre Retiro` (`h_2fc31b41…`) |
| 3 | 28013 | `Hotel Madrid Plaza España, Affiliated by Meliá` (`h_2e769b93…`) | `Hotel Madrid Plaza España Affiliated by Meliá` (`h_0b061e2a…`) |
| 4 | 28001 | `Hotel Único Madrid, Small Luxury Hotels` (`h_01cc7597…`) | `Hotel Unico Madrid` (`h_18ef8ab3…`) |
| 5 | 28014 | `Mandarin Oriental Ritz, Madrid` (`h_da959d1a…`) | `Mandarin Oriental Ritz Madrid` (`h_300adfec…`) |
| 6 | 28010 | `Santo Mauro, a Luxury Collection Hotel, Madrid` (`h_2e70a55f…`) | `Santo Mauro, a Luxury Collection Hotel, Madri` (truncated · `h_421c531c…`) |
| 7 | 28013 | `Vincci Vía - 66` (`h_304bc454…`) | `Vincci Via 66` (`h_96c6664d…`) |
| 8 | 28020 | `Érase un Hotel` (`h_890f51f3…`) | `Erase un Hotel` (`h_26aea7ac…`) |
| 9 | 28001 / 28046 | `El Corte Inglés Hotel` postal 28001 (`h_69d0990b…`) | Same hotel_id under postal 28046 (`h_69d0990b…` · phantom dup from re-ingest) |

---

## 2 · NOT duplicates (siblings of the same brand · keep both)

These were flagged by the audit but are genuinely separate physical properties:

| Group | Members | Reason kept |
|---|---|---|
| SmartRental Gran Vía Capital vs SmartRental Gran Vía Centric (28013) | 2 | Two distinct properties same chain |
| Eric Vökel Boutique Apartments × 3 | 3 | Atocha Suites · Madrid Suites · Ribera Suites — 3 different addresses |
| Postal + address-prefix false positives (Hostal Esmeralda vs THC Bergantin · Hostal Biarritz vs Arc House · DormirDCine vs NH Príncipe de Vergara · Palacio Duques vs Nest Hotel · AC Génova vs NH Lequerica · CC Atocha vs abba Atocha) | 12 | Different hotels sharing a street prefix · false positives of fuzzy address match |

---

## 3 · Root cause

Two ingest passes against `services/costar/HOTELESperMARKET/INPUT/`:
1. **Previous CoStar+Booking enrichment ingest** (commit `9cb e9b` · "populate institutional XLSX masters + Booking merge") — generated rows with Booking-canonical short names.
2. **Phase D Supabase canonical re-ingest** (this workstream) — generated rows with Supabase canonical long names (which often carry the institutional suffix "- The Leading Hotels of the World" etc.).

The synthetic `hotel_id` is `sha256(country | market | name)`, so different name strings produce different IDs → both rows survive instead of one superseding the other.

---

## 4 · Resolution plan

### 4.1 · Immediate (no ingest run needed)

Mark the 9 short-name duplicate rows in the snapshot as `_meta.deduplicated_into = <linked_long_name_id>` and filter them out of the admin Search hotels view + the institutional master xlsx.

### 4.2 · Persistent (next ingest run)

Extend `services/costar/scripts/ingest.py` → `ingest_hotels` with a post-pass that:
1. Groups by `(postal_code, soundex(stopword_strip(name)))`.
2. Within each group, chooses the row with `canonical_id_supabase` populated (preferred) OR the row with the longer name (institutional canonical).
3. Marks the others as `deduplicated_into` so they're filtered from downstream consumers but kept for audit.

### 4.3 · Manual operator review (drawer + correction queue)

For each of the 9 dup pairs above, the operator can verify which row is canonical in the admin detail page and use the direct-edit drawer or the correction queue to consolidate.

---

## 5 · Concrete fixes already applied (BLESS case study · 2026-05-20)

For BLESS Hotel Madrid · the user-reported case:

| Step | Before | After |
|---|---|---|
| `brand` | "Bless" (lowercase variant) | **"BLESS"** (canonical uppercase) |
| `brand_family` | NULL | **"Palladium Hotel Group"** |
| `operator_id` | NULL | **`5c29d98a-f6ff-4371-946a-c68c24432116`** (Palladium operator row) |
| `chain_scale` | (unknown) | **`luxury`** (it's a Leading Hotels of the World property) |
| `operator_type` | "unknown" | **"managed"** (defensible default for Palladium-managed) |

Plus `apps/web/src/lib/enrichment/registries/brands.ts` extended with 3 new Palladium brand entries:
- `bless` (BLESS · Palladium · luxury)
- `ushuaia` (Ushuaïa · Palladium · upper_upscale)
- `tres-h` (TRS Hotels · Palladium · upper_upscale)

So that future Booking enrichment passes auto-link these brands to the Palladium operator.

---

## 6 · 498 hotels confirmed unique (likely-clean baseline)

Of the 530 snapshot hotels:
- 18 in 9 duplicate groups → consolidation needed (see §1)
- 14 in 6 false-positive groups → keep all (see §2 · siblings or address-coincidence)
- **498 unique hotels** as the institutional baseline

After resolving §1, the corpus drops to **521 unique hotels** (530 − 9 dup short-names that should be retired).
