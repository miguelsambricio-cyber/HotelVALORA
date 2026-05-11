import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgentDashboard } from "@/components/admin";
import { IntelligenceTerminal } from "@/components/admin/intelligence/intelligence-terminal";
import { AGENT_REGISTRY, ALL_AGENTS, isAgentId } from "@/lib/admin/agents";
import { MOCK_TERMINAL_DATA } from "@/lib/admin/intelligence";

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_AGENTS.map((a) => ({ agentId: a.id }));
}

export function generateMetadata({
  params,
}: {
  params: { agentId: string };
}): Metadata {
  if (!isAgentId(params.agentId)) {
    return { title: "Unknown agent · Admin" };
  }
  const agent = AGENT_REGISTRY[params.agentId];
  if (params.agentId === "market_intelligence") {
    return {
      title: "Market Intelligence Terminal · HotelVALORA",
      description:
        "Institutional hospitality intelligence terminal — daily transactions, projects, refinancings, JVs, repositionings. Original source URLs preserved.",
    };
  }
  return {
    title: `${agent.name} · Admin`,
    description: agent.purpose,
  };
}

/**
 * /user/admin/agents/[agentId] — per-agent operational dashboard.
 *
 * Pre-rendered at build time (one route per registered agent). The
 * `market_intelligence` agent renders the institutional Intelligence
 * Terminal instead of the standard agent dashboard — it IS the terminal.
 *
 * Phase 3 flips MOCK_TERMINAL_DATA to a Supabase read across
 * market_news × hotel_transactions × hotel_projects × news_entities.
 */
export default function AgentDetailPage({
  params,
}: {
  params: { agentId: string };
}) {
  if (!isAgentId(params.agentId)) notFound();
  if (params.agentId === "market_intelligence") {
    return <IntelligenceTerminal data={MOCK_TERMINAL_DATA} />;
  }
  const agent = AGENT_REGISTRY[params.agentId];
  return <AgentDashboard agent={agent} />;
}
