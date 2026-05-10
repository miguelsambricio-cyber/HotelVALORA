"use client";

// Investment criteria store — persisted Zustand. Same persistence
// pattern as the auth + profile stores: writes to localStorage so the
// criteria survive reload, but stay swappable for a real backend
// (PUT /api/v1/me/investment-criteria) when ready.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CAPEX_TREE } from "./capex";
import type {
  CapexMode,
  CapexUnit,
  CapexValueMap,
  FacilityId,
  ForecastGrowth,
  InvestmentCriteria,
  MarketAssumptions,
  RenderRow,
  UnderwritingScenario,
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
};

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

      commit: async () => {
        console.info("[investment] commit (v1 = no-op):", get().criteria);
        await new Promise((r) => setTimeout(r, 250));
        return { ok: true };
      },
    }),
    {
      name: "hv-investment-v1",
      version: 2, // bumped — schema added `market` slice
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ criteria: state.criteria }),
      // Migrate v1 (pre-market) localStorage into v2 by hydrating the
      // missing `market` slice with defaults.
      migrate: (persisted, version) => {
        if (!persisted || typeof persisted !== "object") {
          return { criteria: INITIAL_CRITERIA };
        }
        const p = persisted as { criteria?: Partial<InvestmentCriteria> };
        if (version < 2) {
          return {
            criteria: {
              ...INITIAL_CRITERIA,
              ...(p.criteria ?? {}),
              market: INITIAL_MARKET,
            },
          };
        }
        return persisted as { criteria: InvestmentCriteria };
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
