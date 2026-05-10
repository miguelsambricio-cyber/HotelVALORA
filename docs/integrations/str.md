# Integrations · STR (Smith Travel Research)

STR is the canonical RevPAR / ADR / occupancy benchmarking source for hotel markets.

## Status today

- ⏸ Not integrated yet
- 🟡 Market Overview report section uses internal mock RevPAR scenarios (`apps/web/src/lib/investment/market-scenarios.ts`) — DOWN / BASE / UP buckets
- 🟡 Investment Requirements / Hotel Market tab carries the RevPAR Scenario primitive — wired to local state, not STR

## Phase 3 + 4 plan

When STR lands, the wiring is:

1. **Backend** — new `/api/v1/markets/{marketId}/str` resource that the report's Market Overview section calls.
2. **Frontend** — Market Overview section reads via TanStack Query and falls back to the DOWN / BASE / UP scenarios when STR is unavailable for the market.
3. **Investment criteria** — the user-set RevPAR scenario becomes the override over the STR baseline.

## Data shape (planned)

```ts
interface StrMarketMetrics {
  marketId: string;        // e.g., "ES-MAD-CENTRO"
  asOf: string;            // ISO 8601 — month of the latest data
  occupancy: number;       // %
  adr: number;             // EUR
  revpar: number;          // EUR
  yoyGrowth: {
    occupancy: number;     // %
    adr: number;
    revpar: number;
  };
  segmentation?: {
    luxury?: StrMarketMetrics;
    upscale?: StrMarketMetrics;
    midscale?: StrMarketMetrics;
  };
}
```

## Licensing notes

STR data is licensed per-market per-customer. The integration must:
- Store credentials per workspace (not platform-wide)
- Cache responses (24h TTL) to respect rate limits
- Audit-log every fetch in `audit_log` for compliance

## Cross-references

| Topic | Doc |
|---|---|
| Market scenarios (today's mock) | `apps/web/src/lib/investment/market-scenarios.ts` |
| Investment Requirements / Hotel Market | `docs/features/settings.md` |
| Report — Market Overview section | `docs/report-system.md` |
