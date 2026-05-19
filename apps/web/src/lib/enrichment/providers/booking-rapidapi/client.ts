/**
 * RapidAPI Booking — base client (v1).
 *
 * Mode-aware HTTP wrapper. In `dry-run` mode it constructs the request
 * (headers, URL, params) and returns a stubbed result without sending,
 * so we can inspect the wire shape without burning quota. In
 * `recorded-fixture` mode it loads a fixture matching the endpoint.
 * In `live` mode it actually fetches (Phase 3+).
 *
 * The client owns:
 *   - Header construction (X-RapidAPI-Key / X-RapidAPI-Host).
 *   - URL building with query params.
 *   - Mode dispatch.
 *   - Provenance metadata (source string, fetched_at, mode).
 *
 * The client does NOT own:
 *   - Endpoint-specific paths/params — those live in ./endpoints.ts.
 *   - Response parsing — that lives in ./parse.ts.
 *   - Rate limiting — owned by the worker layer (Phase 3+).
 *   - Retry logic — owned by the worker layer (Phase 3+).
 */

import type { BookingRapidApiConfig } from "./config";
import type { ClientMode, RapidApiResult, RapidApiError } from "./types";

export interface PreparedRequest {
  method: "GET";
  url: string;
  headers: Record<string, string>;
  query: Record<string, string | number | undefined>;
  source: string;
}

export interface FixtureLoader<T> {
  load(endpoint: string, params: Record<string, unknown>): Promise<T | null>;
}

export class BookingRapidApiClient {
  constructor(
    private readonly config: BookingRapidApiConfig,
    private readonly fixtureLoader: FixtureLoader<unknown> | null = null,
  ) {}

  /**
   * Public source identifier used as the `source` key in
   * `hotel_field_provenance` and `hotel_source_record`. Stable across
   * publishers — switching publisher does NOT change downstream
   * provenance.
   */
  readonly source = "booking_rapidapi";

  get mode(): ClientMode {
    return this.config.mode;
  }

  /**
   * Build the prepared request without sending. Useful for logging,
   * dry-run inspection, and tests.
   */
  prepareRequest(
    endpointPath: string,
    query: Record<string, string | number | undefined>,
  ): PreparedRequest {
    const url = new URL(endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`, this.config.baseUrl);
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
    return {
      method: "GET",
      url: url.toString(),
      headers: {
        "X-RapidAPI-Key": this.config.apiKey ?? "<UNSET>",
        "X-RapidAPI-Host": this.config.host,
        Accept: "application/json",
      },
      query,
      source: this.source,
    };
  }

  /**
   * Execute the request, dispatching by mode. Returns the canonical
   * `RapidApiResult<T>` shape.
   */
  async execute<T>(
    endpointPath: string,
    query: Record<string, string | number | undefined>,
  ): Promise<RapidApiResult<T>> {
    const prepared = this.prepareRequest(endpointPath, query);
    const fetchedAt = new Date().toISOString();
    const meta = { source: this.source, fetchedAt, mode: this.mode };

    if (this.mode === "live") {
      return this.executeLive<T>(prepared, meta);
    }
    if (this.mode === "dry-run") {
      // Dry-run: return a not-found stub. Caller logs the prepared request
      // shape and continues. No data flows downstream.
      return {
        ok: false,
        error: {
          code: "DRY_RUN_NO_CALL",
          message: "Client is in dry-run mode; no HTTP request was sent.",
        },
        meta,
      };
    }
    // recorded-fixture
    if (!this.fixtureLoader) {
      return {
        ok: false,
        error: {
          code: "FIXTURE_LOADER_MISSING",
          message: "Recorded-fixture mode requires a FixtureLoader to be provided.",
        },
        meta,
      };
    }
    const fixture = (await this.fixtureLoader.load(endpointPath, query)) as T | null;
    if (fixture == null) {
      return {
        ok: false,
        error: {
          code: "FIXTURE_NOT_FOUND",
          message: `No fixture for endpoint ${endpointPath} with params ${JSON.stringify(query)}`,
        },
        meta,
      };
    }
    return { ok: true, data: fixture, meta };
  }

  /**
   * Live HTTP path. Implemented in Phase 3+ — currently throws so
   * accidental invocation is loud and obvious.
   */
  private async executeLive<T>(
    prepared: PreparedRequest,
    meta: { source: string; fetchedAt: string; mode: ClientMode },
  ): Promise<RapidApiResult<T>> {
    void prepared;
    void meta;
    throw new Error(
      "[booking-rapidapi] Live mode is not yet implemented. Phase 3 work item.",
    );
  }
}
