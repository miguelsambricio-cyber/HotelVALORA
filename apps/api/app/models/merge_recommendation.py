"""Merge recommendation model — engine-generated duplicate candidates."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class MergeRecommendation(BaseModel):
    """A candidate duplicate pair surfaced by the dedup engine.

    asset_a_id < asset_b_id (UUID ordering) is enforced at write time so
    the pair has a single canonical representation and the UNIQUE constraint
    (asset_a_id, asset_b_id) fires correctly.

    status lifecycle:
        pending_review  → the default; awaiting human decision
        accepted        → human confirmed the merge (triggers merge_history entry)
        dismissed       → human rejected; engine will not re-surface this pair
        expired         → superseded by a newer scan with different results
    """

    __tablename__ = "merge_recommendations"
    __table_args__ = (
        UniqueConstraint("asset_a_id", "asset_b_id", name="uq_merge_rec_pair"),
    )

    # ── Pair ──────────────────────────────────────────────────────────────────
    asset_a_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("hotel_assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    asset_b_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("hotel_assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Lifecycle ─────────────────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="pending_review",
        server_default="pending_review",
        index=True,
    )

    # ── Scoring ───────────────────────────────────────────────────────────────
    final_score: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    confidence_label: Mapped[str] = mapped_column(
        String(10), nullable=False, index=True
    )
    score_breakdown: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )

    # ── Recommendation ────────────────────────────────────────────────────────
    recommendation: Mapped[str] = mapped_column(String(50), nullable=False)
    false_positive_signals: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default="[]"
    )
    rationale: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=""
    )

    # ── Asset snapshots (denormalised) ────────────────────────────────────────
    asset_a_snapshot: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    asset_b_snapshot: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )

    # ── Human review ──────────────────────────────────────────────────────────
    reviewed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    asset_a: Mapped["HotelAsset"] = relationship(  # noqa: F821
        "HotelAsset", foreign_keys=[asset_a_id]
    )
    asset_b: Mapped["HotelAsset"] = relationship(  # noqa: F821
        "HotelAsset", foreign_keys=[asset_b_id]
    )
    reviewed_by: Mapped[Optional["User"]] = relationship(  # noqa: F821
        "User", foreign_keys=[reviewed_by_id]
    )
