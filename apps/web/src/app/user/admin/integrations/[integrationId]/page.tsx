import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  INTEGRATION_IDS,
  getIntegrationById,
} from "@/lib/admin/integrations";
import { IntegrationDetail } from "@/components/admin/integrations/integration-detail";

interface Params {
  params: { integrationId: string };
}

export function generateStaticParams() {
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

export default function IntegrationDetailPage({ params }: Params) {
  const integration = getIntegrationById(params.integrationId);
  if (!integration) notFound();
  return <IntegrationDetail integration={integration} />;
}
