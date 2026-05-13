"""Phase 2.3.d.6c — Synthetic compset inference (transitional · pending PDF source).

The institutional `compset_membership` for each hotel is supposed to come
from the operator's 3.1 Costar Analytics Print PDF — a curated list of
4 competitor hotels per target. That PDF is not yet parsed.

Until the real membership lands, this module generates a **synthetic
compset** for every hotel in inventory: the top-4 hotels most similar
to the target by location · scale · size · segment. Every synthetic
compset is tagged with `provenance: "synthetic_inference"` so the UI
and the underwriting downstream can clearly distinguish synthetic
inferences from operator-confirmed memberships.

When the PDF parser ships, real memberships replace the synthetic ones
keyed by `target_hotel_id`.

────────────────────
Similarity scoring  (lower score = more similar · range 0..1)
────────────────────

Weighted blend of five factors:

    submarket   0 same · 1 different · 0.5 unknown          weight 0.30
    chain_scale 0 same · 0.33/0.67/1.0 by tier distance     weight 0.30
    rooms       |Δrooms| / max(rooms_a, 200), clamped 0..1  weight 0.20
    segment     0 same · 1 different · 0.5 unknown          weight 0.10
    geo         Haversine(km) / 5km, clamped 0..1           weight 0.10

Hotels missing a factor get the 0.5 neutral penalty so the algorithm
degrades gracefully on incomplete records — matches the institutional
posture that "no data" must be treated as "moderate uncertainty",
never as "perfect match".

The algorithm is intentionally simple. Phase 4+ will replace it with
an LLM-assisted compset suggester that also reads ADR/RevPAR positioning
once those KPIs are joined onto each hotel row.
"""

from __future__ import annotations

import math
from typing import Any


# Canonical chain-scale tier order (Phase 2.3.d.6e · 2026-05-14).
# `independent` is intentionally absent — it is an affiliation axis,
# not a tier.
CHAIN_SCALE_ORDER = (
    "luxury",
    "upper_upscale",
    "upscale",
    "upper_midscale",
    "midscale",
    "economy",
)

WEIGHTS = {
    "submarket": 0.30,
    "chain_scale": 0.30,
    "rooms": 0.20,
    "segment": 0.10,
    "geo": 0.10,
}

NEUTRAL_UNKNOWN = 0.5
TOP_N_DEFAULT = 4
GEO_NORMALISER_KM = 5.0  # 5km radius => 1.0 score; anything farther saturates


# ── Per-factor scorers ──────────────────────────────────────────────────────


def _submarket_score(a: dict[str, Any], b: dict[str, Any]) -> float:
    sa, sb = a.get("submarket_name"), b.get("submarket_name")
    if not sa or not sb:
        return NEUTRAL_UNKNOWN
    return 0.0 if sa == sb else 1.0


def _chain_scale_score(a: dict[str, Any], b: dict[str, Any]) -> float:
    ca, cb = a.get("chain_scale"), b.get("chain_scale")
    if not ca or not cb or ca not in CHAIN_SCALE_ORDER or cb not in CHAIN_SCALE_ORDER:
        return NEUTRAL_UNKNOWN
    diff = abs(CHAIN_SCALE_ORDER.index(ca) - CHAIN_SCALE_ORDER.index(cb))
    # 0 = identical · 1-2 = adjacent tiers · ≥ 3 = far
    return min(1.0, diff / 3.0)


def _rooms_score(a: dict[str, Any], b: dict[str, Any]) -> float:
    ra, rb = a.get("rooms_count"), b.get("rooms_count")
    if not isinstance(ra, (int, float)) or not isinstance(rb, (int, float)):
        return NEUTRAL_UNKNOWN
    if ra <= 0 or rb <= 0:
        return NEUTRAL_UNKNOWN
    return min(1.0, abs(ra - rb) / max(ra, 200))


def _segment_score(a: dict[str, Any], b: dict[str, Any]) -> float:
    sa, sb = a.get("segment_type"), b.get("segment_type")
    if not sa or not sb:
        return NEUTRAL_UNKNOWN
    return 0.0 if sa == sb else 1.0


def _haversine_km(a: dict[str, Any], b: dict[str, Any]) -> float | None:
    lat1, lon1 = a.get("latitude"), a.get("longitude")
    lat2, lon2 = b.get("latitude"), b.get("longitude")
    if None in (lat1, lon1, lat2, lon2):
        return None
    try:
        lat1, lon1, lat2, lon2 = map(float, (lat1, lon1, lat2, lon2))
    except (TypeError, ValueError):
        return None
    R = 6371.0  # km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a_h = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a_h))


def _geo_score(a: dict[str, Any], b: dict[str, Any]) -> float:
    km = _haversine_km(a, b)
    if km is None:
        return NEUTRAL_UNKNOWN
    return min(1.0, km / GEO_NORMALISER_KM)


def composite_score(a: dict[str, Any], b: dict[str, Any]) -> float:
    return (
        WEIGHTS["submarket"] * _submarket_score(a, b)
        + WEIGHTS["chain_scale"] * _chain_scale_score(a, b)
        + WEIGHTS["rooms"] * _rooms_score(a, b)
        + WEIGHTS["segment"] * _segment_score(a, b)
        + WEIGHTS["geo"] * _geo_score(a, b)
    )


# ── Inference pipeline ──────────────────────────────────────────────────────


def infer_synthetic_compsets(
    hotels: list[dict[str, Any]],
    *,
    top_n: int = TOP_N_DEFAULT,
    batch_id: str | None = None,
) -> list[dict[str, Any]]:
    """Return one synthetic compset per hotel.

    Members are restricted to the same `(country, market_name)` pool
    as the target — synthetic compsets never cross markets. Self is
    excluded. Ties broken by deterministic name order so the output is
    stable across reruns of the same snapshot.
    """
    out: list[dict[str, Any]] = []

    # Pre-index by market for O(N · M) instead of O(N²)
    pool_by_market: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for h in hotels:
        key = (h.get("country") or "", h.get("market_name") or "")
        pool_by_market.setdefault(key, []).append(h)

    for target in hotels:
        key = (target.get("country") or "", target.get("market_name") or "")
        pool = [h for h in pool_by_market.get(key, []) if h["hotel_id"] != target["hotel_id"]]
        if not pool:
            continue

        scored: list[tuple[float, dict[str, Any]]] = []
        for cand in pool:
            score = composite_score(target, cand)
            scored.append((score, cand))
        scored.sort(key=lambda x: (x[0], x[1].get("name", "")))
        winners = scored[:top_n]

        members = [
            {
                "hotel_id": c["hotel_id"],
                "name": c.get("name"),
                "chain_scale": c.get("chain_scale"),
                "rooms_count": c.get("rooms_count"),
                "submarket_name": c.get("submarket_name"),
                "similarity_score": round(s, 4),
            }
            for (s, c) in winners
        ]

        out.append({
            "compset_id": f"synth_{target['hotel_id']}",
            "target_hotel_id": target["hotel_id"],
            "target_name": target.get("name"),
            "market_name": target.get("market_name"),
            "submarket_name": target.get("submarket_name"),
            "member_hotel_ids": [m["hotel_id"] for m in members],
            "members": members,
            "provenance": "synthetic_inference",
            "algorithm": {
                "version": "v1",
                "weights": WEIGHTS,
                "top_n": top_n,
                "geo_normaliser_km": GEO_NORMALISER_KM,
            },
            "ingestion_batch_id": batch_id,
            "needs_operator_confirmation": True,
        })

    return out
