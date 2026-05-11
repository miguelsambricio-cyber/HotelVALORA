# services/compset — operational underwriting compset workspace

The operational substrate for the **CompSet Underwriting Agent**. This is **NOT a warehouse** — it is the dynamic, hotel-specific, on-demand operational layer that produces the competitive intelligence required for institutional underwriting.

**Owned by the CompSet Underwriting Agent** (per `docs/agents/compset-underwriting-agent.md`). Distinct from the market warehouse at `services/costar/` (owned by the CoStar Market Data Agent) because the two have fundamentally different operational rhythms, risk profiles, and business purposes — see `docs/architecture/market-vs-underwriting-separation.md`.

**Status** — Phase 1 directory + schemas + workflow live. Phase 2.4 wires the agent's CLI + cloud integration. No autonomous ingestion yet.

---

## Strategic role

Every institutional valuation HOTELVALORA produces ultimately rests on:
- a credible RevPAR / ADR / Occupancy benchmark for the target hotel against its peer set, and
- a defensible forward assumption set (the underwriting view) anchored to those benchmarks.

This workspace is where both live. The agent's job is to keep them current, traceable, and tied to source data.

## Directory map

```
services/compset/
├── MASTER/                                  ← canonical XLSX corpora (tracked in git)
│   ├── COMPSET_MASTER.xlsx                  ← subject + compset KPIs + MPI/ARI/RGI (48c)
│   └── HOTEL_POSITIONING_MASTER.xlsx        ← per-hotel underwriting positioning snapshots (55c)
│
├── INPUT/                                   ← operator drops compset + positioning files here · not tracked
├── old/                                     ← processed archive · not tracked
│
├── staging/
│   ├── failed/                              ← unparseable / corrupted imports · not tracked
│   ├── review/                              ← rows flagged for manual review · not tracked
│   └── temp/                                ← in-flight normalisation artefacts · not tracked
│
├── templates/                               ← 2 operator CSV templates + README · tracked
├── logs/                                    ← per-ingestion run logs · not tracked
├── docs/                                    ← workspace-specific notes · tracked
│
└── scripts/
    └── build_masters.py                     ← reproducible master generator · tracked
```

## Why one INPUT/, not multiple?

Unlike `services/costar/` (one INPUT folder per granularity), this workspace has a **single `INPUT/`** because:

- Both masters share the same operator (asset manager / underwriter / analyst)
- Both are triggered by the same deal context (one valuation produces one COMPSET refresh + one POSITIONING snapshot)
- The CompSet Underwriting Agent routes per-file based on header signature

## Two masters, two contracts

| Master | Purpose | Granularity |
|---|---|---|
| `COMPSET_MASTER.xlsx` | Subject vs compset KPIs + MPI / ARI / RGI time series | one row per `(target_hotel, compset, period)` |
| `HOTEL_POSITIONING_MASTER.xlsx` | Per-hotel underwriting positioning snapshots | one row per `(target_hotel, snapshot_kind, snapshot_at)` |

The first is the BENCHMARK substrate. The second is the AGENT'S DERIVED OUTPUT (forward assumptions, valuation anchors, confidence levels). Both are append-only with the standard 14-column ingestion-meta block.

## What lives in git vs not

Same posture as the other workspaces:

| Kind | Tracked? |
|---|---|
| Directory structure (`.gitkeep`) | ✅ |
| `MASTER/*.xlsx` | ✅ |
| `templates/*.csv` + README | ✅ |
| `scripts/build_masters.py` | ✅ |
| `INPUT/*` files | ❌ |
| `old/*` archives | ❌ |
| `staging/**` | ❌ |
| `logs/**` | ❌ |

See `services/compset/.gitignore` for the explicit rules.

## Operator workflow (Phase 2.4 wires the agent)

1. Operator requests an underwriting refresh for a hotel (deal-driven, or quarterly scheduled).
2. CompSet Underwriting Agent:
   - Reads CoStar warehouse data from `services/costar/` for the relevant market + submarket + class.
   - Loads or builds the compset for the target hotel.
   - Computes subject vs compset KPIs.
   - Computes MPI / ARI / RGI.
   - Writes a new row to `COMPSET_MASTER.xlsx`.
   - Derives forward underwriting assumptions (ADR, occupancy, RevPAR, valuation anchor).
   - Writes a HOTEL_POSITIONING snapshot to `HOTEL_POSITIONING_MASTER.xlsx`.
3. Outputs flow into the Underwriting Engine + the Library report layer.

## Reference documentation

- `docs/agents/compset-underwriting-agent.md` — agent charter, responsibilities, escalation rules
- `docs/agents/costar-market-data-agent.md` — the sister agent that owns the market warehouse
- `docs/agents/ceo-agent-supervision-layer.md` — orchestration agent overseeing both
- `docs/architecture/market-vs-underwriting-separation.md` — why these two agents are separate
- `docs/intelligence/compset-schema.md` — COMPSET_MASTER column reference
- `docs/intelligence/hotel-positioning-schema.md` — HOTEL_POSITIONING_MASTER column reference

## Regenerating the masters

If the schema evolves, bump `NORMALIZATION_VERSION` in `scripts/build_masters.py`, re-run, and commit both:

```bash
python services/compset/scripts/build_masters.py
git add services/compset/scripts/build_masters.py services/compset/MASTER/*.xlsx
git commit -m "data(schema): bump compset masters to vN.M"
```

## Future evolution

| Phase | Hook |
|---|---|
| 2.4 | CompSet Underwriting Agent fully wired — operator-triggered CLI + Vercel-Function-backed cloud variant + audit-sync to `ai_agent_runs` |
| 4 | LLM-assisted assumption derivation — agent narrates positioning rationale + risks based on news + market context |
| 5 | XLSX masters mirrored into Supabase tables (`public.compset_periods`, `public.hotel_positioning_snapshots`) |
| 6 | Underwriting Engine reads HOTEL_POSITIONING_MASTER directly to seed every valuation |
| 7 | Report Generation surfaces HOTEL_POSITIONING_MASTER in `/report/competitive-set` with full assumption traceability |
