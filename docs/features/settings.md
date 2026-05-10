# Feature · Settings

`/settings/*` is the user / workspace control surface. Wrapped by `SettingsLayout` (`AppHeader` + sticky 240 px sub-sidebar + slim institutional footer).

## Routes

| Route | File | Purpose |
|---|---|---|
| `/settings/profile` | `app/settings/profile/page.tsx` | User profile form + completion card |
| `/settings/credentials` | `app/settings/credentials/page.tsx` | Credentials & Security (OAuth providers, password) |
| `/settings/investment` | `app/settings/investment/page.tsx` | Investment Requirements · **Hotel Asset** |
| `/settings/investment/market` | `app/settings/investment/market/page.tsx` | Investment Requirements · **Hotel Market** |
| `/settings/investment/value` | `app/settings/investment/value/page.tsx` | Investment Requirements · **Hotel Value** |

## Investment Requirements engine

Three sub-tabs, all driven by one Zustand store (`lib/investment/store.ts`, persisted v3).

### Hotel Asset (`/settings/investment`)

Asset criteria — segment, geography, room range, classification preferences, facility checklist. The match-engine stub lives in `lib/investment/match-engine.ts` and will eventually score every Library row against the user's criteria.

### Hotel Market (`/settings/investment/market`)

- ADR growth + occupancy growth sliders
- RevPAR Scenario (DOWN / BASE / UP segmented pill)
- Target market settings (single ISO market id or list)
- Internal scenario KPI tables in `lib/investment/market-scenarios.ts`

### Hotel Value (`/settings/investment/value`)

Five sections, all part of the same persisted store:

1. **Site Acquisition** — Asking Price slider · Acquisition Cost (Basic/Premium gate; Premium reveals editable 5-line table) · Total Investment · Saved Scenarios
2. **Exit Investment** — Exit Price slider · Saved Scenarios · Cap Rate Scenario (flat segmented pill) · Yield Target / IRR Project / IRR Equity sliders
3. **Rent Factor** — disabled by default. € Rent · % Fixed Rent · % Variable Rent (slider + numeric + basis select)
4. **Finance Structure** — 8 sliders in 2-col grid (Acquisition Debt, Capex Debt, Interest Rate, Amortization Asset, Grace Period, Amortization Capex, Bullet Payment, Opening Fee)
5. **P&L Forecast** — TTM slider · Management Fee Basic/Premium gate · Marketing — Royalty % · FF&E Reserve Y1-Y4 grid

### Right sidebar (Investment)

Two subscription cards rendered on every Investment page:

- `PremiumSubscriptionCard` — dark-forest gradient, 8 feature bullets, "Valora Prime" footer, ACTIVATE CTA
- `ProSubscriptionCard` — white card, 7 PRO features, disabled INCLUDED CTA (user is already on PRO)

## Shared primitives

`InstitutionalToggle` — canonical ON/OFF switch used across Market + Value surfaces. File: `components/settings/investment/institutional-toggle.tsx`.

## Cross-references

| Topic | Doc |
|---|---|
| Tier system | `docs/business-rules/tier-system.md` |
| Excel ingestion (pre-fills Investment) | `docs/integrations/excel-ingestion.md` |
| Settings layout shell | `docs/architecture/frontend-architecture.md` |
| CAPEX taxonomy | `apps/web/src/lib/investment/capex.ts` |
| Acquisition cost taxonomy | `apps/web/src/lib/investment/value-acquisition.ts` |
