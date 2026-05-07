"""Duplicate hotel detection and merge recommendation engine.

Algorithm
---------
1. Load all active HotelAsset rows grouped by normalised city.
2. Within each city, score every unique pair using a weighted composite:
      name_exact  35% — normalised name cores identical
      name_fuzzy  30% — Jaccard token-overlap on normalised name
      city        20% — normalised city strings equal
      operator    10% — normalised operator equal (when both present)
      address      5% — Jaccard token-overlap on address (when both present)
   Missing components have their weight redistributed proportionally.
3. Run false-positive detection on each pair:
      disambiguation_token  — one name has "II", "North", "New", etc.
      star_rating_gap       — ≥ 2 star difference
      room_count_ratio      — max/min keys ratio ≥ 2.5
      operator_mismatch     — both have operators and they differ
      chain_scale_mismatch  — different chain scale segments
      geographic_distance   — lat/lon distance > 2 km (when both present)
4. Classify into recommendation tiers:
      auto_merge       — score ≥ 0.92, no high-severity FP signal, label=HIGH
      needs_review     — score ≥ 0.80, no blocking signal
      likely_duplicate — score ≥ 0.65
5. Upsert into merge_recommendations; skip pairs already accepted/dismissed.

Scoring is fully self-contained (no dependency on services/data_pipeline).
"""
from __future__ import annotations

import re
import unicodedata
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from math import atan2, cos, radians, sin, sqrt
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.hotel import HotelAsset
from app.models.merge_recommendation import MergeRecommendation
from app.schemas.merge_recommendation import ScanResult
from app.services.audit_service import AuditService

# ── Inline normalisation (mirrors pipeline.cleaning.multilingual) ─────────────

_CHAR_MAP: dict[str, str] = {
    "ß": "ss", "æ": "ae", "Æ": "ae", "œ": "oe", "Œ": "oe",
    "ø": "o",  "Ø": "o",  "ł": "l",  "Ł": "l",  "ı": "i",
}
_CHAR_RE = re.compile("|".join(re.escape(k) for k in _CHAR_MAP))

_HOTEL_PREFIXES = [
    "grand hotel ", "boutique hotel ", "palace hotel ", "the hotel ",
    "gran hotel ", "hotel palacio ", "parador de ", "parador ",
    "auberge de ", "auberge du ", "auberge ",
    "pousada de ", "pousada ", "grande hotel ", "gasthof ", "gasthaus ",
    "hotel ",
]
_HOTEL_SUFFIXES = [
    " grand hotel", " boutique hotel", " hotel & spa", " hotel and spa",
    " suite hotel", " hotel garni", " hotel", " inn", " lodge",
    " manor", " resort", " suites", " spa",
]
_STOPWORDS = frozenset({
    "the", "a", "an", "at", "in", "on", "of", "and", "or", "by",
    "el", "la", "los", "las", "un", "una", "de", "del", "en", "al",
    "le", "les", "du", "au", "aux", "des",
    "os", "as", "do", "da", "dos", "das",
    "der", "die", "dem", "den", "ein", "eine", "am", "im", "von", "vom",
})
_PUNCT_RE = re.compile(r"[-,'\"()/&+|]")
_WS_RE = re.compile(r"\s+")


def _key(raw: str) -> str:
    s = unicodedata.normalize("NFKD", raw.strip().lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return _WS_RE.sub(" ", s).strip()


def _normalize(text: str) -> str:
    """Full multilingual normalization: strip accents, prefixes, stopwords."""
    if not text or not text.strip():
        return ""
    s = text.strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = _CHAR_RE.sub(lambda m: _CHAR_MAP[m.group()], s)
    for p in _HOTEL_PREFIXES:
        if s.startswith(p):
            s = s[len(p):]
            break
    for sf in _HOTEL_SUFFIXES:
        if s.endswith(sf):
            s = s[: -len(sf)]
            break
    s = _PUNCT_RE.sub(" ", s)
    s = _WS_RE.sub(" ", s).strip()
    tokens = [t for t in s.split() if t not in _STOPWORDS]
    return " ".join(tokens) if tokens else s


def _jaccard(a: str, b: str) -> float:
    ta, tb = set(a.split()), set(b.split())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


# ── Scoring ───────────────────────────────────────────────────────────────────

_WEIGHTS = {
    "name_exact": 0.35,
    "name_fuzzy":  0.30,
    "city":        0.20,
    "operator":    0.10,
    "address":     0.05,
}


def _score_pair(
    a: HotelAsset, b: HotelAsset
) -> tuple[float, str, dict]:
    """Return (final_score, label, breakdown_dict)."""
    core_a = _normalize(a.asset_name)
    core_b = _normalize(b.asset_name)

    raw: dict[str, tuple[Optional[float], str]] = {}

    # Name exact
    if core_a and core_b:
        exact = 1.0 if core_a == core_b else 0.0
        raw["name_exact"] = (exact, f"'{core_a}' vs '{core_b}'")
    else:
        raw["name_exact"] = (None, "empty normalized core")

    # Name fuzzy
    if core_a and core_b:
        jac = _jaccard(core_a, core_b)
        raw["name_fuzzy"] = (jac, f"jaccard={jac:.3f}")
    else:
        raw["name_fuzzy"] = (None, "empty normalized core")

    # City
    city_a, city_b = _key(a.city), _key(b.city)
    if city_a and city_b:
        city_score = 1.0 if city_a == city_b else 0.0
        raw["city"] = (city_score, f"'{a.city}' vs '{b.city}'")
    else:
        raw["city"] = (None, "no city")

    # Operator
    op_a = _key(a.operator) if a.operator else None
    op_b = _key(b.operator) if b.operator else None
    if op_a and op_b:
        op_score = 1.0 if op_a == op_b else 0.0
        raw["operator"] = (op_score, f"'{a.operator}' vs '{b.operator}'")
    else:
        raw["operator"] = (None, "no operator data")

    # Address
    addr_a = _key(a.address) if a.address else None
    addr_b = _key(b.address) if b.address else None
    if addr_a and addr_b:
        addr_jac = _jaccard(addr_a, addr_b)
        raw["address"] = (addr_jac, f"token_overlap={addr_jac:.3f}")
    else:
        raw["address"] = (None, "no address data")

    # Weighted composite (redistribute weight of missing components)
    available = {k: s for k, (s, _) in raw.items() if s is not None}
    if not available:
        final = 0.0
    else:
        total_w = sum(_WEIGHTS[k] for k in available)
        final = sum(_WEIGHTS[k] * s for k, s in available.items()) / total_w

    final = round(final, 4)
    label = "HIGH" if final >= 0.85 else ("MEDIUM" if final >= 0.65 else "LOW")

    breakdown = {
        k: {"score": float(s) if s is not None else None, "weight": _WEIGHTS[k], "detail": d}
        for k, (s, d) in raw.items()
    }
    return final, label, breakdown


# ── False-positive detection ──────────────────────────────────────────────────

_DISAMBIGUATION_TOKENS = frozenset({
    "i", "ii", "iii", "iv", "v", "vi", "vii", "viii",
    "1", "2", "3", "4", "5",
    "first", "second", "third",
    "north", "south", "east", "west",
    "norte", "sur", "este", "oeste",
    "nord", "sud",
    "new", "old", "original", "classic",
    "nuevo", "viejo", "antiguo",
    "express", "select", "plus", "lite",
})


def _false_positive_signals(a: HotelAsset, b: HotelAsset) -> list[dict]:
    signals: list[dict] = []

    # Disambiguation tokens present in one name but not the other
    tokens_a = set(_normalize(a.asset_name).split())
    tokens_b = set(_normalize(b.asset_name).split())
    sym_diff = (tokens_a - tokens_b) | (tokens_b - tokens_a)
    disamb = sym_diff & _DISAMBIGUATION_TOKENS
    if disamb:
        signals.append({
            "signal_type": "disambiguation_token",
            "severity": 0.7,
            "detail": f"Token(s) suggest distinct properties: {', '.join(sorted(disamb))}",
        })

    # Star rating gap
    if a.star_rating is not None and b.star_rating is not None:
        gap = abs(float(a.star_rating) - float(b.star_rating))
        if gap >= 2.0:
            severity = min(0.95, 0.4 + (gap - 2.0) * 0.25)
            signals.append({
                "signal_type": "star_rating_gap",
                "severity": round(severity, 2),
                "detail": f"Star gap of {gap:.1f} ({a.star_rating}★ vs {b.star_rating}★)",
            })

    # Room count ratio
    if a.keys and b.keys and a.keys > 0 and b.keys > 0:
        ratio = max(a.keys, b.keys) / min(a.keys, b.keys)
        if ratio >= 2.5:
            severity = min(0.75, 0.3 + (ratio - 2.5) * 0.08)
            signals.append({
                "signal_type": "room_count_ratio",
                "severity": round(severity, 2),
                "detail": f"Room count ratio {ratio:.1f}× ({a.keys} vs {b.keys} keys)",
            })

    # Operator mismatch (both known, but different)
    if a.operator and b.operator and _key(a.operator) != _key(b.operator):
        signals.append({
            "signal_type": "operator_mismatch",
            "severity": 0.65,
            "detail": f"Different operators: '{a.operator}' vs '{b.operator}'",
        })

    # Chain scale mismatch
    if a.chain_scale and b.chain_scale and a.chain_scale != b.chain_scale:
        signals.append({
            "signal_type": "chain_scale_mismatch",
            "severity": 0.5,
            "detail": f"Different segments: '{a.chain_scale}' vs '{b.chain_scale}'",
        })

    # Geographic distance
    if all(
        x is not None
        for x in [a.latitude, a.longitude, b.latitude, b.longitude]
    ):
        dist_km = _haversine_km(
            float(a.latitude), float(a.longitude),  # type: ignore[arg-type]
            float(b.latitude), float(b.longitude),  # type: ignore[arg-type]
        )
        if dist_km > 2.0:
            severity = min(0.9, 0.35 + (dist_km - 2.0) * 0.04)
            signals.append({
                "signal_type": "geographic_distance",
                "severity": round(severity, 2),
                "detail": f"Properties are {dist_km:.1f} km apart",
            })

    return signals


# ── Recommendation classification ─────────────────────────────────────────────

def _classify(score: float, label: str, signals: list[dict]) -> str:
    max_severity = max((s["severity"] for s in signals), default=0.0)
    hard_block = any(s["severity"] >= 0.7 for s in signals)

    if score >= 0.92 and not hard_block and label == "HIGH":
        return "auto_merge"
    if score >= 0.80 and not hard_block:
        return "needs_review"
    if score >= 0.65:
        return "likely_duplicate"
    return "not_duplicate"


# ── Rationale builder ─────────────────────────────────────────────────────────

def _build_rationale(
    score: float, label: str, breakdown: dict, signals: list[dict]
) -> str:
    parts: list[str] = []

    name_exact = breakdown.get("name_exact", {})
    name_fuzzy = breakdown.get("name_fuzzy", {})
    city = breakdown.get("city", {})
    operator = breakdown.get("operator", {})

    if name_exact.get("score") == 1.0:
        detail = name_exact.get("detail", "")
        core = detail.split("'")[1] if "'" in detail else ""
        parts.append(f"Name cores match exactly ('{core}').")
    elif (name_fuzzy.get("score") or 0) >= 0.8:
        jac = name_fuzzy["score"]
        parts.append(f"Names are highly similar (Jaccard {jac:.0%}).")
    elif (name_fuzzy.get("score") or 0) >= 0.5:
        jac = name_fuzzy["score"]
        parts.append(f"Names share moderate overlap (Jaccard {jac:.0%}).")

    if city.get("score") == 1.0:
        city_name = city.get("detail", "").split("'")[1] if "'" in city.get("detail", "") else ""
        parts.append(f"City confirmed identical ({city_name}).")
    elif city.get("score") == 0.0:
        parts.append("Different cities — verify this is the same property.")

    if operator.get("score") == 1.0:
        parts.append("Same operator confirmed.")
    elif operator.get("score") == 0.0:
        parts.append("Different operators detected.")
    elif operator.get("score") is None:
        parts.append("No operator data available to compare.")

    for sig in signals:
        parts.append(f"Warning: {sig['detail']}")

    parts.append(f"Overall confidence: {label} ({score:.1%}).")
    return " ".join(parts)


# ── Snapshot helpers ──────────────────────────────────────────────────────────

def _rec_snapshot(rec: MergeRecommendation) -> dict:
    return {
        "id": str(rec.id),
        "asset_a_id": str(rec.asset_a_id),
        "asset_b_id": str(rec.asset_b_id),
        "status": rec.status,
        "final_score": float(rec.final_score),
        "confidence_label": rec.confidence_label,
        "recommendation": rec.recommendation,
        "reviewed_at": rec.reviewed_at.isoformat() if rec.reviewed_at else None,
        "review_notes": rec.review_notes,
    }


def _snapshot(asset: HotelAsset) -> dict:
    return {
        "id": str(asset.id),
        "asset_name": asset.asset_name,
        "city": asset.city,
        "operator": asset.operator,
        "brand": asset.brand,
        "star_rating": float(asset.star_rating) if asset.star_rating is not None else None,
        "keys": asset.keys,
        "chain_scale": asset.chain_scale,
        "address": asset.address,
        "submarket": asset.submarket,
        "status": asset.status,
    }


# ── Main service ──────────────────────────────────────────────────────────────

class DedupService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ── Scan ──────────────────────────────────────────────────────────────────

    async def run_scan(self, city: Optional[str] = None) -> ScanResult:
        """Score all hotel pairs and upsert recommendations."""
        q = select(HotelAsset).where(HotelAsset.status != "deleted")
        if city:
            q = q.where(func.lower(HotelAsset.city) == city.lower())
        result = await self._db.execute(q)
        assets: list[HotelAsset] = list(result.scalars().all())

        # Load existing recommendations so we can skip human-reviewed pairs
        existing_q = select(
            MergeRecommendation.asset_a_id,
            MergeRecommendation.asset_b_id,
            MergeRecommendation.status,
            MergeRecommendation.final_score,
        )
        existing_res = await self._db.execute(existing_q)
        existing: dict[tuple, tuple[str, float]] = {
            (row.asset_a_id, row.asset_b_id): (row.status, float(row.final_score))
            for row in existing_res.fetchall()
        }

        # Group by normalised city for candidate blocking
        city_groups: dict[str, list[HotelAsset]] = {}
        for asset in assets:
            ck = _key(asset.city)
            city_groups.setdefault(ck, []).append(asset)

        counters = {"new": 0, "updated": 0, "skipped": 0, "evaluated": 0}

        for city_assets in city_groups.values():
            n = len(city_assets)
            for i in range(n):
                for j in range(i + 1, n):
                    a, b = city_assets[i], city_assets[j]
                    # Canonical ordering: smaller UUID first
                    if a.id > b.id:
                        a, b = b, a

                    pair_key = (a.id, b.id)

                    # Skip if human has already made a decision
                    if pair_key in existing:
                        st, _ = existing[pair_key]
                        if st in ("accepted", "dismissed"):
                            counters["skipped"] += 1
                            continue

                    counters["evaluated"] += 1

                    score, label, breakdown = _score_pair(a, b)

                    if score < 0.65:
                        continue

                    signals = _false_positive_signals(a, b)
                    recommendation = _classify(score, label, signals)
                    rationale = _build_rationale(score, label, breakdown, signals)
                    snap_a = _snapshot(a)
                    snap_b = _snapshot(b)

                    if pair_key in existing:
                        # Update score / recommendation if changed
                        _, old_score = existing[pair_key]
                        if abs(score - old_score) >= 0.01:
                            upd_q = (
                                select(MergeRecommendation)
                                .where(
                                    MergeRecommendation.asset_a_id == a.id,
                                    MergeRecommendation.asset_b_id == b.id,
                                )
                            )
                            upd_res = await self._db.execute(upd_q)
                            rec = upd_res.scalar_one_or_none()
                            if rec and rec.status == "pending_review":
                                rec.final_score = Decimal(str(score))
                                rec.confidence_label = label
                                rec.score_breakdown = breakdown
                                rec.false_positive_signals = signals
                                rec.recommendation = recommendation
                                rec.rationale = rationale
                                rec.asset_a_snapshot = snap_a
                                rec.asset_b_snapshot = snap_b
                                rec.updated_at = datetime.now(timezone.utc)
                                counters["updated"] += 1
                    else:
                        rec = MergeRecommendation(
                            asset_a_id=a.id,
                            asset_b_id=b.id,
                            status="pending_review",
                            final_score=Decimal(str(score)),
                            confidence_label=label,
                            score_breakdown=breakdown,
                            false_positive_signals=signals,
                            recommendation=recommendation,
                            rationale=rationale,
                            asset_a_snapshot=snap_a,
                            asset_b_snapshot=snap_b,
                        )
                        self._db.add(rec)
                        counters["new"] += 1

        await self._db.commit()

        # Count pending rows
        count_q = select(func.count()).select_from(MergeRecommendation).where(
            MergeRecommendation.status == "pending_review"
        )
        total_pending = (await self._db.execute(count_q)).scalar() or 0

        scan_result = ScanResult(
            assets_scanned=len(assets),
            pairs_evaluated=counters["evaluated"],
            new_recommendations=counters["new"],
            updated_recommendations=counters["updated"],
            skipped_human_reviewed=counters["skipped"],
            total_pending=total_pending,
        )

        await AuditService(self._db).log(
            event_type="merge.scan",
            actor_type="system",
            meta={
                "city_filter": city,
                "assets_scanned": scan_result.assets_scanned,
                "pairs_evaluated": scan_result.pairs_evaluated,
                "new_recommendations": scan_result.new_recommendations,
                "updated_recommendations": scan_result.updated_recommendations,
                "skipped_human_reviewed": scan_result.skipped_human_reviewed,
                "total_pending": scan_result.total_pending,
            },
        )
        await self._db.commit()
        return scan_result

    # ── List / get ────────────────────────────────────────────────────────────

    async def list_recommendations(
        self,
        status: Optional[str] = None,
        recommendation: Optional[str] = None,
        confidence_label: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ):
        from app.schemas.common import PagedResponse, Pagination

        q = select(MergeRecommendation).order_by(
            MergeRecommendation.final_score.desc()
        )
        if status:
            q = q.where(MergeRecommendation.status == status)
        if recommendation:
            q = q.where(MergeRecommendation.recommendation == recommendation)
        if confidence_label:
            q = q.where(MergeRecommendation.confidence_label == confidence_label)

        count_q = select(func.count()).select_from(q.subquery())
        total = (await self._db.execute(count_q)).scalar() or 0

        q = q.limit(limit).offset(offset)
        rows = (await self._db.execute(q)).scalars().all()

        from app.schemas.merge_recommendation import MergeRecommendationListItem
        return PagedResponse(
            data=[MergeRecommendationListItem.model_validate(r) for r in rows],
            meta=Pagination(
                total=total,
                limit=limit,
                offset=offset,
                has_next=offset + limit < total,
            ),
        )

    async def get_recommendation(self, rec_id: uuid.UUID):
        from app.schemas.merge_recommendation import MergeRecommendationRead
        from app.core.exceptions import NotFoundError

        q = select(MergeRecommendation).where(MergeRecommendation.id == rec_id)
        rec = (await self._db.execute(q)).scalar_one_or_none()
        if not rec:
            raise NotFoundError(f"Recommendation {rec_id} not found")
        return MergeRecommendationRead.model_validate(rec)

    # ── Accept ────────────────────────────────────────────────────────────────

    async def accept(
        self,
        rec_id: uuid.UUID,
        notes: Optional[str] = None,
        actor_id: Optional[uuid.UUID] = None,
    ):
        from app.core.exceptions import NotFoundError, ConflictError
        from app.schemas.merge_recommendation import MergeRecommendationRead

        q = select(MergeRecommendation).where(MergeRecommendation.id == rec_id)
        rec = (await self._db.execute(q)).scalar_one_or_none()
        if not rec:
            raise NotFoundError(f"Recommendation {rec_id} not found")
        if rec.status not in ("pending_review",):
            raise ConflictError(
                f"Recommendation is already '{rec.status}' — cannot accept"
            )

        before = _rec_snapshot(rec)
        rec.status = "accepted"
        rec.review_notes = notes
        rec.reviewed_at = datetime.now(timezone.utc)
        rec.updated_at = datetime.now(timezone.utc)
        await self._db.flush()
        await AuditService(self._db).log(
            event_type="merge.accepted",
            actor_type="user" if actor_id else "system",
            actor_id=actor_id,
            entity_type="merge_recommendation",
            entity_id=rec.id,
            before_state=before,
            after_state=_rec_snapshot(rec),
            meta={"score_breakdown": rec.score_breakdown, "false_positive_signals": rec.false_positive_signals},
            reversible=True,
        )
        await self._db.commit()
        await self._db.refresh(rec)
        return MergeRecommendationRead.model_validate(rec)

    # ── Dismiss ───────────────────────────────────────────────────────────────

    async def dismiss(
        self,
        rec_id: uuid.UUID,
        notes: Optional[str] = None,
        actor_id: Optional[uuid.UUID] = None,
    ):
        from app.core.exceptions import NotFoundError, ConflictError
        from app.schemas.merge_recommendation import MergeRecommendationRead

        q = select(MergeRecommendation).where(MergeRecommendation.id == rec_id)
        rec = (await self._db.execute(q)).scalar_one_or_none()
        if not rec:
            raise NotFoundError(f"Recommendation {rec_id} not found")
        if rec.status not in ("pending_review",):
            raise ConflictError(
                f"Recommendation is already '{rec.status}' — cannot dismiss"
            )

        before = _rec_snapshot(rec)
        rec.status = "dismissed"
        rec.review_notes = notes
        rec.reviewed_at = datetime.now(timezone.utc)
        rec.updated_at = datetime.now(timezone.utc)
        await self._db.flush()
        await AuditService(self._db).log(
            event_type="merge.dismissed",
            actor_type="user" if actor_id else "system",
            actor_id=actor_id,
            entity_type="merge_recommendation",
            entity_id=rec.id,
            before_state=before,
            after_state=_rec_snapshot(rec),
            meta={"score_breakdown": rec.score_breakdown, "false_positive_signals": rec.false_positive_signals},
            reversible=True,
        )
        await self._db.commit()
        await self._db.refresh(rec)
        return MergeRecommendationRead.model_validate(rec)

    # ── Summary ───────────────────────────────────────────────────────────────

    async def get_summary(self):
        from app.schemas.merge_recommendation import DedupSummary

        rows = (
            await self._db.execute(
                select(
                    MergeRecommendation.status,
                    MergeRecommendation.recommendation,
                    func.count().label("n"),
                ).group_by(
                    MergeRecommendation.status, MergeRecommendation.recommendation
                )
            )
        ).fetchall()

        counts: dict[tuple, int] = {(r.status, r.recommendation): r.n for r in rows}

        pending = sum(v for (st, _), v in counts.items() if st == "pending_review")
        auto_merge = counts.get(("pending_review", "auto_merge"), 0)
        needs_review = counts.get(("pending_review", "needs_review"), 0)
        likely_dup = counts.get(("pending_review", "likely_duplicate"), 0)
        accepted = sum(v for (st, _), v in counts.items() if st == "accepted")
        dismissed = sum(v for (st, _), v in counts.items() if st == "dismissed")

        return DedupSummary(
            total_pending=pending,
            auto_merge_count=auto_merge,
            needs_review_count=needs_review,
            likely_duplicate_count=likely_dup,
            accepted_count=accepted,
            dismissed_count=dismissed,
        )
