# Integrations · Datasite Contacts (institutional relationship intelligence)

**Last refreshed:** 2026-05-12
**Status:** 🟢 Phase 2.C live · canonical Master promoted to Supabase (5 tables · 4,547 contacts · 2,990 companies · 2,990 interactions · 143 labels · 34 health rows) · operator console live at `/user/admin/contacts` · quality-first default filters · `promote_to_supabase.py` is idempotent and re-runnable

Datasite Outreach is the operator's deal-distribution platform. Its
Companies & Contacts and Buyer Tracking modules together hold the
canonical institutional relationship graph that powers HotelVALORA's
sourcing, underwriting, and outreach layers.

This integration is **export-driven** (not API-driven) because the
Datasite Claude MCP connector does not expose the Outreach CRM
endpoints. The operator drops a Full Report `.xlsm` export into
`CONTACTOS DATASITE/incoming/` and the ingester normalises, dedupes,
and merges into the canonical Master.

---

## 1 · Where this fits in the HotelVALORA data graph

```
                    ┌─────────────────────────────────────────────┐
                    │  DATASITE Outreach (external SaaS)          │
                    │  · Companies & Contacts                     │
                    │  · Buyer Tracking pipeline                  │
                    │  · Activities timeline                      │
                    └─────────────────┬───────────────────────────┘
                                      │ Full Report .xlsm export
                                      ▼
            ┌──────────────────────────────────────────────────────┐
            │  CONTACTOS DATASITE/incoming/   (operator drop zone) │
            └─────────────────┬────────────────────────────────────┘
                              │ python scripts/contactos/ingest.py
                              ▼
            ┌──────────────────────────────────────────────────────┐
            │  Ingester · parse · clean · normalise · join · dedupe │
            │  · classify (investor type · hotel focus · seniority) │
            └─────────────────┬────────────────────────────────────┘
                              ▼
            ┌──────────────────────────────────────────────────────┐
            │  CONTACTOS DATASITE/master/metcub-contacts-master    │
            │  + reports/                                          │
            │  + old/ (source archive)                             │
            └─────────────────┬────────────────────────────────────┘
                              ▼ (future)
            ┌──────────────────────────────────────────────────────┐
            │  Supabase · institutional contacts table (Phase 2.A) │
            │   → CompSet underwriting relationship lookup         │
            │   → Transaction enrichment (buyer/seller identity)   │
            │   → Outreach campaign deal sourcing                  │
            │   → Investor graph for hospitality intelligence       │
            └──────────────────────────────────────────────────────┘
```

The Master sheet is the **single canonical institutional dataset** for
person-level relationship data. It's the natural join target for:

- **Transactions ingestion** · match buyer/seller names → institutional master row → enrich the deal with investor type, fund size, prior bid history
- **CompSet underwriting** · when an asset competes with one of the institutional buyers in the dataset, surface their declined comments / latest bid range
- **Intelligence Engine** · when news articles mention institutional names (Blackstone, Brookfield, KKR, AXA, Allianz, etc.), join to the Master to derive contact-level outreach hooks
- **Future CRM layer** · the Master IS the institutional contact directory · the UI of any CRM feature reads from it

---

## 2 · Three architectural disciplines (shared with other ingesters)

The CONTACTOS DATASITE ingester mirrors the same architectural pattern
already used in HotelVALORA for transactions, CoStar warehouse, and the
hospitality intelligence pipeline:

| Discipline | How it shows up here |
|---|---|
| **Drop-zone workflow** | `incoming/` is the only operator interaction surface · drop the file and run · no UI · no flags · idempotent |
| **Provenance + lineage** | every Master row carries `source_file`, `first_seen_batch_id`, `last_seen_batch_id`, `last_updated_at` · history never lost |
| **Audit-grade reports** | every batch emits 3 CSVs + 1 JSONL line · dedup decisions are forensic-ready · schema changes are detected via the schema-mapping report |
| **Re-classifiability** | `--reclassify` rebuilds derived fields (investor type · hotel focus · seniority) when canonical rules change · no source re-ingest needed |
| **Append-only audit log** | `reports/ingestion-log.jsonl` grows forever · QA can replay history |
| **Encrypted/protected PII** | the whole folder is `.gitignore`'d except this doc and the operator README · nothing PII ever lands in git |

---

## 3 · Canonical institutional taxonomy

The classifier maps Datasite's free-text Spanish + English "Type of
Investor" + `Subtype` + Description fields to a stable canonical
taxonomy that reflects the hospitality investment universe:

| Canonical | Includes raw signal |
|---|---|
| REIT/SOCIMI | REIT, SOCIMI, inmobiliaria cotizada |
| Family Office | family office, FO, patrimonio familiar |
| Sovereign Wealth | sovereign, wealth fund, fondo soberano |
| Pension Fund | pension, pensiones |
| Insurance | insurance, asegurador, aseguradora |
| Fund | private equity, PE fund, venture capital, VC, fondo de inversión, investment fund |
| Lender | financiador, banco, prestamista, debt fund, mortgage, lender |
| Hotel Chain | cadena hotelera, cadenas hotel, hotel chain |
| Operator | operator, operador, gestor hotelero, management company |
| Brand | brand, marca, franchise, franchisor |
| Owner | propietario, owner |
| Broker | broker, intermediario, asesor inmobiliario, real estate advisor |
| Advisor | consultor, consultora, consultancy, advisory, asesoría |
| Developer | developer, promotor, desarrollador, promotora |
| Architect | architect, arquitecto, arquitectura |
| Service Provider | proveedor, provider, service provider, servicios |
| F&B Operator | F&B, food & beverage |
| Media | medios, media, press, prensa, periodista, publicación |
| Corporate | corporate, industrial |
| Institutional Investor | institutional, institucional |
| Investor | inversor, investor (general fallback) |

Distinct buckets are deliberate. **Hotel Chain ≠ Operator** (chains are
brand-affiliated networks; operators are management companies).
**Owner ≠ Investor** (owners hold equity in specific assets; investors
deploy capital across portfolios). Don't collapse these without an
explicit operator directive.

When Datasite invents a new label or imports a project with a new raw
type, the value falls through to the raw string (preserved verbatim).
The Summary sheet surfaces this as a non-canonical bucket so the
operator notices and decides whether to add a new canonical rule.

---

## 4 · Dedup priority + merge rules

Order applied when matching a new contact against the existing Master:

1. **exact email** (lowercase, mailto/whitespace stripped) — primary key
2. **LinkedIn URL** (protocol/www stripped, trailing slash trimmed)
3. **full_name (lowercase) + company_key (legal-suffix stripped, alphanumeric only)**
4. **fuzzy fallback** · Levenshtein ≥ 0.88 on full_name within same company_key

When a match is found:
- `master_id` is preserved (synthetic stable id, never re-keyed)
- `first_seen_batch_id` is preserved (lineage anchor)
- For every other field: **latest non-empty value wins** if it differs from the existing
- `notes_consolidated` is **concatenated** (dedup by lowercase substring, joined with ` | `)
- `last_seen_batch_id` + `last_updated_at` advance to current
- `source_file` updates to the most recent ingest filename

When no match is found:
- New row appended · `master_id` synthesised from the highest-priority discriminator present (email > LinkedIn > name+company hash)
- `first_seen_batch_id` = `last_seen_batch_id` = current batch

Every decision is logged to `reports/duplicate-resolution_<batch_id>.csv`
with the strategy used, the similarity score (for fuzzy), and the list
of fields that changed (for UPDATEs).

---

## 5 · Operational baseline (METCUB · 2026-05-12)

First production ingest · single Full Report (`20260512 - METCUB -
Full Report.xlsm` · 2.3MB · 4,828 contact rows · 3,000 company rows ·
3,000 activity rows).

**Master cardinality after dedup:** 4,547 contacts · 2,819 unique
companies (with at least one contact) · 2,990 company records · 2,990
activity timelines.

**Pipeline distribution:**

| Stage | Contacts |
|---|---|
| Teaser | 2,301 |
| Outreach | 1,176 |
| NDA | 729 |
| Investment Meetings | 267 |
| Warehouse | 52 |
| Bids | 22 |

**Top canonical investor types:**

| Type | Contacts |
|---|---|
| Investor (general) | 1,836 |
| Broker | 905 |
| Hotel Chain | 669 |
| Developer | 521 |
| Lender | 334 |
| Service Provider | 112 |
| Family Office | 59 |
| Operator | 40 |
| Owner | 17 |
| Media | 11 |

**Geography:** España 1,667 · USA 1,649 · Europa 1,190 · UK 15 · Portugal 11.

**Coverage:** 99.6% have email · 15% have phone · 0% have LinkedIn (Datasite export doesn't populate this field for this room).

**Top active institutional investors by Master contact count:** Colliers
(13) · BBVA (12) · Eastdil Secured (12) · Allianz Real Estate (11) ·
Anida-BBVA (11) · Morgan Stanley (11) · Credit Suisse (11) · AXA
Investment Managers (10) · Banca March (10) · Goldman Sachs (10) ·
Savills (10) · Deutsche Bank (9) · Wyndham Hotel Group (9) ·
Bankinter (8) · Carlyle (8).

---

## 6 · Forward roadmap

### Phase 2.A · Supabase relationship table (deferred)
Promote the Master sheet to a queryable Postgres table
(`relationship_contacts`) with proper indexes on email / LinkedIn /
company. Add columns for `master_id`, `investor_type`, `hotel_focus`,
`pipeline_state`, `last_activity_date`. The ingester gains a
`--push-to-db` flag that upserts after the local Master is rewritten.

### Phase 2.B · Cross-system joins
- **Transactions** · `hotel_transactions.buyer_id` / `seller_id` →
  `relationship_contacts.master_id` (when the deal counterparty matches
  a known institutional contact)
- **CompSet** · when an institutional contact has an active deal stage
  on a competing asset, surface in the CompSet underwriting panel
- **Intelligence Engine** · join news articles mentioning institutional
  names to the Master · drive outreach hooks

### Phase 2.C · Outreach intelligence UI · ✅ shipped 2026-05-12

The institutional relationship console at `/user/admin/contacts` is now
live and queries Supabase directly. Visual language matches AI
Operations / Integrations / Intelligence Feed (dark forest-900 →
slate-950 gradient cards, lime-300 accents, tracked-out uppercase
micro-labels).

**Schema (migration `0014_relationship_contacts`):**
- `relationship_companies` (unique by `company_key`)
- `relationship_contacts` (FK → companies · unique by `master_id` ·
  generated `email_lower` for case-insensitive search · indexed on band
  / bucket / investor_type / collab score / company_id)
- `relationship_interactions` (FK → companies · one timeline per company)
- `relationship_labels` (FK → contacts · unique on `(contact_id, label)`)
- `relationship_health` (FK → contacts · unique on `contact_id`)

RLS enabled · zero policies · anon + authenticated revoked. Only the
service-role server lib reads these tables.

**Ingester (`scripts/contactos/promote_to_supabase.py`):**
- stdlib `urllib` PostgREST client · `Bearer SERVICE_KEY`
- `upsert` with `on_conflict` + `Prefer: resolution=merge-duplicates`
- paginated `fetch_all()` (Range header) for FK resolution — fixed the
  first-run truncation at 1,000 IDs that lost company_id joins
- 5-step ingest: companies → fetch IDs → contacts (with FK) → fetch IDs
  → interactions + labels + health
- idempotent · re-runnable · final ingest:
  2,990 companies · 4,547 contacts · 2,990 interactions · 143 labels ·
  34 health records

**UI (`apps/web/src/app/user/admin/contacts/page.tsx`):**
- 14 KPI totems split across 2 rows · top row = bands + recency, bottom
  row = institutional-type breakdown
- 10-column table: Contact (name + title + email + LinkedIn) · Company
  (with geography) · Type (with hospitality badge) · Band · Strength ·
  Collab · Last email (with directionality) · Gmail labels (max 3 chips
  + count) · Email health · Strategic signal (inferred stage + Datasite
  stage + pipeline state when non-Active)
- URL-driven filter state — band chips · institutional type chips ·
  "Show invalid" + "Recently active · 90d" toggles · sort (Collab /
  Strength / Recent / A-Z) · debounced search across name + email +
  company
- Quality-first default filter active: `bucket = 'active'` AND
  `hide_invalid` AND no-Gmail-activity dormant rows hidden. Operator
  flips the toggle to widen.
- Server-side pagination (50/page) via PostgREST `Range`
- Sidebar entry added under "AI Operations" / "Integrations" with the
  Users icon and a `Live` badge

**Server lib:** `apps/web/src/lib/admin/contacts/live.ts`
- `loadContacts(filter)` · `loadContactKpis()` · `loadInvestorTypes()`
- 15 parallel count queries for the KPI strip (no waterfall)
- joins `relationship_labels` for the visible page only (max
  `page_size` lookups)

**Out-of-scope (deferred):** realtime Supabase channel · auto Gmail
crawling · embeddings · graph visualizer · AI orchestration on contacts
table. The UI is read-only — mutations (merge / promote unmatched /
correct invalid) still happen via the Python ingester so provenance
stays auditable.

### Phase 2.D · Incremental updates from additional projects
The architecture already supports this — drop a different project's
Full Report into `incoming/`, the dedup logic merges by email/LinkedIn
across projects. The `source_file` provenance preserves which export
each row came from.

---

## 7 · Google Contacts enrichment pipeline (Phase 2.A · shipped)

Operator's personal/professional Google address book is the second
relationship signal layer. The Google ingester cross-references it
against the Master and emits a 5-sheet workbook + 4 per-batch CSV
reports + a markdown analysis. **It does NOT mutate the Master** —
explicit operator approval is required to promote suggestions.

### Architecture (parallel to Datasite ingester)

```
incoming/google-contacts/<file.csv>
            │
            ▼ python scripts/contactos/ingest_google.py
            │
   ┌────────┴────────────────────────────────────────────┐
   │  parse Google CSV (multi-value columns tolerant)    │
   │  → GoogleContacts_Raw  (verbatim · UTF-8 BOM clean) │
   │  → GoogleContacts_Normalized (canonical shape)      │
   │  → classify (9-bucket Google taxonomy)              │
   │  → within-google duplicate detection                │
   │  → identity-resolve vs Master                       │
   │  → recommend action per row                         │
   └────────┬────────────────────────────────────────────┘
            ▼
   google-contacts/
     raw/google_raw_<batch>.csv
     normalized/google_normalized_<batch>.csv
     enriched/google_enriched_<batch>.xlsx   ← 5 sheets
     relationship-enrichment-report.md       ← single canonical analysis

   reports/
     google-ingestion-log.jsonl              (append-only)
     google-identity-resolution_<batch>.csv
     google-overlap-analysis_<batch>.csv
     google-within-duplicates_<batch>.csv
     google-suggested-joins_<batch>.csv

   old/google-contacts/<file.csv>            ← source archived
```

### Google classification taxonomy

Distinct from the Master's investor-type taxonomy because Google contacts
carry less structure. Nine high-level buckets:

| Bucket | Signal |
|---|---|
| investor | REIT/SOCIMI · Family Office · Fund · PE · VC · Asset Management · Capital Partners |
| lender | Bank · Banco · Financiador · Debt fund · Mortgage |
| broker | Colliers · JLL · Cushman · CBRE · Savills · Knight Frank · broker · intermediario |
| operator | Operador · Gestor hotelero · Management company · Cadena hotelera |
| brand | Brand · Marca · Franchisor · Franchise |
| consultant | Consultor · Consultancy · Consulting |
| advisor | Advisor · Advisory · Asesoría |
| personal | Personal email domain (Gmail · Hotmail · Yahoo · iCloud · etc.) without institutional company signal |
| unknown | No company AND no email AND no classification signal |

Matched contacts ALSO carry the canonical Master `investor_type` so the
operator can reason in either vocabulary.

### Identity resolution

Same priority order as the Master ingester:

1. exact email (primary + secondaries against `master.email`)
2. exact phone (digits-only, +-prefix-aware)
3. exact LinkedIn URL (protocol/www-stripped)
4. exact name + normalised company (legal-suffix stripped)
5. fuzzy fallback · Levenshtein ≥ 0.88 within same company_key

### Recommended actions (4-valued)

| Action | Condition | Operator response |
|---|---|---|
| MERGE | exact match found · safe field-level enrichment | review email/phone/LinkedIn deltas · approve specific fields |
| INSERT | institutional classification · no Master match | candidate for outreach + Master row creation |
| REVIEW | fuzzy match OR unclassified-with-company | 5-minute manual triage each |
| NO_OP | personal · no company · no institutional signal | skip |

### Privacy posture

The whole `CONTACTOS DATASITE/google-contacts/` subtree is `.gitignore`'d
in addition to the existing Datasite rules. Both `*.csv` and `*.xlsx`
patterns are excluded. The README is the only safe artifact under that
folder.

### Phase 2.A.2 · apply-tool (deferred)

When the operator has reviewed `google-suggested-joins_<batch>.csv` and
wants to promote some/all rows to the Master, the next planned tool is
a `scripts/contactos/apply_google_joins.py` that:

1. reads an operator-edited CSV (with a `decision` column · APPROVE/SKIP)
2. for each APPROVE row, calls the Master ingester's `upsertItem` /
   `merge_existing` logic directly
3. writes a new `google-applied_<batch>.jsonl` audit line
4. regenerates the Master + Summary

Until then, the operator cherry-picks manually.

---

## 8 · Cross-references

- `CONTACTOS DATASITE/README.md` — operator-facing workflow guide (Datasite + Google sections)
- `scripts/contactos/ingest.py` — Datasite ingester (`MASTER_SCHEMA` = canonical column order)
- `scripts/contactos/ingest_google.py` — Google Contacts enrichment ingester (read-only, no Master mutation)
- `.gitignore` — privacy rules (search "CONTACTOS DATASITE")
- `docs/changelog.md` — Phase 2.10 + Phase 2.A entries
