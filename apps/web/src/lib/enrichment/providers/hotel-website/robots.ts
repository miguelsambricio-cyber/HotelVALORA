/**
 * Robots.txt parser + per-domain compliance cache (v1).
 *
 * INSTITUTIONAL DISCIPLINE:
 *   - Every hotel-website fetch CHECKS robots.txt FIRST.
 *   - User-Agent identifies HotelVALORA + contact email.
 *   - Crawl-delay is honored.
 *   - 4–8s randomized delay per domain (above any crawl-delay).
 *   - HEAD-only for discovery; GET only for the institutional landing
 *     page when robots allows.
 *
 * Phase 1: parser is implemented; HTTP fetcher is dry-run only.
 * Live mode lands in Phase 4 with explicit operator authorisation per
 * domain (no blanket scraping).
 */

const USER_AGENT_NAME = "HotelVALORA-Bot";
const USER_AGENT_CONTACT = "miguel.sambricio@metcub.com";

export const HOTELVALORA_USER_AGENT =
  `HotelVALORA/1.0 (+https://hotelvalora.com; bot=${USER_AGENT_NAME}; contact=${USER_AGENT_CONTACT})`;

// ───────────────────────────────────────────────────────────────────────────
// Parser
// ───────────────────────────────────────────────────────────────────────────

export interface RobotsDirectives {
  /** UA whose rules apply (best-match). */
  userAgent: string;
  /** Path prefixes the bot must NOT fetch. */
  disallow: string[];
  /** Path prefixes explicitly allowed (override `disallow`). */
  allow: string[];
  /** Crawl-delay in seconds, if specified. */
  crawlDelaySec: number | null;
  sitemap: string[];
  raw: string;
}

/**
 * Parse a robots.txt file and return directives relevant to our bot.
 * Best-match algorithm: longest UA prefix wins; `*` is the fallback.
 */
export function parseRobotsTxt(content: string): RobotsDirectives {
  const lines = content.split(/\r?\n/);
  const sections: Array<{ ua: string; disallow: string[]; allow: string[]; crawlDelay: number | null }> = [];
  const sitemap: string[] = [];

  let current: { ua: string; disallow: string[]; allow: string[]; crawlDelay: number | null } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [keyRaw, ...valueParts] = line.split(":");
    if (!keyRaw || valueParts.length === 0) continue;
    const key = keyRaw.trim().toLowerCase();
    const value = valueParts.join(":").trim();
    if (key === "user-agent") {
      if (current) sections.push(current);
      current = { ua: value, disallow: [], allow: [], crawlDelay: null };
    } else if (current) {
      if (key === "disallow") current.disallow.push(value);
      else if (key === "allow") current.allow.push(value);
      else if (key === "crawl-delay") current.crawlDelay = parseInt(value, 10) || null;
    }
    if (key === "sitemap") sitemap.push(value);
  }
  if (current) sections.push(current);

  // Pick the most specific UA section that matches our bot name.
  const targetLower = USER_AGENT_NAME.toLowerCase();
  let chosen: typeof sections[number] | undefined;
  let chosenLen = -1;
  for (const s of sections) {
    const uaLower = s.ua.toLowerCase();
    if (uaLower === "*" && chosenLen < 0) {
      chosen = s;
      chosenLen = 0;
    } else if (targetLower.includes(uaLower) && uaLower.length > chosenLen) {
      chosen = s;
      chosenLen = uaLower.length;
    }
  }

  if (!chosen) {
    chosen = { ua: "*", disallow: [], allow: [], crawlDelay: null };
  }

  return {
    userAgent: chosen.ua,
    disallow: chosen.disallow,
    allow: chosen.allow,
    crawlDelaySec: chosen.crawlDelay,
    sitemap,
    raw: content,
  };
}

/**
 * Decide whether the bot may fetch `path` for the given directives.
 * Empty `disallow:` means "no restrictions". Most-specific match wins.
 */
export function isAllowedByRobots(path: string, directives: RobotsDirectives): boolean {
  // Default: allowed
  let allowedSpecificity = -1;
  let disallowedSpecificity = -1;
  for (const a of directives.allow) {
    if (a && path.startsWith(a)) allowedSpecificity = Math.max(allowedSpecificity, a.length);
  }
  for (const d of directives.disallow) {
    if (d && path.startsWith(d)) disallowedSpecificity = Math.max(disallowedSpecificity, d.length);
  }
  if (disallowedSpecificity < 0) return true;
  if (allowedSpecificity > disallowedSpecificity) return true;
  return false;
}

// ───────────────────────────────────────────────────────────────────────────
// Per-domain compliance cache (in-process, TTL 1h)
// ───────────────────────────────────────────────────────────────────────────

interface CacheEntry {
  directives: RobotsDirectives;
  fetchedAt: Date;
}

const ROBOTS_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

export interface RobotsFetcher {
  fetchRobots(domain: string): Promise<string | null>;
}

/**
 * Get directives for a domain, using the in-process cache.
 * `fetcher` is injected — in Phase 1, only the dry-run fetcher exists.
 */
export async function getDirectives(
  domain: string,
  fetcher: RobotsFetcher,
  now: Date = new Date(),
): Promise<RobotsDirectives> {
  const entry = cache.get(domain);
  if (entry && now.getTime() - entry.fetchedAt.getTime() < ROBOTS_TTL_MS) {
    return entry.directives;
  }
  const raw = await fetcher.fetchRobots(domain);
  const directives = raw ? parseRobotsTxt(raw) : { userAgent: "*", disallow: [], allow: [], crawlDelaySec: null, sitemap: [], raw: "" };
  cache.set(domain, { directives, fetchedAt: now });
  return directives;
}

/**
 * Compute the delay (in milliseconds) to wait before the next fetch
 * against `domain`. Respects robots.txt Crawl-delay AND adds a
 * randomized 4–8s jitter on top. Anti-aggression by construction.
 */
export function computeFetchDelayMs(
  directives: RobotsDirectives,
  rng: () => number = Math.random,
): number {
  const baseSec = Math.max(4, directives.crawlDelaySec ?? 0);
  const jitterSec = 4 + rng() * 4; // 4–8s
  return Math.floor((baseSec + jitterSec) * 1000);
}
