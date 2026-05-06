from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import PagedResponse, SingleResponse
from app.schemas.hotel import (
    HotelAssetCreate,
    HotelAssetListItem,
    HotelAssetRead,
    HotelAssetUpdate,
    HotelFinancialCreate,
    HotelFinancialRead,
)
from app.services.hotel_service import HotelAssetService

router = APIRouter()


# ── Collection ────────────────────────────────────────────────────────────────

@router.get("", response_model=PagedResponse[HotelAssetListItem], summary="List hotel assets")
async def list_hotel_assets(
    city: str | None = Query(default=None, description="Partial match on city name"),
    country: str | None = Query(default=None, description="Partial match on country"),
    submarket: str | None = Query(default=None, description="Partial match on submarket"),
    asset_type: str | None = Query(default=None, description="Exact match: full_service | select_service | extended_stay | resort | boutique | apart_hotel"),
    status: str | None = Query(default=None, description="Exact match: operating | pipeline | under_renovation | distressed"),
    chain_scale: str | None = Query(default=None, description="Exact match: luxury | upscale | upper_midscale | midscale | economy"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> PagedResponse[HotelAssetListItem]:
    svc = HotelAssetService(db)
    return await svc.list(
        city=city,
        country=country,
        submarket=submarket,
        asset_type=asset_type,
        status=status,
        chain_scale=chain_scale,
        limit=limit,
        offset=offset,
    )


@router.post(
    "",
    response_model=SingleResponse[HotelAssetRead],
    status_code=status.HTTP_201_CREATED,
    summary="Create a hotel asset",
)
async def create_hotel_asset(
    payload: HotelAssetCreate,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[HotelAssetRead]:
    svc = HotelAssetService(db)
    asset = await svc.create(payload)
    return SingleResponse(data=HotelAssetRead.model_validate(asset))


# ── Single resource ───────────────────────────────────────────────────────────

@router.get(
    "/{asset_id}",
    response_model=SingleResponse[HotelAssetRead],
    summary="Get a hotel asset by ID",
)
async def get_hotel_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[HotelAssetRead]:
    svc = HotelAssetService(db)
    asset = await svc.get(asset_id)
    return SingleResponse(data=HotelAssetRead.model_validate(asset))


@router.patch(
    "/{asset_id}",
    response_model=SingleResponse[HotelAssetRead],
    summary="Partially update a hotel asset",
)
async def update_hotel_asset(
    asset_id: UUID,
    payload: HotelAssetUpdate,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[HotelAssetRead]:
    svc = HotelAssetService(db)
    asset = await svc.update(asset_id, payload)
    return SingleResponse(data=HotelAssetRead.model_validate(asset))


@router.delete(
    "/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a hotel asset",
)
async def delete_hotel_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    await HotelAssetService(db).delete(asset_id)


# ── Financials sub-resource ───────────────────────────────────────────────────

@router.get(
    "/{asset_id}/financials",
    response_model=SingleResponse[list[HotelFinancialRead]],
    summary="List financials for a hotel asset",
)
async def list_hotel_financials(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[list[HotelFinancialRead]]:
    svc = HotelAssetService(db)
    records = await svc.list_financials(asset_id)
    return SingleResponse(data=[HotelFinancialRead.model_validate(r) for r in records])


@router.post(
    "/{asset_id}/financials",
    response_model=SingleResponse[HotelFinancialRead],
    status_code=status.HTTP_201_CREATED,
    summary="Add a financial period to a hotel asset",
)
async def add_hotel_financial(
    asset_id: UUID,
    payload: HotelFinancialCreate,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[HotelFinancialRead]:
    svc = HotelAssetService(db)
    record = await svc.add_financial(asset_id, payload)
    return SingleResponse(data=HotelFinancialRead.model_validate(record))
