import type { Metadata } from "next";
import { HotelTable } from "@/components/hotels/hotel-table";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";

export const metadata: Metadata = { title: "Hotels" };

export default function HotelsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Hotel Assets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your hotel portfolio — operating, pipeline & distressed
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" /> Import Excel
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> Add Hotel
          </Button>
        </div>
      </div>
      <HotelTable />
    </div>
  );
}
