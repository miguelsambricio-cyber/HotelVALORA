from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from app.schemas.common import PagedResponse, ValoraBase  # noqa: F401


class AuditLogListItem(ValoraBase):
    id: uuid.UUID
    event_type: str
    actor_type: str
    actor_id: Optional[uuid.UUID]
    entity_type: Optional[str]
    entity_id: Optional[uuid.UUID]
    reversible: bool
    reversed_at: Optional[datetime]
    created_at: datetime


class AuditLogRead(AuditLogListItem):
    before_state: Optional[dict[str, Any]]
    after_state: Optional[dict[str, Any]]
    meta: Optional[dict[str, Any]]
    reversed_by_id: Optional[uuid.UUID]
    updated_at: datetime
