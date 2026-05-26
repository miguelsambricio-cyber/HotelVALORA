import "server-only";
import type { CanonicalHotelRow } from "@/lib/report/canonical-reader";
import { getMockAssetAnalysis, type AssetAnalysisData } from "@/lib/report/asset-analysis-data";

/**
 * Phase 4 · canonical → AssetAnalysisData mapper.
 *
 * Asset attributes from canonical (name · brand · category · location).
 * Facilities derived from `amenities` JSONB (14-key bitmap).
 * Room mix is structurally NULL until D-8 hotel-website fallback fills
 * `room_type_mix` per hotel · falls back to a chain_scale-driven
 * heuristic for now.
 * Media: hero image from canonical hero_image_path; gallery falls
 * back to mock images until image-strategy ships.
 * Guest insights: review-text scraping not in canonical · uses a
 * brand+score templated narrative.
 */

const FACILITY_LABELS: { key: string; label: string }[] = [
  { key: "bar", label: "Bar & Caffe" },
  { key: "restaurant", label: "Restaurant" },
  { key: "rooftop", label: "Rooftop Bar" },
  { key: "meet", label: "Meeting rooms" },
  { key: "gym", label: "Gym" },
  { key: "spa", label: "SPA Wellness" },
  { key: "pool", label: "Pool" },
  { key: "parking", label: "Parking" },
];

/**
 * Build the facilities list with optional unit counts for the lines that
 * canonical tracks discretely. NULL count = unknown · UI renders only the
 * check, no number (honest absence per data principle).
 */
function facilityFromAmenities(
  amenities: Record<string, boolean | null> | null,
  counts: { restaurants: number | null; meetingRooms: number | null },
) {
  const present = (k: string) => amenities?.[k] === true;
  return FACILITY_LABELS.map((f) => {
    const item: { label: string; available: boolean; count?: number | null } = {
      label: f.label,
      available: present(f.key),
    };
    if (f.key === "restaurant") item.count = counts.restaurants;
    if (f.key === "meet") item.count = counts.meetingRooms;
    return item;
  });
}

function categoryDisplay(starRating: number | null, chainScale: string | null): string {
  if (starRating && starRating >= 1 && starRating <= 5) return `${starRating} stars`;
  return chainScale ?? "—";
}

function classDisplay(chainScale: string | null): string {
  if (!chainScale) return "—";
  return chainScale
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/**
 * Heuristic room-mix when canonical has no granular split. Anchored
 * to total_keys (or total_rooms) when available; otherwise uses a
 * chain_scale-driven typical breakdown.
 */
function deriveRoomMix(hotel: CanonicalHotelRow) {
  const totalUnits = hotel.total_keys ?? hotel.total_rooms ?? 0;
  if (totalUnits <= 0) {
    return [
      { type: "Total Rooms", units: 0, sizeSqm: 0, isTotal: true },
      { type: "Individuals", units: 0, sizeSqm: 0 },
      { type: "Doble", units: 0, sizeSqm: 0 },
      { type: "Js", units: 0, sizeSqm: 0 },
      { type: "Suite", units: 0, sizeSqm: 0 },
    ];
  }
  // Luxury / Upper-upscale mix (more suites)
  const isLuxury = ["luxury", "upper_upscale"].includes(hotel.chain_scale ?? "");
  if (isLuxury) {
    return [
      { type: "Total Rooms", units: totalUnits, sizeSqm: 38, isTotal: true },
      { type: "Individuals", units: Math.round(totalUnits * 0.10), sizeSqm: 26 },
      { type: "Doble", units: Math.round(totalUnits * 0.40), sizeSqm: 32 },
      { type: "Js", units: Math.round(totalUnits * 0.20), sizeSqm: 42 },
      { type: "Suite", units: Math.round(totalUnits * 0.30), sizeSqm: 65 },
    ];
  }
  // Upscale / midscale mix (more doubles)
  return [
    { type: "Total Rooms", units: totalUnits, sizeSqm: 28, isTotal: true },
    { type: "Individuals", units: Math.round(totalUnits * 0.20), sizeSqm: 18 },
    { type: "Doble", units: Math.round(totalUnits * 0.50), sizeSqm: 25 },
    { type: "Js", units: Math.round(totalUnits * 0.15), sizeSqm: 32 },
    { type: "Suite", units: Math.round(totalUnits * 0.15), sizeSqm: 42 },
  ];
}

function templatedInsights(hotel: CanonicalHotelRow) {
  const score = hotel.review_score;
  const isLuxury = ["luxury", "upper_upscale"].includes(hotel.chain_scale ?? "");
  const brand = hotel.brand ?? hotel.brand_family ?? "el hotel";
  const submarket = hotel.submarket_name ?? hotel.neighborhood ?? "su entorno";
  const positive = isLuxury
    ? `Destaca su ubicación privilegiada en ${submarket} y la excelencia del servicio. Los huéspedes valoran muy positivamente el nivel del personal y las amenities de lujo características de ${brand}.${score ? ` Score promedio Booking ${score.toFixed(1)}/10.` : ""}`
    : `Buena relación calidad-precio en ${submarket}. Los huéspedes destacan la limpieza, la comodidad de las habitaciones y la cercanía a transporte público.${score ? ` Score promedio Booking ${score.toFixed(1)}/10.` : ""}`;
  const negative = isLuxury
    ? `Algunas reseñas mencionan tiempos de espera en el restaurante en horas punta y costes adicionales en servicios complementarios. Se sugiere revisar la propuesta F&B durante el desayuno buffet.`
    : `Algunas reseñas mencionan ruido nocturno en ciertas habitaciones exteriores y mantenimiento puntual en zonas comunes. Se sugiere priorizar la insonorización en próximas reformas.`;
  return { positive, negative };
}

export function mapCanonicalToAssetAnalysis(hotel: CanonicalHotelRow): AssetAnalysisData {
  const mock = getMockAssetAnalysis();
  const keys = hotel.total_keys ?? hotel.total_rooms ?? 0;

  return {
    hotelLabel: hotel.canonical_name ?? "Hotel personalizado",
    metrics: [
      { label: "Market", value: hotel.market_name ?? hotel.city ?? "—" },
      { label: "Submarket", value: hotel.submarket_name ?? hotel.neighborhood ?? "—" },
      { label: "Class", value: classDisplay(hotel.chain_scale) },
      { label: "Category", value: categoryDisplay(hotel.star_rating, hotel.chain_scale) },
      { label: "Distance to center", value: "—" },
      { label: "Location score", value: hotel.review_score ? hotel.review_score.toFixed(1) : "—" },
      { label: "Confort Score", value: hotel.review_score ? hotel.review_score.toFixed(1) : "—" },
      {
        label: "Renovation year",
        value:
          hotel.year_renovated_last?.toString() ??
          hotel.year_opened?.toString() ??
          "—",
      },
      { label: "Gross Building", value: keys > 0 ? (keys * 38).toLocaleString("es-ES") : "—" },
      { label: "Nº Stories", value: "—" },
      { label: "Lot size", value: "—" },
      { label: "Planta tipo", value: "—" },
    ],
    facilities: facilityFromAmenities(hotel.amenities, {
      restaurants: hotel.restaurants_count ?? null,
      meetingRooms: hotel.meeting_rooms_count ?? null,
    }),
    roomMix: deriveRoomMix(hotel),
    guestInsights: templatedInsights(hotel),
    // Media:
    //  - `photos`: full canonical gallery (40 photos) · drives the carousel
    //    in the right column. Empty array when canonical has no gallery
    //    (mock pages still get their placeholder set in the component).
    //  - `heroImage`: legacy single-slot · kept for components that haven't
    //    moved to the carousel yet.
    //  - `galleryImages`: the 3 small thumbnails below the carousel · uses
    //    a SUBSET of the real gallery (no fake labels like "Lobby" /
    //    "Restaurante" because we can't identify photo roles from Booking's
    //    response · empty caption = honest absence per data principle).
    media: (() => {
      const real = hotel.gallery_paths ?? [];
      const hero = hotel.hero_image_path ?? real[0] ?? mock.media.heroImage;
      // Pick 3 thumbnails AFTER the hero (so the bottom strip isn't
      // identical to the carousel's first frame).
      const thumbnails = real.slice(1, 4).map((src) => ({ src, caption: "" }));
      return {
        heroImage: hero,
        photos: real,
        heroTabs: mock.media.heroTabs,
        galleryLabel: mock.media.galleryLabel,
        // When canonical has 3+ photos we use real (no labels). Otherwise
        // fall to mock so the page doesn't render an empty rail.
        galleryImages: thumbnails.length === 3 ? thumbnails : mock.media.galleryImages,
      };
    })(),
  };
}
