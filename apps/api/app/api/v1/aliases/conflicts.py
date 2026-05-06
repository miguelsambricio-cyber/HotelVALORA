from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.alias import (
    AliasConflictListItem,
    AliasConflictRead,
    ConflictIgnoreRequest,
    ConflictResolveRequest,
)
from app.schemas.common import PagedResponse, SingleResponse
from app.services.alias_service import AliasConflictService

router = APIRouter()


@router.get(
    "",
    response_model=PagedResponse[AliasConflictListItem],
    summary="List alias conflicts",
    description=(
        "Returns alias collisions detected by the ETL. "
        "Default filter is status=open to show the review queue. "
        "Pass status=resolved_manual / resolved_auto / ignored to see history."
    ),
)
async def list_conflicts(
    status: str | None = Query(
        default="open",
        description="open | resolved_manual | resolved_auto | ignored; omit for all",
    ),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> PagedResponse[AliasConflictListItem]:
    svc = AliasConflictService(db)
    return await svc.list(status=status, limit=limit, offset=offset)


@router.get(
    "/{conflict_id}",
    response_model=SingleResponse[AliasConflictRead],
    summary="Get an alias conflict",
)
async def get_conflict(
    conflict_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[AliasConflictRead]:
    row = await AliasConflictService(db).get(conflict_id)
    return SingleResponse(data=AliasConflictRead.model_validate(row))


@router.post(
    "/{conflict_id}/resolve",
    response_model=SingleResponse[AliasConflictRead],
    summary="Resolve an alias conflict",
    description=(
        "Nominates one of the conflicting assets as the owner of the alias. "
        "`resolved_asset_id` must be present in the conflict's `conflicting_asset_ids`. "
        "Returns 422 if the conflict is already closed."
    ),
)
async def resolve_conflict(
    conflict_id: UUID,
    payload: ConflictResolveRequest,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[AliasConflictRead]:
    row = await AliasConflictService(db).resolve(conflict_id, payload)
    return SingleResponse(data=AliasConflictRead.model_validate(row))


@router.post(
    "/{conflict_id}/ignore",
    response_model=SingleResponse[AliasConflictRead],
    summary="Ignore an alias conflict",
    description=(
        "Closes the conflict without nominating a winner — use when two genuinely "
        "distinct hotels happen to share the same normalised alias key (e.g. "
        "homonyms in different cities). Returns 422 if already closed."
    ),
)
async def ignore_conflict(
    conflict_id: UUID,
    payload: ConflictIgnoreRequest,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[AliasConflictRead]:
    row = await AliasConflictService(db).ignore(conflict_id, payload)
    return SingleResponse(data=AliasConflictRead.model_validate(row))
