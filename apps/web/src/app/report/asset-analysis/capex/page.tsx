import { redirect } from "next/navigation";
import { createOrGetReport } from "@/lib/report/report-session";

/**
 * LEGACY BRIDGE · /report/asset-analysis/capex.
 * See /report/executive-summary/page.tsx for the pattern.
 */

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { canonical_id?: string; hotel_id?: string; ref?: string };
}

export default async function LegacyCapexPage({ searchParams = {} }: PageProps) {
  const legacyInput = searchParams?.canonical_id ?? searchParams?.hotel_id ?? searchParams?.ref;
  if (legacyInput) {
    const session = await createOrGetReport({
      input: legacyInput,
      inputParams: { legacy_input: legacyInput, section: "asset-analysis/capex" },
    });
    if (session) redirect(`/report/${session.report_id}/asset-analysis/capex`);
  }
  redirect("/report/legacy-mock/asset-analysis/capex");
}
