"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MOCK_DATA = [
  { month: "Jan", portfolio: 98, market: 91 },
  { month: "Feb", portfolio: 102, market: 94 },
  { month: "Mar", portfolio: 115, market: 108 },
  { month: "Apr", portfolio: 121, market: 112 },
  { month: "May", portfolio: 118, market: 110 },
  { month: "Jun", portfolio: 130, market: 119 },
  { month: "Jul", portfolio: 138, market: 125 },
  { month: "Aug", portfolio: 135, market: 122 },
  { month: "Sep", portfolio: 128, market: 116 },
  { month: "Oct", portfolio: 120, market: 111 },
  { month: "Nov", portfolio: 110, market: 104 },
  { month: "Dec", portfolio: 118, market: 109 },
];

export function RevParChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>RevPAR — Portfolio vs Market</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={MOCK_DATA}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis tickFormatter={(v) => `$${v}`} className="text-xs" />
            <Tooltip formatter={(v: number) => [`$${v}`, ""]} />
            <Legend />
            <Line
              type="monotone"
              dataKey="portfolio"
              name="Portfolio RevPAR"
              stroke="#6272f1"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="market"
              name="Market RevPAR"
              stroke="#d4af37"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
