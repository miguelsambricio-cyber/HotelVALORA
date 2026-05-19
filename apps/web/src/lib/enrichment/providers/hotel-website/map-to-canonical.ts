/**
 * Hotel-website parsed → canonical field fragment (v1).
 *
 * Phase 1: parser is a stub — Phase 4 will add an institutional
 * meta/JSON-LD/Open Graph extractor. The mapping shape below documents
 * the contract: hotel-website is authoritative for `year_opened`,
 * `legal_name`, `meeting_space_sqm`, `website_url`, `email`,
 * `year_renovated_last`, and certain operator clarifications.
 *
 * Confidence calibration uses Tier-B base (0.80) with per-field
 * overrides:
 *   - year_opened, legal_name              0.90 (operator-controlled, accurate when present)
 *   - meeting_space_sqm                    0.85
 *   - email, website_url                   0.80
 *   - operator_type                        0.75 (often inferred from About page)
 */

export interface HotelWebsiteFragment {
  fields: {
    year_opened: number | null;
    year_renovated_last: number | null;
    legal_name: string | null;
    meeting_rooms_count: number | null;
    meeting_space_sqm: number | null;
    website_url: string | null;
    email: string | null;
    operator_type: "franchise" | "managed" | "owned" | "lease" | "unknown" | null;
  };
  provenance: Array<{
    field: string;
    value: unknown;
    confidence: number;
    rationale: string;
  }>;
  warnings: string[];
}

const TIER_B_BASE = 0.8;
const TIER_B_YEAR_BOOST = 0.9;
const TIER_B_MICE_BOOST = 0.85;
const TIER_B_OPERATOR_HINT = 0.75;

export interface HotelWebsiteExtraction {
  yearOpened?: number | null;
  yearRenovatedLast?: number | null;
  legalName?: string | null;
  meetingRoomsCount?: number | null;
  meetingSpaceSqm?: number | null;
  websiteUrl?: string | null;
  email?: string | null;
  operatorTypeHint?: string | null;
}

/**
 * Map an institutional extraction (from JSON-LD, Open Graph, or
 * targeted CSS selectors — out of scope for Phase 1) into the
 * canonical fragment shape. Inputs are validated; invalid years and
 * malformed emails are silently dropped.
 */
export function mapHotelWebsiteToFragment(input: HotelWebsiteExtraction): HotelWebsiteFragment {
  const warnings: string[] = [];
  const provenance: HotelWebsiteFragment["provenance"] = [];

  const currentYear = new Date().getFullYear();

  function validYear(y: number | null | undefined): number | null {
    if (y == null) return null;
    if (y < 1700 || y > currentYear) {
      warnings.push(`year_out_of_range:${y}`);
      return null;
    }
    return Math.round(y);
  }

  function validEmail(e: string | null | undefined): string | null {
    if (!e) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      warnings.push(`email_malformed:${e}`);
      return null;
    }
    return e.trim().toLowerCase();
  }

  function normaliseOperatorType(
    raw: string | null | undefined,
  ): HotelWebsiteFragment["fields"]["operator_type"] {
    if (!raw) return null;
    const s = raw.toLowerCase();
    if (s.includes("franchise")) return "franchise";
    if (s.includes("management") || s.includes("managed by")) return "managed";
    if (s.includes("owned") || s.includes("propietario")) return "owned";
    if (s.includes("lease") || s.includes("arrendamiento")) return "lease";
    return "unknown";
  }

  const fields = {
    year_opened: validYear(input.yearOpened),
    year_renovated_last: validYear(input.yearRenovatedLast),
    legal_name: input.legalName?.trim() ?? null,
    meeting_rooms_count: input.meetingRoomsCount ?? null,
    meeting_space_sqm: input.meetingSpaceSqm ?? null,
    website_url: input.websiteUrl ?? null,
    email: validEmail(input.email),
    operator_type: normaliseOperatorType(input.operatorTypeHint),
  };

  function push(field: string, value: unknown, confidence: number, rationale: string): void {
    if (value === null || value === undefined) return;
    provenance.push({ field, value, confidence, rationale });
  }

  push("year_opened", fields.year_opened, TIER_B_YEAR_BOOST, "hotel_website_year_opened");
  push("year_renovated_last", fields.year_renovated_last, TIER_B_YEAR_BOOST, "hotel_website_year_renovated");
  push("legal_name", fields.legal_name, TIER_B_YEAR_BOOST, "hotel_website_legal_name");
  push("meeting_rooms_count", fields.meeting_rooms_count, TIER_B_MICE_BOOST, "hotel_website_meeting_rooms_count");
  push("meeting_space_sqm", fields.meeting_space_sqm, TIER_B_MICE_BOOST, "hotel_website_meeting_space_sqm");
  push("website_url", fields.website_url, TIER_B_BASE, "hotel_website_self");
  push("email", fields.email, TIER_B_BASE, "hotel_website_contact_email");
  push("operator_type", fields.operator_type, TIER_B_OPERATOR_HINT, "hotel_website_operator_type_hint");

  return { fields, provenance, warnings };
}
