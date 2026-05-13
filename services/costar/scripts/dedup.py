"""Identity + dedup helpers for the COSTAR v1.2 ingestion engine.

Three families of stable IDs:

  - hotel_id            ← (country, market, name) sha256 OR CoStar PROPERTY ID
  - compset_id          ← (target_hotel_id, member_hotel_ids sorted) sha256
  - transaction_id      ← (source, asset_name, closed_at, price_eur) sha256
  - ingestion_batch_id  ← uuid4 per pipeline run

Plus name + address normalisation for fuzzy matching, and a confidence
scorer used by the reconciliation queue.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
import uuid
from typing import Any, Iterable

try:
    from rapidfuzz import fuzz
except ImportError:  # pragma: no cover — surfaced as a CLI error
    fuzz = None  # type: ignore[assignment]


# ── Diacritic + case normalisation ──────────────────────────────────────────

def strip_diacritics(s: str) -> str:
    """Remove combining marks. 'Málaga' → 'Malaga'."""
    nkfd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nkfd if not unicodedata.combining(c)).strip()


def normalise_str_for_key(value: Any) -> str:
    """Lowercase + strip diacritics + collapse whitespace.

    Used for building dedup keys and for fuzzy-match candidates.
    """
    if value is None:
        return ""
    text = str(value).strip()
    text = strip_diacritics(text).lower()
    return " ".join(text.split())


def normalise_address(value: Any) -> str:
    """Aggressive normalisation for address comparison.

    Drops common abbreviation noise (calle, c/, avda, avenida, etc.) and
    keeps the alpha-num token core so that '"C/ Gran Vía, 22"' and
    '"Calle Gran Via 22"' collapse to the same key.
    """
    base = normalise_str_for_key(value)
    if not base:
        return ""
    # Strip leading street-prefix noise
    base = re.sub(
        r"^(c/?\.?|calle|cl\.?|avda?\.?|avenida|av\.?|paseo|p\.?|plaza|pza\.?|pl\.?|gran via)\s+",
        "",
        base,
    )
    # Keep alpha-num + spaces only
    base = re.sub(r"[^a-z0-9]+", " ", base)
    return " ".join(base.split())


# ── Hash helpers ────────────────────────────────────────────────────────────

def sha256_hex(parts: Iterable[Any]) -> str:
    """Stable hash of pipe-joined parts. None → empty string."""
    payload = "|".join("" if p is None else str(p) for p in parts)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def short_id(prefix: str, *parts: Any) -> str:
    """Stable namespaced identifier — `<prefix>_<sha256[:16]>`."""
    return f"{prefix}_{sha256_hex(list(parts))[:16]}"


# ── Stable identity per entity ─────────────────────────────────────────────

def hotel_id(country: str, market_name: str, name: str, costar_property_id: str | None = None) -> str:
    """Canonical hotel identifier.

    If CoStar's PROPERTY ID is present in the export, use it directly
    (prefixed with `costar_`) — this is the authoritative external
    identity. Otherwise compute a deterministic sha256 from
    `(country, market_name, name)` lowercased + diacritic-stripped.
    """
    if costar_property_id:
        cleaned = re.sub(r"\s+", "", str(costar_property_id))
        if cleaned:
            return f"costar_{cleaned}"
    return short_id(
        "h",
        country.upper() if country else "",
        normalise_str_for_key(market_name),
        normalise_str_for_key(name),
    )


def compset_id(target_hotel_id: str, member_hotel_ids: list[str]) -> str:
    """Compset identifier — order-insensitive over members."""
    members = "|".join(sorted(member_hotel_ids))
    return short_id("cs", target_hotel_id, members)


def transaction_id(
    source: str,
    asset_name: str,
    closed_at: str | None,
    price_eur: float | None,
) -> str:
    """Transaction identifier — stable across re-ingests of the same row."""
    return short_id(
        "tx",
        source,
        normalise_str_for_key(asset_name),
        closed_at or "",
        f"{price_eur:.0f}" if price_eur is not None else "",
    )


def ingestion_batch_id() -> str:
    """Fresh per-run identifier."""
    return f"batch_{uuid.uuid4().hex[:16]}"


# ── Fuzzy matching ──────────────────────────────────────────────────────────

DEFAULT_FUZZY_THRESHOLD = 88  # 0–100, rapidfuzz scale


def fuzzy_score(a: str, b: str) -> int:
    """Composite fuzzy similarity 0–100.

    Uses rapidfuzz `token_set_ratio` (order-insensitive token overlap)
    blended with `partial_ratio` (substring tolerance). The blend rewards
    real-name overlap while tolerating brand prefixes like
    'NH Collection ...' vs '... by NH Collection'.

    Falls back to 0 when rapidfuzz is unavailable — caller should detect
    and warn the operator.
    """
    if fuzz is None or not a or not b:
        return 0
    s1 = fuzz.token_set_ratio(a, b)
    s2 = fuzz.partial_ratio(a, b)
    return int(0.6 * s1 + 0.4 * s2)


def find_fuzzy_match(
    candidate: dict[str, Any],
    pool: list[dict[str, Any]],
    threshold: int = DEFAULT_FUZZY_THRESHOLD,
) -> tuple[dict[str, Any] | None, int]:
    """Find the best fuzzy match in `pool` above `threshold`.

    `candidate` and each pool entry must expose `_match_name` and
    `_match_address` — the pre-normalised comparison strings produced by
    `normalise_str_for_key()` + `normalise_address()`.

    Returns (best_match, score). When score < threshold returns
    (None, best_score) — the caller can decide whether to keep the
    candidate as a new hotel or send it to the reconciliation queue.
    """
    if not pool:
        return None, 0
    best, best_score = None, 0
    for row in pool:
        name_score = fuzzy_score(candidate["_match_name"], row["_match_name"])
        addr_score = fuzzy_score(candidate["_match_address"], row["_match_address"])
        score = max(name_score, int(0.7 * name_score + 0.3 * addr_score))
        if score > best_score:
            best, best_score = row, score
    if best_score >= threshold:
        return best, best_score
    return None, best_score


# ── Confidence + needs-review classifier ────────────────────────────────────

REQUIRED_HOTEL_FIELDS = ("country", "market_name", "hotel_id", "name")
RECOMMENDED_HOTEL_FIELDS = ("chain_scale", "rooms_count", "latitude", "longitude")


def classify_hotel_row(row: dict[str, Any]) -> tuple[float, list[str]]:
    """Return (confidence 0–1, needs_review_reasons[]).

    Confidence drops 0.1 per missing required field and 0.05 per missing
    recommended field. Below 0.7 the row is queued for operator review.
    """
    confidence = 1.0
    reasons: list[str] = []
    for f in REQUIRED_HOTEL_FIELDS:
        if not row.get(f):
            confidence -= 0.10
            reasons.append(f"missing_required:{f}")
    for f in RECOMMENDED_HOTEL_FIELDS:
        if row.get(f) in (None, "", []):
            confidence -= 0.05
            reasons.append(f"missing_recommended:{f}")
    rooms = row.get("rooms_count")
    if rooms is not None:
        try:
            n = int(rooms)
            if n < 5 or n > 4000:
                confidence -= 0.10
                reasons.append("rooms_count_out_of_range")
        except (TypeError, ValueError):
            confidence -= 0.10
            reasons.append("rooms_count_unparseable")
    score = row.get("score_costar")
    if score is not None:
        try:
            v = float(score)
            if v < 0 or v > 5:
                confidence -= 0.05
                reasons.append("score_costar_out_of_range")
        except (TypeError, ValueError):
            confidence -= 0.05
            reasons.append("score_costar_unparseable")
    return max(0.0, round(confidence, 3)), reasons
