/**
 * Google Places client (v1).
 *
 * Mode-aware: dry-run / recorded-fixture / live. Live mode throws —
 * Phase 4 work item, after Madrid Phase E entry criteria are met.
 *
 * Auth: X-Goog-Api-Key header. Cost: ~$0.017 per Place Details call;
 * Place Search Text is similar. Field-mask reduces cost when only a
 * subset of fields is needed.
 */

export type GooglePlacesMode = "live" | "dry-run" | "recorded-fixture";

export interface GooglePlacesConfig {
  mode: GooglePlacesMode;
  apiKey: string | null;
  baseUrl: string;          // default https://places.googleapis.com
  /** Caller-controlled monthly budget guard (USD). 0 disables. */
  monthlyBudgetUsd: number;
}

export function loadConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  modeOverride?: GooglePlacesMode,
): GooglePlacesConfig {
  const mode: GooglePlacesMode = modeOverride ?? ((env.GOOGLE_PLACES_MODE as GooglePlacesMode) || "dry-run");
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

export class GooglePlacesClient {
  constructor(private readonly config: GooglePlacesConfig) {}
  readonly source = "google_places" as const;
  get mode(): GooglePlacesMode { return this.config.mode; }

  /**
   * Live mode is gated behind an explicit throw in Phase 1. The client
   * intentionally produces the request shape (for inspection) but never
   * sends.
   */
  async fetchPlaceDetails(placeId: string): Promise<unknown> {
    if (this.config.mode === "live") {
      throw new Error("[google-places] Live mode not yet implemented — Phase 4 work item.");
    }
    if (this.config.mode === "dry-run") return null;
    // recorded-fixture: caller supplies the fixture
    return null;
  }
}
