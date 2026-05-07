"""Schemas for the merge recommendation engine."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.common import ValoraBase


# ── Score breakdown ───────────────────────────────────────────────────────────

class ComponentScore(ValoraBase):
    score: float | None = None
    weight: float
    detail: str


class ScoreBreakdown(ValoraBase):
    name_exact: ComponentScore
    name_fuzzy: ComponentScore
    city: ComponentScore
    operator: ComponentScore
    address: ComponentScore


# ── False-positive signal ─────────────────────────────────────────────────────

class FalsePositiveSignal(ValoraBase):
    signal_type: str
    severity: float = Field(ge=0.0, le=1.0)
    detail: str


# ── Asset snapshot ────────────────────────────────────────────────────────────

class AssetSnapshot(ValoraBase):
    id: UUID
    asset_name: str
    city: str
    operator: str | None = None
    brand: str | None = None
    star_rating: Decimal | None = None
    keys: int | None = None
    chain_scale: str | None = None
    address: str | None = None
    submarket: str | None = None
    status: str | None = None


# ── Main recommendation schemas ───────────────────────────────────────────────

class MergeRecommendationListItem(ValoraBase):
    id: UUID
    asset_a_id: UUID
    asset_b_id: UUID
    status: str
    recommendation: str
    final_score: Decimal
    confidence_label: str
    asset_a_snapshot: dict[str, Any]
    asset_b_snapshot: dict[str, Any]
    false_positive_signals: list[dict[str, Any]]
    created_at: datetime
    reviewed_at: datetime | None = None


class MergeRecommendationRead(ValoraBase):
    id: UUID
    asset_a_id: UUID
    asset_b_id: UUID
    status: str
    recommendation: str
    final_score: Decimal
    confidence_label: str
    score_breakdown: dict[str, Any]
    false_positive_signals: list[dict[str, Any]]
    rationale: str
    asset_a_snapshot: dict[str, Any]
    asset_b_snapshot: dict[str, Any]
    reviewed_by_id: UUID | None = None
    review_notes: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


# ── Review actions ────────────────────────────────────────────────────────────

class ReviewAction(ValoraBase):
    notes: str | None = None


# ── Scan ─────────────────────────────────────────────────────────────────────

class ScanResult(ValoraBase):
    assets_scanned: int
    pairs_evaluated: int
    new_recommendations: int
    updated_recommendations: int
    skipped_human_reviewed: int
    total_pending: int


# ── Summary ───────────────────────────────────────────────────────────────────

class DedupSummary(ValoraBase):
    total_pending: int
    auto_merge_count: int
    needs_review_count: int
    likely_duplicate_count: int
    accepted_count: int
    dismissed_count: int
