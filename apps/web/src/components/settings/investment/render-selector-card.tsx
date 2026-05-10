"use client";

import { Camera, Edit, PlusCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvestment } from "@/lib/investment";
import { SectionHeader } from "./section-header";

export function RenderSelectorCard() {
  const { criteria, setField } = useInvestment();

  return (
    <section>
      <SectionHeader icon={<Camera size={20} />} title="Renders — AI Image" />

      <div className="space-y-4">
        {/* Master toggle */}
        <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
          <div className="min-w-0">
            <span className="block text-sm font-bold text-forest-900">
              Renders
            </span>
            <p className="mt-0.5 text-xs text-slate-500">
              Include computer-generated visualisations of project assets
            </p>
          </div>
          <Switch
            checked={criteria.rendersEnabled}
            onChange={(v) => setField("rendersEnabled", v)}
          />
        </div>

        {criteria.rendersEnabled && (
          <div className="space-y-6 rounded-xl border border-slate-200 bg-white/60 p-6">
            {/* Auto-select sub-toggle */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-blue-600" />
                <span className="text-sm font-bold text-slate-800">
                  Auto-select AI-generated images
                </span>
              </div>
              <Switch
                checked={criteria.autoSelectAi}
                onChange={(v) => setField("autoSelectAi", v)}
              />
            </div>

            {/* Render rows */}
            <div className="grid grid-cols-1 gap-3">
              {criteria.renderRows.map((row) => (
                <div
                  key={row.id}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-1 items-center gap-6">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-forest-900/10 text-xs font-bold text-forest-900">
                      {String(row.index).padStart(2, "0")}
                    </div>
                    <div className="flex flex-1 items-center gap-10">
                      <RenderField label="Área" value={row.area} />
                      <RenderField label="Tipo" value={row.type} />
                      <RenderField label="Vista" value={row.view} />
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Edit render ${row.area}`}
                    className="p-1 text-slate-400 transition-colors hover:text-forest-900"
                  >
                    <Edit size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add CTA */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-forest-900/20 px-6 py-2.5 text-sm font-bold text-forest-900 transition-colors hover:border-forest-900/40"
              >
                <PlusCircle size={16} />
                Add new automatic renders
              </button>
              <span className="text-[10px] font-medium italic text-slate-500">
                System will generate unique high-fidelity visual representations
                based on these parameters after save
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function RenderField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span className="text-sm font-semibold text-forest-900">{value}</span>
    </div>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
        checked ? "bg-forest-700" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
