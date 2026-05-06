from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.market import MarketSnapshot
from app.models.transaction import ComparableTransaction


class MarketService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_snapshots(self, city, submarket, year, limit, offset) -> dict:
        q = select(MarketSnapshot)
        if city:
            q = q.where(MarketSnapshot.city.ilike(f"%{city}%"))
        if submarket:
            q = q.where(MarketSnapshot.submarket.ilike(f"%{submarket}%"))
        if year:
            q = q.where(MarketSnapshot.period_year == year)
        total = await self.db.scalar(select(func.count()).select_from(q.subquery()))
        rows = list(await self.db.scalars(q.offset(offset).limit(limit)))
        return {
            "data": [
                {
                    "id": str(s.id),
                    "submarket": s.submarket,
                    "city": s.city,
                    "period_year": s.period_year,
                    "market_occupancy": float(s.market_occupancy) if s.market_occupancy else None,
                    "market_adr": float(s.market_adr) if s.market_adr else None,
                    "market_revpar": float(s.market_revpar) if s.market_revpar else None,
                    "revpar_growth_yoy": float(s.revpar_growth_yoy) if s.revpar_growth_yoy else None,
                }
                for s in rows
            ],
            "meta": {"total": total, "limit": limit, "offset": offset},
        }

    async def get_trends(self, city: str, years: int) -> dict:
        from sqlalchemy import desc
        q = (
            select(MarketSnapshot)
            .where(MarketSnapshot.city.ilike(f"%{city}%"))
            .where(MarketSnapshot.period_type == "annual")
            .order_by(desc(MarketSnapshot.period_year))
            .limit(years)
        )
        rows = list(await self.db.scalars(q))
        return {
            "city": city,
            "years": [
                {
                    "year": s.period_year,
                    "occupancy": float(s.market_occupancy) if s.market_occupancy else None,
                    "adr": float(s.market_adr) if s.market_adr else None,
                    "revpar": float(s.market_revpar) if s.market_revpar else None,
                    "revpar_growth_yoy": float(s.revpar_growth_yoy) if s.revpar_growth_yoy else None,
                }
                for s in rows
            ],
        }

    async def get_supply_pipeline(self, city: str | None) -> dict:
        from app.models.market import MarketSubmarket
        q = select(MarketSubmarket)
        if city:
            q = q.where(MarketSubmarket.city.ilike(f"%{city}%"))
        rows = list(await self.db.scalars(q))
        return {
            "data": [
                {
                    "id": str(s.id),
                    "name": s.name,
                    "city": s.city,
                    "total_supply": s.total_supply_keys,
                    "pipeline": s.pipeline_keys,
                }
                for s in rows
            ]
        }


class ComparableService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_comps(
        self, city, chain_scale, min_keys, max_keys, sale_year_from, sale_year_to, limit, offset
    ) -> dict:
        q = select(ComparableTransaction)
        if city:
            q = q.where(ComparableTransaction.city.ilike(f"%{city}%"))
        if chain_scale:
            q = q.where(ComparableTransaction.chain_scale == chain_scale)
        if min_keys:
            q = q.where(ComparableTransaction.total_keys >= min_keys)
        if max_keys:
            q = q.where(ComparableTransaction.total_keys <= max_keys)
        if sale_year_from:
            q = q.where(ComparableTransaction.sale_date >= f"{sale_year_from}-01-01")
        if sale_year_to:
            q = q.where(ComparableTransaction.sale_date <= f"{sale_year_to}-12-31")

        total = await self.db.scalar(select(func.count()).select_from(q.subquery()))
        rows = list(await self.db.scalars(q.offset(offset).limit(limit)))
        return {
            "data": [
                {
                    "id": str(c.id),
                    "property_name": c.property_name,
                    "city": c.city,
                    "total_keys": c.total_keys,
                    "sale_date": c.sale_date,
                    "sale_price": float(c.sale_price) if c.sale_price else None,
                    "price_per_key": float(c.price_per_key) if c.price_per_key else None,
                    "cap_rate": float(c.cap_rate) if c.cap_rate else None,
                }
                for c in rows
            ],
            "meta": {"total": total, "limit": limit, "offset": offset},
        }

    async def create_comp(self, payload: dict) -> dict:
        comp = ComparableTransaction(**payload)
        self.db.add(comp)
        await self.db.flush()
        return {"id": str(comp.id)}

    async def get_comp(self, comp_id) -> dict:
        comp = await self.db.get(ComparableTransaction, comp_id)
        if not comp:
            raise NotFoundError(f"Comparable {comp_id} not found.")
        return {"id": str(comp.id), "property_name": comp.property_name, "city": comp.city}

    async def delete_comp(self, comp_id) -> None:
        comp = await self.db.get(ComparableTransaction, comp_id)
        if not comp:
            raise NotFoundError(f"Comparable {comp_id} not found.")
        await self.db.delete(comp)
