/**
 * Wikidata SPARQL response → canonical fragment (v1).
 *
 * Wikidata is Tier-F — sparse but high-signal. We pull only fields we
 * can't get cheaply elsewhere: `year_opened` (P571 inception),
 * `wikidata_qid`, `ownership_structure` (P127 owned by), and an
 * operator clarification (P137).
 */

const TIER_F_BASE = 0.5;
const TIER_F_YEAR_BOOST = 0.65;   // Wikidata inception is well-curated when present
const SELF_AUTHORITATIVE = 1.0;

export interface WikidataBinding {
  hotel?: { value?: string };          // URI ending in QID
  hotelLabel?: { value?: string };
  inception?: { value?: string };      // ISO date string
  operatorLabel?: { value?: string };
  ownedByLabel?: { value?: string };
}

export interface WikidataFragment {
  fields: {
    wikidata_qid: string | null;
    year_opened: number | null;
    operator_hint: string | null;
    ownership_structure: string | null;
  };
  provenance: Array<{
    field: string;
    value: unknown;
    confidence: number;
    rationale: string;
  }>;
  warnings: string[];
}

function extractQid(uri: string | undefined | null): string | null {
  if (!uri) return null;
  const m = uri.match(/Q\d+$/);
  return m ? m[0] : null;
}

function inceptionToYear(iso: string | undefined | null, warnings: string[]): number | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  if (!Number.isFinite(y) || y < 1700 || y > new Date().getFullYear()) {
    warnings.push(`wikidata_inception_out_of_range:${iso}`);
    return null;
  }
  return y;
}

export function mapWikidataBindingToFragment(binding: WikidataBinding): WikidataFragment {
  const warnings: string[] = [];
  const provenance: WikidataFragment["provenance"] = [];

  const qid = extractQid(binding.hotel?.value);
  const year = inceptionToYear(binding.inception?.value, warnings);
  const operatorHint = binding.operatorLabel?.value?.trim() ?? null;
  const ownership = binding.ownedByLabel?.value?.trim() ?? null;

  function push(field: string, value: unknown, confidence: number, rationale: string): void {
    if (value === null || value === undefined) return;
    provenance.push({ field, value, confidence, rationale });
  }

  push("wikidata_qid", qid, SELF_AUTHORITATIVE, "self_authoritative_qid");
  push("year_opened", year, TIER_F_YEAR_BOOST, "wikidata_p571_inception");
  // operator_hint and ownership_structure are heuristic — Wikidata is
  // base tier for both
  push("operator_type", null, 0, "wikidata_no_operator_type_concept"); // not a direct fit
  push("ownership_structure", ownership, TIER_F_BASE, "wikidata_p127_owned_by");

  return {
    fields: {
      wikidata_qid: qid,
      year_opened: year,
      operator_hint: operatorHint,
      ownership_structure: ownership,
    },
    provenance,
    warnings,
  };
}
