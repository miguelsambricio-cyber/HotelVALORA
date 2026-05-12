# CONTACTOS DATASITE · institutional relationship intelligence

This folder is the canonical institutional source of every contact in
HotelVALORA's Datasite-driven CRM layer. It is the foundation for:

- outreach intelligence
- institutional graph (investor / operator / lender / broker / family office network)
- deal sourcing
- underwriting relationship lookups
- investor mapping
- the future CRM layer of HotelVALORA

The Master sheet is the canonical truth. Every downstream consumer joins
against `master_id` (synthetic stable id) or `email` (primary natural key).

---

## Folder layout

```
CONTACTOS DATASITE/
├── README.md              ← this file (safe to commit)
├── incoming/              ← drop NEW Datasite Outreach exports here
├── old/                   ← processed exports archived here (with batch_id suffix on collision)
├── master/                ← canonical institutional output
│   └── metcub-contacts-master.xlsx
└── reports/               ← per-batch audit artifacts
    ├── ingestion-log.jsonl                   (append-only)
    ├── duplicate-resolution_<batch_id>.csv   (per-row dedup decisions)
    ├── schema-mapping_<batch_id>.csv         (column → canonical mapping)
    └── invalid-missing_<batch_id>.csv        (rows skipped + why)
```

Everything except this README is `.gitignore`'d. Datasite exports contain
emails, phone numbers, LinkedIn URLs, internal notes, bid history, and
declined-buyer comments — none of it is committed to git.

---

## Workflow · daily / weekly operator use

### 1. Drop a new Datasite export

Datasite Outreach → Full Report → exports a `.xlsm` with sheets:
**Cover · RaceLong · RaceShort · Marketing Update · Declined · Activities ·
Companies · Contacts · Project · Scratch**

The pipeline reads three of these: `Contacts`, `Companies`, `Activities`.
Save the file as-is (don't rename) to:

```
CONTACTOS DATASITE/incoming/
```

### 2. Run the ingester

From the repo root:

```bash
python scripts/contactos/ingest.py
```

Per-file lifecycle:

1. **Parse** → load workbook · read Contacts / Companies / Activities sheets
2. **Clean + normalise** → encoding · whitespace · email (lowercase) · phone (digits-only) · LinkedIn (strip protocol/www)
3. **Map columns** → source headers → canonical schema (see `MASTER_SCHEMA` in `scripts/contactos/ingest.py`)
4. **Enrich** → LEFT JOIN Contacts ⨝ Companies ⨝ Activities on `company` (normalised). Each person row gets investor type · continent · fund size · latest deal stage · pipeline state · bid values · etc.
5. **Deduplicate** against the existing Master, priority order:
   1. exact email
   2. LinkedIn URL
   3. full name + company (exact, case-insensitive)
   4. fuzzy fallback (Levenshtein ≥ 0.88 on full_name within same company)
6. **Merge** when a match is found:
   - Latest non-empty value wins for state fields (role, title, deal stage, etc.)
   - Notes are concatenated (dedup substrings)
   - `first_seen_batch_id` is preserved (provenance never lost)
   - `last_seen_batch_id` + `last_updated_at` advance
   - `source_file` advances to most recent ingest
7. **Report** → four files written to `reports/` (see "Audit trail" below)
8. **Move** → source `.xlsm` shifts from `incoming/` → `old/`. If a same-named file already exists in `old/`, the new one gets a `.<batch_id>` suffix.

Idempotent: empty `incoming/` directory just regenerates the Summary
sheet against the existing Master and exits.

### 3. Open the result

```
CONTACTOS DATASITE/master/metcub-contacts-master.xlsx
```

Five sheets:

| Sheet | Rows | Purpose |
|---|---|---|
| **Master** | per-person enriched | canonical institutional relationship layer · JOIN-ready |
| **Contacts** | per-person raw | normalised copy of every person record · preserves source-level granularity |
| **Companies** | per-entity | canonical company table with `investor_type_canonical` |
| **Activities** | per-company timeline | deal stage timestamps · NDA/IOI/LOI/bids/declined |
| **Summary** | dashboard | totals · pipeline distribution · investor breakdown · seniority · top active investors |

---

## Re-classification without re-ingesting

When the canonical mapping rules change (new investor type, new
hospitality keyword, new seniority pattern), regenerate the Master
without dropping any new file:

```bash
python scripts/contactos/ingest.py --reclassify
```

This loads the existing Master, re-runs the canonical classifiers
(`investor_type`, `hotel_focus`, `seniority`) against the raw values
preserved in the Companies sheet, and rewrites the workbook. Notes,
provenance, deal state, and ingestion lineage are untouched.

---

## Canonical investor-type taxonomy

Datasite uses a free-text "Type of Investor" field in Spanish + English.
We canonicalise to this stable institutional taxonomy:

```
REIT/SOCIMI           Family Office       Sovereign Wealth
Pension Fund          Insurance           Fund
Lender                Hotel Chain         Operator
Brand                 Owner               Broker
Advisor               Developer           Architect
Service Provider      F&B Operator        Media
Corporate             Institutional Investor   Investor
```

Order matters: more specific buckets (REIT/SOCIMI, Family Office) are
applied first so they don't get swallowed by a broader pattern.

The original raw Datasite value is preserved in `investor_type_raw` on
the Companies sheet · the canonical is at `investor_type` on Master.

Add a new bucket by editing `INVESTOR_TYPE_CANON` in
`scripts/contactos/ingest.py` and re-running `--reclassify`.

---

## Hotel focus heuristic

`hotel_focus` is a Yes / Likely / No / Unknown flag, computed from a
hospitality-keyword density check over `industry + description + notes +
association`. Keywords: hotel · hospitality · resort · hostel ·
aparthotel · short-stay · extended-stay · hotelero · RevPAR · ADR ·
GOPPAR · keys/rooms · llaves · habitaciones.

- **Yes** · 2+ keyword hits
- **Likely** · 1 keyword hit
- **No** · zero hits but content present
- **Unknown** · empty industry/description/notes

---

## Master schema (per-row · 47 fields)

See the `MASTER_SCHEMA` constant in `scripts/contactos/ingest.py` for
the authoritative column order. Categories:

- **Identity** · master_id (synthetic stable) · full_name · email · phone · linkedin · title · role · is_primary_contact
- **Company + investor frame** · company · investor_type (canonical) · investor_subtype (raw) · tier · industry · fund_size · investment_preference · investment_min/max · association · hotel_focus
- **Geography** · geography · city · state · country · continent
- **Deal state** · latest_deal_stage · last_activity_type · last_activity_date · buyer_added_date · pipeline_state · IOI bid low/high · LOI bid low/high · Revised bid low/high
- **Relationship** · relationship_status · relationship_manager · coverage_officer · calling_lead · notes_consolidated
- **Provenance + lineage** · datasite_contact_number · datasite_company_number · client_contact_id · client_company_id · source_file · first_seen_batch_id · last_seen_batch_id · last_updated_at

**Never re-order** existing columns — only append new ones at the end.
Downstream consumers position-bind in some cases.

---

## Audit trail

Every ingest emits four reports under `reports/`:

| File | Format | Lifecycle | Purpose |
|---|---|---|---|
| `ingestion-log.jsonl` | append-only JSONL | one line per ingest run | high-level summary · counts · timestamps |
| `duplicate-resolution_<batch_id>.csv` | per-batch CSV | new file per ingest | every dedup decision · INSERT / UPDATE / UNCHANGED · strategy (email_exact / linkedin_exact / name_company_exact / fuzzy) · score · fields changed |
| `schema-mapping_<batch_id>.csv` | per-batch CSV | new file per ingest | source-column → canonical-field mapping observed for this file · flags any unmapped columns Datasite added |
| `invalid-missing_<batch_id>.csv` | per-batch CSV | new file per ingest | rows skipped because they had no email AND no LinkedIn AND no full_name+company |

When a future Datasite export adds new columns:
- Check `schema-mapping_<batch_id>.csv` for `mapped: no` rows
- Decide whether the new column needs to be added to one of the canonical maps in `ingest.py` (`CONTACT_COL_MAP` / `COMPANY_COL_MAP` / `ACTIVITY_COL_MAP`)
- After updating, run `--reclassify` (or re-ingest the file from `old/` by moving it back to `incoming/`)

---

## Privacy

The folder is gitignored:

```
CONTACTOS DATASITE/incoming/
CONTACTOS DATASITE/old/
CONTACTOS DATASITE/master/
CONTACTOS DATASITE/reports/
CONTACTOS DATASITE/*.xlsx
CONTACTOS DATASITE/*.xlsm
CONTACTOS DATASITE/*.csv
```

Nothing under this tree leaves the local filesystem unless you
explicitly export and share it. The README and the ingester script
itself contain no PII.

---

## Cross-references

- Architecture doc · `docs/integrations/datasite-contacts.md` — how this layer fits into the wider HotelVALORA data graph (CompSet · transactions · intelligence · CRM)
- Ingester source · `scripts/contactos/ingest.py`
- gitignore rules · root `.gitignore` (search for "CONTACTOS DATASITE")
