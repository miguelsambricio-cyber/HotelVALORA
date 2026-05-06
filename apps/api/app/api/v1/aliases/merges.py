from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.alias import MergeCreate, MergeRead, MergeReverseRequest
from app.schemas.common import PagedResponse, SingleResponse
from app.services.alias_service import HotelMergeService

router = APIRouter()


@router.get(
    "",
    response_model=PagedResponse[MergeRead],
    summary="List merge history records",
)
async def list_merges(
    winner_asset_id: UUID | None = Query(
        default=None, description="Filter by the surviving asset"
    ),
    loser_asset_id: UUID | None = Query(
        default=None, description="Filter by the absorbed asset"
    ),
    is_reversed: bool | None = Query(
        default=None, description="true = only reversed merges; false = only active merges"
    ),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> PagedResponse[MergeRead]:
    svc = HotelMergeService(db)
    return await svc.list(
        winner_asset_id=winner_asset_id,
        loser_asset_id=loser_asset_id,
        is_reversed=is_reversed,
        limit=limit,
        offset=offset,
    )


@router.post(
    "",
    response_model=SingleResponse[MergeRead],
    status_code=status.HTTP_201_CREATED,
    summary="Record a merge event",
    description=(
        "Appends an immutable merge event. The caller is responsible for "
        "transferring aliases and updating the loser asset's status before "
        "calling this endpoint. snapshot_before should contain the winner "
        "asset JSON at the moment of merge."
    ),
)
async def record_merge(
    payload: MergeCreate,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[MergeRead]:
    svc = HotelMergeService(db)
    row = await svc.record(payload)
    return SingleResponse(data=MergeRead.model_validate(row))


@router.get(
    "/{merge_id}",
    response_model=SingleResponse[MergeRead],
    summary="Get a merge history record",
)
async def get_merge(
    merge_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[MergeRead]:
    row = await HotelMergeService(db).get(merge_id)
    return SingleResponse(data=MergeRead.model_validate(row))


@router.post(
    "/{merge_id}/reverse",
    response_model=SingleResponse[MergeRead],
    summary="Reverse a merge",
    description=(
        "Marks the merge as reversed. Does not automatically restore the loser "
        "asset or re-assign aliases — those operations must be done separately. "
        "Returns 422 if the merge has already been reversed."
    ),
)
async def reverse_merge(
    merge_id: UUID,
    payload: MergeReverseRequest,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[MergeRead]:
    row = await HotelMergeService(db).reverse(merge_id, payload)
    return SingleResponse(data=MergeRead.model_validate(row))
