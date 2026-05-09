import type { UserRole } from "./types";

export interface RoleOption {
  id: UserRole;
  label: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  { id: "investment-analyst", label: "Investment Analyst" },
  { id: "asset-manager", label: "Asset Manager" },
  { id: "hotel-operator", label: "Hotel Operator" },
  { id: "investor", label: "Investor" },
  { id: "consultant", label: "Consultant" },
  { id: "lender", label: "Lender" },
  { id: "broker", label: "Broker" },
  { id: "other", label: "Other" },
];
