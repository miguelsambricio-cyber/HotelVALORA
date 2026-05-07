/**
 * Slim projection used in search autocomplete dropdowns.
 *
 * Aligns with the `HotelListItem` shape returned by
 * GET /api/v1/assets/hotels — only the fields needed for display.
 */
export interface HotelSearchHit {
  id: string;
  name: string;
  city: string;
  country?: string;
  brand?: string | null;
  operator?: string | null;
  star_rating?: number | null;
}

export interface PricingFeature {
  text: string;
  /** "check" → CheckCircle2  |  "verified" → BadgeCheck */
  icon: "check" | "verified";
}

export interface PricingPlan {
  id: string;
  tier: string;
  name: string;
  subtitle?: string;
  features: PricingFeature[];
  ctaLabel: string;
  href: string;
  featured?: boolean;
}
