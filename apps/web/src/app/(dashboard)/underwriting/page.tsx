import type { Metadata } from "next";
import { UnderwritingWorkbench } from "@/components/underwriting/workbench";

export const metadata: Metadata = { title: "Underwriting" };

export default function UnderwritingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Underwriting Workbench</h1>
        <p className="text-muted-foreground text-sm mt-1">
          NOI projections, DSCR, IRR, equity multiple, and sensitivity analysis
        </p>
      </div>
      <UnderwritingWorkbench />
    </div>
  );
}
