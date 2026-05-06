from uuid import UUID

from python_slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.models.hotel import Hotel, HotelFinancial
from app.models.flex_living import FlexLivingAsset
from app.schemas.common import PagedResponse, Pagination
from app.schemas.hotel import HotelCreate, HotelFinancialCreate, HotelListItem, HotelUpdate


class HotelService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_hotels(
        self,
        city: str | None,
        chain_scale: str | None,
        asset_status: str | None,
        limit: int,
        offset: int,
    ) -> PagedResponse[HotelListItem]:
        q = select(Hotel)
        if city:
            q = q.where(Hotel.city.ilike(f"%{city}%"))
        if chain_scale:
            q = q.where(Hotel.chain_scale == chain_scale)
        if asset_status:
            q = q.where(Hotel.asset_status == asset_status)

        total = await self.db.scalar(select(func.count()).select_from(q.subquery()))
        rows = await self.db.scalars(q.offset(offset).limit(limit))
        items = [HotelListItem.model_validate(h) for h in rows]
        return PagedResponse(
            data=items,
            meta=Pagination(total=total or 0, limit=limit, offset=offset, has_next=(offset + limit) < (total or 0)),
        )

    async def get_hotel(self, hotel_id: UUID) -> Hotel:
        hotel = await self.db.scalar(
            select(Hotel)
            .where(Hotel.id == hotel_id)
            .options(selectinload(Hotel.financials))
        )
        if not hotel:
            raise NotFoundError(f"Hotel {hotel_id} not found.")
        return hotel

    async def create_hotel(self, payload: HotelCreate) -> Hotel:
        slug = slugify(payload.name)
        existing = await self.db.scalar(select(Hotel).where(Hotel.slug == slug))
        if existing:
            slug = f"{slug}-{str(payload.city).lower()}"
        hotel = Hotel(**payload.model_dump(), slug=slug)
        self.db.add(hotel)
        await self.db.flush()
        return await self.get_hotel(hotel.id)

    async def update_hotel(self, hotel_id: UUID, payload: HotelUpdate) -> Hotel:
        hotel = await self.get_hotel(hotel_id)
        for field, value in payload.model_dump(exclude_none=True).items():
            setattr(hotel, field, value)
        await self.db.flush()
        return hotel

    async def delete_hotel(self, hotel_id: UUID) -> None:
        hotel = await self.get_hotel(hotel_id)
        await self.db.delete(hotel)

    async def add_financials(self, hotel_id: UUID, payload: HotelFinancialCreate) -> HotelFinancial:
        await self.get_hotel(hotel_id)
        record = HotelFinancial(hotel_id=hotel_id, **payload.model_dump())
        self.db.add(record)
        await self.db.flush()
        return record


class FlexLivingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_assets(self, city, asset_type, limit, offset) -> dict:
        q = select(FlexLivingAsset)
        if city:
            q = q.where(FlexLivingAsset.city.ilike(f"%{city}%"))
        if asset_type:
            q = q.where(FlexLivingAsset.asset_type == asset_type)
        total = await self.db.scalar(select(func.count()).select_from(q.subquery()))
        rows = list(await self.db.scalars(q.offset(offset).limit(limit)))
        return {
            "data": [{"id": str(a.id), "name": a.name, "city": a.city, "total_units": a.total_units} for a in rows],
            "meta": {"total": total, "limit": limit, "offset": offset},
        }

    async def get_asset(self, asset_id: UUID) -> dict:
        asset = await self.db.get(FlexLivingAsset, asset_id)
        if not asset:
            raise NotFoundError(f"Flex asset {asset_id} not found.")
        return {"id": str(asset.id), "name": asset.name, "city": asset.city, "asset_type": asset.asset_type}

    async def create_asset(self, payload: dict) -> dict:
        slug = slugify(payload.get("name", ""))
        asset = FlexLivingAsset(**{k: v for k, v in payload.items() if k != "slug"}, slug=slug)
        self.db.add(asset)
        await self.db.flush()
        return {"id": str(asset.id)}

    async def delete_asset(self, asset_id: UUID) -> None:
        asset = await self.db.get(FlexLivingAsset, asset_id)
        if not asset:
            raise NotFoundError(f"Flex asset {asset_id} not found.")
        await self.db.delete(asset)
