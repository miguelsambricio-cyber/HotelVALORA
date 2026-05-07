import type { ReportMetadata } from "@/types/report";

export function getMockReport(reportId: string): ReportMetadata {
  return {
    id: reportId,
    hotelId: "hotel-001",
    hotelName: "Hotel Alfonso XIII",
    hotelAddress: "Calle San Fernando, 2",
    hotelCity: "Sevilla",
    hotelCountry: "España",
    starRating: 5,
    roomCount: 151,
    category: "Luxury",
    reportDate: new Date().toISOString(),
    reportPeriod: "FY2024",
    preparedBy: "HotelVALORA Intelligence Platform",
    preparedFor: "Confidencial — Uso Interno",
    status: "draft",
    confidentiality: "confidential",
    version: "1.0",
  };
}
