/**
 * Mapbox Static Images · server-rendered institutional map URLs.
 *
 * Returns a single PNG URL pointing at the Mapbox Static API for a
 * given Madrid submarket. Server-callable · zero JS · zero hydration
 * risk · zero bundle impact. Reuses the existing
 * NEXT_PUBLIC_MAPBOX_TOKEN.
 *
 * Mode:
 *   · Token present → real Mapbox light-v11 PNG of the submarket
 *   · Token missing  → null · caller renders an institutional
 *     placeholder (SharedMapCard handles this defensively)
 *
 * Boundary:
 *   · Stand-alone module · NO touch on the interactive Mapbox GL
 *     consumer in /compset (that one still uses its own client-side
 *     pipeline · separate concern).
 *   · NO touch on the underwriting baseline · freeze respected.
 */

export interface SubmarketCoords {
  longitude: number;
  latitude: number;
  /** Default zoom for this submarket · tuned so the submarket fits inside the 300px card. */
  zoom: number;
}

/**
 * Madrid submarket centroids · WGS84.
 *
 * Sourced from canonical Madrid geography (Sol · Plaza de Salamanca ·
 * Glorieta de Bilbao). Coordinates are conservative · the Mapbox
 * Static API will render the right neighbourhood.
 */
const SUBMARKET_COORDS: Record<string, SubmarketCoords> = {
  "Madrid Centro": { longitude: -3.7038, latitude: 40.4168, zoom: 14 },
  Salamanca: { longitude: -3.6840, latitude: 40.4280, zoom: 14 },
  Chamberí: { longitude: -3.7050, latitude: 40.4380, zoom: 14 },
  // Generic city-wide fallback · used by the standalone
  // /report/market-overview page (no per-hotel context).
  Madrid: { longitude: -3.7038, latitude: 40.4168, zoom: 12 },
};

const DEFAULT_SUBMARKET_KEY = "Madrid";

export interface BuildStaticMapOptions {
  /** Submarket label · matches HotelProfile.submarket. */
  submarket?: string;
  /** Card width in px · default 600 (matches SharedMapCard 300px container at @2x). */
  width?: number;
  /** Card height in px · default 600 · square by default. */
  height?: number;
  /** Mapbox style id · default "mapbox/light-v11" (canonical institutional). */
  style?: string;
}

/**
 * Returns a Mapbox Static API URL for the given Madrid submarket, OR
 * null if NEXT_PUBLIC_MAPBOX_TOKEN is not set. The caller renders an
 * institutional placeholder on null.
 *
 * Output URL is stable · safe to ship to the client as an <img> src.
 * The token is public-anon (per Next convention NEXT_PUBLIC_*) so it
 * is intended to be browser-readable.
 */
export function buildMadridStaticMapUrl(
  opts: BuildStaticMapOptions = {},
): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const submarketKey = opts.submarket && SUBMARKET_COORDS[opts.submarket]
    ? opts.submarket
    : DEFAULT_SUBMARKET_KEY;
  const coords = SUBMARKET_COORDS[submarketKey];
  const width = clampInt(opts.width ?? 600, 50, 1280);
  const height = clampInt(opts.height ?? 600, 50, 1280);
  const style = opts.style ?? "mapbox/light-v11";

  const { longitude, latitude, zoom } = coords;
  // Mapbox Static Images API · clean basemap · pins/numbers are
  // overlaid by SharedMapCard via absolute-positioned divs so the
  // Static URL stays as plain geography.
  // Path: /styles/v1/{username}/{style_id}/static/{lng},{lat},{zoom}/{width}x{height}@2x
  return (
    `https://api.mapbox.com/styles/v1/${style}/static/` +
    `${longitude},${latitude},${zoom}/${width}x${height}@2x` +
    `?access_token=${token}`
  );
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** Public · the canonical submarket keys this helper handles. */
export function getSupportedSubmarkets(): string[] {
  return Object.keys(SUBMARKET_COORDS);
}
