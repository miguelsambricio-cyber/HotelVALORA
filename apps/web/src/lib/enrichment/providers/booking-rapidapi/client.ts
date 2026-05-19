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
   * Live HTTP path. Calls the RapidAPI Booking endpoint with the
   * prepared headers and query params. Defensive on:
   *   - Network timeouts (30s default)
   *   - HTTP status codes (maps to ClassifiedError shapes)
   *   - JSON parse errors (caught and surfaced as PARSE)
   *
   * Caller is responsible for rate-limiting and retry policy (worker
   * layer). This method does NOT retry — it returns the first result
   * (success or classified error) and lets the retry policy decide.
   */
  private async executeLive<T>(
    prepared: PreparedRequest,
    meta: { source: string; fetchedAt: string; mode: ClientMode },
  ): Promise<RapidApiResult<T>> {
    if (!this.config.apiKey) {
      return {
        ok: false,
        error: { code: "AUTH_MISSING_KEY", message: "RAPIDAPI_BOOKING_KEY is not configured." },
        meta,
      };
    }

    const controller = new AbortController();
    const timeoutMs = 30_000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(prepared.url, {
        method: prepared.method,
        headers: prepared.headers,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : String(err);
      const aborted = err instanceof Error && err.name === "AbortError";
      return {
        ok: false,
        error: {
          code: aborted ? "NETWORK_TIMEOUT" : "NETWORK_ERROR",
          message,
          status: 0,
        },
        meta,
      };
    } finally {
      clearTimeout(timeoutId);
    }

    // Auth / quota / not-found / server errors → classified errors
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        error: {
          code: "AUTH",
          message: `Authentication failed (HTTP ${response.status}).`,
          status: response.status,
        },
        meta,
      };
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      return {
        ok: false,
        error: {
          code: "RATE_LIMIT",
          message: `Rate limit (HTTP 429${retryAfter ? `, Retry-After=${retryAfter}` : ""}).`,
          status: 429,
        },
        meta,
      };
    }
    if (response.status === 404) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "HTTP 404", status: 404 },
        meta,
      };
    }
    if (response.status >= 500) {
      return {
        ok: false,
        error: { code: "NETWORK", message: `Upstream ${response.status}.`, status: response.status },
        meta,
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        error: { code: "HTTP_ERROR", message: `Unexpected HTTP ${response.status}.`, status: response.status },
        meta,
      };
    }

    // Parse JSON defensively
    let data: unknown;
    try {
      data = await response.json();
    } catch (err) {
      return {
        ok: false,
        error: {
          code: "PARSE",
          message: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
          status: response.status,
        },
        meta,
      };
    }

    return { ok: true, data: data as T, meta };
  }
}
