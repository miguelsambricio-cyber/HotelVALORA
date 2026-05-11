# Components — Canonical Catalog

The institutional component surface. Use these primitives + cards before building new ones. Detail and prop signatures live in [`docs/component-library.md`](docs/component-library.md) and [`docs/design-system.md`](docs/design-system.md).

Source roots:
- `apps/web/src/components/layout/`
- `apps/web/src/components/auth/`
- `apps/web/src/components/settings/`
- `apps/web/src/components/report/`

---

## Layout

| Component | Location | Use |
|---|---|---|
| `AppHeader` | `layout/app-header.tsx` | Sticky global header — every authenticated page |
| `LandingHeader` / `LandingFooter` | `landing/` | Marketing surfaces (`/`, `/compset`) — re-exports `AppHeader` |
| `ScenarioToggle` | `layout/scenario-toggle.tsx` | DOWN / BASE / UP global scenario switch (header-mounted) |
| `ReportShell` | `report/shell/report-shell.tsx` | Top-nav + sidebar + footer + main canvas for every report page |
| `ReportPaper` / `ReportSection` | `report/shell/`, `report/primitives/` | Canonical page wrappers |
| `SettingsLayout` | `settings/settings-layout.tsx` | `/settings/*` shell |
| `SettingsSidebar` | `settings/settings-sidebar.tsx` | Sticky sidebar with active nav item (white-pill / yellow-rail) |
| `SettingsHeader` | `settings/settings-header.tsx` | Page H1 + subtitle on every settings page |

---

## Auth

| Component | Location | Use |
|---|---|---|
| `AuthCard` | `auth/auth-card.tsx` | Login form (email + password + access platform CTA) |
| `LinkedAccountsCard` | `auth/linked-accounts-card.tsx` | LinkedIn / Google / Apple / Microsoft connect grid |
| `ConnectivityStatusBar` | `auth/connectivity-status-bar.tsx` | Lower hero strip on `/login` |
| `PROVIDER_MARKS` | `auth/provider-marks.tsx` | Centralized brand-mark catalog (LinkedIn lucide + Google/Apple/Microsoft monochrome SVG) |

---

## Settings (shared)

| Component | Location | Use |
|---|---|---|
| `ProfileCompletionCard` | `settings/profile-completion-card.tsx` | Bar + percent on `/settings/profile` |
| `ProfileForm` | `settings/profile-form.tsx` | User profile fields |
| `ChangePasswordCard` | `settings/credentials/change-password-card.tsx` | 3 password fields with eye toggles |
| `LinkedAccountCard` | `settings/credentials/linked-account-card.tsx` | Reusable per-provider card with optional Disconnect / Enterprise badge |
| `TwoFactorCard` | `settings/credentials/two-factor-card.tsx` | Dark forest gradient + shield watermark + yellow CTA |
| `ActiveSessionsCard` | `settings/credentials/active-sessions-card.tsx` | Session list + count |

---

## Investment Requirements — shared

| Component | Location | Use |
|---|---|---|
| `InvestmentTabs` | `settings/investment/investment-tabs.tsx` | Hotel Asset / Hotel Market / Hotel Value tabs (route-driven via `usePathname`) |
| `SectionHeader` | `settings/investment/section-header.tsx` | Icon + title + optional `rightSlot` (e.g. ON/OFF toggle) divider |
| `InstitutionalToggle` | `settings/investment/institutional-toggle.tsx` | Canonical ON/OFF switch — used across Market + Value sections |
| `MatchIndicator` | `settings/investment/match-indicator.tsx` | 🟢🟡🔴 + score chip primitive (placeholder for downstream surfaces) |

---

## Investment Requirements — Asset tab

| Component | Use |
|---|---|
| `MyPropertyParametersCard` | Asset Type, Star Category, Asset Class |
| `CapacityOperationCard` | Min/Max rooms (dual-range), days open |
| `LocationTargetsCard` | Country / Market / Submarket + Centro Histórico + Location Score + Renovation YES/NO |
| `PropertySpecsCard` | Distance, Year, GBA, Lot, Ownership, Brand |
| `CapexSettingsCard` + `CapexTable` | Basico/Personalizado + collapsible Hard/Soft/Project Costs editor |
| `RenderSelectorCard` | AI imagery toggles + 4 render rows |
| `FacilitiesCard` | Reusable for MyProperty + CompSet (with optional `bottomSlot`) |
| `CoverageCard` + `CoverageTree` | Country → Market → Submarket expandable tree |
| `DualRangeSlider` | Two-thumb min/max range primitive (custom styled-jsx thumbs) |
| `SliderField` | Generic single-thumb slider with label + value |

All under `components/settings/investment/`.

---

## Investment Requirements — Market tab

| Component | Use |
|---|---|
| `ForecastGrowthCard` | Reusable for ADR + OCC — toggle ON/OFF + CONSTANT/CUSTOM modes + Y1-Y4 grid |
| `RevparTargetCard` | €/room target hurdle |
| `MarketCoverageCard` | Compact country pills (Spain / Italy) — distinct from Asset's tree variant |
| `MarketPrimeCard` | Dark forest premium tier with PRIME badge + ACTIVATE |
| `MarketOverviewCard` | White feature gate with INCLUDED CTA |
| `ExtraPackagesCard` | Yellow add-on stacker with auto-recomputing total |

All under `components/settings/investment/market/`. RevPAR Scenario reuses `RevparScenarioCard` from `components/report/financials`.

---

## Investment Requirements — Value tab

### Primitives
| Component | Use |
|---|---|
| `UnderwritingSlider` | Slider + numeric input + display modes + optional €/$ currency or Guardar action |
| `DisplayModeToggle` | Compact 3-pill Total / Per Room / Per m² toggle |
| `LabeledSlider` | Slider with label + right-aligned value + optional range hint |
| `BasicPremiumPicker` | 2-card mode picker — gates Premium content reveal |
| `CapRatePicker` | Flat segmented Conservador / Mercado / Optimista |
| `SavedScenarioList` | Collapsible scenario list with delete |
| `AcquisitionCostTable` | Editable 5-line table with dark header (Premium); Locked panel (Basic) |
| `FfeReserveYears` | 4-column Y1-Y4 slider grid |

### Section cards
| Component | Use |
|---|---|
| `SiteAcquisitionSection` | Asking Price + Acquisition Cost + Total Investment + Saved Scenarios |
| `ExitInvestmentSection` | Exit Price + Saved Scenarios + Cap Rate + Yield/IRR Project/IRR Equity |
| `RentFactorSection` | € Rent + % Fixed + % Variable with basis selector |
| `FinanceStructureSection` | 8 institutional sliders in 2-col grid |
| `PlForecastSection` | TTM + Mgmt Fee + Marketing-Royalty + FF&E Reserve |

### Sidebar cards
| Component | Use |
|---|---|
| `PremiumSubscriptionCard` | Dark forest gradient + 8 features + ACTIVATE |
| `ProSubscriptionCard` | White card + 7 PRO features + INCLUDED disabled |

All under `components/settings/investment/value/`.

---

## Reports — financial primitives

| Component | Location | Use |
|---|---|---|
| `RevparScenarioCard` | `report/financials/pl-top-cards.tsx` | DOWN / BASE / UP segmented selector — reused by Market tab |
| `ExpenseInflationCard` | same | Payroll / Utilities / Other inflation inputs |
| `EbitdaStabilizedCard` | same | Dark hero with Year-3 margin + staff cost |
| `FinancialMetricCard` | `report/financials/financial-metric-card.tsx` | Editorial card wrapper (light + dark variants) |
| `FinancialTable` + `PLRow` + `PLSection` + `FinancialResultRow` | `report/financials/` | Full P&L table with monthly Year-1 expansion |
| `EditableAssumptionCell` | `report/financials/editable-assumption-cell.tsx` | Inline editable cells with format guards |

---

## Reports — canonical primitives

`components/report/primitives/` carries the catalog used by every report page (`MetricRow`, `MetricTable`, `StatCard`, `StatGrid`, `UpgradeGate`, `UpgradeCard`, `ImageGallery`, `ReportMap`, `PrintPage`, `ReportSection`, `ReportHeader`). See `docs/component-library.md`.

---

## When to add new vs reuse

1. Check this catalog first.
2. If no existing primitive fits, check `docs/component-library.md` for less-common ones.
3. If still no match, add to the closest folder using the design-system tokens (forest-900 primary · yellow-300 accent · slate scale · rounded-2xl · soft shadows · Manrope headlines · Inter body).
4. Update this file + `docs/component-library.md` when you add anything reusable.
