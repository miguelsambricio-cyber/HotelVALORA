import { notFound } from "next/navigation";
import { getSectionById } from "@/lib/report/sections";
import { SectionWrapper } from "@/components/report/sections/section-wrapper";
import { SectionPlaceholder } from "@/components/report/sections/section-placeholder";
import { SectionNav } from "@/components/report/sections/section-nav";
import type { ReportSectionId } from "@/types/report";

interface Props {
  params: { reportId: string; section: string };
}

export default function SectionPage({ params }: Props) {
  const section = getSectionById(params.section);
  if (!section) notFound();

  return (
    <SectionWrapper section={section}>
      {/* Each section's real content will replace SectionPlaceholder */}
      <SectionPlaceholder section={section} />

      <SectionNav
        reportId={params.reportId}
        currentSectionId={section.id as ReportSectionId}
      />
    </SectionWrapper>
  );
}

export function generateMetadata({ params }: Props) {
  const section = getSectionById(params.section);
  return {
    title: section ? `${section.label} — HotelVALORA` : "Informe — HotelVALORA",
  };
}
