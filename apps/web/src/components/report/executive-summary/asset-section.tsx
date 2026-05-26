import { SubSectionHeading } from "./sub-section-heading";
import { LockedGate } from "@/components/report/ui/locked-gate";
import { HotelPhotoCarousel } from "./hotel-photo-carousel";
import type { AssetData, ExecutiveSummaryMeta } from "@/lib/report/executive-summary-data";

interface FactRow {
  label: string;
  value: string;
  hasDot: boolean;
  strongBorder?: boolean;
}

function AssetFactsTable({ rows }: { rows: FactRow[] }) {
  return (
    <table className="w-full text-sm border-collapse">
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.label}
            className={row.strongBorder ? "border-b border-slate-400" : "border-b border-slate-200"}
          >
            <td className="py-1.5 w-8">
              {row.hasDot && (
                <div className="w-4 h-4 rounded-full border border-slate-400" />
              )}
            </td>
            <td className="py-1.5 font-medium text-slate-600">{row.label}</td>
            <td className="py-1.5 font-bold text-right text-forest-900">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface AssetSectionProps {
  asset: AssetData;
  meta: ExecutiveSummaryMeta;
}

export function AssetSection({ asset, meta }: AssetSectionProps) {
  const rows: FactRow[] = [
    { label: "Name",           value: asset.name,          hasDot: true  },
    { label: "Address",        value: asset.address,       hasDot: false },
    { label: "País",           value: asset.country,       hasDot: true  },
    { label: "Mercado",        value: asset.market,        hasDot: true  },
    { label: "Submercado",     value: asset.submarket,     hasDot: true, strongBorder: true },
    { label: "Type",           value: asset.type,          hasDot: true  },
    { label: "Category",       value: asset.category,      hasDot: true  },
    { label: "Nº Keys",        value: String(asset.keys),  hasDot: true  },
    { label: "Buildable area", value: asset.buildableArea, hasDot: true  },
    { label: "Brand",          value: asset.brand,         hasDot: true  },
  ];

  return (
    <section>
      {/* print:grid-cols-12 + explicit col-span bypass the md: breakpoint
          that Chrome never fires in its narrow print viewport             */}
      <div className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-8 print:gap-4 items-start">

        <div className="md:col-span-7 print:col-span-7">
          <SubSectionHeading title="EXECUTIVE SUMMARY: HOTEL ASSET" />
          <AssetFactsTable rows={rows} />
          <LockedGate rows={["Hotel Personalizado", "CAPEX & Renders"]} tier="PREMIUM" />
        </div>

        <div className="md:col-span-5 print:col-span-5 flex flex-col gap-4 pt-10 print:pt-0 print:gap-2">
          <div className="text-right">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              Report ID: {meta.reportDisplayId} | {meta.reportDate}
            </p>
          </div>
          <HotelPhotoCarousel name={asset.name} photos={asset.photos} />
        </div>

      </div>
    </section>
  );
}
