# services/costar — institutional hospitality market WAREHOUSE + hotel REFERENCE registry

The operational substrate for HOTELVALORA's institutional hospitality market intelligence. **Not a document repository.** This workspace contains **two genuinely distinct datasets** that both happen to come from CoStar exports but model different things:

| Dataset | Nature | Granularities | Purpose |
|---|---|---|---|
| **A. Market Performance Data** | aggregated KPIs over time (occupancy · ADR · RevPAR · room nights · supply · demand · pipeline · absorption) | country · market · submarket | Macro context for valuations + report generation |
| **B. Hotel-by-Market Inventory** | individual hotel records with attributes (name · brand · operator · facilities · amenities · score · category · rooms · geolocation · owner / operator) | hotel-by-hotel within a market | Reference data backbone for compsets · valuations · benchmarking |

**Owned by the COSTAR & Hotel Reference Agent** (per `docs/agents/costar-market-data-agent.md`). Hotel-specific compsets and underwriting outputs live in the OPERATIONAL workspace at `services/compset/` — owned by the CompSet Underwriting Agent. The two workspaces are deliberately separate per `docs/architecture/market-vs-underwriting-separation.md`.

**Status** — Phase 1 directory + schemas + workflow live. Madrid · Madrid Centro · COSTAR market-data + hotel-inventory files dropped 2026-05-14. Phase 2.3.d.1 wires the CLI ingestion pipeline. No autonomous ingestion yet.

> **2026-05-14 conceptual shift:** the previous CLASS granularity (chain-scale aggregates) is retired. `chain_scale` becomes an attribute on each hotel record in the new HOTELESperMARKET inventory, not its own master. The legacy `COSTAR_MASTER_CLASS.xlsx` stays in `MASTER/` for archival but is no longer the source of truth for chain-scale positioning.

---

## Strategic role

The macro corpora here feed three downstream consumers:

- **Underwriting Engine** — country/market/submarket/class KPIs become the macro substrate the CompSet Underwriting Agent reads when building per-hotel valuation context
- **Market Observatory** — submarket + class time-series fuel the Market Overview report section
- **AI-assisted Underwriting (Phase 4+)** — Market Intelligence Agent cross-references the warehouse with `public.market_news` for narrative positioning

CompSet outputs (MPI / ARI / RGI per target hotel) live in `services/compset/` — a different workspace because compset workflows are operational (per-deal, on-demand, dynamic), not warehouse-style (monthly batch, standardized, slow-changing).

## Directory map

```
services/costar/
├── MASTER/                                  ← canonical XLSX corpora (tracked in git)
│   ├── COSTAR_MASTER_PAIS.xlsx              ← country market metrics (Dataset A)
│   ├── COSTAR_MASTER_MERCADOS.xlsx          ← market metrics (Dataset A)
│   ├── COSTAR_MASTER_SUBMERCADOS.xlsx       ← submarket metrics (Dataset A)
│   ├── COSTAR_MASTER_HOTELES_POR_MERCADO    ← hotel inventory (Dataset B) · planned next master
│   └── COSTAR_MASTER_CLASS.xlsx             ← LEGACY (chain-scale aggregates · retired 2026-05-14)
│
├── PAIS/
│   ├── INPUT/                               ← operator drops raw country market-data files here
│   └── OLD/                                 ← processed archive (governance · 2026-05-14)
│
├── MERCADO/
│   ├── INPUT/                               ← operator drops raw market-data files here
│   └── OLD/                                 ← processed archive
│
├── SUBMERCADO/
│   ├── INPUT/                               ← operator drops raw submarket-data files here
│   └── OLD/                                 ← processed archive
│
├── HOTELESperMARKET/                        ← renamed from "HOTELES POR MERCADO" (2026-05-14)
│   ├── INPUT/                               ← operator drops hotel-inventory exports here
│   │   └── LISTA HOTELES FROM MARKET - <CITY>/
│   └── OLD/                                 ← processed archive
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

## Pipeline architecture · two datasets, four ingestion streams

Dataset **A** (market performance) flows through three strictly separated parallel pipelines by granularity. Dataset **B** (hotel inventory) is its own fourth pipeline.

| Stream | Dataset | Primary entity | Time series | Role |
|---|---|---|---|---|
| **Country** (`PAIS`) | A | ISO-3166-1 alpha-2 | yes | Macro context |
| **Market** (`MERCADO`) | A | (country, market_name) | yes | Asset-level positioning anchor |
| **Submarket** (`SUBMERCADO`) | A | (country, market, submarket) | yes | Comp neighborhood reference |
| **Hotels by Market** (`HOTELESperMARKET`) | B | (country, market, hotel_id) | no — slowly-changing dimension | **Reference data backbone** · powers compsets · valuations · benchmarking |

The four streams share infrastructure (ingestion-meta block, SOURCES_REGISTRY) but never share a DATA sheet — schemas, granularity, KPIs, aggregation logic, and underwriting relevance all differ. See `docs/intelligence/costar-master-dataset-architecture.md` for the detailed rationale.

Compset outputs (MPI / ARI / RGI per target hotel) live in `services/compset/` — a different workspace owned by a different agent. Transactions live in `services/transactions/`.

Compset outputs (MPI / ARI / RGI per target hotel) live in `services/compset/` — a different workspace owned by a different agent.

## What lives in git vs not

| Kind | Tracked? | Why |
|---|---|---|
| Directory structure (`.gitkeep`) | ✅ | The contract |
| `MASTER/*.xlsx` | ✅ | The canonical institutional datasets |
| `templates/*.csv` | ✅ | The contract operators meet |
| `scripts/build_masters.py` | ✅ | Reproducible schema |
| `<GRANULARITY>/INPUT/*` files | ❌ | Operator-supplied CoStar exports — sensitive, large, transient |
| `<GRANULARITY>/old.*/` archives | ❌ | Processed imports — auditable locally |
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
- `costar-class-schema.md` — full column reference for COSTAR_MASTER_CLASS

Compset workspace docs live in `docs/intelligence/compset-schema.md` + `docs/intelligence/hotel-positioning-schema.md`; agent ownership docs in `docs/agents/{costar-market-data-agent, compset-underwriting-agent, ceo-agent-supervision-layer}.md`.

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
