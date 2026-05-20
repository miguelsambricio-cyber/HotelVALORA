#!/usr/bin/env python3
"""Convert Supabase hotel_canonical JSON dump -> CSV in HOTELESperMARKET/INPUT/.

Input source: the MCP execute_sql result file (a JSON dump produced via the
Supabase MCP tool). Path passed as argv[1] OR auto-discovered from the
tool-results folder by latest mtime.

The CSV uses the canonical CoStar schema (per HOTEL_HEADER_ALIASES in
normalization.py) so the existing ingest.py supersede pipeline absorbs
the enriched rows.

Operator workflow:
  1. Close COSTAR_MASTER_HOTELESperMARKET.xlsx in Excel.
  2. Run: python services/costar/scripts/dump_canonical_to_master_csv.py <mcp-dump.txt>
  3. Run: python services/costar/scripts/ingest.py
  4. Re-open the xlsx — enriched rows visible.
"""

from __future__ import annotations
import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
INPUT_DIR = REPO_ROOT / "services" / "costar" / "HOTELESperMARKET" / "INPUT"

# Map our chain_scale enum -> CoStar's expected "Class" tier label
CHAIN_SCALE_TO_COSTAR: dict[str, str] = {
    "luxury": "Luxury",
    "upper_upscale": "Upper Upscale",
    "upscale": "Upscale",
    "upper_midscale": "Upper Midscale",
    "midscale": "Midscale",
    "economy": "Economy",
    "lifestyle": "Lifestyle",
    "boutique": "Boutique",
    "resort": "Resort",
    "mixed_use": "Mixed Use",
    "serviced_apartments": "Serviced Apartments",
    "unknown": "",
    "independent": "Independent",
}


def star_label(n) -> str:
    if n is None:
        return ""
    try:
        return f"{int(n)}-star"
    except (TypeError, ValueError):
        return ""


def parse_mcp_json_dump(path: Path) -> list[dict]:
    """Extract the JSONB aggregated array from the MCP tool-result file.

    File format (MCP wrapper):
      {"result": "Below is...\\n<untrusted-data-XXX>\\n[{\"data\": [...]}]\\n</untrusted-data-XXX>..."}

    We parse the outer JSON, then extract the inner JSON array from the
    "result" field's untrusted-data block.
    """
    raw = path.read_text(encoding="utf-8")
    outer = json.loads(raw)
    if not isinstance(outer, dict) or "result" not in outer:
        sys.exit("MCP dump missing 'result' key")
    result_str = outer["result"]
    # Find the JSON array `[{...}]` inside the result string (within the untrusted-data block)
    m = re.search(r"(\[\s*\{.*\}\s*\])", result_str, re.DOTALL)
    if not m:
        sys.exit("could not locate inner JSON array in result string")
    inner = json.loads(m.group(1))
    # inner is [{"data": [<hotels>]}]
    if isinstance(inner, list) and inner and isinstance(inner[0], dict) and "data" in inner[0]:
        return inner[0]["data"] or []
    if isinstance(inner, list):
        return inner
    sys.exit(f"unexpected inner JSON shape: {type(inner)}")


def find_latest_mcp_dump() -> Path:
    """Find the most recent MCP tool-result file in the cached folder."""
    candidates_root = Path.home() / ".claude" / "projects"
    if not candidates_root.exists():
        sys.exit(f"no MCP results folder at {candidates_root}")
    pattern = "**/mcp-claude_ai_Supabase-execute_sql-*.txt"
    files = sorted(candidates_root.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        sys.exit("no MCP execute_sql dumps found")
    return files[0]


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else find_latest_mcp_dump()
    print(f"[dump] reading MCP dump · {src}")
    hotels = parse_mcp_json_dump(src)
    print(f"[dump] parsed {len(hotels)} hotel rows")
    if not hotels:
        sys.exit("dump contained zero hotels")

    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H%M%SZ")
    out_path = INPUT_DIR / f"hotelvalora-canonical-madrid-{stamp}.csv"

    fieldnames = [
        "country", "market_name", "submarket_name",
        "name", "brand", "operator", "owner",
        "chain_scale", "category", "segment_type",
        "rooms_count", "year_opened", "year_last_renovated",
        "address_line", "postal_code", "latitude", "longitude", "neighborhood",
        "meeting_rooms_count", "meeting_space_sqm",
        "score_costar", "score_external",
        "phone", "website_url", "booking_url", "hero_image_path",
        "google_place_id", "wikidata_qid", "review_score", "review_count",
        "data_quality_tier", "enrichment_sources", "last_scraped_at",
        "canonical_id_supabase", "booking_hotel_id",
    ]

    rows_written = 0
    with out_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for h in hotels:
            sc = h.get("source_confidence") or {}
            enrichment_sources = sorted(set(sc.keys())) if isinstance(sc, dict) else []
            scale_key = (h.get("chain_scale") or "")
            row = {
                "country": h.get("country_code") or "ES",
                "market_name": "Madrid",
                "submarket_name": h.get("submarket_name") or h.get("neighborhood") or "",
                "name": h.get("canonical_name") or "",
                "brand": h.get("brand") or "",
                "operator": h.get("operator_name") or h.get("brand_family") or "",
                "owner": "",
                "chain_scale": CHAIN_SCALE_TO_COSTAR.get(scale_key, scale_key),
                "category": star_label(h.get("star_rating")),
                "segment_type": h.get("hotel_type") or h.get("segment") or "",
                "rooms_count": h.get("total_keys") or h.get("total_rooms") or "",
                "year_opened": h.get("year_opened") or "",
                "year_last_renovated": h.get("year_renovated_last") or "",
                "address_line": h.get("address_line1") or "",
                "postal_code": h.get("postal_code") or "",
                "latitude": h.get("lat") or "",
                "longitude": h.get("lng") or "",
                "neighborhood": h.get("neighborhood") or "",
                "meeting_rooms_count": h.get("meeting_rooms_count") or "",
                "meeting_space_sqm": h.get("meeting_space_sqm") or "",
                "score_costar": "",
                "score_external": json.dumps({"booking_review_score": h.get("review_score")}) if h.get("review_score") is not None else "",
                "phone": h.get("phone") or "",
                "website_url": h.get("website_url") or "",
                "booking_url": h.get("booking_url") or "",
                "hero_image_path": h.get("hero_image_path") or "",
                "google_place_id": h.get("google_place_id") or "",
                "wikidata_qid": h.get("wikidata_qid") or "",
                "review_score": h.get("review_score") or "",
                "review_count": h.get("review_count") or "",
                "data_quality_tier": h.get("data_quality_tier") or "",
                "enrichment_sources": "+".join(enrichment_sources) if enrichment_sources else "",
                "last_scraped_at": h.get("last_enriched_at") or "",
                "canonical_id_supabase": h.get("id") or "",
                "booking_hotel_id": h.get("booking_hotel_id") or "",
            }
            writer.writerow(row)
            rows_written += 1

    print(f"[dump] wrote {rows_written} rows -> {out_path.relative_to(REPO_ROOT)}")
    print(f"[next] close Excel and run:")
    print(f"       python services/costar/scripts/ingest.py")


if __name__ == "__main__":
    main()
