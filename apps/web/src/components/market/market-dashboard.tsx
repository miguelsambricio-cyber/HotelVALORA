"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SUPPLY_DATA = [
  { year: "2021", supply: 142500, demand: 95000 },
  { year: "2022", supply: 145200, demand: 110000 },
  { year: "2023", supply: 148000, demand: 120000 },
  { year: "2024", supply: 152000, demand: 128000 },
  { year: "2025E", supply: 155000, demand: 132000 },
];

export function MarketDashboard() {
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Miami Market — Supply vs Demand</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={SUPPLY_DATA}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" className="text-xs" />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} className="text-xs" />
              <Tooltip formatter={(v: number) => [v.toLocaleString(), ""]} />
              <Legend />
              <Bar dataKey="supply" name="Supply (keys)" fill="#6272f1" />
              <Bar dataKey="demand" name="Demand (room nights)" fill="#d4af37" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submarket Stats</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground text-left">
                <th className="px-4 py-3">Submarket</th>
                <th className="px-4 py-3 text-right">Occ</th>
                <th className="px-4 py-3 text-right">ADR</th>
                <th className="px-4 py-3 text-right">RevPAR</th>
                <th className="px-4 py-3 text-right">YoY</th>
              </tr>
            </thead>
            <tbody>
              {[
                { market: "Miami Beach", occ: "74.2%", adr: "$245", revpar: "$182", yoy: "+5.1%" },
                { market: "Brickell/Downtown", occ: "71.8%", adr: "$189", revpar: "$136", yoy: "+3.8%" },
                { market: "Wynwood/Design", occ: "68.5%", adr: "$210", revpar: "$144", yoy: "+8.2%" },
                { market: "Airport/Doral", occ: "76.1%", adr: "$148", revpar: "$113", yoy: "+1.9%" },
              ].map((row) => (
                <tr key={row.market} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{row.market}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.occ}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.adr}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.revpar}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600">{row.yoy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
