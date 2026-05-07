import { PDFExportButton } from "@/components/report/ui/pdf-export-button";
import { cn } from "@/lib/utils";

interface PaperHeaderProps {
  sectionLabel: string;
  title: string;
  titleSize?: "2xl" | "4xl";
  headerRight?: React.ReactNode;
}

function PaperHeader({ sectionLabel, title, titleSize = "2xl", headerRight }: PaperHeaderProps) {
  return (
    <div className="flex items-start justify-between px-8 py-6 border-b border-blue-100 bg-white print:px-4 print:py-2">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          {sectionLabel}
        </p>
        <div className="flex flex-col md:flex-row items-start md:items-baseline justify-between gap-3">
          <h2
            className={cn(
              "font-bold font-headline tracking-tight text-forest-900 leading-tight print:text-base",
              titleSize === "4xl" ? "text-4xl font-extrabold" : "text-2xl"
            )}
          >
            {title}
          </h2>
          {headerRight && (
            <div className="shrink-0 print:hidden">{headerRight}</div>
          )}
        </div>
      </div>
      <div className="mt-1 ml-6 shrink-0">
        <PDFExportButton />
      </div>
    </div>
  );
}

interface ReportPaperProps {
  sectionLabel: string;
  title: string;
  titleSize?: "2xl" | "4xl";
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export function ReportPaper({
  sectionLabel,
  title,
  titleSize,
  headerRight,
  children,
}: ReportPaperProps) {
  return (
    <div className="bg-white shadow-2xl border-x border-t border-blue-100 rounded-t-xl overflow-hidden graph-paper print:shadow-none print:rounded-none print:border-none print:overflow-visible">
      <PaperHeader
        sectionLabel={sectionLabel}
        title={title}
        titleSize={titleSize}
        headerRight={headerRight}
      />
      <div className="bg-white/95 print:bg-white">{children}</div>
    </div>
  );
}
