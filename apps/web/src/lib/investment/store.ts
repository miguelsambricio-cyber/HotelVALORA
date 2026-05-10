"use client";

// Investment criteria store — persisted Zustand. Same persistence
// pattern as the auth + profile stores: writes to localStorage so the
// criteria survive reload, but stay swappable for a real backend
// (PUT /api/v1/me/investment-criteria) when ready.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CAPEX_TREE } from "./capex";
import { buildInitialAcquisitionCostEntries } from "./value-acquisition";
import type {
  AcquisitionCostEntry,
  BasicPremiumMode,
  CapexMode,
  CapexUnit,
  CapexValueMap,
  CurrencyCode,
  DisplayMode,
  FacilityId,
  ForecastGrowth,
  InvestmentCriteria,
  MarketAssumptions,
  RentBasis,
  RenderRow,
  SavedScenario,
  UnderwritingScenario,
  ValueAssumptions,
} from "./types";

interface InvestmentState {
  criteria: InvestmentCriteria;

  // Field setters (typed slice mutations)
  setField: <K extends keyof InvestmentCriteria>(
    key: K,
    value: InvestmentCriteria[K],
  ) => void;

  toggleMyPropertyFacility: (id: FacilityId) => void;
  toggleCompsetFacility: (id: FacilityId) => void;

  setCapexMode: (mode: CapexMode) => void;
  setCapexValue: (lineId: string, value: number | null) => void;
  setCapexUnit: (lineId: string, unit: CapexUnit) => void;

  // ── Market tab mutations ───────────────────────────────────────────
  setAdrGrowth: (next: ForecastGrowth) => void;
  setOccGrowth: (next: ForecastGrowth) => void;
  setRevparScenario: (scenario: UnderwritingScenario) => void;
  setRevparTarget: (eur: number) => void;
  resetMarket: () => void;

  // ── Value tab mutations (5 sub-blocks) ─────────────────────────────
  // Section 1 — Site Acquisition
  setSiteAcqEnabled: (v: boolean) => void;
  setAskingPrice: (eur: number) => void;
  setAskingPriceMode: (mode: DisplayMode) => void;
  setAskingPriceCurrency: (c: CurrencyCode) => void;
  setAcquisitionCostMode: (mode: BasicPremiumMode) => void;
  setAcquisitionCostHeader: (entry: AcquisitionCostEntry) => void;
  setAcquisitionCostLine: (lineId: string, entry: AcquisitionCostEntry) => void;
  setTotalInvestment: (eur: number) => void;
  setTotalInvestmentMode: (mode: DisplayMode) => void;
  addSiteScenario: () => void;
  removeSiteScenario: (id: string) => void;

  // Section 2 — Exit Investment
  setExitEnabled: (v: boolean) => void;
  setExitPrice: (eur: number) => void;
  setExitPriceMode: (mode: DisplayMode) => void;
  addExitScenario: () => void;
  removeExitScenario: (id: string) => void;
  setCapRateScenario: (s: UnderwritingScenario) => void;
  setYieldTarget: (pct: number) => void;
  setIrrProject: (pct: number) => void;
  setIrrEquity: (pct: number) => void;

  // Section 3 — Rent Factor
  setRentEnabled: (v: boolean) => void;
  setRentEur: (eur: number) => void;
  setRentMode: (mode: DisplayMode) => void;
  setFixedRentPct: (pct: number) => void;
  setFixedRentBasis: (b: RentBasis) => void;
  setVariableRentPct: (pct: number) => void;
  setVariableRentBasis: (b: RentBasis) => void;

  // Section 4 — Finance Structure
  setFinanceEnabled: (v: boolean) => void;
  setFinanceField: <K extends keyof InvestmentCriteria["value"]["financeStructure"]>(
    key: K,
    value: InvestmentCriteria["value"]["financeStructure"][K],
  ) => void;

  // Section 5 — P&L Forecast
  setPlEnabled: (v: boolean) => void;
  setTtm: (n: number) => void;
  setMgmtFeeMode: (m: BasicPremiumMode) => void;
  setBaseFeePct: (pct: number) => void;
  setBaseFeeBasis: (b: RentBasis) => void;
  setIncentiveFeePct: (pct: number) => void;
  setIncentiveFeeBasis: (b: RentBasis) => void;
  setMarketingRoyalty: (pct: number) => void;
  setFfeReserveYear: (yearIdx: 0 | 1 | 2 | 3, pct: number) => void;

  /** v1: no-op + console.info. v2: PUT to backend */
  commit: () => Promise<{ ok: boolean; error?: string }>;
}

// Build the default capex value map from the tree (every line/group id
// gets an empty value with its default unit)
function buildInitialCapexValues(): CapexValueMap {
  const map: CapexValueMap = {};
  // Top-level "TOTAL CAPEX" pseudo-row
  map["total-capex"] = { value: null, unit: "total" };
  for (const group of CAPEX_TREE) {
    map[group.id] = { value: null, unit: group.defaultUnit };
    for (const child of group.children) {
      map[child.id] = { value: null, unit: child.defaultUnit };
    }
  }
  return map;
}

const DEFAULT_RENDER_ROWS: RenderRow[] = [
  { id: "r1", index: 1, area: "Fachada", type: "Moderna", view: "Portada" },
  { id: "r2", index: 2, area: "Lobby", type: "Moderna", view: "Final" },
  { id: "r3", index: 3, area: "Room", type: "Vanguard", view: "Reporte" },
  { id: "r4", index: 4, area: "F&B", type: "Clásico", view: "Reporte" },
];

const INITIAL_MARKET: MarketAssumptions = {
  // ADR defaults to CUSTOM with the values shown in the Stitch reference
  adrGrowth: {
    enabled: true,
    mode: "custom",
    constant: 2.0,
    custom: [3.5, 4.0, 2.5, 2.0],
  },
  // OCC defaults to CONSTANT 2.0% (Stitch active state)
  occGrowth: {
    enabled: true,
    mode: "constant",
    constant: 2.0,
    custom: [0, 0, 0, 0],
  },
  revparScenario: "base",
  revparTargetEur: 100,
};

const INITIAL_VALUE: ValueAssumptions = {
  siteAcquisition: {
    enabled: true,
    askingPriceEur: 16_500_000,
    askingPriceMode: "total",
    askingPriceCurrency: "eur",
    acquisitionCostMode: "premium",
    acquisitionCostHeader: { value: null, unit: "total" },
    acquisitionCostLines: buildInitialAcquisitionCostEntries(),
    totalInvestmentEur: 18_000_000,
    totalInvestmentMode: "total",
    savedScenarios: [
      { id: "s1", name: "Scenario 1", amount: 50_000_000, mode: "total", variant: "max" },
      { id: "s2", name: "Scenario 2", amount: 10_000_000, mode: "total", variant: "min" },
      { id: "s3", name: "Scenario 3", amount: 500_000, mode: "per_room", variant: "max" },
    ],
  },
  exitInvestment: {
    enabled: true,
    exitPriceEur: 25_000_000,
    exitPriceMode: "total",
    savedScenarios: [
      { id: "x1", name: "Exit Scenario 1", amount: 30_000_000, mode: "total", variant: "min" },
    ],
    capRateScenario: "downside", // = "Conservador" preset highlighted in Stitch
    yieldTargetPct: 6.5,
    irrProjectPct: 8.0,
    irrEquityPct: 15.0,
  },
  rentFactor: {
    enabled: false,
    rentEur: 0,
    rentMode: "total",
    fixedRentPct: 25.0,
    fixedRentBasis: "gop",
    variableRentPct: 10.0,
    variableRentBasis: "revenue",
  },
  financeStructure: {
    enabled: true,
    acquisitionDebtPct: 60,
    capexDebtPct: 70,
    interestRatePct: 4.5,
    amortAssetYears: 15,
    gracePeriodYears: 2,
    amortCapexYears: 10,
    bulletPaymentPct: 0,
    openingFeePct: 1.0,
  },
  plForecast: {
    enabled: true,
    ttm: 10,
    mgmtFeeMode: "premium",
    baseFeePct: 2.0,
    baseFeeBasis: "revenue",
    incentiveFeePct: 8.0,
    incentiveFeeBasis: "gop",
    marketingRoyaltyPct: 1.5,
    ffeReserveByYear: [1.0, 2.0, 3.0, 4.0],
  },
};

const INITIAL_CRITERIA: InvestmentCriteria = {
  assetType: "hotel",
  starCategory: 5,
  assetClass: "midscale",

  minRooms: 80,
  maxRooms: 250,
  daysOpenYearly: 365,

  country: "Spain",
  marketTarget: "Madrid",
  submarket: "Salamanca",
  centroHistorico: false,
  targetLocationScore: 8.5,
  comfortScoreRenovation: 7.0,
  forRenovation: "no",

  distanceToCenterKm: 5,
  yearToBuild: "any",
  grossBuildingM2: 2500,
  lotSizeM2: 1200,
  ownershipInterest: "freehold",
  brandManagement: "unencumbered",

  capexMode: "personalizado",
  capexValues: buildInitialCapexValues(),

  rendersEnabled: true,
  autoSelectAi: true,
  renderRows: DEFAULT_RENDER_ROWS,

  myPropertyFacilities: ["restaurant", "meeting-events", "gym", "spa-wellness"],
  compsetFacilities: ["restaurant", "meeting-events", "gym"],
  compsetDistanceKm: 2.5,

  market: INITIAL_MARKET,
  value: INITIAL_VALUE,
};

// ── Value mutation helpers ────────────────────────────────────────────────
// These curry through the deep `criteria.value.<block>` path so the
// individual setters below stay short.

type CriteriaSetter = (
  fn: (s: { criteria: InvestmentCriteria }) => Partial<{ criteria: InvestmentCriteria }>,
) => void;

function patchSite(set: CriteriaSetter, patch: Partial<ValueAssumptions["siteAcquisition"]>) {
  set((s) => ({
    criteria: {
      ...s.criteria,
      value: {
        ...s.criteria.value,
        siteAcquisition: { ...s.criteria.value.siteAcquisition, ...patch },
      },
    },
  }));
}
function patchExit(set: CriteriaSetter, patch: Partial<ValueAssumptions["exitInvestment"]>) {
  set((s) => ({
    criteria: {
      ...s.criteria,
      value: {
        ...s.criteria.value,
        exitInvestment: { ...s.criteria.value.exitInvestment, ...patch },
      },
    },
  }));
}
function patchRent(set: CriteriaSetter, patch: Partial<ValueAssumptions["rentFactor"]>) {
  set((s) => ({
    criteria: {
      ...s.criteria,
      value: {
        ...s.criteria.value,
        rentFactor: { ...s.criteria.value.rentFactor, ...patch },
      },
    },
  }));
}
function patchFinance(
  set: CriteriaSetter,
  patch: Partial<ValueAssumptions["financeStructure"]>,
) {
  set((s) => ({
    criteria: {
      ...s.criteria,
      value: {
        ...s.criteria.value,
        financeStructure: { ...s.criteria.value.financeStructure, ...patch },
      },
    },
  }));
}
function patchPl(set: CriteriaSetter, patch: Partial<ValueAssumptions["plForecast"]>) {
  set((s) => ({
    criteria: {
      ...s.criteria,
      value: {
        ...s.criteria.value,
        plForecast: { ...s.criteria.value.plForecast, ...patch },
      },
    },
  }));
}

export const useInvestmentStore = create<InvestmentState>()(
  persist(
    (set, get) => ({
      criteria: INITIAL_CRITERIA,

      setField: (key, value) =>
        set((s) => ({ criteria: { ...s.criteria, [key]: value } })),

      toggleMyPropertyFacility: (id) =>
        set((s) => {
          const current = new Set(s.criteria.myPropertyFacilities);
          if (current.has(id)) current.delete(id);
          else current.add(id);
          return {
            criteria: { ...s.criteria, myPropertyFacilities: Array.from(current) },
          };
        }),

      toggleCompsetFacility: (id) =>
        set((s) => {
          const current = new Set(s.criteria.compsetFacilities);
          if (current.has(id)) current.delete(id);
          else current.add(id);
          return {
            criteria: { ...s.criteria, compsetFacilities: Array.from(current) },
          };
        }),

      setCapexMode: (mode) =>
        set((s) => ({ criteria: { ...s.criteria, capexMode: mode } })),

      setCapexValue: (lineId, value) =>
        set((s) => ({
          criteria: {
            ...s.criteria,
            capexValues: {
              ...s.criteria.capexValues,
              [lineId]: { ...s.criteria.capexValues[lineId], value },
            },
          },
        })),

      setCapexUnit: (lineId, unit) =>
        set((s) => ({
          criteria: {
            ...s.criteria,
            capexValues: {
              ...s.criteria.capexValues,
              [lineId]: { ...s.criteria.capexValues[lineId], unit },
            },
          },
        })),

      // ── Market mutations ────────────────────────────────────────────
      setAdrGrowth: (next) =>
        set((s) => ({
          criteria: { ...s.criteria, market: { ...s.criteria.market, adrGrowth: next } },
        })),

      setOccGrowth: (next) =>
        set((s) => ({
          criteria: { ...s.criteria, market: { ...s.criteria.market, occGrowth: next } },
        })),

      setRevparScenario: (scenario) =>
        set((s) => ({
          criteria: { ...s.criteria, market: { ...s.criteria.market, revparScenario: scenario } },
        })),

      setRevparTarget: (eur) =>
        set((s) => ({
          criteria: { ...s.criteria, market: { ...s.criteria.market, revparTargetEur: eur } },
        })),

      resetMarket: () =>
        set((s) => ({ criteria: { ...s.criteria, market: INITIAL_MARKET } })),

      // ── Value: Section 1 (Site Acquisition) ─────────────────────────
      setSiteAcqEnabled: (v) => patchSite(set, { enabled: v }),
      setAskingPrice: (eur) => patchSite(set, { askingPriceEur: eur }),
      setAskingPriceMode: (mode) => patchSite(set, { askingPriceMode: mode }),
      setAskingPriceCurrency: (c) => patchSite(set, { askingPriceCurrency: c }),
      setAcquisitionCostMode: (mode) => patchSite(set, { acquisitionCostMode: mode }),
      setAcquisitionCostHeader: (entry) =>
        patchSite(set, { acquisitionCostHeader: entry }),
      setAcquisitionCostLine: (lineId, entry) =>
        set((s) => ({
          criteria: {
            ...s.criteria,
            value: {
              ...s.criteria.value,
              siteAcquisition: {
                ...s.criteria.value.siteAcquisition,
                acquisitionCostLines: {
                  ...s.criteria.value.siteAcquisition.acquisitionCostLines,
                  [lineId]: entry,
                },
              },
            },
          },
        })),
      setTotalInvestment: (eur) => patchSite(set, { totalInvestmentEur: eur }),
      setTotalInvestmentMode: (mode) => patchSite(set, { totalInvestmentMode: mode }),
      addSiteScenario: () =>
        set((s) => {
          const site = s.criteria.value.siteAcquisition;
          const id = `s${Date.now().toString(36)}`;
          const next: SavedScenario = {
            id,
            name: `Scenario ${site.savedScenarios.length + 1}`,
            amount: site.totalInvestmentEur,
            mode: site.totalInvestmentMode,
            variant: "max",
          };
          return {
            criteria: {
              ...s.criteria,
              value: {
                ...s.criteria.value,
                siteAcquisition: {
                  ...site,
                  savedScenarios: [...site.savedScenarios, next],
                },
              },
            },
          };
        }),
      removeSiteScenario: (id) =>
        set((s) => ({
          criteria: {
            ...s.criteria,
            value: {
              ...s.criteria.value,
              siteAcquisition: {
                ...s.criteria.value.siteAcquisition,
                savedScenarios: s.criteria.value.siteAcquisition.savedScenarios.filter(
                  (sc) => sc.id !== id,
                ),
              },
            },
          },
        })),

      // ── Value: Section 2 (Exit Investment) ──────────────────────────
      setExitEnabled: (v) => patchExit(set, { enabled: v }),
      setExitPrice: (eur) => patchExit(set, { exitPriceEur: eur }),
      setExitPriceMode: (mode) => patchExit(set, { exitPriceMode: mode }),
      addExitScenario: () =>
        set((s) => {
          const exit = s.criteria.value.exitInvestment;
          const id = `x${Date.now().toString(36)}`;
          const next: SavedScenario = {
            id,
            name: `Exit Scenario ${exit.savedScenarios.length + 1}`,
            amount: exit.exitPriceEur,
            mode: exit.exitPriceMode,
            variant: "max",
          };
          return {
            criteria: {
              ...s.criteria,
              value: {
                ...s.criteria.value,
                exitInvestment: {
                  ...exit,
                  savedScenarios: [...exit.savedScenarios, next],
                },
              },
            },
          };
        }),
      removeExitScenario: (id) =>
        set((s) => ({
          criteria: {
            ...s.criteria,
            value: {
              ...s.criteria.value,
              exitInvestment: {
                ...s.criteria.value.exitInvestment,
                savedScenarios: s.criteria.value.exitInvestment.savedScenarios.filter(
                  (sc) => sc.id !== id,
                ),
              },
            },
          },
        })),
      setCapRateScenario: (sc) => patchExit(set, { capRateScenario: sc }),
      setYieldTarget: (pct) => patchExit(set, { yieldTargetPct: pct }),
      setIrrProject: (pct) => patchExit(set, { irrProjectPct: pct }),
      setIrrEquity: (pct) => patchExit(set, { irrEquityPct: pct }),

      // ── Value: Section 3 (Rent Factor) ──────────────────────────────
      setRentEnabled: (v) => patchRent(set, { enabled: v }),
      setRentEur: (eur) => patchRent(set, { rentEur: eur }),
      setRentMode: (mode) => patchRent(set, { rentMode: mode }),
      setFixedRentPct: (pct) => patchRent(set, { fixedRentPct: pct }),
      setFixedRentBasis: (b) => patchRent(set, { fixedRentBasis: b }),
      setVariableRentPct: (pct) => patchRent(set, { variableRentPct: pct }),
      setVariableRentBasis: (b) => patchRent(set, { variableRentBasis: b }),

      // ── Value: Section 4 (Finance Structure) ────────────────────────
      setFinanceEnabled: (v) => patchFinance(set, { enabled: v }),
      setFinanceField: (key, value) => patchFinance(set, { [key]: value } as Partial<ValueAssumptions["financeStructure"]>),

      // ── Value: Section 5 (P&L Forecast) ─────────────────────────────
      setPlEnabled: (v) => patchPl(set, { enabled: v }),
      setTtm: (n) => patchPl(set, { ttm: n }),
      setMgmtFeeMode: (m) => patchPl(set, { mgmtFeeMode: m }),
      setBaseFeePct: (pct) => patchPl(set, { baseFeePct: pct }),
      setBaseFeeBasis: (b) => patchPl(set, { baseFeeBasis: b }),
      setIncentiveFeePct: (pct) => patchPl(set, { incentiveFeePct: pct }),
      setIncentiveFeeBasis: (b) => patchPl(set, { incentiveFeeBasis: b }),
      setMarketingRoyalty: (pct) => patchPl(set, { marketingRoyaltyPct: pct }),
      setFfeReserveYear: (yearIdx, pct) =>
        set((s) => {
          const next = [...s.criteria.value.plForecast.ffeReserveByYear] as [
            number,
            number,
            number,
            number,
          ];
          next[yearIdx] = pct;
          return {
            criteria: {
              ...s.criteria,
              value: {
                ...s.criteria.value,
                plForecast: { ...s.criteria.value.plForecast, ffeReserveByYear: next },
              },
            },
          };
        }),

      commit: async () => {
        console.info("[investment] commit (v1 = no-op):", get().criteria);
        await new Promise((r) => setTimeout(r, 250));
        return { ok: true };
      },
    }),
    {
      name: "hv-investment-v1",
      version: 3, // bumped — schema added `value` slice (DCF/IRR/debt criteria)
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ criteria: state.criteria }),
      // v1 → v2: hydrate `market` slice. v2 → v3: hydrate `value` slice.
      migrate: (persisted, version) => {
        if (!persisted || typeof persisted !== "object") {
          return { criteria: INITIAL_CRITERIA };
        }
        const p = persisted as { criteria?: Partial<InvestmentCriteria> };
        const merged: InvestmentCriteria = {
          ...INITIAL_CRITERIA,
          ...(p.criteria ?? {}),
        };
        if (version < 2) merged.market = INITIAL_MARKET;
        if (version < 3) merged.value = INITIAL_VALUE;
        return { criteria: merged };
      },
    },
  ),
);

// ── Tuple-style hook ──────────────────────────────────────────────────────

export function useInvestment() {
  const criteria = useInvestmentStore((s) => s.criteria);
  const setField = useInvestmentStore((s) => s.setField);
  const toggleMyPropertyFacility = useInvestmentStore((s) => s.toggleMyPropertyFacility);
  const toggleCompsetFacility = useInvestmentStore((s) => s.toggleCompsetFacility);
  const setCapexMode = useInvestmentStore((s) => s.setCapexMode);
  const setCapexValue = useInvestmentStore((s) => s.setCapexValue);
  const setCapexUnit = useInvestmentStore((s) => s.setCapexUnit);
  const setAdrGrowth = useInvestmentStore((s) => s.setAdrGrowth);
  const setOccGrowth = useInvestmentStore((s) => s.setOccGrowth);
  const setRevparScenario = useInvestmentStore((s) => s.setRevparScenario);
  const setRevparTarget = useInvestmentStore((s) => s.setRevparTarget);
  const resetMarket = useInvestmentStore((s) => s.resetMarket);
  const commit = useInvestmentStore((s) => s.commit);
  return {
    criteria,
    setField,
    toggleMyPropertyFacility,
    toggleCompsetFacility,
    setCapexMode,
    setCapexValue,
    setCapexUnit,
    setAdrGrowth,
    setOccGrowth,
    setRevparScenario,
    setRevparTarget,
    resetMarket,
    commit,
  };
}
