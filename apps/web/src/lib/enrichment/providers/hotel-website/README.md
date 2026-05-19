# Hotel-Website Provider (Phase 1 dry-run)

Tier-B source. Used as **second fallback** after Google Places for fields hotel operators control directly: `year_opened`, `legal_name`, `meeting_space_sqm`, `email`, `operator_type`.

## Strictly controlled scraping policy

HotelVALORA does NOT behave like an aggressive scraper. The discipline below is structural — enforced by the code, not just documented:

| Rule | Mechanism |
|---|---|
| robots.txt checked before every fetch | `getDirectives(domain, fetcher)` in `robots.ts` |
| UA identifies HotelVALORA + contact email | `HOTELVALORA_USER_AGENT` constant — single source of truth |
| Crawl-delay honored | `computeFetchDelayMs(directives)` reads the directive |
| 4–8s randomized delay above crawl-delay | Same function adds jitter on top |
| HEAD-only probes Phase 1 | `headProbe(url)` is the only fetcher; no GET path |
| Per-domain authorisation list | `config.authorisedDomains` — live mode throws if domain not present |
| Live mode gated explicitly | `client.ts` throws in live; Phase 4 enables it with operator opt-in per domain |

There is no path to a bulk crawler. Adding one would require modifying `client.ts` to add a `bulkCrawl` method — visible in code review, gated behind operator authorisation per domain at config level.

## Field authority

Phase 1 calibration:

| Field | Confidence floor | Why |
|---|---|---|
| `year_opened` | 0.90 | Operator-controlled, accurate when present |
| `legal_name` | 0.90 | Operator-controlled |
| `meeting_rooms_count`, `meeting_space_sqm` | 0.85 | MICE info hotels surface for sales |
| `website_url`, `email` | 0.80 | Self-evident |
| `operator_type` | 0.75 | Often inferred from About page; heuristic |
| `year_renovated_last` | 0.90 | When present, authoritative |

## Phase 4 live mode

To enable:
1. Add domain to `config.authorisedDomains` (per-domain opt-in).
2. Implement HEAD probe (single fetch, no body download).
3. Wire `headProbe` into the worker queue at 1 req per 4–8s per domain.
4. Add JSON-LD / Open Graph extractor (separate file — out of scope here).

If a richer extraction is needed for a specific hotel, that domain's GET probe lands in a separate PR with operator review.

## What this provider does NOT do

- It does NOT crawl. No link-following. No sitemap traversal.
- It does NOT respect-then-ignore robots.txt. Disallowed paths are never fetched.
- It does NOT pretend to be a browser. UA always identifies HotelVALORA.
- It does NOT bypass auth walls, CAPTCHAs, or rate-limit shields. On 403/429, the domain enters a 24h cooldown.
