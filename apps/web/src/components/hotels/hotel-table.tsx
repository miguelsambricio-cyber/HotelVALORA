"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HotelListItem } from "@/types/hotel";

const STATUS_COLORS: Record<string, string> = {
  operating: "bg-emerald-100 text-emerald-700",
  pipeline: "bg-blue-100 text-blue-700",
  under_renovation: "bg-amber-100 text-amber-700",
  distressed: "bg-red-100 text-red-700",
};

export function HotelTable() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["hotels"],
    queryFn: () => apiClient.get<{ data: HotelListItem[] }>("/assets/hotels").then((r) => r.data),
  });

  if (isLoading) return <div className="text-muted-foreground text-sm p-4">Loading hotels…</div>;
  if (error) return <div className="text-red-500 text-sm p-4">Failed to load hotels.</div>;

  const hotels = data?.data ?? [];

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-right">Keys</th>
              <th className="px-4 py-3">Stars</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {hotels.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No hotels found. Add your first asset or import from Excel.
                </td>
              </tr>
            )}
            {hotels.map((h) => (
              <tr key={h.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer">
                <td className="px-4 py-3 font-medium">{h.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{h.brand ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {h.city}{h.state ? `, ${h.state}` : ""}
                </td>
                <td className="px-4 py-3 text-right font-mono">{h.total_keys}</td>
                <td className="px-4 py-3">{h.star_rating ? `${h.star_rating}★` : "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[h.asset_status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {h.asset_status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
