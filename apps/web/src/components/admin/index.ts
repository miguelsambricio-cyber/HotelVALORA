// Re-exports for the institutional admin surface. Two sub-trees:
//   ./agents/*      — orbital architecture + per-agent dashboard + slide-out detail panel
//   ./dashboard/*   — Executive Control Room (KPI grid · pipelines · infra · activity)
//
// The admin shell sidebar lives at the root of this module since it is the
// connective tissue between both sub-trees.

export { AgentStatusBadge } from "./agents/agent-status-badge";
export { AgentHealthRing } from "./agents/agent-health-ring";
export { AgentNode } from "./agents/agent-node";
export { AgentOrbit } from "./agents/agent-orbit";
export { AgentLogsPanel } from "./agents/agent-logs-panel";
export { AgentMetricsPanel } from "./agents/agent-metrics-panel";
export { AgentDashboard } from "./agents/agent-dashboard";
export { AgentDetailPanel } from "./agents/agent-detail-panel";

export { KpiCard } from "./dashboard/kpi-card";
export { AiOpsFeatureCard } from "./dashboard/ai-ops-feature-card";
export { PipelineCard } from "./dashboard/pipeline-card";
export { InfraIndicator } from "./dashboard/infra-indicator";
export { ActivityTimeline } from "./dashboard/activity-timeline";
