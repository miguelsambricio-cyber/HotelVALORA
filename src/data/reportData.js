export const sidebarSections = [
  {
    title: "1. Executive Summary",
  },
  {
    title: "2. Asset Analysis",
    active: true,
    children: [
      { title: "Hotel personalizado", active: true },
      { title: "CAPEX" },
      { title: "Renders" },
    ],
  },
  {
    title: "3. Compset",
  },
  {
    title: "4. Market Overview",
    children: [
      { title: "Market overview" },
      { title: "Transactions" },
      { title: "Projects" },
      { title: "Market dynamics" },
    ],
  },
  {
    title: "5. Financials",
    children: [
      { title: "Finance structure" },
      { title: "P&L" },
      { title: "Underwriting IRR" },
    ],
  },
  {
    title: "6. Methodology",
  },
];

export const assetDetails = [
  { label: "Market", value: "Madrid" },
  { label: "Submarket", value: "Centre" },
  { label: "Class", value: "Luxury" },
  { label: "Category", value: "5 stars" },
  { label: "Distance to center", value: "2.2 km" },
  { label: "Location score", value: "8.6" },
  { label: "Comfort score", value: "9.2" },
  { label: "Renovation year", value: "2018" },
  { label: "Gross Building", value: "102,851 m²" },
  { label: "Nº Stories", value: "33 / 58" },
  { label: "Lot size", value: "7,500 m²" },
  { label: "Planta tipo", value: "730 m²" },
];

export const facilities = [
  { label: "Bar & Caffe", available: true },
  { label: "Restaurant", available: true },
  { label: "Rooftop Bar", available: true },
  { label: "Meeting rooms", available: true },
  { label: "Events", available: true },
  { label: "Gym", available: true },
  { label: "SPA Wellness", available: true },
  { label: "Pool", available: true },
  { label: "Parking", available: true },
  { label: "Other rentals", available: false },
];

export const roomMix = [
  { type: "Total rooms", units: "150", avgSize: "38" },
  { type: "Individual", units: "25", avgSize: "30" },
  { type: "Double", units: "30", avgSize: "30" },
  { type: "Suites", units: "60", avgSize: "45" },
];

export const guestNotes = [
  {
    title: "Lo que más gusta a los huéspedes:",
    icon: "thumb_up",
    iconColor: "text-emerald-600",
    text: "Excelente ubicación, personal amable y limpieza impecable. Las habitaciones son amplias y luminosas.",
  },
  {
    title: "Lo que menos gusta a los huéspedes:",
    icon: "thumb_down",
    iconColor: "text-rose-600",
    text: "El desayuno podría tener más variedad y el wifi a veces es intermitente en las plantas superiores.",
  },
];

export const heroImages = {
  catastro:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAr6mFv-IgjVtnJt6fw2R6NI9b0p_8Drxd2xA1-an_wTblbJBL3VlYBvvGLBNJHoz03BYFEJsryV0Umiy0fQoYqFqvJfHorZ9Ar32sVr8rZbWiuFrqGU6KOBCV0fz9KP53OcGxWJeu31uhBMUwHRMv2D5vbmBKmdBHEeZ7A595D3OiqygMp8MCjhYPdU8W_zHyHgt0fq6ZQoBUoh8Wh_LBpOetA1SvDD8yaERJ1q-AoitzVIiOuTgTGKm1ahntQhYfaZAEkoZ_N2L7f",
  planos:
    "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80",
};

export const galleryItems = [
  {
    title: "Lobby",
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBvLPHGVDEtYqHcP52X2JVXtVrSRO1jLv_lplMA0XWwp2BGiEtNHoAy_9vyYQRKZeeQxoKSqJrU-hvVLaa-PiPNwdY9ArKbD8iiqFmWjtwAwbm1SGCUNBY_wxniKdVzsl8FRcIJs4rBnVhdf4ex5za8-DmDpwYZZQNgWjAhPdcADkdsLVnHgQuBaP8FEG0BouDqzFc9uESTcJZomF5EjcP_DdD-9P18xelLrsrhtu_msvXcQRZU2DYekenNyWa3EFIqMyg6my2zuXI5",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBdzAjqLJjuHSNfhe9qLFIiiCF-ry6upFq8ISNP_Cd0zu2sllgGHwMOTqYQhIfyM76lbLAnjgpfHMjn696OuHLD4JKWyELtv4vzqTMD3dhZl24mAQdh7PPA2usXcwkA2_763B6X-h459IcB-QbZi-5mubA8Nmt81J9zqsNkxENG8MSivoZxs0gOl3XI-SJrR6uXXYHPmgEutYsSEx4EIqhjJ6zwSPbYKQLOAyNGUXcDirUL_vKrqPK8becwkfLWW36Xj7Yej5m-3jNA",
    ],
  },
  {
    title: "Restaurante",
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBdzAjqLJjuHSNfhe9qLFIiiCF-ry6upFq8ISNP_Cd0zu2sllgGHwMOTqYQhIfyM76lbLAnjgpfHMjn696OuHLD4JKWyELtv4vzqTMD3dhZl24mAQdh7PPA2usXcwkA2_763B6X-h459IcB-QbZi-5mubA8Nmt81J9zqsNkxENG8MSivoZxs0gOl3XI-SJrR6uXXYHPmgEutYsSEx4EIqhjJ6zwSPbYKQLOAyNGUXcDirUL_vKrqPK8becwkfLWW36Xj7Yej5m-3jNA",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAmazU7herDbLKa6GUCTAHlaLqwOjuBY6GjPh5iVIZw20g_2rkTTas-DVfA_0G7Xd8xZNdahM3cR3r0amLjeHb5VJQYR7rek2LxVfsoDFGdMShWGj8cxjYCa3twXCWhmJI5_VOP9DC08sj76YBLU_0EmaWTVQ8RiRYw8z4WUKJ9Ua41JyG7LreI0_AYc01gnfD6p7kX2T18JYE2eMyiVJR0Ci5CxRpf-swTEpAxR3IDggiqpq2_R5UosK9i9S8xcQSvifznwAvIi7mY",
    ],
  },
  {
    title: "Rooftop",
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAmazU7herDbLKa6GUCTAHlaLqwOjuBY6GjPh5iVIZw20g_2rkTTas-DVfA_0G7Xd8xZNdahM3cR3r0amLjeHb5VJQYR7rek2LxVfsoDFGdMShWGj8cxjYCa3twXCWhmJI5_VOP9DC08sj76YBLU_0EmaWTVQ8RiRYw8z4WUKJ9Ua41JyG7LreI0_AYc01gnfD6p7kX2T18JYE2eMyiVJR0Ci5CxRpf-swTEpAxR3IDggiqpq2_R5UosK9i9S8xcQSvifznwAvIi7mY",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBvLPHGVDEtYqHcP52X2JVXtVrSRO1jLv_lplMA0XWwp2BGiEtNHoAy_9vyYQRKZeeQxoKSqJrU-hvVLaa-PiPNwdY9ArKbD8iiqFmWjtwAwbm1SGCUNBY_wxniKdVzsl8FRcIJs4rBnVhdf4ex5za8-DmDpwYZZQNgWjAhPdcADkdsLVnHgQuBaP8FEG0BouDqzFc9uESTcJZomF5EjcP_DdD-9P18xelLrsrhtu_msvXcQRZU2DYekenNyWa3EFIqMyg6my2zuXI5",
    ],
  },
];
