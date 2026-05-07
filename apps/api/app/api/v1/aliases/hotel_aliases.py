"""
Flat hotel alias entry endpoints.

Nested alias endpoints (scoped to a specific asset) live in
assets/hotels.py under /{asset_id}/aliases.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.alias import (
    HotelAliasEntryListItem,
    HotelAliasEntryRead,
    HotelAliasEntryUpdate,
)
from app.schemas.common import PagedResponse, SingleResponse
from app.services.alias_service import HotelAliasService

router = APIRouter()


@router.get(
    "",
    response_model=PagedResponse[HotelAliasEntryListItem],
    summary="List hotel alias entries",
    description=(
        "Query alias entries across all assets. "
        "Use `asset_id` to scope to one hotel, `alias_key` for an exact "
        "normalised-key lookup, or `alias_type`/`language` to filter by category."
    ),
)
async def list_hotel_aliases(
    asset_id: UUID | None = Query(default=None, description="Scope to one hotel asset"),
    alias_key: str | None = Query(
        default=None,
        description="Exact normalised-key lookup (the query value is normalised before search)",
    ),
    alias_type: str | None = Query(
        default=None,
        description="canonical | common | multilingual | operator | historical | source_raw",
    ),
    language: str | None = Query(
        default=None, description="BCP-47 language tag e.g. 'es', 'en', 'ca'"
    ),
    active_only: bool = Query(default=True, description="When true, returns only is_active=true rows"),
    confidence_max: float | None = Query(
        default=None,
        description="Return only entries with a non-null confidence ≤ this value (e.g. 0.65 for the review queue)",
        ge=0.0,
        le=1.0,
    ),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> PagedResponse[HotelAliasEntryListItem]:
    svc = HotelAliasService(db)
    return await svc.list(
        asset_id=asset_id,
        alias_key=alias_key,
        alias_type=alias_type,
        language=language,
        active_only=active_only,
        confidence_max=confidence_max,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{alias_id}",
    response_model=SingleResponse[HotelAliasEntryRead],
    summary="Get a hotel alias entry",
)
async def get_hotel_alias(
    alias_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[HotelAliasEntryRead]:
    svc = HotelAliasService(db)
    entry = await svc.get(alias_id)
    return SingleResponse(data=HotelAliasEntryRead.model_validate(entry))


@router.patch(
    "/{alias_id}",
    response_model=SingleResponse[HotelAliasEntryRead],
    summary="Update a hotel alias entry",
    description=(
        "Partial update. If `alias_text` is changed, `alias_key` is recomputed "
        "automatically and cross-asset conflict detection re-runs. "
        "Set `is_active=false` to soft-deactivate without deleting."
    ),
)
async def update_hotel_alias(
    alias_id: UUID,
    payload: HotelAliasEntryUpdate,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[HotelAliasEntryRead]:
    svc = HotelAliasService(db)
    entry = await svc.update(alias_id, payload)
    return SingleResponse(data=HotelAliasEntryRead.model_validate(entry))


@router.delete(
    "/{alias_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate a hotel alias entry",
    description=(
        "Soft-deletes the alias by setting is_active=false and valid_to=today. "
        "The row is kept for audit and historical queries."
    ),
)
async def deactivate_hotel_alias(
    alias_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    await HotelAliasService(db).deactivate(alias_id)
