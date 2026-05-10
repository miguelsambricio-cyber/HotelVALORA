# Feature · Financials

The financial engine spans **three surfaces** in the product:

1. The Library list view (Bloomberg-grade table — `/library/{favorites,top}-list`)
2. The Investment Requirements engine (`/settings/investment/{,market,value}`)
3. The Report engine — Section 5 (Financials) — **not yet shipped**

## Surface 1 · Library table financial cells

Each row of `FavoritesTable` carries a `financials: ReportFinancials` block:

```ts
{
  capex: number | null;
  totalInvest: { total, perRoom, perM2 } | null;
  capRate: number;                  // always visible
  marketValueTtm: { total, perRoom, perM2 };  // always visible
  exitYear: number | null;
  exitPrice: { total, perRoom, perM2 } | null;
  yield: number | null;
  irrProject: number | null;
  irrEquity: number | null;
}
```

The locked-cell pattern: any `null` value renders `<LockedCell />` (small blue lock icon) instead of the number. See **`docs/business-rules/tier-system.md`** for the gating matrix.

Formatters: `fmtEur(n)` → `€128.5M` / `€524k`, `fmtPct(n)` → `5.4%`. Defined inline in `components/library/favorites-table.tsx`.

## Surface 2 · Investment Requirements

The user's investor preferences are stored in the persisted Zustand store and feed every future valuation:

| Section | Slice |
|---|---|
| Hotel Asset criteria | `criteria` |
| Hotel Market | `market` |
| Hotel Value | `value` (5 sub-blocks: site, exit, rent, finance, pl) |

The match-engine stub (`lib/investment/match-engine.ts`) is the future entry point — eventually scores every Library report against the user's preferences and surfaces a "match score" column.

## Surface 3 · Report Section 5 (planned)

Will compose:
- P&L forecast — 5-year + TTM, with the user's investment assumptions applied
- Underwriting & IRR Equity — DCF projection from `services/financial_engine`
- Sensitivity — 2-axis sensitivity tables (typical: cap rate × exit year, or interest rate × leverage)

Wire targets:
- `/api/v1/valuations/dcf` (already built in `apps/api`)
- `/api/v1/valuations/underwriting` (already built)
- New `/api/v1/valuations/sensitivity` (to build)

## Standalone financial engine

`services/financial_engine/engine/dcf/projections.py` runs DCF projections in Python. Not imported by `apps/api` directly — the API duplicates the relevant logic in `apps/api/app/services/valuation_service.py` to avoid the package cross-dep. See `docs/financial-engine.md` for the module map and **`docs/underwriting.md`** for the model.

## Cross-references

| Topic | Doc |
|---|---|
| Financial engine internals | `docs/financial-engine.md` |
| Underwriting model | `docs/underwriting.md` |
| Investment criteria UI | `docs/features/settings.md` |
| Tier gating | `docs/business-rules/tier-system.md` |
| Report engine + planned Section 5 | `docs/architecture/report-engine.md` |
| Display formulas | `docs/financial.md` |
