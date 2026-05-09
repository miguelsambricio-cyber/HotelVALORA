// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssetMetricsRow {
  label: string;
  value: string;
}

export interface FacilityItem {
  /** Display label (e.g. "Bar & Caffe") */
  label: string;
  /** True = available (green check). False = not available (slate dash) */
  available: boolean;
}

export interface RoomMixRow {
  /** Type label, e.g. "Total Rooms", "Individuals", "Doble" */
  type: string;
  units: number;
  /** Average size in m² */
  sizeSqm: number;
  /** Bold styling for the totals row */
  isTotal?: boolean;
}

export interface GalleryImage {
  src: string;
  caption: string;
  /** Optional alternate src to swap on click — replicates the Stitch toggle behavior */
  altSrc?: string;
}

export interface PropertyMedia {
  /** Square hero image at the top of the right column */
  heroImage: string;
  /** Tabs below the hero (e.g. "Catastro", "Planos") — first item is active */
  heroTabs: { label: string; href?: string }[];
  /** Section label above the vertical gallery (e.g. "GRAFICOS: MYPROPERTY") */
  galleryLabel: string;
  /** Vertical gallery images (Lobby, Restaurante, Rooftop, …) */
  galleryImages: GalleryImage[];
}

export interface GuestInsights {
  /** What guests like the most */
  positive: string;
  /** What guests dislike */
  negative: string;
}

export interface AssetAnalysisData {
  /** Hotel display name shown next to the section title */
  hotelLabel: string;
  metrics: AssetMetricsRow[];
  facilities: FacilityItem[];
  roomMix: RoomMixRow[];
  guestInsights: GuestInsights;
  media: PropertyMedia;
}

// ── Mock data (matches Stitch reference) ──────────────────────────────────────

export function getMockAssetAnalysis(): AssetAnalysisData {
  return {
    hotelLabel: "Hotel personalizado",
    metrics: [
      { label: "Market", value: "Madrid" },
      { label: "Submarket", value: "Centre" },
      { label: "Class", value: "Luxury" },
      { label: "Category", value: "5 stars" },
      { label: "Distance to center", value: "2.2 km" },
      { label: "Location score", value: "8.6" },
      { label: "Confort Score", value: "9.2" },
      { label: "Renovation year", value: "2018" },
      { label: "Gross Building", value: "102,851" },
      { label: "Nº Stories", value: "33 / 58" },
      { label: "Lot size", value: "7,500" },
      { label: "Planta tipo", value: "730" },
    ],
    facilities: [
      { label: "Bar & Caffe", available: true },
      { label: "Restaurant", available: true },
      { label: "Rooftop Bar", available: true },
      { label: "Meeting rooms", available: true },
      { label: "Events", available: true },
      { label: "Gym", available: true },
      { label: "SPA Wellness", available: false },
      { label: "Pool", available: false },
      { label: "Parking", available: true },
      { label: "Other rentals", available: false },
    ],
    roomMix: [
      { type: "Total Rooms", units: 150, sizeSqm: 29, isTotal: true },
      { type: "Individuals", units: 25, sizeSqm: 19 },
      { type: "Doble", units: 30, sizeSqm: 24 },
      { type: "Js", units: 15, sizeSqm: 32 },
      { type: "Suite", units: 60, sizeSqm: 38 },
    ],
    guestInsights: {
      positive:
        "Destaca su ubicación privilegiada en el corazón de Madrid y la excelencia en el servicio del personal. Los huéspedes valoran muy positivamente la calidad del desayuno buffet y las vistas panorámicas desde el rooftop bar.",
      negative:
        "Algunas reseñas mencionan tiempos de espera prolongados en los ascensores durante horas punta. Se sugiere una renovación en el mobiliario de las habitaciones individuales para alinearlas con el estándar de lujo del resto del hotel.",
    },
    media: {
      heroImage:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAr6mFv-IgjVtnJt6fw2R6NI9b0p_8Drxd2xA1-an_wTblbJBL3VlYBvvGLBNJHoz03BYFEJsryV0Umiy0fQoYqFqvJfHorZ9Ar32sVr8rZbWiuFrqGU6KOBCV0fz9KP53OcGxWJeu31uhBMUwHRMv2D5vbmBKmdBHEeZ7A595D3OiqygMp8MCjhYPdU8W_zHyHgt0fq6ZQoBUoh8Wh_LBpOetA1SvDD8yaERJ1q-AoitzVIiOuTgTGKm1ahntQhYfaZAEkoZ_N2L7f",
      heroTabs: [{ label: "Catastro" }, { label: "Planos" }],
      galleryLabel: "GRAFICOS: MYPROPERTY",
      galleryImages: [
        {
          src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBvLPHGVDEtYqHcP52X2JVXtVrSRO1jLv_lplMA0XWwp2BGiEtNHoAy_9vyYQRKZeeQxoKSqJrU-hvVLaa-PiPNwdY9ArKbD8iiqFmWjtwAwbm1SGCUNBY_wxniKdVzsl8FRcIJs4rBnVhdf4ex5za8-DmDpwYZZQNgWjAhPdcADkdsLVnHgQuBaP8FEG0BouDqzFc9uESTcJZomF5EjcP_DdD-9P18xelLrsrhtu_msvXcQRZU2DYekenNyWa3EFIqMyg6my2zuXI5",
          caption: "Lobby",
          altSrc:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuBdzAjqLJjuHSNfhe9qLFIiiCF-ry6upFq8ISNP_Cd0zu2sllgGHwMOTqYQhIfyM76lbLAnjgpfHMjn696OuHLD4JKWyELtv4vzqTMD3dhZl24mAQdh7PPA2usXcwkA2_763B6X-h459IcB-QbZi-5mubA8Nmt81J9zqsNkxENG8MSivoZxs0gOl3XI-SJrR6uXXYHPmgEutYsSEx4EIqhjJ6zwSPbYKQLOAyNGUXcDirUL_vKrqPK8becwkfLWW36Xj7Yej5m-3jNA",
        },
        {
          src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBdzAjqLJjuHSNfhe9qLFIiiCF-ry6upFq8ISNP_Cd0zu2sllgGHwMOTqYQhIfyM76lbLAnjgpfHMjn696OuHLD4JKWyELtv4vzqTMD3dhZl24mAQdh7PPA2usXcwkA2_763B6X-h459IcB-QbZi-5mubA8Nmt81J9zqsNkxENG8MSivoZxs0gOl3XI-SJrR6uXXYHPmgEutYsSEx4EIqhjJ6zwSPbYKQLOAyNGUXcDirUL_vKrqPK8becwkfLWW36Xj7Yej5m-3jNA",
          caption: "Restaurante",
          altSrc:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuAmazU7herDbLKa6GUCTAHlaLqwOjuBY6GjPh5iVIZw20g_2rkTTas-DVfA_0G7Xd8xZNdahM3cR3r0amLjeHb5VJQYR7rek2LxVfsoDFGdMShWGj8cxjYCa3twXCWhmJI5_VOP9DC08sj76YBLU_0EmaWTVQ8RiRYw8z4WUKJ9Ua41JyG7LreI0_AYc01gnfD6p7kX2T18JYE2eMyiVJR0Ci5CxRpf-swTEpAxR3IDggiqpq2_R5UosK9i9S8xcQSvifznwAvIi7mY",
        },
        {
          src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAmazU7herDbLKa6GUCTAHlaLqwOjuBY6GjPh5iVIZw20g_2rkTTas-DVfA_0G7Xd8xZNdahM3cR3r0amLjeHb5VJQYR7rek2LxVfsoDFGdMShWGj8cxjYCa3twXCWhmJI5_VOP9DC08sj76YBLU_0EmaWTVQ8RiRYw8z4WUKJ9Ua41JyG7LreI0_AYc01gnfD6p7kX2T18JYE2eMyiVJR0Ci5CxRpf-swTEpAxR3IDggiqpq2_R5UosK9i9S8xcQSvifznwAvIi7mY",
          caption: "Rooftop",
          altSrc:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuBvLPHGVDEtYqHcP52X2JVXtVrSRO1jLv_lplMA0XWwp2BGiEtNHoAy_9vyYQRKZeeQxoKSqJrU-hvVLaa-PiPNwdY9ArKbD8iiqFmWjtwAwbm1SGCUNBY_wxniKdVzsl8FRcIJs4rBnVhdf4ex5za8-DmDpwYZZQNgWjAhPdcADkdsLVnHgQuBaP8FEG0BouDqzFc9uESTcJZomF5EjcP_DdD-9P18xelLrsrhtu_msvXcQRZU2DYekenNyWa3EFIqMyg6my2zuXI5",
        },
      ],
    },
  };
}
