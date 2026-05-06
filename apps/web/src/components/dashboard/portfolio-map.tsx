import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export function PortfolioMap() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Portfolio Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-48 rounded-md bg-muted text-muted-foreground text-sm">
          Map integration — connect Mapbox or Google Maps with lat/lng from hotel records
        </div>
      </CardContent>
    </Card>
  );
}
