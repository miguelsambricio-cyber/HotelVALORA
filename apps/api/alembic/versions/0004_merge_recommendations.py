"""Add merge_recommendations table

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "merge_recommendations",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        # Pair (always stored with asset_a_id < asset_b_id for uniqueness)
        sa.Column(
            "asset_a_id",
            UUID(as_uuid=True),
            sa.ForeignKey("hotel_assets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "asset_b_id",
            UUID(as_uuid=True),
            sa.ForeignKey("hotel_assets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # Lifecycle
        sa.Column(
            "status",
            sa.String(50),
            nullable=False,
            server_default="pending_review",
            comment="pending_review | accepted | dismissed | expired",
        ),
        # Scoring
        sa.Column("final_score", sa.Numeric(4, 3), nullable=False),
        sa.Column(
            "confidence_label",
            sa.String(10),
            nullable=False,
            comment="HIGH | MEDIUM | LOW",
        ),
        sa.Column(
            "score_breakdown",
            JSONB,
            nullable=False,
            server_default="{}",
            comment="Per-component scores: name_exact, name_fuzzy, city, operator, address",
        ),
        # Recommendation
        sa.Column(
            "recommendation",
            sa.String(50),
            nullable=False,
            comment="auto_merge | needs_review | likely_duplicate | not_duplicate",
        ),
        sa.Column(
            "false_positive_signals",
            JSONB,
            nullable=False,
            server_default="[]",
            comment="List of {signal_type, severity, detail} objects",
        ),
        sa.Column("rationale", sa.Text, nullable=False, server_default=""),
        # Human review
        sa.Column(
            "reviewed_by_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("review_notes", sa.Text, nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        # Asset snapshots — denormalised so the recommendation survives asset edits
        sa.Column(
            "asset_a_snapshot",
            JSONB,
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "asset_b_snapshot",
            JSONB,
            nullable=False,
            server_default="{}",
        ),
        sa.UniqueConstraint("asset_a_id", "asset_b_id", name="uq_merge_rec_pair"),
    )

    op.create_index("ix_merge_rec_status", "merge_recommendations", ["status"])
    op.create_index(
        "ix_merge_rec_label", "merge_recommendations", ["confidence_label"]
    )
    op.create_index("ix_merge_rec_asset_a", "merge_recommendations", ["asset_a_id"])
    op.create_index("ix_merge_rec_asset_b", "merge_recommendations", ["asset_b_id"])
    op.create_index(
        "ix_merge_rec_score", "merge_recommendations", ["final_score"]
    )


def downgrade() -> None:
    op.drop_table("merge_recommendations")
