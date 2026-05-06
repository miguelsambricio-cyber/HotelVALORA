export interface Valuation {
  id: string;
  name: string;
  hotel_id: string | null;
  flex_asset_id: string | null;
  valuation_type: "dcf" | "income_cap" | "sales_comp" | "replacement_cost";
  status: "draft" | "review" | "final" | "archived";
  effective_date: string;
  currency: string;
  concluded_value: number | null;
  value_per_key: number | null;
  implied_cap_rate: number | null;
  assumptions: Record<string, unknown>;
  cash_flows: CashFlowRow[];
  sensitivity: Record<string, Record<string, number>>;
  notes: string | null;
}

export interface CashFlowRow {
  year: number | string;
  noi?: number;
  free_cash_flow?: number;
  discount_factor?: number;
  pv?: number;
  terminal_value?: number;
}

export interface Underwriting {
  id: string;
  valuation_id: string;
  projection_years: number;
  stabilized_occupancy: number | null;
  stabilized_adr: number | null;
  revenue_growth_rate: number | null;
  expense_growth_rate: number | null;
  noi_margin: number | null;
  cap_rate_entry: number | null;
  cap_rate_exit: number | null;
  discount_rate: number | null;
  ltv_ratio: number | null;
  debt_service_coverage: number | null;
  irr: number | null;
  equity_multiple: number | null;
}
