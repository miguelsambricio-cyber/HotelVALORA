from uuid import UUID

from python_slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictError, NotFoundError
from app.models.hotel import HotelAsset, HotelFinancial
from app.models.flex_living import FlexLivingAsset
from app.schemas.common import PagedResponse, Pagination
from app.schemas.hotel import (
    HotelAssetCreate,
    HotelAssetListItem,
    HotelAssetUpdate,
    HotelFinancialCreate,
)


class HotelAssetService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Queries ───────────────────────────────────────────────────────────────

    async def _get_or_404(self, asset_id: UUID, *, load_financials: bool = False) -> HotelAsset:
        q = select(HotelAsset).where(HotelAsset.id == asset_id)
        if load_financials:
            q = q.options(selectinload(HotelAsset.financials))
        asset = await self.db.scalar(q)
        if not asset:
            raise NotFoundError(f"Hotel asset {asset_id} not found.")
        return asset

    async def list(
        self,
        *,
        city: str | None,
        country: str | None,
        submarket: str | None,
        asset_type: str | None,
        status: str | None,
        chain_scale: str | None,
        limit: int,
        offset: int,
    ) -> PagedResponse[HotelAssetListItem]:
        q = select(HotelAsset)
        if city:
            q = q.where(HotelAsset.city.ilike(f"%{city}%"))
        if country:
            q = q.where(HotelAsset.country.ilike(f"%{country}%"))
        if submarket:
            q = q.where(HotelAsset.submarket.ilike(f"%{submarket}%"))
        if asset_type:
            q = q.where(HotelAsset.asset_type == asset_type)
        if status:
            q = q.where(HotelAsset.status == status)
        if chain_scale:
            q = q.where(HotelAsset.chain_scale == chain_scale)

        q = q.order_by(HotelAsset.asset_name)

        total = await self.db.scalar(select(func.count()).select_from(q.subquery()))
        rows = await self.db.scalars(q.offset(offset).limit(limit))
        items = [HotelAssetListItem.model_validate(h) for h in rows]
        return PagedResponse(
            data=items,
            meta=Pagination(
                total=total or 0,
                limit=limit,
                offset=offset,
                has_next=(offset + limit) < (total or 0),
            ),
        )

    async def get(self, asset_id: UUID) -> HotelAsset:
        return await self._get_or_404(asset_id, load_financials=True)

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def create(self, payload: HotelAssetCreate) -> HotelAsset:
        base_slug = slugify(payload.asset_name)
        slug = base_slug
        if await self.db.scalar(select(HotelAsset).where(HotelAsset.slug == base_slug)):
            slug = f"{base_slug}-{payload.city.lower()}"
            if await self.db.scalar(select(HotelAsset).where(HotelAsset.slug == slug)):
                raise ConflictError(
                    f"A hotel asset with slug '{slug}' already exists in {payload.city}."
                )

        asset = HotelAsset(**payload.model_dump(), slug=slug)
        self.db.add(asset)
        await self.db.flush()
        return await self._get_or_404(asset.id, load_financials=True)

    async def update(self, asset_id: UUID, payload: HotelAssetUpdate) -> HotelAsset:
        asset = await self._get_or_404(asset_id, load_financials=True)
        for field, value in payload.model_dump(exclude_none=True).items():
            setattr(asset, field, value)
        await self.db.flush()
        return asset

    async def delete(self, asset_id: UUID) -> None:
        asset = await self._get_or_404(asset_id)
        await self.db.delete(asset)

    # ── Financials ────────────────────────────────────────────────────────────

    async def add_financial(
        self, asset_id: UUID, payload: HotelFinancialCreate
    ) -> HotelFinancial:
        await self._get_or_404(asset_id)
        record = HotelFinancial(asset_id=asset_id, **payload.model_dump())
        self.db.add(record)
        await self.db.flush()
        return record

    async def list_financials(self, asset_id: UUID) -> list[HotelFinancial]:
        await self._get_or_404(asset_id)
        rows = await self.db.scalars(
            select(HotelFinancial)
            .where(HotelFinancial.asset_id == asset_id)
            .order_by(HotelFinancial.year.desc(), HotelFinancial.period)
        )
        return list(rows)


# ── FlexLiving (kept here for colocation with hotel service) ──────────────────

class FlexLivingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_assets(
        self, city: str | None, asset_type: str | None, limit: int, offset: int
    ) -> dict:
        q = select(FlexLivingAsset)
        if city:
            q = q.where(FlexLivingAsset.city.ilike(f"%{city}%"))
        if asset_type:
            q = q.where(FlexLivingAsset.asset_type == asset_type)
        total = await self.db.scalar(select(func.count()).select_from(q.subquery()))
        rows = list(await self.db.scalars(q.offset(offset).limit(limit)))
        return {
            "data": [
                {"id": str(a.id), "name": a.name, "city": a.city, "total_units": a.total_units}
                for a in rows
            ],
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
