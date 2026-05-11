import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgentDashboard } from "@/components/admin";
import { AGENT_REGISTRY, ALL_AGENTS, isAgentId } from "@/lib/admin/agents";

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
  return {
    title: `${agent.name} · Admin`,
    description: agent.purpose,
  };
}

/**
 * /user/admin/agents/[agentId] — per-agent operational dashboard.
 *
 * Pre-rendered at build time (one route per registered agent). Phase 3
 * flips to dynamic when realtime agent state is wired.
 */
export default function AgentDetailPage({
  params,
}: {
  params: { agentId: string };
}) {
  if (!isAgentId(params.agentId)) notFound();
  const agent = AGENT_REGISTRY[params.agentId];
  return <AgentDashboard agent={agent} />;
}
