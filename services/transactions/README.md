# services/transactions — institutional ingestion workspace

The operational substrate for HOTELVALORA's institutional transactions + projects intelligence. This is **not a simple upload folder**: it is the ingest layer of a hospitality data warehouse, designed to scale into centralised transaction intelligence + underwriting enrichment + AI-assisted institutional datasets.

**Phase 1** — directory + schema + workflow design. **No automation yet** — that lands in Phase 2 of the Data Ingestion Agent.

---

## Directory map

```
services/transactions/
├── MASTER/
│   ├── HOTEL_TRANSACCIONES_MASTER.xlsx   ← canonical transactions corpus
│   └── HOTEL_PROYECTOS_MASTER.xlsx       ← canonical projects corpus
│
├── INPUT_TRANSACCIONES/                   ← operator drops raw transaction files here
│   └── old.transacciones/                 ← processed files archive
│
├── INPUT_PROYECTOS/                       ← operator drops raw project files here
│   └── old.proyectos/                     ← processed files archive
│
├── staging/
│   ├── failed/                            ← unparseable / corrupted imports
│   ├── review/                            ← rows flagged for manual review
│   └── temp/                              ← in-flight normalisation artefacts
│
├── templates/                             ← reference contracts for operator imports
│
├── logs/                                  ← per-ingestion run logs (jsonl)
│
├── docs/                                  ← workspace-specific notes (operational, not architectural)
│
└── scripts/
    └── build_masters.py                   ← reproducible master generator
```

## Strict separation: transactions ↔ projects

Two parallel pipelines because the domains have different schemas, lifecycles, underwriting logic, KPIs, and categorisation systems. They never share a master. They never share a categorisation enum. Mixing them once would require splitting them every quarter thereafter.

## What lives in git vs not

| Kind | Tracked? | Why |
|---|---|---|
| Directory structure (`.gitkeep`) | ✅ | The contract |
| `MASTER/*.xlsx` | ✅ | The canonical institutional datasets |
| `templates/*.csv` | ✅ | The contract operators meet |
| `scripts/build_masters.py` | ✅ | Reproducible schema |
| `INPUT_*` files | ❌ | Operator-supplied raw data — sensitive, large, transient |
| `old.*` archives | ❌ | Processed imports — auditable locally but not committed |
| `staging/**` | ❌ | Operational artefacts |
| `logs/**` | ❌ | Run logs |

See `services/transactions/.gitignore` for the explicit rules.

## Operator workflow (manual today, agent-supervised in Phase 2)

1. Drop a raw file into `INPUT_TRANSACCIONES/` or `INPUT_PROYECTOS/`
2. Trigger the Data Ingestion Agent (today: TODO — Phase 2 wires the trigger)
3. The agent parses · validates · normalises · deduplicates · enriches metadata
4. Valid rows are appended to the matching MASTER workbook with full ingestion-meta
5. The processed file is moved to `old.*/`
6. Failures land in `staging/failed/` with an error report
7. Borderline rows land in `staging/review/` for operator approval

After step 5, `INPUT_*` should contain ONLY files still waiting to be processed.

## Reference documentation

Architectural docs live in `docs/intelligence/`:

- `transaction-ingestion-workflow.md` — operator + agent workflow
- `master-dataset-architecture.md` — why xlsx now · path to Supabase
- `data-normalization-rules.md` — canonicalisation rules per field
- `transaction-schema.md` — full column reference for transactions
- `project-schema.md` — full column reference for projects

## Regenerating the masters

If the schema evolves, bump `NORMALIZATION_VERSION` in `scripts/build_masters.py`, re-run, and commit both:

```bash
python services/transactions/scripts/build_masters.py
git add services/transactions/scripts/build_masters.py services/transactions/MASTER/*.xlsx
git commit -m "data(schema): bump transactions master to vN.M"
```

## Future evolution

Phase 2 brings the Data Ingestion Agent (`apps/web/src/lib/ai-agents/agents/data-ingestion.ts`) into supervising this workspace end-to-end. Phase 4+ moves the canonical corpora from XLSX into Supabase tables (`hotel_transactions`, `hotel_projects`) once enrichment + entity resolution + reactive event flow are stable. Until then, the XLSX masters are the institutional source of truth.
