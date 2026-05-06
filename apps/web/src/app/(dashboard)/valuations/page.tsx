import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ValuationTable } from "@/components/valuations/valuation-table";

export const metadata: Metadata = { title: "Valuations" };

export default function ValuationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Valuations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            DCF models, income-cap, and sales comp valuations
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> New Valuation
        </Button>
      </div>
      <ValuationTable />
    </div>
  );
}
