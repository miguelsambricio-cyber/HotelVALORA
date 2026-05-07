import { redirect } from "next/navigation";

interface Props {
  params: { reportId: string };
}

export default function ReportIndexPage({ params }: Props) {
  redirect(`/report/${params.reportId}/executive-summary`);
}
