import { redirect } from "next/navigation";
import { createOrGetReport } from "@/lib/report/report-session";

/**
 * LEGACY BRIDGE · /report/market-overview.
 * See /report/executive-summary/page.tsx for the pattern.
 */

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { canonical_id?: string; hotel_id?: string; ref?: string };
}

export default async function LegacyMarketOverviewPage({ searchParams = {} }: PageProps) {
  const legacyInput = searchParams?.canonical_id ?? searchParams?.hotel_id ?? searchParams?.ref;
  if (legacyInput) {
    const session = await createOrGetReport({
      input: legacyInput,
      inputParams: { legacy_input: legacyInput, section: "market-overview" },
    });
    if (session) redirect(`/report/${session.report_id}/market-overview`);
  }
  redirect("/report/legacy-mock/market-overview");
}
