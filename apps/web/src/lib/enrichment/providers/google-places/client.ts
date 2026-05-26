/**
 * Google Places client (v1 · live HTTP enabled 2026-05-26).
 *
 * Mode-aware: dry-run / recorded-fixture / live.
 *
 * Auth: X-Goog-Api-Key header. Cost: ~$0.017 per Place Details call
 * (Pro tier). Field-mask reduces cost when fewer fields are requested ·
 * we always request a narrow mask sized to our enrichment needs.
 *
 * Photos are NOT retrieved through Place Details here · the photo
 * resource names are returned but the actual photo URLs require a
 * separate billable GET per photo. Pilot strategy: Booking photos
 * (cf.bstatic.com · free CDN) cover the gallery · Google photos remain
 * available for hotels with poor Booking coverage in a later pass.
 */

export type GooglePlacesMode = "live" | "dry-run" | "recorded-fixture";

export interface GooglePlacesConfig {
  mode: GooglePlacesMode;
  apiKey: string | null;
  baseUrl: string; // default https://places.googleapis.com
  /** Caller-controlled monthly budget guard (USD). 0 disables. */
  monthlyBudgetUsd: number;
}

export function loadConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  modeOverride?: GooglePlacesMode,
): GooglePlacesConfig {
  const mode: GooglePlacesMode =
    modeOverride ?? ((env.GOOGLE_PLACES_MODE as GooglePlacesMode) || "dry-run");
  const apiKey = env.GOOGLE_PLACES_API_KEY ?? null;
  if (mode === "live" && !apiKey) {
    throw new Error("[google-places] Live mode requires GOOGLE_PLACES_API_KEY env var.");
  }
  return {
    mode,
    apiKey,
    baseUrl: env.GOOGLE_PLACES_BASE_URL ?? "https://places.googleapis.com",
    monthlyBudgetUsd: parseInt(env.GOOGLE_PLACES_MONTHLY_BUDGET_USD ?? "0", 10),
  };
}

export interface PlaceDetailsRaw {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
  location?: { latitude?: number; longitude?: number };
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  /** Photo resource names · `places/{id}/photos/{photo_id}`. Not URLs. */
  photos?: Array<{ name?: string; widthPx?: number; heightPx?: number }>;
}

export type PlaceDetailsResult =
  | { ok: true; data: PlaceDetailsRaw; status: number }
  | { ok: false; code: "AUTH" | "RATE_LIMIT" | "NOT_FOUND" | "NETWORK" | "PARSE" | "DRY_RUN"; message: string; status: number };

/**
 * Field-mask aligned to our enrichment needs · keeps cost down by NOT
 * requesting fields we don't persist (e.g. types · reviews · open hours
 * are deferred to a future enrichment pass).
 */
const DEFAULT_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "location",
  "internationalPhoneNumber",
  "nationalPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "photos",
].join(",");

export class GooglePlacesClient {
  constructor(private readonly config: GooglePlacesConfig) {}
  readonly source = "google_places" as const;
  get mode(): GooglePlacesMode {
    return this.config.mode;
  }

  /**
   * Fetch Place Details by place_id. Returns the canonical fields we
   * need for enrichment (geo + contact + photo refs).
   *
   * In `dry-run` mode returns `{ ok: false, code: "DRY_RUN" }` without
   * making any HTTP call · use this in tests/CI without leaking quota.
   */
  async fetchPlaceDetails(placeId: string): Promise<PlaceDetailsResult> {
    if (this.config.mode === "dry-run") {
      return { ok: false, code: "DRY_RUN", message: "dry-run mode", status: 0 };
    }
    if (this.config.mode === "recorded-fixture") {
      // Caller supplies fixture loader at higher level · not used in pilot
      return { ok: false, code: "DRY_RUN", message: "fixture not wired", status: 0 };
    }
    if (!this.config.apiKey) {
      return { ok: false, code: "AUTH", message: "API key missing", status: 0 };
    }

    const url = `${this.config.baseUrl}/v1/places/${encodeURIComponent(placeId)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": this.config.apiKey,
          "X-Goog-FieldMask": DEFAULT_FIELD_MASK,
          "Accept": "application/json",
        },
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, code: "NETWORK", message, status: 0 };
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401 || response.status === 403) {
      return { ok: false, code: "AUTH", message: `HTTP ${response.status}`, status: response.status };
    }
    if (response.status === 429) {
      return { ok: false, code: "RATE_LIMIT", message: "HTTP 429", status: 429 };
    }
    if (response.status === 404) {
      return { ok: false, code: "NOT_FOUND", message: "place_id not found", status: 404 };
    }
    if (response.status >= 400) {
      return { ok: false, code: "NETWORK", message: `HTTP ${response.status}`, status: response.status };
    }

    let parsed: PlaceDetailsRaw;
    try {
      parsed = (await response.json()) as PlaceDetailsRaw;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, code: "PARSE", message, status: response.status };
    }

    return { ok: true, data: parsed, status: response.status };
  }
}
