from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import PagedResponse, SingleResponse
from app.services.hotel_service import FlexLivingService

router = APIRouter()


@router.get("")
async def list_flex_assets(
    city: str | None = None,
    asset_type: str | None = None,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> dict:
    svc = FlexLivingService(db)
    return await svc.list_assets(city=city, asset_type=asset_type, limit=limit, offset=offset)


@router.post("", status_code=201)
async def create_flex_asset(payload: dict, db: AsyncSession = Depends(get_db)) -> dict:
    svc = FlexLivingService(db)
    return await svc.create_asset(payload)


@router.get("/{asset_id}")
async def get_flex_asset(asset_id: UUID, db: AsyncSession = Depends(get_db)) -> dict:
    svc = FlexLivingService(db)
    return await svc.get_asset(asset_id)


@router.delete("/{asset_id}", status_code=204)
async def delete_flex_asset(asset_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    await FlexLivingService(db).delete_asset(asset_id)
