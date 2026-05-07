"""Add audit_log table

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_log",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "event_type",
            sa.String(100),
            nullable=False,
            comment="Dotted notation: domain.action  e.g. merge.accepted",
        ),
        sa.Column(
            "actor_type",
            sa.String(20),
            nullable=False,
            comment="system | user",
        ),
        sa.Column(
            "actor_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            comment="Null for system-initiated events",
        ),
        sa.Column(
            "entity_type",
            sa.String(100),
            nullable=True,
            comment="hotel_alias_entry | operator_alias | merge_recommendation | alias_conflict",
        ),
        sa.Column(
            "entity_id",
            UUID(as_uuid=True),
            nullable=True,
            comment="UUID of the affected row",
        ),
        sa.Column(
            "before_state",
            JSONB,
            nullable=True,
            comment="Full field snapshot before the change; null for create events",
        ),
        sa.Column(
            "after_state",
            JSONB,
            nullable=True,
            comment="Full field snapshot after the change",
        ),
        sa.Column(
            "meta",
            JSONB,
            nullable=True,
            comment="Domain-specific extra data: normalization pipeline, scoring breakdown, scan counters",
        ),
        sa.Column(
            "reversible",
            sa.Boolean,
            nullable=False,
            server_default="false",
            comment="Whether this event can be undone via the rollback endpoint",
        ),
        sa.Column(
            "reversed_at",
            sa.DateTime(timezone=True),
            nullable=True,
            comment="Set when a rollback is applied",
        ),
        sa.Column(
            "reversed_by_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
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
    )

    op.create_index(
        "ix_audit_log_entity", "audit_log", ["entity_type", "entity_id"]
    )
    op.create_index("ix_audit_log_event_type", "audit_log", ["event_type"])
    op.create_index("ix_audit_log_actor", "audit_log", ["actor_id"])
    op.create_index("ix_audit_log_created_at", "audit_log", ["created_at"])


def downgrade() -> None:
    op.drop_table("audit_log")
