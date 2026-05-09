// Canonical KPI / stat card. Re-exports the underlying KPICard implementation
// so that section pages depend on a stable name even if the impl is replaced.

export { KPICard as StatCard } from "@/components/report/kpi/kpi-card";
export { KPIGrid as StatGrid } from "@/components/report/kpi/kpi-grid";
export type { KPIValue as StatValue } from "@/types/report";
