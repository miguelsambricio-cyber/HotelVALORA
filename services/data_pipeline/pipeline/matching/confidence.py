"""
Hotel match confidence scoring.

Produces a weighted composite score (0.0–1.0) with a HIGH/MEDIUM/LOW label
and a per-component breakdown for explainability.

Usage::

    from pipeline.matching.confidence import score_hotels, score_hotel_dicts

    result = score_hotels(
        name_a="Hotel Arts Barcelona",  city_a="Barcelona",
        name_b="Arts Hotel",            city_b="barcelona",
    )
    print(result.label)       # "HIGH"
    print(result.final_score) # 0.93
    print(result.explain())
    # name_exact : 1.000  weight=0.350  strip+key exact match
    # name_fuzzy : None   weight=0.300  EXCLUDED (requires pip install rapidfuzz)
    # city       : 1.000  weight=0.200  both → Barcelona
    # operator   : None   weight=0.100  EXCLUDED (no operator provided)
    # address    : None   weight=0.050  EXCLUDED (no address provided)
    # FINAL      : 0.929  label=HIGH

Component weights are redistributed proportionally when a component is
unavailable (rapidfuzz missing) or has no data (operator/address = None).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from pipeline.cleaning.multilingual import normalize_for_matching
from pipeline.cleaning.names import _key, normalize_operator
from pipeline.cleaning.geography import normalize_city

try:
    from rapidfuzz.fuzz import token_set_ratio as _token_set_ratio
    _HAS_RAPIDFUZZ = True
except ImportError:
    _HAS_RAPIDFUZZ = False

# ── Default component weights (must sum to 1.0) ───────────────────────────────

DEFAULT_WEIGHTS: dict[str, float] = {
    "name_exact":  0.35,
    "name_fuzzy":  0.30,
    "city":        0.20,
    "operator":    0.10,
    "address":     0.05,
}

# ── Data structures ───────────────────────────────────────────────────────────


@dataclass(frozen=True)
class MatchThresholds:
    high:   float = 0.85
    medium: float = 0.65

    def label(self, score: float) -> str:
        if score >= self.high:
            return "HIGH"
        if score >= self.medium:
            return "MEDIUM"
        return "LOW"


@dataclass
class ComponentScore:
    name:   str
    score:  Optional[float]   # None = component excluded from final calc
    weight: float
    detail: str = ""

    @property
    def excluded(self) -> bool:
        return self.score is None


@dataclass
class ConfidenceResult:
    final_score: float
    label:       str
    components:  list[ComponentScore]
    name_a:      str
    name_b:      str
    city_a:      Optional[str] = None
    city_b:      Optional[str] = None

    def explain(self) -> str:
        lines = []
        for c in self.components:
            score_str = f"{c.score:.3f}" if c.score is not None else "None "
            status    = f"EXCLUDED ({c.detail})" if c.excluded else c.detail
            lines.append(
                f"{c.name:<12} : {score_str}  weight={c.weight:.3f}  {status}"
            )
        lines.append(
            f"{'FINAL':<12} : {self.final_score:.3f}  label={self.label}"
        )
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "final_score": round(self.final_score, 4),
            "label":       self.label,
            "name_a":      self.name_a,
            "name_b":      self.name_b,
            "city_a":      self.city_a,
            "city_b":      self.city_b,
            "components": [
                {
                    "name":    c.name,
                    "score":   round(c.score, 4) if c.score is not None else None,
                    "weight":  c.weight,
                    "detail":  c.detail,
                    "excluded": c.excluded,
                }
                for c in self.components
            ],
        }


# ── Internal helpers ──────────────────────────────────────────────────────────


def _name_core(name: str) -> str:
    """Full multilingual normalization of a hotel name for comparison."""
    return normalize_for_matching(name)


def _compute_final(components: list[ComponentScore]) -> float:
    available = [c for c in components if not c.excluded]
    if not available:
        return 0.0
    total_weight = sum(c.weight for c in available)
    weighted_sum = sum(c.score * c.weight for c in available)  # type: ignore[operator]
    return weighted_sum / total_weight


# ── Component scorers ─────────────────────────────────────────────────────────


def _score_name_exact(
    name_a: str, name_b: str, weight: float
) -> ComponentScore:
    core_a = _name_core(name_a)
    core_b = _name_core(name_b)
    if not core_a or not core_b:
        return ComponentScore(
            "name_exact", None, weight, "one or both names empty after stripping"
        )
    score = 1.0 if core_a == core_b else 0.0
    detail = f"strip+key exact match" if score == 1.0 else f"{core_a!r} ≠ {core_b!r}"
    return ComponentScore("name_exact", score, weight, detail)


def _score_name_fuzzy(
    name_a: str, name_b: str, weight: float
) -> ComponentScore:
    if not _HAS_RAPIDFUZZ:
        return ComponentScore(
            "name_fuzzy", None, weight, "requires pip install rapidfuzz"
        )
    core_a = _name_core(name_a)
    core_b = _name_core(name_b)
    if not core_a or not core_b:
        return ComponentScore(
            "name_fuzzy", None, weight, "one or both names empty after stripping"
        )
    raw = _token_set_ratio(core_a, core_b)
    score = raw / 100.0
    return ComponentScore("name_fuzzy", score, weight, f"token_set_ratio={raw}")


def _score_city(
    city_a: Optional[str], city_b: Optional[str], weight: float
) -> ComponentScore:
    if not city_a or not city_b:
        return ComponentScore(
            "city", None, weight, "no city provided"
        )
    norm_a = normalize_city(city_a)
    norm_b = normalize_city(city_b)
    if norm_a is None or norm_b is None:
        return ComponentScore(
            "city", None, weight, "city could not be normalised"
        )
    score = 1.0 if _key(norm_a) == _key(norm_b) else 0.0
    detail = (
        f"both → {norm_a}"
        if score == 1.0
        else f"{norm_a!r} ≠ {norm_b!r}"
    )
    return ComponentScore("city", score, weight, detail)


def _score_operator(
    operator_a: Optional[str], operator_b: Optional[str], weight: float
) -> ComponentScore:
    if not operator_a or not operator_b:
        return ComponentScore(
            "operator", None, weight, "no operator provided"
        )
    norm_a = normalize_operator(operator_a)
    norm_b = normalize_operator(operator_b)
    if not norm_a or not norm_b:
        return ComponentScore(
            "operator", None, weight, "operator could not be normalised"
        )
    score = 1.0 if norm_a == norm_b else 0.0
    detail = (
        f"both → {norm_a}"
        if score == 1.0
        else f"{norm_a!r} ≠ {norm_b!r}"
    )
    return ComponentScore("operator", score, weight, detail)


def _score_address(
    address_a: Optional[str], address_b: Optional[str], weight: float
) -> ComponentScore:
    if not address_a or not address_b:
        return ComponentScore(
            "address", None, weight, "no address provided"
        )
    k_a = _key(address_a)
    k_b = _key(address_b)
    if not k_a or not k_b:
        return ComponentScore(
            "address", None, weight, "address empty after normalisation"
        )
    if _HAS_RAPIDFUZZ:
        raw = _token_set_ratio(k_a, k_b)
        score = raw / 100.0
        detail = f"token_set_ratio={raw}"
    else:
        score = 1.0 if k_a == k_b else 0.0
        detail = "exact match (rapidfuzz not installed)"
    return ComponentScore("address", score, weight, detail)


# ── Public API ────────────────────────────────────────────────────────────────


def score_hotels(
    name_a: str,
    city_a: Optional[str] = None,
    name_b: str = "",
    city_b: Optional[str] = None,
    operator_a: Optional[str] = None,
    operator_b: Optional[str] = None,
    address_a: Optional[str] = None,
    address_b: Optional[str] = None,
    weights: Optional[dict[str, float]] = None,
    thresholds: Optional[MatchThresholds] = None,
) -> ConfidenceResult:
    """Score the similarity between two hotel records.

    Returns a :class:`ConfidenceResult` with the final weighted score,
    a HIGH/MEDIUM/LOW label, and a per-component breakdown.
    """
    w = {**DEFAULT_WEIGHTS, **(weights or {})}
    t = thresholds or MatchThresholds()

    components = [
        _score_name_exact(name_a, name_b,      w["name_exact"]),
        _score_name_fuzzy(name_a, name_b,       w["name_fuzzy"]),
        _score_city(city_a, city_b,             w["city"]),
        _score_operator(operator_a, operator_b, w["operator"]),
        _score_address(address_a, address_b,    w["address"]),
    ]

    final = _compute_final(components)
    return ConfidenceResult(
        final_score=round(final, 4),
        label=t.label(final),
        components=components,
        name_a=name_a,
        name_b=name_b,
        city_a=city_a,
        city_b=city_b,
    )


def score_hotel_dicts(
    hotel_a: dict,
    hotel_b: dict,
    weights: Optional[dict[str, float]] = None,
    thresholds: Optional[MatchThresholds] = None,
) -> ConfidenceResult:
    """Convenience wrapper — accepts hotel dicts with standard field names.

    Recognised keys: ``asset_name`` / ``property_name`` (name),
    ``city``, ``operator``, ``address``.
    """
    def _name(h: dict) -> str:
        return h.get("asset_name") or h.get("property_name") or ""

    return score_hotels(
        name_a=_name(hotel_a),
        city_a=hotel_a.get("city"),
        name_b=_name(hotel_b),
        city_b=hotel_b.get("city"),
        operator_a=hotel_a.get("operator"),
        operator_b=hotel_b.get("operator"),
        address_a=hotel_a.get("address"),
        address_b=hotel_b.get("address"),
        weights=weights,
        thresholds=thresholds,
    )
