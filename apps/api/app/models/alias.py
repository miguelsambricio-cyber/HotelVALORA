"""
Alias registry models.

Four tables cover the full alias lifecycle:

    hotel_alias_entries  — one row per alias per hotel asset
    operator_aliases     — operator/brand name registry (portfolio-wide)
    hotel_merge_history  — append-only log of merged asset records
    alias_conflicts      — open/resolved conflicts where two assets share an alias_key

alias_type values for hotel_alias_entries:
    canonical       — current official name (mirrors hotel_assets.asset_name)
    common          — widely-used informal form
    multilingual    — same hotel in another language; see `language` field
    operator        — name as used by the brand in their own systems
    historical      — name was valid in the past; valid_to is set
    source_raw      — verbatim string from an import before normalisation

Conflict detection invariant:
    An alias_key is "conflicted" when two or more ACTIVE rows in
    hotel_alias_entries with different asset_ids share the same alias_key.
    Detected conflicts are written to alias_conflicts for human review.
    is_manual_override = TRUE lets a human resolve a conflict permanently
    without deleting the competing entries.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

import sqlalchemy as sa
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class HotelAliasEntry(BaseModel):
    """One alias for one hotel asset.

    The same hotel may have many active aliases of different types.
    A partial unique index on (alias_key, asset_id) WHERE is_active = TRUE
    prevents the same alias appearing twice for the same hotel.
    """

    __tablename__ = "hotel_alias_entries"
    __table_args__ = (
        # Prevent duplicate active aliases for the same hotel
        Index(
            "uq_hotel_alias_active_per_asset",
            "alias_key",
            "asset_id",
            unique=True,
            postgresql_where=sa.text("is_active = true"),
        ),
    )

    # ── Core ─────────────────────────────────────────────────────────────────
    asset_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("hotel_assets.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    alias_text: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Raw alias as it appears in source data",
    )
    alias_key: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="_key()-normalised form; used for fast dedup lookups",
    )
    alias_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="canonical | common | multilingual | operator | historical | source_raw",
    )

    # ── Language / provenance ─────────────────────────────────────────────────
    language: Mapped[Optional[str]] = mapped_column(
        String(10),
        nullable=True,
        comment="BCP-47 language tag e.g. 'es', 'en', 'ca', 'fr'; null = language-agnostic",
    )
    source: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="costar | excel_import | manual | etl | merge",
    )

    # ── Flags ─────────────────────────────────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=sa.true(),
        comment="False = soft-deleted; historical aliases kept for audit",
    )
    is_manual_override: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=sa.false(),
        comment="True = set by a human; wins all automated conflict resolution",
    )

    # ── Scoring ───────────────────────────────────────────────────────────────
    confidence: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(4, 3),
        nullable=True,
        comment="0.000–1.000 from the confidence scoring engine; null if manually added",
    )

    # ── Validity window ───────────────────────────────────────────────────────
    valid_from: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        comment="Date from which this alias was valid; null = unknown / always",
    )
    valid_to: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        comment="Date after which this alias is no longer current; null = still active",
    )

    # ── Metadata ──────────────────────────────────────────────────────────────
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    asset: Mapped[Optional["HotelAsset"]] = relationship(  # noqa: F821
        "HotelAsset",
        back_populates="aliases",
        foreign_keys=[asset_id],
    )
    created_by: Mapped[Optional["User"]] = relationship(  # noqa: F821
        "User",
        foreign_keys=[created_by_id],
    )


class OperatorAlias(BaseModel):
    """Operator / brand name registry.

    Maps any raw operator string (alias_text) to a single canonical_operator.
    One alias_key → one canonical operator; duplicates are prevented by a
    unique index on alias_key.

    Mirrors the OPERATOR_CANONICAL dict in pipeline.cleaning.names but
    is authoritative: the static dict is the seed; this table takes precedence
    at runtime.
    """

    __tablename__ = "operator_aliases"

    # ── Core ─────────────────────────────────────────────────────────────────
    alias_text: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Raw operator string as seen in source data",
    )
    alias_key: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
        comment="_key()-normalised; unique per row",
    )
    canonical_operator: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="Authoritative display name e.g. 'Marriott International'",
    )

    # ── Brand hierarchy ───────────────────────────────────────────────────────
    brand_family: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Top-level loyalty programme / portfolio e.g. 'Marriott Bonvoy'",
    )
    chain_scale: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="luxury | upper_upscale | upscale | upper_midscale | midscale | economy",
    )
    parent_company: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Legal parent entity e.g. 'Marriott International Inc.'",
    )

    # ── Flags / provenance ────────────────────────────────────────────────────
    source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=sa.true(),
    )
    is_manual_override: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=sa.false(),
        comment="True = human-verified; skipped in auto re-seeding from static dict",
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_by: Mapped[Optional["User"]] = relationship(  # noqa: F821
        "User",
        foreign_keys=[created_by_id],
    )


class HotelMergeHistory(BaseModel):
    """Append-only log of merge events.

    When two hotel_assets are determined to be the same physical property,
    one record (the loser) is absorbed into the other (the winner).
    This row captures the full context for audit and potential reversal.

    The loser_asset_id is not a FK because the loser asset is soft-deleted
    or reassigned after the merge. loser_asset_name and loser_city are
    denormalised to preserve the record independently of the loser's fate.
    """

    __tablename__ = "hotel_merge_history"

    # ── Participants ──────────────────────────────────────────────────────────
    winner_asset_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("hotel_assets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="The asset record that survived the merge",
    )
    loser_asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="The asset record that was absorbed; no FK — may be deleted",
    )
    loser_asset_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Denormalised name of the absorbed record",
    )
    loser_city: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Denormalised city of the absorbed record",
    )

    # ── Merge mechanics ───────────────────────────────────────────────────────
    merge_strategy: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="auto_exact | auto_fuzzy | manual",
    )
    confidence_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(4, 3),
        nullable=True,
        comment="Final score from pipeline.matching.confidence at merge time",
    )
    confidence_label: Mapped[Optional[str]] = mapped_column(
        String(10),
        nullable=True,
        comment="HIGH | MEDIUM | LOW",
    )
    triggered_by: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="e.g. 'import_job:uuid', 'manual', 'etl'",
    )

    # ── Review / approval ─────────────────────────────────────────────────────
    reviewed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ── Reversal ──────────────────────────────────────────────────────────────
    is_reversed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=sa.false(),
        comment="True = merge was undone; winner/loser are both active again",
    )
    reversed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reversed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Audit snapshots ───────────────────────────────────────────────────────
    snapshot_before: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        server_default="{}",
        comment="Full JSON of the winner asset state immediately before the merge",
    )
    aliases_transferred: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        server_default="[]",
        comment="List of alias_entry ids moved from loser to winner",
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    winner_asset: Mapped[Optional["HotelAsset"]] = relationship(  # noqa: F821
        "HotelAsset",
        foreign_keys=[winner_asset_id],
    )
    reviewed_by: Mapped[Optional["User"]] = relationship(  # noqa: F821
        "User",
        foreign_keys=[reviewed_by_id],
    )
    reversed_by: Mapped[Optional["User"]] = relationship(  # noqa: F821
        "User",
        foreign_keys=[reversed_by_id],
    )


class AliasConflict(BaseModel):
    """Lifecycle record for an unresolved alias collision.

    Created when the ETL detects that the same alias_key maps to two or more
    different hotel_assets. Stays open until a human (or an automated rule)
    resolves it by nominating a winner asset.

    A partial unique index on (alias_key) WHERE status = 'open' prevents
    duplicate open conflicts for the same key.

    Resolution strategies:
        manual              — human chose the winning asset in the UI
        confidence_winner   — auto-resolved by taking the highest-scoring candidate
        override            — a manual_override alias entry broke the tie
        ignored             — conflict acknowledged but left unresolved (e.g. genuinely
                              different hotels with identical names in different cities
                              that happen to collide on the key)
    """

    __tablename__ = "alias_conflicts"
    __table_args__ = (
        # Only one open conflict per alias_key at a time
        Index(
            "uq_alias_conflict_open",
            "alias_key",
            unique=True,
            postgresql_where=sa.text("status = 'open'"),
        ),
    )

    # ── Conflict identity ─────────────────────────────────────────────────────
    alias_key: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="The normalised key that collided across multiple assets",
    )
    alias_text: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Original raw text that triggered the conflict",
    )
    conflicting_asset_ids: Mapped[list] = mapped_column(
        ARRAY(UUID(as_uuid=True)),
        nullable=False,
        server_default=sa.text("'{}'::uuid[]"),
        comment="All asset_ids that claimed this alias_key",
    )

    # ── Status / lifecycle ────────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="open",
        server_default="open",
        index=True,
        comment="open | resolved_manual | resolved_auto | ignored",
    )
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="When the ETL first detected this collision",
    )

    # ── Resolution ────────────────────────────────────────────────────────────
    resolved_asset_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("hotel_assets.id", ondelete="SET NULL"),
        nullable=True,
        comment="The asset nominated to own the alias after resolution",
    )
    resolution_strategy: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="manual | confidence_winner | override | ignored",
    )
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolved_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    resolved_asset: Mapped[Optional["HotelAsset"]] = relationship(  # noqa: F821
        "HotelAsset",
        foreign_keys=[resolved_asset_id],
    )
    resolved_by: Mapped[Optional["User"]] = relationship(  # noqa: F821
        "User",
        foreign_keys=[resolved_by_id],
    )
