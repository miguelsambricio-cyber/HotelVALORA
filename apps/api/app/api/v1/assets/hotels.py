from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import PagedResponse, SingleResponse
from app.schemas.hotel import HotelCreate, HotelFinancialCreate, HotelListItem, HotelRead, HotelUpdate
from app.services.hotel_service import HotelService

router = APIRouter()


@router.get("", response_model=PagedResponse[HotelListItem])
async def list_hotels(
    city: str | None = None,
    chain_scale: str | None = None,
    asset_status: str | None = None,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> PagedResponse[HotelListItem]:
    svc = HotelService(db)
    return await svc.list_hotels(
        city=city, chain_scale=chain_scale, asset_status=asset_status,
        limit=limit, offset=offset,
    )


@router.post("", response_model=SingleResponse[HotelRead], status_code=201)
async def create_hotel(
    payload: HotelCreate, db: AsyncSession = Depends(get_db)
) -> SingleResponse[HotelRead]:
    svc = HotelService(db)
    hotel = await svc.create_hotel(payload)
    return SingleResponse(data=HotelRead.model_validate(hotel))


@router.get("/{hotel_id}", response_model=SingleResponse[HotelRead])
async def get_hotel(
    hotel_id: UUID, db: AsyncSession = Depends(get_db)
) -> SingleResponse[HotelRead]:
    svc = HotelService(db)
    hotel = await svc.get_hotel(hotel_id)
    return SingleResponse(data=HotelRead.model_validate(hotel))


@router.patch("/{hotel_id}", response_model=SingleResponse[HotelRead])
async def update_hotel(
    hotel_id: UUID, payload: HotelUpdate, db: AsyncSession = Depends(get_db)
) -> SingleResponse[HotelRead]:
    svc = HotelService(db)
    hotel = await svc.update_hotel(hotel_id, payload)
    return SingleResponse(data=HotelRead.model_validate(hotel))


@router.delete("/{hotel_id}", status_code=204)
async def delete_hotel(hotel_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    await HotelService(db).delete_hotel(hotel_id)


@router.post("/{hotel_id}/financials", response_model=SingleResponse[dict], status_code=201)
async def add_financials(
    hotel_id: UUID, payload: HotelFinancialCreate, db: AsyncSession = Depends(get_db)
) -> SingleResponse[dict]:
    svc = HotelService(db)
    record = await svc.add_financials(hotel_id, payload)
    return SingleResponse(data={"id": str(record.id), "year": record.year})
