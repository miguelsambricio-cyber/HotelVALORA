"use client";

import { Card, CardContent } from "@/components/ui/card";

const MOCK = [
  { name: "Grand Hyatt Miami", city: "Miami", keys: 460, date: "2025-03-15", ppk: "$312K", cap: "6.1%", buyer: "Ares RE" },
  { name: "Curio Miami Beach", city: "Miami Beach", keys: 212, date: "2024-11-20", ppk: "$485K", cap: "5.4%", buyer: "Blackstone" },
  { name: "AC Hotel Brickell", city: "Miami", keys: 178, date: "2024-09-05", ppk: "$290K", cap: "6.8%", buyer: "Marriott Corp" },
  { name: "Cambria Nashville", city: "Nashville", keys: 255, date: "2024-06-18", ppk: "$248K", cap: "7.2%", buyer: "TPG Real Estate" },
];

export function TransactionTable() {
  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-right">Keys</th>
              <th className="px-4 py-3">Sale Date</th>
              <th className="px-4 py-3 text-right">$/Key</th>
              <th className="px-4 py-3 text-right">Cap Rate</th>
              <th className="px-4 py-3">Buyer</th>
            </tr>
          </thead>
          <tbody>
            {MOCK.map((tx) => (
              <tr key={tx.name} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer">
                <td className="px-4 py-3 font-medium">{tx.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{tx.city}</td>
                <td className="px-4 py-3 text-right font-mono">{tx.keys}</td>
                <td className="px-4 py-3 text-muted-foreground">{tx.date}</td>
                <td className="px-4 py-3 text-right font-mono">{tx.ppk}</td>
                <td className="px-4 py-3 text-right font-mono">{tx.cap}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{tx.buyer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
