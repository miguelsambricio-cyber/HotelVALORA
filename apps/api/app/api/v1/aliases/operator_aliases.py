from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_optional_actor_id
from app.database import get_db
from app.schemas.alias import (
    BulkCreateResult,
    OperatorAliasCreate,
    OperatorAliasListItem,
    OperatorAliasBulkCreate,
    OperatorAliasRead,
    OperatorAliasUpdate,
)
from app.schemas.common import PagedResponse, SingleResponse
from app.services.alias_service import OperatorAliasService

router = APIRouter()


@router.get(
    "",
    response_model=PagedResponse[OperatorAliasListItem],
    summary="List operator aliases",
)
async def list_operator_aliases(
    canonical_operator: str | None = Query(
        default=None, description="Partial match on canonical operator name"
    ),
    brand_family: str | None = Query(
        default=None, description="Partial match on brand family e.g. 'Marriott Bonvoy'"
    ),
    active_only: bool = Query(default=True),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> PagedResponse[OperatorAliasListItem]:
    svc = OperatorAliasService(db)
    return await svc.list(
        canonical_operator=canonical_operator,
        brand_family=brand_family,
        active_only=active_only,
        limit=limit,
        offset=offset,
    )


@router.post(
    "",
    response_model=SingleResponse[OperatorAliasRead],
    status_code=status.HTTP_201_CREATED,
    summary="Create an operator alias",
    description=(
        "alias_key is computed from alias_text using the same NFKD normalisation "
        "as the ETL pipeline. Returns 409 if the key already exists."
    ),
)
async def create_operator_alias(
    payload: OperatorAliasCreate,
    actor_id: Optional[UUID] = Depends(get_optional_actor_id),
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[OperatorAliasRead]:
    svc = OperatorAliasService(db)
    entry = await svc.create(payload, created_by_id=actor_id)
    return SingleResponse(data=OperatorAliasRead.model_validate(entry))


@router.post(
    "/bulk",
    response_model=SingleResponse[BulkCreateResult],
    status_code=status.HTTP_200_OK,
    summary="Bulk-create operator aliases",
    description=(
        "Insert up to 500 operator aliases in one request. "
        "Items whose alias_key already exists are skipped (not overwritten). "
        "Use this endpoint to seed from the static OPERATOR_CANONICAL dictionary."
    ),
)
async def bulk_create_operator_aliases(
    payload: OperatorAliasBulkCreate,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[BulkCreateResult]:
    svc = OperatorAliasService(db)
    result = await svc.bulk_create(payload.items)
    return SingleResponse(data=result)


@router.get(
    "/{alias_id}",
    response_model=SingleResponse[OperatorAliasRead],
    summary="Get an operator alias",
)
async def get_operator_alias(
    alias_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[OperatorAliasRead]:
    entry = await OperatorAliasService(db).get(alias_id)
    return SingleResponse(data=OperatorAliasRead.model_validate(entry))


@router.patch(
    "/{alias_id}",
    response_model=SingleResponse[OperatorAliasRead],
    summary="Update an operator alias",
    description=(
        "Partial update. If alias_text changes, alias_key is recomputed. "
        "Returns 409 if the new key is already taken by another entry."
    ),
)
async def update_operator_alias(
    alias_id: UUID,
    payload: OperatorAliasUpdate,
    actor_id: Optional[UUID] = Depends(get_optional_actor_id),
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[OperatorAliasRead]:
    svc = OperatorAliasService(db)
    entry = await svc.update(alias_id, payload, actor_id=actor_id)
    return SingleResponse(data=OperatorAliasRead.model_validate(entry))


@router.delete(
    "/{alias_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate an operator alias",
)
async def deactivate_operator_alias(
    alias_id: UUID,
    actor_id: Optional[UUID] = Depends(get_optional_actor_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    await OperatorAliasService(db).deactivate(alias_id, actor_id=actor_id)
