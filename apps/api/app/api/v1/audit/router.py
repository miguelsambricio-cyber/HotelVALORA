"""Audit log endpoints — read-only access + rollback."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.security import get_optional_actor_id
from app.database import get_db
from app.schemas.audit_log import AuditLogListItem, AuditLogRead
from app.schemas.common import PagedResponse, SingleResponse
from app.services.audit_service import AuditService

router = APIRouter()


def _svc(db=Depends(get_db)) -> AuditService:
    return AuditService(db)


@router.get("", response_model=PagedResponse[AuditLogListItem])
async def list_audit_events(
    entity_type: Optional[str] = Query(default=None),
    entity_id: Optional[UUID] = Query(default=None),
    event_type: Optional[str] = Query(default=None),
    actor_id: Optional[UUID] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    svc: AuditService = Depends(_svc),
):
    return await svc.list_events(
        entity_type=entity_type,
        entity_id=entity_id,
        event_type=event_type,
        actor_id=actor_id,
        limit=limit,
        offset=offset,
    )


@router.get("/{audit_id}", response_model=SingleResponse[AuditLogRead])
async def get_audit_event(
    audit_id: UUID,
    svc: AuditService = Depends(_svc),
):
    event = await svc.get(audit_id)
    return SingleResponse(data=AuditLogRead.model_validate(event))


@router.post("/{audit_id}/rollback", response_model=SingleResponse[AuditLogRead])
async def rollback_event(
    audit_id: UUID,
    actor_id: Optional[UUID] = Depends(get_optional_actor_id),
    svc: AuditService = Depends(_svc),
):
    rollback = await svc.rollback(audit_id, actor_id=actor_id)
    return SingleResponse(data=AuditLogRead.model_validate(rollback))
