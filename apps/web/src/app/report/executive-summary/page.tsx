import { redirect } from "next/navigation";
import { createOrGetReport } from "@/lib/report/report-session";

/**
 * LEGACY BRIDGE · /report/executive-summary
 *
 * Canonical route is /report/[reportId]/executive-summary. This bridge:
 *   - Bootstraps a hotel_report row when legacy input is present
 *     (?canonical_id / ?hotel_id / ?ref) and 308-redirects to the
 *     canonical URL.
 *   - Falls to a sentinel reportId ("legacy-mock") that the [reportId]
 *     page detects as non-UUID and renders the mock canvas. Operator
 *     decision: preserve mock fallback for one more sprint.
 *
 * Remove this file once analytics confirms zero legacy traffic.
 */

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { canonical_id?: string; hotel_id?: string; ref?: string };
}

export default async function LegacyExecutiveSummaryPage({ searchParams = {} }: PageProps) {
  const legacyInput = searchParams?.canonical_id ?? searchParams?.hotel_id ?? searchParams?.ref;
  if (legacyInput) {
    const session = await createOrGetReport({
      input: legacyInput,
      inputParams: { legacy_input: legacyInput, section: "executive-summary" },
    });
    if (session) redirect(`/report/${session.report_id}/executive-summary`);
  }
  redirect("/report/legacy-mock/executive-summary");
}
