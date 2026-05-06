export interface HotelListItem {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  city: string;
  state: string | null;
  country: string;
  total_keys: number;
  asset_status: "operating" | "pipeline" | "under_renovation" | "distressed";
  star_rating: number | null;
}

export interface HotelFinancial {
  id: string;
  hotel_id: string;
  year: number;
  period: string;
  rooms_revenue: number | null;
  total_revenue: number | null;
  occupancy_rate: number | null;
  adr: number | null;
  revpar: number | null;
  noi: number | null;
  noi_margin: number | null;
}

export interface Hotel extends HotelListItem {
  address: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  year_built: number | null;
  year_renovated: number | null;
  gfa_sqft: number | null;
  meeting_space_sqft: number | null;
  management_company: string | null;
  franchise_agreement: string | null;
  owner_entity: string | null;
  chain_scale: string | null;
  meta: Record<string, unknown>;
  financials: HotelFinancial[];
}
