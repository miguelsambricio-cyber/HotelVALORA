"""
Append-only audit log for normalization and merge operations.

event_type dotted notation:
  normalization.alias_key        raw alias_text → alias_key computed
  alias.created
  alias.updated
  alias.deactivated
  operator_alias.created
  operator_alias.updated
  operator_alias.deactivated
  conflict.resolved
  conflict.ignored
  merge.scan                     dedup scan completed (system actor)
  merge.accepted                 human accepted a merge recommendation
  merge.dismissed                human dismissed a merge recommendation
  <event_type>.rollback          rollback of any of the above

Reversible events store a full before_state so rollback can restore them
without re-querying the original record. The original row gets reversed_at
and reversed_by_id set when rolled back (only allowed mutation on this table).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class AuditLog(BaseModel):
    __tablename__ = "audit_log"
    __table_args__ = (
        Index("ix_audit_log_entity", "entity_type", "entity_id"),
        Index("ix_audit_log_event_type", "event_type"),
        Index("ix_audit_log_actor", "actor_id"),
        Index("ix_audit_log_created_at", "created_at"),
    )

    # ── Event classification ──────────────────────────────────────────────────
    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Dotted notation: domain.action  e.g. merge.accepted",
    )

    # ── Actor ─────────────────────────────────────────────────────────────────
    actor_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="system | user",
    )
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Null for system-initiated events",
    )

    # ── Entity reference ──────────────────────────────────────────────────────
    entity_type: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="hotel_alias_entry | operator_alias | merge_recommendation | alias_conflict",
    )
    entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        comment="UUID of the affected row; null for scan events with no single entity",
    )

    # ── State snapshots ───────────────────────────────────────────────────────
    before_state: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Full field snapshot before the change; null for create events",
    )
    after_state: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Full field snapshot after the change",
    )
    meta: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Domain-specific extra data: normalization pipeline, scoring breakdown, scan counters",
    )

    # ── Rollback tracking ─────────────────────────────────────────────────────
    reversible: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        comment="Whether this event can be undone via the rollback endpoint",
    )
    reversed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Set when a rollback is applied; only allowed mutation on this table",
    )
    reversed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    actor: Mapped[Optional["User"]] = relationship(  # noqa: F821
        "User", foreign_keys=[actor_id]
    )
    reversed_by: Mapped[Optional["User"]] = relationship(  # noqa: F821
        "User", foreign_keys=[reversed_by_id]
    )
