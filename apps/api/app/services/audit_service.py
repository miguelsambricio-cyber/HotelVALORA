"""Append-only audit service for normalization and merge operations."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationError
from app.models.audit_log import AuditLog


class AuditService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def log(
        self,
        *,
        event_type: str,
        actor_type: str,
        actor_id: Optional[uuid.UUID] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[uuid.UUID] = None,
        before_state: Optional[dict[str, Any]] = None,
        after_state: Optional[dict[str, Any]] = None,
        meta: Optional[dict[str, Any]] = None,
        reversible: bool = False,
    ) -> AuditLog:
        entry = AuditLog(
            event_type=event_type,
            actor_type=actor_type,
            actor_id=actor_id,
            entity_type=entity_type,
            entity_id=entity_id,
            before_state=before_state,
            after_state=after_state,
            meta=meta,
            reversible=reversible,
        )
        self._db.add(entry)
        await self._db.flush()
        return entry

    async def get(self, audit_id: uuid.UUID) -> AuditLog:
        row = await self._db.get(AuditLog, audit_id)
        if not row:
            raise NotFoundError(f"Audit log entry {audit_id} not found.")
        return row

    async def list_events(
        self,
        *,
        entity_type: Optional[str] = None,
        entity_id: Optional[uuid.UUID] = None,
        event_type: Optional[str] = None,
        actor_id: Optional[uuid.UUID] = None,
        limit: int = 50,
        offset: int = 0,
    ):
        from app.schemas.audit_log import AuditLogListItem
        from app.schemas.common import PagedResponse, Pagination
        from sqlalchemy import func

        q = select(AuditLog).order_by(AuditLog.created_at.desc())
        if entity_type:
            q = q.where(AuditLog.entity_type == entity_type)
        if entity_id:
            q = q.where(AuditLog.entity_id == entity_id)
        if event_type:
            q = q.where(AuditLog.event_type == event_type)
        if actor_id:
            q = q.where(AuditLog.actor_id == actor_id)

        count_q = select(func.count()).select_from(q.subquery())
        total = (await self._db.execute(count_q)).scalar() or 0

        rows = list((await self._db.execute(q.offset(offset).limit(limit))).scalars())
        return PagedResponse(
            data=[AuditLogListItem.model_validate(r) for r in rows],
            meta=Pagination(
                total=total,
                limit=limit,
                offset=offset,
                has_next=offset + limit < total,
            ),
        )

    async def rollback(
        self, audit_id: uuid.UUID, actor_id: Optional[uuid.UUID]
    ) -> AuditLog:
        from app.models.alias import AliasConflict, HotelAliasEntry, OperatorAlias
        from app.models.merge_recommendation import MergeRecommendation

        event = await self._db.get(AuditLog, audit_id)
        if not event:
            raise NotFoundError(f"Audit log entry {audit_id} not found.")
        if not event.reversible:
            raise ValidationError(f"Event {audit_id} ({event.event_type}) is not reversible.")
        if event.reversed_at is not None:
            raise ValidationError(f"Event {audit_id} has already been reversed.")

        rollback_meta: dict[str, Any] = {"original_event_id": str(audit_id)}

        et = event.event_type

        if et == "alias.created":
            if event.entity_id:
                entry = await self._db.get(HotelAliasEntry, event.entity_id)
                if entry:
                    entry.is_active = False
                    entry.valid_to = entry.valid_to or date.today()

        elif et == "alias.deactivated":
            if event.entity_id and event.before_state:
                entry = await self._db.get(HotelAliasEntry, event.entity_id)
                if entry:
                    entry.is_active = True
                    entry.valid_to = None

        elif et == "alias.updated":
            if event.entity_id and event.before_state:
                entry = await self._db.get(HotelAliasEntry, event.entity_id)
                if entry:
                    for field in (
                        "alias_text", "alias_key", "alias_type", "language",
                        "source", "is_active", "is_manual_override", "confidence", "notes",
                        "valid_from", "valid_to",
                    ):
                        if field in event.before_state:
                            setattr(entry, field, event.before_state[field])

        elif et == "operator_alias.created":
            if event.entity_id:
                entry = await self._db.get(OperatorAlias, event.entity_id)
                if entry:
                    entry.is_active = False

        elif et == "operator_alias.deactivated":
            if event.entity_id and event.before_state:
                entry = await self._db.get(OperatorAlias, event.entity_id)
                if entry:
                    entry.is_active = True

        elif et == "operator_alias.updated":
            if event.entity_id and event.before_state:
                entry = await self._db.get(OperatorAlias, event.entity_id)
                if entry:
                    for field in (
                        "alias_text", "alias_key", "canonical_operator", "brand_family",
                        "chain_scale", "parent_company", "source",
                        "is_active", "is_manual_override", "notes",
                    ):
                        if field in event.before_state:
                            setattr(entry, field, event.before_state[field])

        elif et in ("merge.accepted", "merge.dismissed"):
            if event.entity_id:
                rec = await self._db.get(MergeRecommendation, event.entity_id)
                if rec:
                    rec.status = "pending_review"
                    rec.reviewed_at = None
                    rec.review_notes = None

        elif et in ("conflict.resolved", "conflict.ignored"):
            if event.entity_id:
                conflict = await self._db.get(AliasConflict, event.entity_id)
                if conflict:
                    conflict.status = "open"
                    conflict.resolved_asset_id = None
                    conflict.resolution_strategy = None
                    conflict.resolution_notes = None
                    conflict.resolved_at = None
                    conflict.resolved_by_id = None

        # Mark original event reversed
        event.reversed_at = datetime.now(timezone.utc)
        event.reversed_by_id = actor_id

        rollback_event = AuditLog(
            event_type=f"{et}.rollback",
            actor_type="user" if actor_id else "system",
            actor_id=actor_id,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            before_state=event.after_state,
            after_state=event.before_state,
            meta=rollback_meta,
            reversible=False,
        )
        self._db.add(rollback_event)
        await self._db.flush()
        return rollback_event
