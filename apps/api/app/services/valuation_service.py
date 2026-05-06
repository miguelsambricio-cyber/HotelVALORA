from decimal import Decimal
from uuid import UUID

import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.models.valuation import Underwriting, Valuation
from app.schemas.valuation import DCFAssumptions, UnderwritingCreate, ValuationCreate, ValuationUpdate


class ValuationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_valuation(self, payload: ValuationCreate) -> Valuation:
        assumptions = (
            payload.assumptions.model_dump()
            if isinstance(payload.assumptions, DCFAssumptions)
            else payload.assumptions
        )
        valuation = Valuation(
            name=payload.name,
            hotel_id=payload.hotel_id,
            flex_asset_id=payload.flex_asset_id,
            valuation_type=payload.valuation_type,
            effective_date=payload.effective_date,
            currency=payload.currency,
            assumptions=assumptions,
            notes=payload.notes,
        )
        self.db.add(valuation)
        await self.db.flush()
        return await self.get_valuation(valuation.id)

    async def get_valuation(self, valuation_id: UUID) -> Valuation:
        v = await self.db.scalar(
            select(Valuation)
            .where(Valuation.id == valuation_id)
            .options(selectinload(Valuation.underwriting))
        )
        if not v:
            raise NotFoundError(f"Valuation {valuation_id} not found.")
        return v

    async def update_valuation(self, valuation_id: UUID, payload: ValuationUpdate) -> Valuation:
        v = await self.get_valuation(valuation_id)
        for field, value in payload.model_dump(exclude_none=True).items():
            setattr(v, field, value)
        await self.db.flush()
        return v

    async def run_dcf(self, valuation_id: UUID) -> Valuation:
        v = await self.get_valuation(valuation_id)
        assumptions = v.assumptions
        cash_flows, npv = self._compute_dcf(assumptions)
        v.cash_flows = cash_flows
        v.concluded_value = Decimal(str(round(npv, 2)))
        if v.hotel_id:
            from app.models.hotel import Hotel
            hotel = await self.db.get(Hotel, v.hotel_id)
            if hotel and hotel.total_keys:
                v.value_per_key = Decimal(str(round(npv / hotel.total_keys, 2)))
        await self.db.flush()
        return v

    def _compute_dcf(self, assumptions: dict) -> tuple[list[dict], float]:
        years = assumptions.get("projection_years", 10)
        discount_rate = float(assumptions.get("discount_rate", 0.10))
        terminal_cap_rate = float(assumptions.get("terminal_cap_rate", 0.07))
        occupancy = float(assumptions.get("stabilized_occupancy", 0.70))
        adr = float(assumptions.get("stabilized_adr", 150.0))
        total_keys = int(assumptions.get("total_keys", 100))
        revenue_growth = float(assumptions.get("revenue_growth_rates", [0.03])[0] if isinstance(
            assumptions.get("revenue_growth_rates"), list) else 0.03)
        noi_margin = float(assumptions.get("noi_margin", 0.35))
        capex_reserve_pct = float(assumptions.get("capex_reserve_pct", 0.04))

        cash_flows = []
        npv = 0.0
        base_noi = total_keys * 365 * occupancy * adr * noi_margin

        for year in range(1, years + 1):
            noi = base_noi * ((1 + revenue_growth) ** year)
            capex = noi * capex_reserve_pct
            fcf = noi - capex
            discount_factor = 1 / ((1 + discount_rate) ** year)
            pv = fcf * discount_factor
            npv += pv
            cash_flows.append({
                "year": year,
                "noi": round(noi, 2),
                "capex_reserve": round(capex, 2),
                "free_cash_flow": round(fcf, 2),
                "discount_factor": round(discount_factor, 6),
                "pv": round(pv, 2),
            })

        # Terminal value (Gordon Growth / cap rate exit)
        terminal_noi = base_noi * ((1 + revenue_growth) ** (years + 1))
        terminal_value = terminal_noi / terminal_cap_rate
        tv_pv = terminal_value / ((1 + discount_rate) ** years)
        npv += tv_pv

        cash_flows.append({
            "year": f"Terminal (Y{years})",
            "terminal_noi": round(terminal_noi, 2),
            "terminal_value": round(terminal_value, 2),
            "pv": round(tv_pv, 2),
        })

        return cash_flows, npv

    async def sensitivity_table(
        self,
        valuation_id: UUID,
        discount_rates: list[float],
        exit_cap_rates: list[float],
    ) -> dict:
        v = await self.get_valuation(valuation_id)
        assumptions = v.assumptions.copy()
        table: dict[str, dict[str, float]] = {}

        for dr in discount_rates:
            table[str(dr)] = {}
            for cr in exit_cap_rates:
                assumptions["discount_rate"] = dr
                assumptions["terminal_cap_rate"] = cr
                _, npv = self._compute_dcf(assumptions)
                table[str(dr)][str(cr)] = round(npv, 2)

        v.sensitivity = table
        await self.db.flush()
        return table

    async def create_underwriting(
        self, valuation_id: UUID, payload: UnderwritingCreate
    ) -> Underwriting:
        v = await self.get_valuation(valuation_id)
        uw = Underwriting(valuation_id=valuation_id, **payload.model_dump())
        self.db.add(uw)
        await self.db.flush()
        return uw

    async def get_underwriting(self, valuation_id: UUID) -> Underwriting:
        uw = await self.db.scalar(
            select(Underwriting).where(Underwriting.valuation_id == valuation_id)
        )
        if not uw:
            raise NotFoundError(f"Underwriting for valuation {valuation_id} not found.")
        return uw
