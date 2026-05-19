/**
 * Madrid metro municipios → `city_normalized` alias table (v1).
 *
 * Hybrid policy (decision under autonomy — see coverage targets doc §10):
 *  - `city`            (canonical column)  preserves the original municipio
 *                                          name from the source payload
 *                                          (e.g. "Pozuelo de Alarcón").
 *  - `city_normalized` (canonical column)  collapses Madrid-metro municipios
 *                                          to "Madrid" so reports aggregate
 *                                          correctly at the CoStar Madrid
 *                                          market boundary.
 *
 * Non-metro municipios outside the 19-entry "fold to Madrid" set are
 * preserved as their own city_normalized value, so historic/touristic
 * locations (Aranjuez, Alcalá de Henares, El Escorial) remain separate
 * markets.
 *
 * The Comunidad de Madrid has 179 municipios; this v1 covers the
 * institutional hotel-bearing metro core (~85% of Madrid-area hotel
 * inventory). Extend with care — every entry below is a deliberate
 * institutional market call, not a geographic dragnet.
 */

interface MunicipioEntry {
  /** Canonical Spanish spelling with diacritics. */
  displayName: string;
  /** Common variant spellings (accent-less, abbreviated, English forms). */
  aliases: string[];
  /**
   * What `city_normalized` should resolve to.
   * `"Madrid"` for the 19 metro entries below; the municipio itself for
   * separate-market entries.
   */
  cityNormalized: string;
  /** Indicative postal-code prefix(es) used as defence-in-depth signal. */
  postalPrefixes: readonly string[];
  /** Why this municipio folds (or doesn't) — institutional rationale. */
  notes: string;
}

export const MADRID_METRO_MUNICIPIOS: readonly MunicipioEntry[] = Object.freeze([
  // ─── Madrid capital ──────────────────────────────────────────────────────
  {
    displayName: "Madrid",
    aliases: ["madrid capital", "madrid city"],
    cityNormalized: "Madrid",
    postalPrefixes: [
      "28001", "28002", "28003", "28004", "28005", "28006", "28007", "28008",
      "28009", "28010", "28011", "28012", "28013", "28014", "28015", "28016",
      "28017", "28018", "28019", "28020", "28021", "28022", "28023", "28024",
      "28025", "28026", "28027", "28028", "28029", "28030", "28031", "28032",
      "28033", "28034", "28035", "28036", "28037", "28038", "28039", "28040",
      "28041", "28042", "28043", "28044", "28045", "28046", "28047", "28048",
      "28049", "28050", "28051", "28052", "28053", "28054", "28055",
    ],
    notes: "Madrid municipio proper. Always resolves to city_normalized=Madrid.",
  },

  // ─── Northern metro arc (institutional hotel cluster) ────────────────────
  {
    displayName: "Alcobendas",
    aliases: ["alcobendas madrid"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28100", "28108"],
    notes: "Hotels along A-1 corridor + business parks. Madrid CoStar market.",
  },
  {
    displayName: "San Sebastián de los Reyes",
    aliases: ["san sebastian de los reyes", "sanse"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28700", "28701", "28702", "28703"],
    notes: "Adjacent to Alcobendas; same business cluster.",
  },
  {
    displayName: "Tres Cantos",
    aliases: ["tres cantos madrid"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28760"],
    notes: "Tech park + airport-adjacent. Folds to Madrid market.",
  },

  // ─── Eastern metro arc (airport corridor) ────────────────────────────────
  {
    displayName: "Torrejón de Ardoz",
    aliases: ["torrejon de ardoz", "torrejon"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28850"],
    notes: "Madrid-Barajas eastern approach.",
  },
  {
    displayName: "San Fernando de Henares",
    aliases: ["san fernando de henares", "san fernando"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28830"],
    notes: "Airport corridor.",
  },
  {
    displayName: "Coslada",
    aliases: ["coslada madrid"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28820", "28823"],
    notes: "Airport corridor; logistics cluster.",
  },

  // ─── Western metro arc (premium residential) ─────────────────────────────
  {
    displayName: "Pozuelo de Alarcón",
    aliases: ["pozuelo de alarcon", "pozuelo"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28223", "28224"],
    notes: "Premium western metro. Folds to Madrid for institutional view.",
  },
  {
    displayName: "Majadahonda",
    aliases: ["majadahonda madrid"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28220", "28221", "28222"],
    notes: "Western metro residential + business park.",
  },
  {
    displayName: "Las Rozas de Madrid",
    aliases: ["las rozas", "rozas"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28230", "28231", "28232"],
    notes: "A-6 corridor business cluster; folds to Madrid.",
  },
  {
    displayName: "Boadilla del Monte",
    aliases: ["boadilla del monte", "boadilla"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28660"],
    notes: "Premium residential western metro.",
  },
  {
    displayName: "Villanueva del Pardillo",
    aliases: ["villanueva del pardillo", "pardillo"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28229"],
    notes: "Western metro fringe; folds to Madrid.",
  },

  // ─── Southern metro arc ──────────────────────────────────────────────────
  {
    displayName: "Getafe",
    aliases: ["getafe madrid"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28901", "28902", "28903", "28904", "28905", "28906", "28907", "28909"],
    notes: "Southern industrial metro; folds to Madrid.",
  },
  {
    displayName: "Leganés",
    aliases: ["leganes"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28911", "28912", "28913", "28914", "28915", "28916", "28917", "28918"],
    notes: "Southern metro; folds to Madrid.",
  },
  {
    displayName: "Alcorcón",
    aliases: ["alcorcon"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28921", "28922", "28923", "28924", "28925"],
    notes: "Southern metro; folds to Madrid.",
  },
  {
    displayName: "Móstoles",
    aliases: ["mostoles"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28931", "28932", "28933", "28934", "28935", "28936", "28937", "28938"],
    notes: "Southern metro; folds to Madrid.",
  },
  {
    displayName: "Fuenlabrada",
    aliases: ["fuenlabrada madrid"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28941", "28942", "28943", "28944", "28945", "28946"],
    notes: "Southern metro; folds to Madrid.",
  },
  {
    displayName: "Pinto",
    aliases: ["pinto madrid"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28320"],
    notes: "Southern metro logistics; folds to Madrid.",
  },
  {
    displayName: "Rivas-Vaciamadrid",
    aliases: ["rivas vaciamadrid", "rivas"],
    cityNormalized: "Madrid",
    postalPrefixes: ["28521", "28522", "28523"],
    notes: "South-eastern metro; folds to Madrid.",
  },
]);

/**
 * Separate-market municipios — preserved as their own city_normalized,
 * even though they lie within the Comunidad de Madrid. These have distinct
 * institutional positioning (historic, mountain, touristic) that warrants
 * separate market aggregation.
 */
export const MADRID_SEPARATE_MARKET_MUNICIPIOS: readonly MunicipioEntry[] = Object.freeze([
  {
    displayName: "Alcalá de Henares",
    aliases: ["alcala de henares", "alcala"],
    cityNormalized: "Alcalá de Henares",
    postalPrefixes: ["28800", "28801", "28802", "28803", "28804", "28805", "28806", "28807"],
    notes: "UNESCO heritage city. Distinct historic/cultural market.",
  },
  {
    displayName: "Aranjuez",
    aliases: ["aranjuez madrid"],
    cityNormalized: "Aranjuez",
    postalPrefixes: ["28300"],
    notes: "Royal Palace tourism. Distinct touristic market.",
  },
  {
    displayName: "San Lorenzo de El Escorial",
    aliases: ["san lorenzo de el escorial", "el escorial", "san lorenzo del escorial"],
    cityNormalized: "Sierra Norte de Madrid",
    postalPrefixes: ["28200"],
    notes: "Historic + sierra; distinct mountain market.",
  },
  {
    displayName: "Chinchón",
    aliases: ["chinchon"],
    cityNormalized: "Chinchón",
    postalPrefixes: ["28370"],
    notes: "Historic plaza; distinct cultural / weekend market.",
  },
]);

// ───────────────────────────────────────────────────────────────────────────
// Lookup
// ───────────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const ALL_ENTRIES = [...MADRID_METRO_MUNICIPIOS, ...MADRID_SEPARATE_MARKET_MUNICIPIOS];

const MUNICIPIO_INDEX: Map<string, MunicipioEntry> = (() => {
  const m = new Map<string, MunicipioEntry>();
  for (const e of ALL_ENTRIES) {
    m.set(normalize(e.displayName), e);
    for (const a of e.aliases) m.set(normalize(a), e);
  }
  return m;
})();

const POSTAL_INDEX: Map<string, MunicipioEntry> = (() => {
  const m = new Map<string, MunicipioEntry>();
  for (const e of ALL_ENTRIES) {
    for (const p of e.postalPrefixes) m.set(p, e);
  }
  return m;
})();

export interface MunicipioResolution {
  displayName: string;
  cityNormalized: string;
  source: "name" | "postal";
  confidence: number;
}

/**
 * Resolve a raw city string + optional postal code to canonical
 * `(city, city_normalized)`.
 *
 * Lookup order:
 *  1. Postal-code prefix (highest confidence — geo-anchored).
 *  2. Normalized name (alias-aware).
 *
 * If both signals disagree, postal wins and a low-confidence event is
 * recorded by the caller (geo-vs-name mismatch is a known Booking failure
 * mode — see RapidAPI sidecar §7.2).
 *
 * Returns `null` if neither signal hits — caller preserves the raw `city`
 * and sets `city_normalized = city` (verbatim) at low confidence, routed
 * to review.
 */
export function resolveMunicipio(
  rawCity: string | null | undefined,
  postalCode: string | null | undefined,
): MunicipioResolution | null {
  // 1. Postal-code prefix (5-digit ES)
  if (postalCode) {
    const cleaned = postalCode.trim().slice(0, 5);
    if (/^\d{5}$/.test(cleaned)) {
      const direct = POSTAL_INDEX.get(cleaned);
      if (direct) {
        return {
          displayName: direct.displayName,
          cityNormalized: direct.cityNormalized,
          source: "postal",
          confidence: 0.95,
        };
      }
    }
  }
  // 2. Normalized name
  if (rawCity) {
    const key = normalize(rawCity);
    if (key) {
      const direct = MUNICIPIO_INDEX.get(key);
      if (direct) {
        return {
          displayName: direct.displayName,
          cityNormalized: direct.cityNormalized,
          source: "name",
          confidence: 0.9,
        };
      }
    }
  }
  return null;
}

export const MADRID_MUNICIPIOS_REGISTRY_VERSION = "1.0.0";
export const MADRID_METRO_ENTRY_COUNT = MADRID_METRO_MUNICIPIOS.length;
