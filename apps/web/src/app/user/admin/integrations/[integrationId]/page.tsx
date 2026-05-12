import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  INTEGRATION_IDS,
  getIntegrationById,
} from "@/lib/admin/integrations";
import { IntegrationDetail } from "@/components/admin/integrations/integration-detail";
import {
  getCredentialsAudit,
  getCredentialsStatus,
} from "@/lib/intelligence/credentials-store";

interface Params {
  params: { integrationId: string };
}

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  // Kept for static manifest discovery — the page itself is now dynamic
  // (it reads credentials status server-side per request).
  return INTEGRATION_IDS.map((integrationId) => ({ integrationId }));
}

export function generateMetadata({ params }: Params): Metadata {
  const integration = getIntegrationById(params.integrationId);
  if (!integration) return { title: "Integration not found · HotelVALORA" };
  return {
    title: `${integration.name} · Integration · HotelVALORA`,
    description: integration.tagline,
  };
}

export default async function IntegrationDetailPage({ params }: Params) {
  const integration = getIntegrationById(params.integrationId);
  if (!integration) notFound();

  // Server-side: fetch real credentials status + audit when authenticated.
  // For public integrations (requiresAuth=false) we still return an empty
  // status object so the panel can render the "No credentials required"
  // banner without conditional logic.
  const [credentialsStatus, credentialsAudit] = await Promise.all([
    integration.requiresAuth
      ? getCredentialsStatus(integration.id)
      : Promise.resolve(undefined),
    integration.requiresAuth
      ? getCredentialsAudit(integration.id, 10)
      : Promise.resolve([]),
  ]);

  return (
    <IntegrationDetail
      integration={integration}
      credentialsStatus={credentialsStatus}
      credentialsAudit={credentialsAudit}
    />
  );
}
