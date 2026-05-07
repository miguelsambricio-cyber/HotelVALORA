export type FacilityKey = "bar" | "restaurant" | "rooftop" | "meeting" | "gym" | "spa";

export const FACILITY_LABELS: Record<FacilityKey, string> = {
  bar: "Bar",
  restaurant: "Restaurant",
  rooftop: "Rooftop",
  meeting: "Meeting Rooms",
  gym: "Gym",
  spa: "Spa",
};

export const FACILITY_ORDER: FacilityKey[] = [
  "bar",
  "restaurant",
  "rooftop",
  "meeting",
  "gym",
  "spa",
];

export interface CompetitorProperty {
  id: string;
  isSubject: boolean;
  name: string;
  stars: number;
  keys: number;
  submarket: string;
  facilities: Record<FacilityKey, boolean>;
  locationScore: number;
  /** Distance from reference hotel — null for the subject property itself */
  distance: string | null;
}

export interface GalleryImage {
  src: string;
  alt: string;
}

export interface CompetitiveSetData {
  properties: CompetitorProperty[];
  gallery: GalleryImage[];
}

export function getMockCompetitiveSet(): CompetitiveSetData {
  return {
    properties: [
      {
        id: "subject",
        isSubject: true,
        name: "Subject Property",
        stars: 5,
        keys: 150,
        submarket: "Centre",
        facilities: {
          bar: true,
          restaurant: true,
          rooftop: true,
          meeting: true,
          gym: true,
          spa: false,
        },
        locationScore: 8.6,
        distance: null,
      },
      {
        id: "ritz",
        isSubject: false,
        name: "The Ritz-Carlton, Madrid",
        stars: 5,
        keys: 153,
        submarket: "Retiro",
        facilities: {
          bar: true,
          restaurant: true,
          rooftop: false,
          meeting: true,
          gym: true,
          spa: true,
        },
        locationScore: 9.2,
        distance: "650 m",
      },
      {
        id: "four-seasons",
        isSubject: false,
        name: "Four Seasons Madrid",
        stars: 5,
        keys: 200,
        submarket: "Centre",
        facilities: {
          bar: true,
          restaurant: true,
          rooftop: true,
          meeting: true,
          gym: true,
          spa: true,
        },
        locationScore: 9.5,
        distance: "400 m",
      },
      {
        id: "rosewood",
        isSubject: false,
        name: "Rosewood Villa Magna",
        stars: 5,
        keys: 154,
        submarket: "Salamanca",
        facilities: {
          bar: true,
          restaurant: true,
          rooftop: false,
          meeting: true,
          gym: true,
          spa: true,
        },
        locationScore: 8.8,
        distance: "1.1 km",
      },
      {
        id: "westin",
        isSubject: false,
        name: "The Westin Palace",
        stars: 5,
        keys: 470,
        submarket: "Centre",
        facilities: {
          bar: true,
          restaurant: true,
          rooftop: false,
          meeting: true,
          gym: true,
          spa: false,
        },
        locationScore: 8.2,
        distance: "320 m",
      },
    ],
    gallery: [
      {
        src: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80",
        alt: "Hotel Interior",
      },
      {
        src: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80",
        alt: "Hotel Lobby",
      },
      {
        src: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80",
        alt: "Hotel Exterior",
      },
      {
        src: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80",
        alt: "Hotel Room",
      },
      {
        src: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80",
        alt: "Hotel Facade",
      },
      {
        src: "https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?w=600&q=80",
        alt: "Hotel Amenities",
      },
      {
        src: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80",
        alt: "Hotel View",
      },
      {
        src: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80",
        alt: "Hotel Spa",
      },
      {
        src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
        alt: "Hotel Dining",
      },
      {
        src: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80",
        alt: "Hotel Lounge",
      },
      {
        src: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80",
        alt: "Hotel Suite",
      },
      {
        src: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80",
        alt: "Hotel Gym",
      },
      {
        src: "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=600&q=80",
        alt: "Hotel Pool",
      },
      {
        src: "https://images.unsplash.com/photo-1574096079513-d8259312b785?w=600&q=80",
        alt: "Hotel Bar",
      },
      {
        src: "https://images.unsplash.com/photo-1504275107627-0c2ba7a43dba?w=600&q=80",
        alt: "Hotel Terrace",
      },
      {
        src: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",
        alt: "Hotel Meeting Room",
      },
      {
        src: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80",
        alt: "Hotel Bathroom",
      },
      {
        src: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=80",
        alt: "Luxury Hotel Bedroom",
      },
      {
        src: "https://images.unsplash.com/photo-1560185007-5f0bb1866cab?w=600&q=80",
        alt: "Hotel Lounge Area",
      },
      {
        src: "https://images.unsplash.com/photo-1529290130-4ca3753253ae?w=600&q=80",
        alt: "Hotel Architecture Detail",
      },
    ],
  };
}
