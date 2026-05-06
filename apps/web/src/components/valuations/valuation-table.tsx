"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<string, "default" | "success" | "warning" | "outline"> = {
  draft: "outline",
  review: "warning",
  final: "success",
  archived: "secondary" as any,
};

export function ValuationTable() {
  // Placeholder — hook up to /valuations/dcf endpoint
  const MOCK = [
    { id: "1", name: "Grand Hyatt Miami — DCF 2026", type: "dcf", status: "final", value: "$182M", ppk: "$395K", cap: "5.8%" },
    { id: "2", name: "Curio Miami Beach — Income Cap", type: "income_cap", status: "review", value: "$98M", ppk: "$462K", cap: "5.2%" },
    { id: "3", name: "AC Brickell — DCF v2", type: "dcf", status: "draft", value: "—", ppk: "—", cap: "—" },
  ];

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3 text-right">$/Key</th>
              <th className="px-4 py-3 text-right">Imp. Cap</th>
            </tr>
          </thead>
          <tbody>
            {MOCK.map((v) => (
              <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer">
                <td className="px-4 py-3 font-medium">{v.name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs uppercase">{v.type.replace("_", " ")}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_MAP[v.status]}>{v.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right font-mono">{v.value}</td>
                <td className="px-4 py-3 text-right font-mono">{v.ppk}</td>
                <td className="px-4 py-3 text-right font-mono">{v.cap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
