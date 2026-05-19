/**
 * Canonical brand registry — Madrid-focused initial set (v1).
 *
 * Maps brand display names (and their common aliases) to a canonical
 * brand slug, brand family (parent group), chain scale, and HQ country.
 *
 * Used by the enrichment pipeline to:
 *  - Resolve `chain_name` / `brand` from Booking E2 into canonical
 *    `brand` + `brand_family` + `chain_scale` columns of `hotel_canonical`.
 *  - Detect rebrands and chain mergers (via alias lookup).
 *  - Drive deterministic confidence scoring (registry hits → 0.80 floor).
 *
 * Extensible: a missing brand surfaces in the review queue rather than
 * blocking ingestion. Add entries by appending to `BRANDS`.
 */

import type { HotelSegment } from "./hotel-types";

// The chain-scale enum mirrors the database `hotel_segment` enum
// (reused for both `segment` and `chain_scale` columns per migration 0024).
export type ChainScale = HotelSegment;

export interface BrandEntry {
  /** Lower-kebab canonical key. Stable across rebrands. */
  slug: string;
  /** Canonical display name (institutional spelling). */
  displayName: string;
  /** Parent group slug. Use the same slug as the brand for independent operators. */
  brandFamilySlug: string;
  brandFamilyDisplayName: string;
  /** Scale of this individual brand (sub-brands of a family may differ). */
  chainScale: ChainScale;
  /** ISO-3166-1 alpha-2 of the parent group's headquarters. */
  hqCountry: string;
  /** Common variant strings (multilingual + abbreviations) used for matching. */
  aliases: string[];
}

export const BRANDS: readonly BrandEntry[] = Object.freeze([
  // ───── Spanish chains (HQ ES) ─────────────────────────────────────────────
  {
    slug: "nh",
    displayName: "NH",
    brandFamilySlug: "nh-hotel-group",
    brandFamilyDisplayName: "NH Hotel Group",
    chainScale: "upscale",
    hqCountry: "ES",
    aliases: ["nh hotel", "nh hoteles", "nh hotels"],
  },
  {
    slug: "nh-collection",
    displayName: "NH Collection",
    brandFamilySlug: "nh-hotel-group",
    brandFamilyDisplayName: "NH Hotel Group",
    chainScale: "upper_upscale",
    hqCountry: "ES",
    aliases: ["nhcollection", "nh col"],
  },
  {
    slug: "nhow",
    displayName: "nhow",
    brandFamilySlug: "nh-hotel-group",
    brandFamilyDisplayName: "NH Hotel Group",
    chainScale: "upper_upscale",
    hqCountry: "ES",
    aliases: ["nhow hotels"],
  },
  {
    slug: "hesperia",
    displayName: "Hesperia",
    brandFamilySlug: "nh-hotel-group",
    brandFamilyDisplayName: "NH Hotel Group",
    chainScale: "upscale",
    hqCountry: "ES",
    aliases: ["hesperia hotels", "hesperia hoteles"],
  },
  {
    slug: "gran-melia",
    displayName: "Gran Meliá",
    brandFamilySlug: "melia-hotels-international",
    brandFamilyDisplayName: "Meliá Hotels International",
    chainScale: "luxury",
    hqCountry: "ES",
    aliases: ["gran melia"],
  },
  {
    slug: "me-by-melia",
    displayName: "ME by Meliá",
    brandFamilySlug: "melia-hotels-international",
    brandFamilyDisplayName: "Meliá Hotels International",
    chainScale: "upper_upscale",
    hqCountry: "ES",
    aliases: ["me by melia", "me melia", "me hotels"],
  },
  {
    slug: "melia",
    displayName: "Meliá",
    brandFamilySlug: "melia-hotels-international",
    brandFamilyDisplayName: "Meliá Hotels International",
    chainScale: "upscale",
    hqCountry: "ES",
    aliases: ["melia hotels", "melia hoteles"],
  },
  {
    slug: "innside-by-melia",
    displayName: "INNSIDE by Meliá",
    brandFamilySlug: "melia-hotels-international",
    brandFamilyDisplayName: "Meliá Hotels International",
    chainScale: "upscale",
    hqCountry: "ES",
    aliases: ["innside", "innside melia"],
  },
  {
    slug: "paradisus",
    displayName: "Paradisus by Meliá",
    brandFamilySlug: "melia-hotels-international",
    brandFamilyDisplayName: "Meliá Hotels International",
    chainScale: "upper_upscale",
    hqCountry: "ES",
    aliases: ["paradisus", "paradisus resorts"],
  },
  {
    slug: "sol-by-melia",
    displayName: "Sol by Meliá",
    brandFamilySlug: "melia-hotels-international",
    brandFamilyDisplayName: "Meliá Hotels International",
    chainScale: "upper_midscale",
    hqCountry: "ES",
    aliases: ["sol", "sol hotels", "sol melia"],
  },
  {
    slug: "barcelo",
    displayName: "Barceló",
    brandFamilySlug: "barcelo-hotel-group",
    brandFamilyDisplayName: "Barceló Hotel Group",
    chainScale: "upscale",
    hqCountry: "ES",
    aliases: ["barcelo hotels", "barcelo hoteles"],
  },
  {
    slug: "royal-hideaway",
    displayName: "Royal Hideaway",
    brandFamilySlug: "barcelo-hotel-group",
    brandFamilyDisplayName: "Barceló Hotel Group",
    chainScale: "luxury",
    hqCountry: "ES",
    aliases: ["royal hideaway hotels"],
  },
  {
    slug: "occidental",
    displayName: "Occidental",
    brandFamilySlug: "barcelo-hotel-group",
    brandFamilyDisplayName: "Barceló Hotel Group",
    chainScale: "upscale",
    hqCountry: "ES",
    aliases: ["occidental hotels"],
  },
  {
    slug: "iberostar",
    displayName: "Iberostar",
    brandFamilySlug: "iberostar-group",
    brandFamilyDisplayName: "Iberostar Group",
    chainScale: "upscale",
    hqCountry: "ES",
    aliases: ["iberostar hotels", "iberostar hoteles"],
  },
  {
    slug: "riu",
    displayName: "Riu Hotels & Resorts",
    brandFamilySlug: "riu-hotels-resorts",
    brandFamilyDisplayName: "Riu Hotels & Resorts",
    chainScale: "upper_midscale",
    hqCountry: "ES",
    aliases: ["riu", "riu hotels"],
  },
  {
    slug: "eurostars",
    displayName: "Eurostars",
    brandFamilySlug: "hotusa-hotels",
    brandFamilyDisplayName: "Hotusa Hotels",
    chainScale: "upscale",
    hqCountry: "ES",
    aliases: ["eurostars hotels"],
  },
  {
    slug: "petit-palace",
    displayName: "Petit Palace",
    brandFamilySlug: "hotusa-hotels",
    brandFamilyDisplayName: "Hotusa Hotels",
    chainScale: "upscale",
    hqCountry: "ES",
    aliases: ["petit palace hotels"],
  },
  {
    slug: "vincci",
    displayName: "Vincci Hotels",
    brandFamilySlug: "vincci-hotels",
    brandFamilyDisplayName: "Vincci Hotels",
    chainScale: "upscale",
    hqCountry: "ES",
    aliases: ["vincci", "vincci hoteles"],
  },
  {
    slug: "catalonia",
    displayName: "Catalonia Hotels & Resorts",
    brandFamilySlug: "catalonia-hotels-resorts",
    brandFamilyDisplayName: "Catalonia Hotels & Resorts",
    chainScale: "upscale",
    hqCountry: "ES",
    aliases: ["catalonia hotels", "catalonia"],
  },
  {
    slug: "room-mate",
    displayName: "Room Mate",
    brandFamilySlug: "room-mate-hotels",
    brandFamilyDisplayName: "Room Mate Hotels",
    chainScale: "upper_midscale",
    hqCountry: "ES",
    aliases: ["room mate", "room-mate", "roommate hotels"],
  },
  {
    slug: "sercotel",
    displayName: "Sercotel",
    brandFamilySlug: "sercotel-hotels",
    brandFamilyDisplayName: "Sercotel Hotels",
    chainScale: "upper_midscale",
    hqCountry: "ES",
    aliases: ["sercotel hotels", "sercotel hoteles"],
  },
  {
    slug: "only-you",
    displayName: "Only YOU",
    brandFamilySlug: "palladium-hotel-group",
    brandFamilyDisplayName: "Palladium Hotel Group",
    chainScale: "upper_upscale",
    hqCountry: "ES",
    aliases: ["only you hotels"],
  },
  {
    slug: "hard-rock-hotels",
    displayName: "Hard Rock Hotel",
    brandFamilySlug: "palladium-hotel-group",
    brandFamilyDisplayName: "Palladium Hotel Group",
    chainScale: "upper_upscale",
    hqCountry: "ES",
    aliases: ["hard rock", "hard rock hotel"],
  },
  {
    slug: "h10",
    displayName: "H10 Hotels",
    brandFamilySlug: "h10-hotels",
    brandFamilyDisplayName: "H10 Hotels",
    chainScale: "upscale",
    hqCountry: "ES",
    aliases: ["h10", "h-10 hotels"],
  },

  // ───── International luxury / lifestyle ──────────────────────────────────
  {
    slug: "four-seasons",
    displayName: "Four Seasons",
    brandFamilySlug: "four-seasons",
    brandFamilyDisplayName: "Four Seasons Hotels and Resorts",
    chainScale: "luxury",
    hqCountry: "CA",
    aliases: ["four seasons hotel", "four seasons resort"],
  },
  {
    slug: "mandarin-oriental",
    displayName: "Mandarin Oriental",
    brandFamilySlug: "mandarin-oriental",
    brandFamilyDisplayName: "Mandarin Oriental Hotel Group",
    chainScale: "luxury",
    hqCountry: "HK",
    aliases: ["mandarin oriental hotel"],
  },
  {
    slug: "rosewood",
    displayName: "Rosewood",
    brandFamilySlug: "rosewood-hotels",
    brandFamilyDisplayName: "Rosewood Hotels & Resorts",
    chainScale: "luxury",
    hqCountry: "HK",
    aliases: ["rosewood hotel", "rosewood resort"],
  },
  {
    slug: "bvlgari",
    displayName: "Bvlgari Hotels",
    brandFamilySlug: "bvlgari-hotels",
    brandFamilyDisplayName: "Bvlgari Hotels & Resorts",
    chainScale: "luxury",
    hqCountry: "IT",
    aliases: ["bulgari", "bulgari hotel", "bvlgari"],
  },
  {
    slug: "belmond",
    displayName: "Belmond",
    brandFamilySlug: "belmond",
    brandFamilyDisplayName: "Belmond (LVMH)",
    chainScale: "luxury",
    hqCountry: "GB",
    aliases: ["belmond hotel"],
  },
  {
    slug: "the-standard",
    displayName: "The Standard",
    brandFamilySlug: "the-standard-hotels",
    brandFamilyDisplayName: "Standard International",
    chainScale: "upper_upscale",
    hqCountry: "US",
    aliases: ["standard hotel"],
  },

  // ───── Marriott International family ─────────────────────────────────────
  {
    slug: "the-ritz-carlton",
    displayName: "The Ritz-Carlton",
    brandFamilySlug: "marriott-international",
    brandFamilyDisplayName: "Marriott International",
    chainScale: "luxury",
    hqCountry: "US",
    aliases: ["ritz carlton", "ritz-carlton"],
  },
  {
    slug: "st-regis",
    displayName: "The St. Regis",
    brandFamilySlug: "marriott-international",
    brandFamilyDisplayName: "Marriott International",
    chainScale: "luxury",
    hqCountry: "US",
    aliases: ["st regis", "st. regis", "saint regis"],
  },
  {
    slug: "edition",
    displayName: "EDITION",
    brandFamilySlug: "marriott-international",
    brandFamilyDisplayName: "Marriott International",
    chainScale: "luxury",
    hqCountry: "US",
    aliases: ["the edition", "edition hotel"],
  },
  {
    slug: "w-hotels",
    displayName: "W Hotels",
    brandFamilySlug: "marriott-international",
    brandFamilyDisplayName: "Marriott International",
    chainScale: "upper_upscale",
    hqCountry: "US",
    aliases: ["w hotel", "w madrid"],
  },
  {
    slug: "westin",
    displayName: "Westin",
    brandFamilySlug: "marriott-international",
    brandFamilyDisplayName: "Marriott International",
    chainScale: "upper_upscale",
    hqCountry: "US",
    aliases: ["the westin", "westin hotel"],
  },
  {
    slug: "sheraton",
    displayName: "Sheraton",
    brandFamilySlug: "marriott-international",
    brandFamilyDisplayName: "Marriott International",
    chainScale: "upper_upscale",
    hqCountry: "US",
    aliases: ["sheraton hotel"],
  },
  {
    slug: "le-meridien",
    displayName: "Le Méridien",
    brandFamilySlug: "marriott-international",
    brandFamilyDisplayName: "Marriott International",
    chainScale: "upper_upscale",
    hqCountry: "US",
    aliases: ["le meridien", "meridien"],
  },
  {
    slug: "autograph-collection",
    displayName: "Autograph Collection",
    brandFamilySlug: "marriott-international",
    brandFamilyDisplayName: "Marriott International",
    chainScale: "upper_upscale",
    hqCountry: "US",
    aliases: ["autograph"],
  },
  {
    slug: "ac-hotels",
    displayName: "AC Hotels by Marriott",
    brandFamilySlug: "marriott-international",
    brandFamilyDisplayName: "Marriott International",
    chainScale: "upscale",
    hqCountry: "US",
    aliases: ["ac hotel", "ac by marriott", "ac hoteles"],
  },
  {
    slug: "marriott",
    displayName: "Marriott",
    brandFamilySlug: "marriott-international",
    brandFamilyDisplayName: "Marriott International",
    chainScale: "upper_upscale",
    hqCountry: "US",
    aliases: ["marriott hotel", "marriott hotels"],
  },
  {
    slug: "courtyard",
    displayName: "Courtyard by Marriott",
    brandFamilySlug: "marriott-international",
    brandFamilyDisplayName: "Marriott International",
    chainScale: "upscale",
    hqCountry: "US",
    aliases: ["courtyard"],
  },
  {
    slug: "moxy",
    displayName: "Moxy",
    brandFamilySlug: "marriott-international",
    brandFamilyDisplayName: "Marriott International",
    chainScale: "upper_midscale",
    hqCountry: "US",
    aliases: ["moxy hotel", "moxy hotels"],
  },
  {
    slug: "aloft",
    displayName: "Aloft",
    brandFamilySlug: "marriott-international",
    brandFamilyDisplayName: "Marriott International",
    chainScale: "upscale",
    hqCountry: "US",
    aliases: ["aloft hotel"],
  },

  // ───── Hilton family ─────────────────────────────────────────────────────
  {
    slug: "waldorf-astoria",
    displayName: "Waldorf Astoria",
    brandFamilySlug: "hilton",
    brandFamilyDisplayName: "Hilton",
    chainScale: "luxury",
    hqCountry: "US",
    aliases: ["waldorf astoria hotel"],
  },
  {
    slug: "conrad",
    displayName: "Conrad",
    brandFamilySlug: "hilton",
    brandFamilyDisplayName: "Hilton",
    chainScale: "luxury",
    hqCountry: "US",
    aliases: ["conrad hotel", "conrad hotels"],
  },
  {
    slug: "curio-collection",
    displayName: "Curio Collection by Hilton",
    brandFamilySlug: "hilton",
    brandFamilyDisplayName: "Hilton",
    chainScale: "upper_upscale",
    hqCountry: "US",
    aliases: ["curio"],
  },
  {
    slug: "canopy",
    displayName: "Canopy by Hilton",
    brandFamilySlug: "hilton",
    brandFamilyDisplayName: "Hilton",
    chainScale: "upper_upscale",
    hqCountry: "US",
    aliases: ["canopy"],
  },
  {
    slug: "hilton",
    displayName: "Hilton",
    brandFamilySlug: "hilton",
    brandFamilyDisplayName: "Hilton",
    chainScale: "upper_upscale",
    hqCountry: "US",
    aliases: ["hilton hotel", "hilton hotels & resorts"],
  },
  {
    slug: "doubletree",
    displayName: "DoubleTree by Hilton",
    brandFamilySlug: "hilton",
    brandFamilyDisplayName: "Hilton",
    chainScale: "upscale",
    hqCountry: "US",
    aliases: ["double tree", "doubletree hotel"],
  },
  {
    slug: "hampton",
    displayName: "Hampton by Hilton",
    brandFamilySlug: "hilton",
    brandFamilyDisplayName: "Hilton",
    chainScale: "upper_midscale",
    hqCountry: "US",
    aliases: ["hampton inn", "hampton"],
  },
  {
    slug: "hilton-garden-inn",
    displayName: "Hilton Garden Inn",
    brandFamilySlug: "hilton",
    brandFamilyDisplayName: "Hilton",
    chainScale: "upscale",
    hqCountry: "US",
    aliases: ["garden inn"],
  },

  // ───── Hyatt family ──────────────────────────────────────────────────────
  {
    slug: "park-hyatt",
    displayName: "Park Hyatt",
    brandFamilySlug: "hyatt",
    brandFamilyDisplayName: "Hyatt",
    chainScale: "luxury",
    hqCountry: "US",
    aliases: ["park hyatt hotel"],
  },
  {
    slug: "grand-hyatt",
    displayName: "Grand Hyatt",
    brandFamilySlug: "hyatt",
    brandFamilyDisplayName: "Hyatt",
    chainScale: "upper_upscale",
    hqCountry: "US",
    aliases: [],
  },
  {
    slug: "hyatt-regency",
    displayName: "Hyatt Regency",
    brandFamilySlug: "hyatt",
    brandFamilyDisplayName: "Hyatt",
    chainScale: "upper_upscale",
    hqCountry: "US",
    aliases: ["regency"],
  },
  {
    slug: "hyatt-centric",
    displayName: "Hyatt Centric",
    brandFamilySlug: "hyatt",
    brandFamilyDisplayName: "Hyatt",
    chainScale: "upper_upscale",
    hqCountry: "US",
    aliases: ["centric"],
  },
  {
    slug: "andaz",
    displayName: "Andaz",
    brandFamilySlug: "hyatt",
    brandFamilyDisplayName: "Hyatt",
    chainScale: "upper_upscale",
    hqCountry: "US",
    aliases: ["andaz hotel"],
  },
  {
    slug: "thompson",
    displayName: "Thompson Hotels",
    brandFamilySlug: "hyatt",
    brandFamilyDisplayName: "Hyatt",
    chainScale: "upper_upscale",
    hqCountry: "US",
    aliases: ["thompson"],
  },

  // ───── IHG family ────────────────────────────────────────────────────────
  {
    slug: "intercontinental",
    displayName: "InterContinental",
    brandFamilySlug: "ihg",
    brandFamilyDisplayName: "InterContinental Hotels Group",
    chainScale: "luxury",
    hqCountry: "GB",
    aliases: ["intercontinental hotel", "ihg intercontinental", "inter continental"],
  },
  {
    slug: "regent",
    displayName: "Regent",
    brandFamilySlug: "ihg",
    brandFamilyDisplayName: "InterContinental Hotels Group",
    chainScale: "luxury",
    hqCountry: "GB",
    aliases: ["regent hotel"],
  },
  {
    slug: "kimpton",
    displayName: "Kimpton",
    brandFamilySlug: "ihg",
    brandFamilyDisplayName: "InterContinental Hotels Group",
    chainScale: "upper_upscale",
    hqCountry: "GB",
    aliases: ["kimpton hotel"],
  },
  {
    slug: "hotel-indigo",
    displayName: "Hotel Indigo",
    brandFamilySlug: "ihg",
    brandFamilyDisplayName: "InterContinental Hotels Group",
    chainScale: "upper_upscale",
    hqCountry: "GB",
    aliases: ["indigo", "indigo hotel"],
  },
  {
    slug: "voco",
    displayName: "voco",
    brandFamilySlug: "ihg",
    brandFamilyDisplayName: "InterContinental Hotels Group",
    chainScale: "upscale",
    hqCountry: "GB",
    aliases: ["voco hotel", "voco hotels"],
  },
  {
    slug: "crowne-plaza",
    displayName: "Crowne Plaza",
    brandFamilySlug: "ihg",
    brandFamilyDisplayName: "InterContinental Hotels Group",
    chainScale: "upper_upscale",
    hqCountry: "GB",
    aliases: ["crowne plaza hotel"],
  },
  {
    slug: "holiday-inn",
    displayName: "Holiday Inn",
    brandFamilySlug: "ihg",
    brandFamilyDisplayName: "InterContinental Hotels Group",
    chainScale: "upper_midscale",
    hqCountry: "GB",
    aliases: ["holiday inn hotel"],
  },
  {
    slug: "holiday-inn-express",
    displayName: "Holiday Inn Express",
    brandFamilySlug: "ihg",
    brandFamilyDisplayName: "InterContinental Hotels Group",
    chainScale: "upper_midscale",
    hqCountry: "GB",
    aliases: ["holiday inn exp", "hi express"],
  },

  // ───── Accor family ──────────────────────────────────────────────────────
  {
    slug: "raffles",
    displayName: "Raffles",
    brandFamilySlug: "accor",
    brandFamilyDisplayName: "Accor",
    chainScale: "luxury",
    hqCountry: "FR",
    aliases: ["raffles hotel"],
  },
  {
    slug: "sofitel",
    displayName: "Sofitel",
    brandFamilySlug: "accor",
    brandFamilyDisplayName: "Accor",
    chainScale: "luxury",
    hqCountry: "FR",
    aliases: ["sofitel hotel"],
  },
  {
    slug: "fairmont",
    displayName: "Fairmont",
    brandFamilySlug: "accor",
    brandFamilyDisplayName: "Accor",
    chainScale: "luxury",
    hqCountry: "FR",
    aliases: ["fairmont hotel"],
  },
  {
    slug: "pullman",
    displayName: "Pullman",
    brandFamilySlug: "accor",
    brandFamilyDisplayName: "Accor",
    chainScale: "upper_upscale",
    hqCountry: "FR",
    aliases: ["pullman hotel"],
  },
  {
    slug: "mgallery",
    displayName: "MGallery",
    brandFamilySlug: "accor",
    brandFamilyDisplayName: "Accor",
    chainScale: "upper_upscale",
    hqCountry: "FR",
    aliases: ["m gallery", "mgallery hotel collection"],
  },
  {
    slug: "novotel",
    displayName: "Novotel",
    brandFamilySlug: "accor",
    brandFamilyDisplayName: "Accor",
    chainScale: "upscale",
    hqCountry: "FR",
    aliases: ["novotel hotel"],
  },
  {
    slug: "mercure",
    displayName: "Mercure",
    brandFamilySlug: "accor",
    brandFamilyDisplayName: "Accor",
    chainScale: "upscale",
    hqCountry: "FR",
    aliases: ["mercure hotel"],
  },
  {
    slug: "ibis",
    displayName: "Ibis",
    brandFamilySlug: "accor",
    brandFamilyDisplayName: "Accor",
    chainScale: "midscale",
    hqCountry: "FR",
    aliases: ["ibis hotel"],
  },
  {
    slug: "ibis-styles",
    displayName: "Ibis Styles",
    brandFamilySlug: "accor",
    brandFamilyDisplayName: "Accor",
    chainScale: "midscale",
    hqCountry: "FR",
    aliases: ["ibis style"],
  },
  {
    slug: "25hours",
    displayName: "25hours Hotels",
    brandFamilySlug: "accor",
    brandFamilyDisplayName: "Accor",
    chainScale: "upper_upscale",
    hqCountry: "FR",
    aliases: ["25 hours", "25hours hotel"],
  },

  // ───── Radisson family ───────────────────────────────────────────────────
  {
    slug: "radisson-collection",
    displayName: "Radisson Collection",
    brandFamilySlug: "radisson-hotel-group",
    brandFamilyDisplayName: "Radisson Hotel Group",
    chainScale: "upper_upscale",
    hqCountry: "BE",
    aliases: ["radisson collection hotel"],
  },
  {
    slug: "radisson-blu",
    displayName: "Radisson Blu",
    brandFamilySlug: "radisson-hotel-group",
    brandFamilyDisplayName: "Radisson Hotel Group",
    chainScale: "upper_upscale",
    hqCountry: "BE",
    aliases: ["radisson blu hotel"],
  },
  {
    slug: "radisson",
    displayName: "Radisson",
    brandFamilySlug: "radisson-hotel-group",
    brandFamilyDisplayName: "Radisson Hotel Group",
    chainScale: "upscale",
    hqCountry: "BE",
    aliases: ["radisson hotel"],
  },
  {
    slug: "park-plaza",
    displayName: "Park Plaza",
    brandFamilySlug: "radisson-hotel-group",
    brandFamilyDisplayName: "Radisson Hotel Group",
    chainScale: "upscale",
    hqCountry: "BE",
    aliases: ["park plaza hotel"],
  },

  // ───── Other ─────────────────────────────────────────────────────────────
  {
    slug: "wyndham",
    displayName: "Wyndham",
    brandFamilySlug: "wyndham",
    brandFamilyDisplayName: "Wyndham Hotels & Resorts",
    chainScale: "upper_midscale",
    hqCountry: "US",
    aliases: ["wyndham hotel"],
  },
  {
    slug: "tryp-by-wyndham",
    displayName: "TRYP by Wyndham",
    brandFamilySlug: "wyndham",
    brandFamilyDisplayName: "Wyndham Hotels & Resorts",
    chainScale: "midscale",
    hqCountry: "US",
    aliases: ["tryp", "tryp hotel"],
  },
  {
    slug: "best-western",
    displayName: "Best Western",
    brandFamilySlug: "best-western",
    brandFamilyDisplayName: "Best Western Hotels & Resorts",
    chainScale: "midscale",
    hqCountry: "US",
    aliases: ["best western hotel"],
  },
  {
    slug: "best-western-plus",
    displayName: "Best Western Plus",
    brandFamilySlug: "best-western",
    brandFamilyDisplayName: "Best Western Hotels & Resorts",
    chainScale: "upper_midscale",
    hqCountry: "US",
    aliases: [],
  },
  {
    slug: "leonardo",
    displayName: "Leonardo Hotels",
    brandFamilySlug: "leonardo-hotels",
    brandFamilyDisplayName: "Leonardo Hotels",
    chainScale: "upscale",
    hqCountry: "DE",
    aliases: ["leonardo hotel"],
  },
  {
    slug: "pestana",
    displayName: "Pestana",
    brandFamilySlug: "pestana-hotel-group",
    brandFamilyDisplayName: "Pestana Hotel Group",
    chainScale: "upscale",
    hqCountry: "PT",
    aliases: ["pestana hotel"],
  },
]);

// ───────────────────────────────────────────────────────────────────────────
// Lookup helpers
// ───────────────────────────────────────────────────────────────────────────

// Build a normalized index once at module load.
function normalize(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
}

const BRAND_INDEX: Map<string, BrandEntry> = (() => {
  const m = new Map<string, BrandEntry>();
  for (const b of BRANDS) {
    m.set(normalize(b.displayName), b);
    m.set(normalize(b.slug), b);
    for (const a of b.aliases) m.set(normalize(a), b);
  }
  return m;
})();

/**
 * Look up a brand by raw string (case- and accent-insensitive, alias-aware).
 * Returns `null` if no match — caller should route to review queue.
 */
export function lookupBrand(rawName: string | null | undefined): BrandEntry | null {
  if (!rawName) return null;
  const key = normalize(rawName);
  if (!key) return null;
  // Exact normalized match first
  const direct = BRAND_INDEX.get(key);
  if (direct) return direct;
  // Best-effort prefix match — handles "Hotel <brand> Madrid" style strings
  for (const [k, b] of BRAND_INDEX) {
    if (k.length >= 4 && key.includes(k)) return b;
  }
  return null;
}

/**
 * Resolve to brand family. Returns null if brand not found.
 */
export function resolveBrandFamily(rawName: string | null | undefined): {
  brandFamilySlug: string;
  brandFamilyDisplayName: string;
  chainScale: ChainScale;
  hqCountry: string;
} | null {
  const b = lookupBrand(rawName);
  if (!b) return null;
  return {
    brandFamilySlug: b.brandFamilySlug,
    brandFamilyDisplayName: b.brandFamilyDisplayName,
    chainScale: b.chainScale,
    hqCountry: b.hqCountry,
  };
}

export const BRAND_REGISTRY_VERSION = "1.0.0";
export const BRAND_REGISTRY_ENTRY_COUNT = BRANDS.length;
