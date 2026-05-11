# services/costar — institutional hospitality market intelligence warehouse

The operational substrate for HOTELVALORA's institutional hospitality market intelligence. **Not a document repository.** This is the normalized hospitality intelligence warehouse + benchmark database layer + underwriting market intelligence substrate.

**Phase 1** — directory + schemas + workflow design. **No automation yet** — that lands in Phase 2.3.d of the Data Ingestion Agent, building on the same infrastructure that supervises `services/transactions/`.

---

## Strategic role

The corpora that land here feed four downstream consumers in the platform:

- **Underwriting Engine** — country/market/submarket KPIs become the macro substrate behind every valuation
- **Compset Benchmarking** — MPI / ARI / RGI per target hotel underpin institutional reporting and Library positioning
- **Market Observatory** — submarket time-series fuels the Market Overview report section
- **AI-assisted Underwriting (Phase 4+)** — Market Intelligence Agent reads these masters to enrich each deal context

## Directory map

```
services/costar/
├── MASTER/                                  ← canonical XLSX corpora (tracked in git)
│   ├── COSTAR_MASTER_PAIS.xlsx              ← country-level (39c · COUNTRY sheet)
│   ├── COSTAR_MASTER_MERCADOS.xlsx          ← market-level (40c · MARKET sheet)
│   ├── COSTAR_MASTER_SUBMERCADOS.xlsx       ← submarket-level (41c · SUBMARKET sheet)
│   └── COSTAR_MASTER_COMPSETS.xlsx          ← compset benchmarks (48c · COMPSET sheet)
│
├── PAIS/
│   ├── INPUT/                               ← operator drops raw country files here
│   └── old.pais/                            ← processed archive
│
├── MERCADO/
│   ├── INPUT/                               ← operator drops raw market files here
│   └── old.mercado/                         ← processed archive
│
├── SUBMERCADO/
│   ├── INPUT/                               ← operator drops raw submarket files here
│   └── old.submercado/                      ← processed archive
│
├── COMPSET/
│   ├── INPUT/                               ← operator drops raw compset files here
│   └── old.compset/                         ← processed archive
│
├── staging/
│   ├── failed/                              ← unparseable / corrupted imports
│   ├── review/                              ← rows flagged for manual review
│   └── temp/                                ← in-flight normalisation artefacts
│
├── templates/                               ← reference contracts for operator imports (4 csv + README)
│
├── logs/                                    ← per-ingestion run logs (jsonl)
│
├── docs/                                    ← workspace-specific notes (operational, not architectural)
│
└── scripts/
    └── build_masters.py                     ← reproducible master generator
```

## Strict separation across four granularities

Country, market, submarket and compset flow through **four strictly separated parallel pipelines** that share infrastructure (ingestion-meta block, SOURCES_REGISTRY) but never share a DATA sheet:

| Granularity | Primary entity | Time series | Underwriting role |
|---|---|---|---|
| **Country** (`PAIS`) | ISO-3166-1 alpha-2 | yes | Macro context |
| **Market** (`MERCADO`) | (country, market_name) | yes | Asset-level positioning anchor |
| **Submarket** (`SUBMERCADO`) | (country, market, submarket, chain_scale) | yes | Comp neighborhood reference |
| **Compset** (`COMPSET`) | (compset_uid, target_hotel) | yes | MPI / ARI / RGI per asset |

They never share a master because their schemas, granularity, KPIs, aggregation logic, and underwriting relevance all differ. See `docs/intelligence/costar-master-dataset-architecture.md` for the detailed rationale.

## What lives in git vs not

| Kind | Tracked? | Why |
|---|---|---|
| Directory structure (`.gitkeep`) | ✅ | The contract |
| `MASTER/*.xlsx` | ✅ | The canonical institutional datasets |
| `templates/*.csv` | ✅ | The contract operators meet |
| `scripts/build_masters.py` | ✅ | Reproducible schema |
| `INPUT/*` files | ❌ | Operator-supplied CoStar exports — sensitive, large, transient |
| `old.*/` archives | ❌ | Processed imports — auditable locally |
| `staging/**` | ❌ | Operational artefacts |
| `logs/**` | ❌ | Run logs |

See `services/costar/.gitignore` for the explicit rules.

## Operator workflow (manual today, agent-supervised in Phase 2)

1. Drop a raw CoStar export into the matching `<GRANULARITY>/INPUT/` directory.
2. Trigger the Data Ingestion Agent (Phase 2.3.d wires the trigger).
3. The agent parses · validates · normalises · deduplicates · enriches metadata.
4. Valid rows are appended to the matching MASTER workbook with full ingestion-meta.
5. The processed file is moved to `old.<granularity>/` with a timestamp + ingestion-id prefix.
6. Failures land in `staging/failed/<ingestion_id>/`.
7. Borderline rows land in `staging/review/<ingestion_id>/`.
8. Per-run jsonl trace lands in `logs/<YYYY-MM>/<ingestion_id>.jsonl`.
9. A row is appended to the MASTER's `INGESTION_LOG` sheet.
10. CLI POSTs a per-file summary to the cloud audit endpoint (same pattern as `transactions/`).

After step 5, each `<GRANULARITY>/INPUT/` should contain **only files still waiting to be processed**.

## Reference documentation

Architectural docs live in `docs/intelligence/`:

- `costar-ingestion-workflow.md` — operator + agent workflow
- `costar-master-dataset-architecture.md` — why XLSX now · path to Supabase
- `costar-normalization-rules.md` — canonicalisation rules per field
- `costar-country-schema.md` — full column reference for COSTAR_MASTER_PAIS
- `costar-market-schema.md` — full column reference for COSTAR_MASTER_MERCADOS
- `costar-submarket-schema.md` — full column reference for COSTAR_MASTER_SUBMERCADOS
- `costar-compset-schema.md` — full column reference for COSTAR_MASTER_COMPSETS

## Regenerating the masters

If the schema evolves, bump `NORMALIZATION_VERSION` in `scripts/build_masters.py`, re-run, and commit both:

```bash
python services/costar/scripts/build_masters.py
git add services/costar/scripts/build_masters.py services/costar/MASTER/*.xlsx
git commit -m "data(schema): bump costar masters to vN.M"
```

## Future evolution

| Phase | Hook |
|---|---|
| 2.3.d | Data Ingestion Agent supervises this workspace (operator-side Python CLI + cloud audit-sync), parallel to `transactions/` |
| 4 | LLM-assisted normalisation — CoStar code resolution, submarket disambiguation, segment-level enrichment |
| 5 | XLSX masters mirrored into Supabase tables (`public.market_periods`, `public.compset_periods`); read-path becomes Postgres, XLSX stays operator-canonical |
| 6 | Underwriting Engine reads MASTER directly for valuation context and report generation |
| 7 | Market Intelligence Agent cross-joins this workspace with `public.market_news` for AI-driven positioning narratives |
