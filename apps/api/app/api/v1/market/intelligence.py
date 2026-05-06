from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import PagedResponse, SingleResponse
from app.services.market_service import MarketService

router = APIRouter()


@router.get("/snapshots")
async def list_snapshots(
    city: str | None = None,
    submarket: str | None = None,
    year: int | None = None,
    limit: int = Query(default=20, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> dict:
    svc = MarketService(db)
    return await svc.list_snapshots(city=city, submarket=submarket, year=year, limit=limit, offset=offset)


@router.get("/trends")
async def market_trends(
    city: str,
    years: int = Query(default=5, le=20),
    db: AsyncSession = Depends(get_db),
) -> dict:
    svc = MarketService(db)
    return await svc.get_trends(city=city, years=years)


@router.get("/supply-pipeline")
async def supply_pipeline(
    city: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    svc = MarketService(db)
    return await svc.get_supply_pipeline(city=city)
