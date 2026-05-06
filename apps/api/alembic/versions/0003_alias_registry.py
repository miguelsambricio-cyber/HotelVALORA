"""Add alias registry tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-07

Four tables:

    hotel_alias_entries  — one row per alias per hotel; covers all alias types
    operator_aliases     — operator/brand name registry (portfolio-wide)
    hotel_merge_history  — append-only log of asset merge events
    alias_conflicts      — open/resolved conflicts where two assets share an alias_key

Design notes:
  * alias_key is the _key()-normalised form; always populated before insert.
  * hotel_alias_entries has a partial unique index on (alias_key, asset_id)
    WHERE is_active = TRUE to prevent duplicate active aliases for the same hotel.
  * operator_aliases has a full unique index on alias_key (one key → one
    canonical operator).
  * alias_conflicts has a partial unique index on (alias_key) WHERE status = 'open'
    so only one open conflict can exist per key at any time.
  * hotel_merge_history.loser_asset_id is intentionally NOT a foreign key because
    the loser asset may be deleted after the merge.
  * conflicting_asset_ids uses the native PostgreSQL uuid[] array type.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─────────────────────────────────────────── hotel_alias_entries
    op.create_table(
        "hotel_alias_entries",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        # FK to hotel_assets — nullable so an alias can exist before the asset
        # is confirmed (e.g. during conflict resolution).
        sa.Column(
            "asset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hotel_assets.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "alias_text",
            sa.String(255),
            nullable=False,
            comment="Raw alias as it appears in source data",
        ),
        sa.Column(
            "alias_key",
            sa.String(255),
            nullable=False,
            comment="_key()-normalised form; used for fast dedup lookups",
        ),
        sa.Column(
            "alias_type",
            sa.String(50),
            nullable=False,
            comment="canonical | common | multilingual | operator | historical | source_raw",
        ),
        sa.Column(
            "language",
            sa.String(10),
            nullable=True,
            comment="BCP-47 tag e.g. 'es', 'en', 'ca', 'fr'; null = language-agnostic",
        ),
        sa.Column(
            "source",
            sa.String(100),
            nullable=True,
            comment="costar | excel_import | manual | etl | merge",
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "is_manual_override",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
            comment="True = set by a human; wins automated conflict resolution",
        ),
        sa.Column(
            "confidence",
            sa.Numeric(4, 3),
            nullable=True,
            comment="0.000–1.000 from confidence engine; null if manually added",
        ),
        sa.Column("valid_from", sa.Date(), nullable=True),
        sa.Column(
            "valid_to",
            sa.Date(),
            nullable=True,
            comment="Null = still current; set when alias becomes historical",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_index("ix_hotel_alias_entries_asset_id", "hotel_alias_entries", ["asset_id"])
    op.create_index("ix_hotel_alias_entries_alias_key", "hotel_alias_entries", ["alias_key"])
    op.create_index("ix_hotel_alias_entries_alias_type", "hotel_alias_entries", ["alias_type"])
    op.create_index(
        "ix_hotel_alias_entries_language",
        "hotel_alias_entries",
        ["language"],
        postgresql_where=sa.text("language IS NOT NULL"),
    )
    # Prevent the same alias_key appearing twice for the same asset (active rows only)
    op.create_index(
        "uq_hotel_alias_active_per_asset",
        "hotel_alias_entries",
        ["alias_key", "asset_id"],
        unique=True,
        postgresql_where=sa.text("is_active = true"),
    )

    # ─────────────────────────────────────────────────── operator_aliases
    op.create_table(
        "operator_aliases",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "alias_text",
            sa.String(255),
            nullable=False,
            comment="Raw operator string as seen in source data",
        ),
        sa.Column(
            "alias_key",
            sa.String(255),
            nullable=False,
            comment="_key()-normalised; unique per row",
        ),
        sa.Column(
            "canonical_operator",
            sa.String(255),
            nullable=False,
            comment="Authoritative display name e.g. 'Marriott International'",
        ),
        sa.Column(
            "brand_family",
            sa.String(255),
            nullable=True,
            comment="Top-level loyalty/portfolio e.g. 'Marriott Bonvoy'",
        ),
        sa.Column(
            "chain_scale",
            sa.String(100),
            nullable=True,
            comment="luxury | upper_upscale | upscale | upper_midscale | midscale | economy",
        ),
        sa.Column(
            "parent_company",
            sa.String(255),
            nullable=True,
            comment="Legal parent entity",
        ),
        sa.Column("source", sa.String(100), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "is_manual_override",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
            comment="True = human-verified; skipped in auto re-seeding from static dict",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # One alias_key → one canonical operator
    op.create_index(
        "uq_operator_aliases_alias_key",
        "operator_aliases",
        ["alias_key"],
        unique=True,
    )
    op.create_index(
        "ix_operator_aliases_canonical_operator",
        "operator_aliases",
        ["canonical_operator"],
    )
    op.create_index(
        "ix_operator_aliases_brand_family",
        "operator_aliases",
        ["brand_family"],
        postgresql_where=sa.text("brand_family IS NOT NULL"),
    )

    # ──────────────────────────────────────────── hotel_merge_history
    op.create_table(
        "hotel_merge_history",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        # winner survives; SET NULL if the winner is later deleted
        sa.Column(
            "winner_asset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hotel_assets.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # loser is intentionally NOT a FK — may be deleted after merge
        sa.Column(
            "loser_asset_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "loser_asset_name",
            sa.String(255),
            nullable=False,
            comment="Denormalised: preserved regardless of what happens to the loser record",
        ),
        sa.Column("loser_city", sa.String(100), nullable=True),
        sa.Column(
            "merge_strategy",
            sa.String(50),
            nullable=False,
            comment="auto_exact | auto_fuzzy | manual",
        ),
        sa.Column(
            "confidence_score",
            sa.Numeric(4, 3),
            nullable=True,
        ),
        sa.Column(
            "confidence_label",
            sa.String(10),
            nullable=True,
            comment="HIGH | MEDIUM | LOW",
        ),
        sa.Column(
            "triggered_by",
            sa.String(255),
            nullable=True,
            comment="e.g. 'import_job:uuid', 'manual', 'etl'",
        ),
        sa.Column(
            "reviewed_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "is_reversed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
            comment="True = merge was undone; both records are active again",
        ),
        sa.Column("reversed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "reversed_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "snapshot_before",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
            comment="Full JSON of the winner asset immediately before the merge",
        ),
        sa.Column(
            "aliases_transferred",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
            comment="List of hotel_alias_entry ids moved from loser to winner",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_index(
        "ix_hotel_merge_history_winner_asset_id",
        "hotel_merge_history",
        ["winner_asset_id"],
    )
    op.create_index(
        "ix_hotel_merge_history_loser_asset_id",
        "hotel_merge_history",
        ["loser_asset_id"],
    )
    op.create_index(
        "ix_hotel_merge_history_merge_strategy",
        "hotel_merge_history",
        ["merge_strategy"],
    )

    # ─────────────────────────────────────────────────── alias_conflicts
    op.create_table(
        "alias_conflicts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "alias_key",
            sa.String(255),
            nullable=False,
            comment="Normalised key that collided across multiple assets",
        ),
        sa.Column(
            "alias_text",
            sa.String(255),
            nullable=False,
            comment="Original raw text that triggered the conflict",
        ),
        sa.Column(
            "conflicting_asset_ids",
            postgresql.ARRAY(postgresql.UUID(as_uuid=True)),
            nullable=False,
            server_default=sa.text("'{}'::uuid[]"),
            comment="All asset_ids that claimed this alias_key",
        ),
        sa.Column(
            "status",
            sa.String(50),
            nullable=False,
            server_default="open",
            comment="open | resolved_manual | resolved_auto | ignored",
        ),
        sa.Column(
            "detected_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "resolved_asset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hotel_assets.id", ondelete="SET NULL"),
            nullable=True,
            comment="Asset nominated to own the alias after resolution",
        ),
        sa.Column(
            "resolution_strategy",
            sa.String(50),
            nullable=True,
            comment="manual | confidence_winner | override | ignored",
        ),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "resolved_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_index("ix_alias_conflicts_alias_key", "alias_conflicts", ["alias_key"])
    op.create_index("ix_alias_conflicts_status", "alias_conflicts", ["status"])
    # Only one open conflict per alias_key at a time
    op.create_index(
        "uq_alias_conflict_open",
        "alias_conflicts",
        ["alias_key"],
        unique=True,
        postgresql_where=sa.text("status = 'open'"),
    )

    # Back-reference: add aliases relationship column to hotel_assets
    # (no schema change needed; handled by SQLAlchemy relationship on the ORM side)


def downgrade() -> None:
    op.drop_table("alias_conflicts")
    op.drop_table("hotel_merge_history")
    op.drop_table("operator_aliases")
    op.drop_table("hotel_alias_entries")
