import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  INTEGRATION_IDS,
  getIntegrationById,
} from "@/lib/admin/integrations";
import { IntegrationDetail } from "@/components/admin/integrations/integration-detail";
import { getCredentialStatus } from "@/lib/intelligence/credentials/store.server";

interface Params {
  params: { integrationId: string };
}

/**
 * Force-dynamic for credentialed sources so the CredentialsPanel always
 * reflects current DB state immediately after provision / rotate /
 * invalidate. revalidatePath in the server actions also covers this, but
 * we go dynamic-by-default to keep operator UX predictable.
 *
 * Build cost is negligible: only 10 integration routes, page itself is
 * a thin server component.
 */
export const dynamic = "force-dynamic";

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

export default async function IntegrationDetailPage({ params }: Params) {
  const integration = getIntegrationById(params.integrationId);
  if (!integration) notFound();

  // Fetch the T1.5 credential descriptor server-side for authenticated
  // sources. The descriptor never includes encrypted bytea — see
  // lib/intelligence/credentials/store.server.ts.
  const credentialDescriptor = integration.requiresAuth
    ? await getCredentialStatus(integration.id)
    : undefined;

  return (
    <IntegrationDetail
      integration={integration}
      credentialDescriptor={credentialDescriptor}
    />
  );
}
