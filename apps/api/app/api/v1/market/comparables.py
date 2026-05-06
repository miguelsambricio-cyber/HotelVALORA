from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import PagedResponse, SingleResponse
from app.services.market_service import ComparableService

router = APIRouter()


@router.get("")
async def list_comps(
    city: str | None = None,
    chain_scale: str | None = None,
    min_keys: int | None = None,
    max_keys: int | None = None,
    sale_year_from: int | None = None,
    sale_year_to: int | None = None,
    limit: int = Query(default=20, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> dict:
    svc = ComparableService(db)
    return await svc.list_comps(
        city=city, chain_scale=chain_scale,
        min_keys=min_keys, max_keys=max_keys,
        sale_year_from=sale_year_from, sale_year_to=sale_year_to,
        limit=limit, offset=offset,
    )


@router.post("", status_code=201)
async def create_comp(payload: dict, db: AsyncSession = Depends(get_db)) -> dict:
    svc = ComparableService(db)
    return await svc.create_comp(payload)


@router.get("/{comp_id}")
async def get_comp(comp_id: UUID, db: AsyncSession = Depends(get_db)) -> dict:
    svc = ComparableService(db)
    return await svc.get_comp(comp_id)


@router.delete("/{comp_id}", status_code=204)
async def delete_comp(comp_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    await ComparableService(db).delete_comp(comp_id)
