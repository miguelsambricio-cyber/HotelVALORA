"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UWAssumptions {
  totalKeys: number;
  occupancy: number;
  adr: number;
  revenueGrowth: number;
  noiMargin: number;
  capRateEntry: number;
  capRateExit: number;
  discountRate: number;
}

const DEFAULT: UWAssumptions = {
  totalKeys: 250,
  occupancy: 0.72,
  adr: 185,
  revenueGrowth: 0.035,
  noiMargin: 0.36,
  capRateEntry: 0.065,
  capRateExit: 0.07,
  discountRate: 0.10,
};

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function computeNOI(a: UWAssumptions): number {
  const roomRev = a.totalKeys * 365 * a.occupancy * a.adr;
  return roomRev * a.noiMargin;
}

export function UnderwritingWorkbench() {
  const [uw, setUw] = useState<UWAssumptions>(DEFAULT);

  const noi = computeNOI(uw);
  const valuationEntry = noi / uw.capRateEntry;
  const valuationExit = (noi * Math.pow(1 + uw.revenueGrowth, 10)) / uw.capRateExit;
  const ppkEntry = valuationEntry / uw.totalKeys;

  function field(label: string, key: keyof UWAssumptions, format: "pct" | "dollar" | "int") {
    const val = uw[key] as number;
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">{label}</label>
        <input
          type="number"
          step={format === "pct" ? 0.001 : format === "dollar" ? 1 : 1}
          value={format === "pct" ? +(val * 100).toFixed(2) : val}
          onChange={(e) => {
            const raw = parseFloat(e.target.value);
            setUw((prev) => ({
              ...prev,
              [key]: format === "pct" ? raw / 100 : raw,
            }));
          }}
          className="h-8 rounded-md border bg-background px-2 text-sm font-mono"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
      {/* Inputs */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Assumptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {field("Total Keys", "totalKeys", "int")}
          {field("Stabilized Occupancy (%)", "occupancy", "pct")}
          {field("ADR ($)", "adr", "dollar")}
          {field("Revenue Growth (%)", "revenueGrowth", "pct")}
          {field("NOI Margin (%)", "noiMargin", "pct")}
          {field("Entry Cap Rate (%)", "capRateEntry", "pct")}
          {field("Exit Cap Rate (%)", "capRateExit", "pct")}
          {field("Discount Rate (%)", "discountRate", "pct")}
          <Button className="w-full mt-2" size="sm">Run Full DCF via API</Button>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Indicative Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Stabilized NOI", value: `$${fmt(noi)}` },
              { label: "Value @ Entry Cap", value: `$${fmt(valuationEntry)}` },
              { label: "Price / Key (Entry)", value: `$${fmt(ppkEntry)}` },
              { label: "Exit Value (Y10)", value: `$${fmt(valuationExit)}` },
              { label: "RevPAR", value: `$${fmt(uw.adr * uw.occupancy, 2)}` },
              { label: "Room Revenue", value: `$${fmt(uw.totalKeys * 365 * uw.occupancy * uw.adr)}` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-md border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-display text-xl font-bold mt-1">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            * Indicative only. Run Full DCF via API for detailed cash-flow schedule, sensitivity table, DSCR, IRR, and equity multiple.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
