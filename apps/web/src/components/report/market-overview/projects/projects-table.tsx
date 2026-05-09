"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectRow } from "@/lib/report/projects-data";
import { StatusBadge } from "./status-badge";

export interface ProjectsTableProps {
  title: string;
  rows: ProjectRow[];
  /** Optional click handler for the "+" button (currently a placeholder) */
  onAdd?: () => void;
  className?: string;
}

const COLUMN_HEADERS = [
  { key: "inc",          label: "Inc.",                align: "center", widthClass: "w-12", printHide: true },
  { key: "name",         label: "Asset / Hotel Name",  align: "left" },
  { key: "keys",         label: "Keys",                align: "left" },
  { key: "status",       label: "Status",              align: "left" },
  { key: "date",         label: "Date",                align: "left" },
  { key: "development",  label: "Development",         align: "right" },
  { key: "price-key",    label: "Price / Key",         align: "right" },
  { key: "price-sqm",    label: "Price / m²",          align: "right" },
  { key: "market",       label: "Market",              align: "left" },
  { key: "submarket",    label: "Submarket",           align: "left" },
  { key: "class",        label: "Class",               align: "left" },
  { key: "category",     label: "Category",            align: "left" },
  { key: "owner",        label: "Owner",               align: "left" },
  { key: "developer",    label: "Developer",           align: "left" },
  { key: "location",     label: "Location",            align: "center" },
  { key: "confort",      label: "Confort",             align: "center" },
  { key: "construction", label: "Construction Type",   align: "right" },
  { key: "zip",          label: "ZIP",                 align: "left" },
  { key: "facilities",   label: "Facilities",          align: "left" },
] as const;

const ALIGN_CLASS: Record<string, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/**
 * Institutional 19-column projects table. Mirrors `TransactionsTable` chrome
 * (sticky-style header bar with title + "Add" CTA, divide-y rows, soft
 * row-hover with emerald asset-name highlight, horizontal scroll on overflow)
 * and adds a Status pill column plus Owner / Developer / Construction Type
 * fields specific to the projects domain.
 */
export function ProjectsTable({
  title,
  rows,
  onAdd,
  className,
}: ProjectsTableProps) {
  const [included, setIncluded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.included])),
  );

  const toggle = (id: string) =>
    setIncluded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <section
      className={cn(
        "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden",
        "print:shadow-none",
        className,
      )}
    >
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 print:py-3">
        <h3 className="text-lg font-extrabold text-forest-900 font-headline uppercase tracking-tight">
          {title}
        </h3>
        <button
          type="button"
          aria-label="Add project"
          onClick={onAdd}
          className="w-8 h-8 rounded-full bg-white hover:bg-slate-50 text-slate-600 hover:text-emerald-700 flex items-center justify-center transition-colors shadow-sm border border-slate-200 print:hidden"
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
            <tr>
              {COLUMN_HEADERS.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-6 py-4",
                    ALIGN_CLASS[col.align],
                    "widthClass" in col && col.widthClass,
                    "printHide" in col && col.printHide && "print:hidden",
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-slate-50/80 transition-colors group print:break-inside-avoid"
              >
                <td className="px-6 py-4 text-center print:hidden">
                  <input
                    type="checkbox"
                    checked={!!included[row.id]}
                    onChange={() => toggle(row.id)}
                    aria-label={`Include ${row.hotelName}`}
                    className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                  />
                </td>
                <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                  {row.hotelName}
                </td>
                <td className="px-6 py-4">{row.keys}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs">{row.date}</td>
                <td className="px-6 py-4 text-right font-semibold">
                  {row.development}
                </td>
                <td className="px-6 py-4 text-right text-slate-600">
                  {row.pricePerKey}
                </td>
                <td className="px-6 py-4 text-right text-slate-500 text-xs">
                  {row.pricePerSqm}
                </td>
                <td className="px-6 py-4">{row.market}</td>
                <td className="px-6 py-4">{row.submarket}</td>
                <td className="px-6 py-4">{row.class}</td>
                <td className="px-6 py-4">{row.category}</td>
                <td className="px-6 py-4">{row.owner}</td>
                <td className="px-6 py-4">{row.developer}</td>
                <td className="px-6 py-4 text-center">
                  {row.locationScore.toFixed(1)}
                </td>
                <td className="px-6 py-4 text-center">
                  {row.confortScore.toFixed(1)}
                </td>
                <td className="px-6 py-4 text-right">{row.constructionType}</td>
                <td className="px-6 py-4">{row.zip}</td>
                <td className="px-6 py-4">{row.facilities}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
