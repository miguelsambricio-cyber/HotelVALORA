import { redirect } from "next/navigation";
import { createOrGetReport } from "@/lib/report/report-session";

/**
 * LEGACY BRIDGE · /report/financials (Financials INDEX landing)
 *
 * Bootstraps + redirects to /report/[reportId]/financials when input is
 * present. Without input, falls to /report/legacy-mock/financials which
 * the canonical [reportId] page renders as the catalog with mock-tagged
 * sub-page hrefs. Mock fallback preserved.
 *
 * Closes the leak where the previous static catalog had hardcoded
 * `/report/financials/pl` sub-page hrefs that bypassed the report context.
 */

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { canonical_id?: string; hotel_id?: string; ref?: string };
}

export default async function LegacyFinancialsPage({ searchParams = {} }: PageProps) {
  const legacyInput = searchParams?.canonical_id ?? searchParams?.hotel_id ?? searchParams?.ref;
  if (legacyInput) {
    const session = await createOrGetReport({
      input: legacyInput,
      inputParams: { legacy_input: legacyInput, section: "financials" },
    });
    if (session) redirect(`/report/${session.report_id}/financials`);
  }
  redirect("/report/legacy-mock/financials");
}
