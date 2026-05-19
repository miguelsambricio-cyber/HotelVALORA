/**
 * Hotel-website client (v1).
 *
 * HEAD-only fetcher with robots.txt + per-domain rate limiting.
 *
 * INSTITUTIONAL DISCIPLINE (operator priority for M6):
 *   - robots.txt checked BEFORE every fetch.
 *   - User-Agent identifies HotelVALORA + contact email.
 *   - HEAD-only in Phase 4; GET only for explicitly-allowed landing
 *     pages with operator opt-in per domain.
 *   - Crawl-delay honored.
 *   - 4–8s randomized delay above any crawl-delay.
 *   - Circuit breaker on per-domain failures.
 *
 * Phase 1: all modes are simulation. Live mode (Phase 4) requires
 * explicit operator authorisation per domain — no blanket scraping.
 */

import {
  HOTELVALORA_USER_AGENT,
  computeFetchDelayMs,
  getDirectives,
  isAllowedByRobots,
  type RobotsFetcher,
} from "./robots";

export type HotelWebsiteMode = "live" | "dry-run" | "recorded-fixture";

export interface HotelWebsiteConfig {
  mode: HotelWebsiteMode;
  /** Per-domain authorisation list. Phase 4 enforces this strictly. */
  authorisedDomains: ReadonlySet<string>;
  /** Robots.txt fetcher (HTTP GET to /robots.txt). */
  robotsFetcher: RobotsFetcher;
}

export interface HotelWebsiteHeadResponse {
  domain: string;
  url: string;
  allowedByRobots: boolean;
  domainAuthorised: boolean;
  // The following are populated only in live mode:
  statusCode?: number;
  contentType?: string;
  lastModified?: string;
  serverFingerprint?: string;
  warnings: string[];
}

/**
 * Dry-run robots fetcher — returns null for every domain so the parser
 * falls back to "no restrictions found" (which is also the safest
 * default behavior since we then add our own 4–8s jitter regardless).
 */
export const DRY_RUN_ROBOTS_FETCHER: RobotsFetcher = {
  async fetchRobots(): Promise<string | null> {
    return null;
  },
};

export class HotelWebsiteClient {
  constructor(private readonly config: HotelWebsiteConfig) {}
  readonly source = "hotel_website" as const;
  get mode(): HotelWebsiteMode { return this.config.mode; }

  async headProbe(url: string): Promise<HotelWebsiteHeadResponse> {
    const parsed = new URL(url);
    const domain = parsed.hostname.toLowerCase();
    const warnings: string[] = [];

    const domainAuthorised = this.config.authorisedDomains.has(domain);
    if (!domainAuthorised && this.config.mode === "live") {
      throw new Error(`[hotel-website] domain not authorised: ${domain}. Add to config.authorisedDomains before live fetch.`);
    }

    // Always check robots.txt (even in dry-run, to validate the path
    // through the discipline gate).
    const directives = await getDirectives(domain, this.config.robotsFetcher);
    const allowedByRobots = isAllowedByRobots(parsed.pathname, directives);
    if (!allowedByRobots) {
      warnings.push("robots_disallow_path");
    }

    if (this.config.mode === "live") {
      throw new Error("[hotel-website] Live HEAD probe not yet implemented — Phase 4 work item.");
    }

    // dry-run: return the inspection-only shape
    return {
      domain,
      url,
      allowedByRobots,
      domainAuthorised,
      warnings,
    };
  }

  /** Expose the computed delay for the worker layer to honor. */
  async computeNextDelayMs(domain: string): Promise<number> {
    const directives = await getDirectives(domain, this.config.robotsFetcher);
    return computeFetchDelayMs(directives);
  }

  static userAgent(): string {
    return HOTELVALORA_USER_AGENT;
  }
}
