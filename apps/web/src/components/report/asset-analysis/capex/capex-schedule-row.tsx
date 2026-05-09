"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type {
  CapexSchedule,
  OperationalMode,
} from "@/lib/report/capex-renders-data";
import { RangeTrack } from "./range-track";
import { ToggleSelector } from "./toggle-selector";
import { CapexDurationBadge } from "./capex-duration-badge";

export interface CapexScheduleRowProps {
  schedule: CapexSchedule;
  className?: string;
}

const OPERATIONAL_OPTIONS: { id: OperationalMode; label: string }[] = [
  { id: "open", label: "Abierto" },
  { id: "closed", label: "Cerrado" },
];

/**
 * Symmetric 2-column schedule control layout. Rendered as a 6-cell CSS grid
 * (2 cols × 3 rows) so that every row of the LEFT column is locked to the
 * same Y-position as its RIGHT counterpart:
 *
 *   ROW 1   label + badge          │   Abierto / Cerrado toggle
 *   ROW 2   months slider          │   operational % slider
 *   ROW 3   "0 MESES" / "36 MESES" │   "0%" / "100%"
 *
 * Toggle ↔ % wiring:
 *   "Cerrado" → percentage slider snaps to 0
 *   "Abierto" → percentage slider snaps back to 100
 *
 * Manual slider drag is independent — it does not flip the toggle.
 */
export function CapexScheduleRow({ schedule, className }: CapexScheduleRowProps) {
  const [months, setMonths] = useState<number>(schedule.durationMonths);
  const [mode, setMode] = useState<OperationalMode>(schedule.operationalMode);
  const [pct, setPct] = useState<number>(
    schedule.operationalMode === "closed" ? 0 : schedule.operationalPercentage,
  );

  function handleModeChange(next: OperationalMode) {
    setMode(next);
    setPct(next === "closed" ? 0 : 100);
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 gap-x-12 gap-y-4 items-center",
        className,
      )}
    >
      {/* ── ROW 1 ────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <label className="text-sm font-bold text-slate-700">
          Duración del CAPEX
        </label>
        <CapexDurationBadge months={months} />
      </div>
      <div className="flex justify-start items-center">
        <ToggleSelector<OperationalMode>
          options={OPERATIONAL_OPTIONS}
          selectedId={mode}
          onChange={handleModeChange}
          size="lg"
          hideOnPrint={false}
        />
      </div>

      {/* ── ROW 2 — paired sliders, locked to the same grid row ──────────── */}
      <RangeTrack
        value={months}
        min={schedule.minMonths}
        max={schedule.maxMonths}
        onChange={setMonths}
        ariaLabel="Duración del CAPEX"
      />
      <RangeTrack
        value={pct}
        min={0}
        max={100}
        onChange={setPct}
        ariaLabel="Porcentaje operativo durante CAPEX"
      />

      {/* ── ROW 3 ────────────────────────────────────────────────────────── */}
      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <span>{schedule.minMonths} MESES</span>
        <span>{schedule.maxMonths} MESES</span>
      </div>
      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
