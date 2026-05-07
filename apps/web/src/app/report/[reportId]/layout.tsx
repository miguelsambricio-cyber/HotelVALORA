import type { ReactNode } from "react";
import { ReportProvider } from "@/components/report/report-context";
import { ReportLayout } from "@/components/report/layout/report-layout";
import { getMockReport } from "@/lib/report/mock-data";

// TODO: replace with real API fetch once GET /api/v1/reports/{reportId} exists
async function fetchReport(reportId: string) {
  return getMockReport(reportId);
}

interface Props {
  params: { reportId: string };
  children: ReactNode;
}

export default async function ReportRootLayout({ params, children }: Props) {
  const report = await fetchReport(params.reportId);

  return (
    <ReportProvider report={report}>
      <ReportLayout reportId={params.reportId}>
        {children}
      </ReportLayout>
    </ReportProvider>
  );
}

export function generateMetadata({ params }: { params: { reportId: string } }) {
  return {
    title: `Informe de Valoración — HotelVALORA`,
  };
}
