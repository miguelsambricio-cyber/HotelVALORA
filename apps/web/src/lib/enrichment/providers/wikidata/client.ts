/**
 * Wikidata SPARQL client (v1).
 *
 * Wikidata exposes a public SPARQL endpoint
 * (https://query.wikidata.org/sparql) at 1 req/s per IP. Batched
 * queries return multiple hotels in one call — preferred over
 * per-hotel HTTP.
 *
 * Phase 1: dry-run. Live mode (Phase 4) is allowed but capped at 1
 * req/s and uses a structured `User-Agent` per Wikidata policy.
 */

export type WikidataMode = "live" | "dry-run" | "recorded-fixture";

export interface WikidataConfig {
  mode: WikidataMode;
  baseUrl: string;
  userAgent: string;
}

export function loadConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  modeOverride?: WikidataMode,
): WikidataConfig {
  return {
    mode: modeOverride ?? ((env.WIKIDATA_MODE as WikidataMode) || "dry-run"),
    baseUrl: env.WIKIDATA_SPARQL_URL ?? "https://query.wikidata.org/sparql",
    userAgent: env.WIKIDATA_USER_AGENT ?? "HotelVALORA/1.0 (https://hotelvalora.com; miguel.sambricio@metcub.com)",
  };
}

// ───────────────────────────────────────────────────────────────────────────
// SPARQL query builders (compose-only; no execution in Phase 1)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Build the SPARQL query that retrieves attributes for a single
 * hotel by Wikidata QID. Returns the query string only — does not
 * execute it.
 */
export function buildHotelByQidQuery(qid: string): string {
  return `
SELECT ?hotel ?hotelLabel ?inception ?operator ?operatorLabel ?ownedBy ?ownedByLabel ?street ?streetNumber ?city ?cityLabel ?postal
WHERE {
  BIND(wd:${qid} AS ?hotel)
  OPTIONAL { ?hotel wdt:P571 ?inception. }     # date of inception (year_opened)
  OPTIONAL { ?hotel wdt:P127 ?ownedBy. }       # owned by
  OPTIONAL { ?hotel wdt:P137 ?operator. }      # operator
  OPTIONAL { ?hotel wdt:P669 ?street. }        # street
  OPTIONAL { ?hotel wdt:P670 ?streetNumber. }  # street number
  OPTIONAL { ?hotel wdt:P131 ?city. }          # located in admin entity
  OPTIONAL { ?hotel wdt:P281 ?postal. }        # postal code
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es". }
}
  `.trim();
}

/**
 * Build SPARQL query: fuzzy-lookup hotel by exact name AND city. Used
 * when we don't yet have a Wikidata QID and want to discover one.
 */
export function buildHotelByNameAndCityQuery(name: string, cityQid: string | null): string {
  const cityClause = cityQid ? `?hotel wdt:P131*/wdt:P31 wd:${cityQid}.` : "";
  // Note: Wikidata's name match is case-sensitive; using rdfs:label with
  // LANGMATCHES gets us closest. Escape quotes.
  const safeName = name.replace(/"/g, '\\"');
  return `
SELECT ?hotel ?hotelLabel ?inception ?operatorLabel ?ownedByLabel
WHERE {
  ?hotel wdt:P31/wdt:P279* wd:Q27686.   # instance of (subclass of) hotel
  ?hotel rdfs:label ?hotelLabel.
  FILTER (LANG(?hotelLabel) IN ("en", "es"))
  FILTER (LCASE(STR(?hotelLabel)) = "${safeName.toLowerCase()}")
  ${cityClause}
  OPTIONAL { ?hotel wdt:P571 ?inception. }
  OPTIONAL { ?hotel wdt:P137 ?operator. }
  OPTIONAL { ?hotel wdt:P127 ?ownedBy. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es". }
}
LIMIT 5
  `.trim();
}

export class WikidataClient {
  constructor(private readonly config: WikidataConfig) {}
  readonly source = "wikidata" as const;
  get mode(): WikidataMode { return this.config.mode; }

  async execute(_sparql: string): Promise<unknown> {
    if (this.config.mode === "live") {
      throw new Error("[wikidata] Live mode not yet implemented — Phase 4 work item.");
    }
    return null;
  }
}
