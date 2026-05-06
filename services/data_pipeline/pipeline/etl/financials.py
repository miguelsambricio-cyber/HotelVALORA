from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pipeline.cleaning.numeric import parse_percent, safe_float, safe_int
from pipeline.cleaning.text import clean_string
from pipeline.core.result import RowError
from pipeline.etl.base import BaseETL, alias


class FinancialImportRow(BaseModel):
    asset_id: UUID
    year: int = Field(ge=1950, le=2040)
    period: str = "annual"

    rooms_revenue: float | None = Field(default=None, ge=0)
    fb_revenue: float | None = Field(default=None, ge=0)
    other_revenue: float | None = Field(default=None, ge=0)
    total_revenue: float | None = Field(default=None, ge=0)

    occupancy_rate: float | None = Field(default=None, ge=0, le=1)
    adr: float | None = Field(default=None, ge=0)
    revpar: float | None = Field(default=None, ge=0)

    total_expenses: float | None = Field(default=None, ge=0)
    ebitda: float | None = None
    noi: float | None = None
    noi_margin: float | None = Field(default=None, ge=-1, le=1)

    source: str = "import"

    @model_validator(mode="after")
    def validate_revenue_consistency(self) -> "FinancialImportRow":
        if self.revpar and self.adr and self.occupancy_rate:
            implied = round(self.adr * self.occupancy_rate, 2)
            if abs(implied - self.revpar) > self.adr * 0.05:
                pass  # Warn only — do not block; data may be from different sources
        return self


_ALIASES = {
    "revenue": "total_revenue",
    "room_revenue": "rooms_revenue",
    "f&b_revenue": "fb_revenue",
    "fb": "fb_revenue",
    "occ": "occupancy_rate",
    "occupancy": "occupancy_rate",
    "net_operating_income": "noi",
}


class FinancialETL(BaseETL[FinancialImportRow]):
    SOURCE_TYPE = "excel_financials"
    ROW_SCHEMA = FinancialImportRow

    def __init__(self, db: AsyncSession, asset_id: UUID) -> None:
        super().__init__(db)
        self.asset_id = asset_id

    def _clean_row(self, raw: dict) -> tuple[dict, list[RowError]]:
        errors: list[RowError] = []
        r = alias(raw, _ALIASES)

        raw_year = safe_int(r.get("year"))

        cleaned = {
            "asset_id": self.asset_id,
            "year": raw_year,
            "period": clean_string(r.get("period")) or "annual",
            "rooms_revenue": safe_float(r.get("rooms_revenue")),
            "fb_revenue": safe_float(r.get("fb_revenue")),
            "other_revenue": safe_float(r.get("other_revenue")),
            "total_revenue": safe_float(r.get("total_revenue")),
            "occupancy_rate": parse_percent(r.get("occupancy_rate")),
            "adr": safe_float(r.get("adr")),
            "revpar": safe_float(r.get("revpar")),
            "total_expenses": safe_float(r.get("total_expenses")),
            "ebitda": safe_float(r.get("ebitda")),
            "noi": safe_float(r.get("noi")),
            "noi_margin": parse_percent(r.get("noi_margin")),
            "source": clean_string(r.get("source")) or "import",
        }

        if raw_year is None:
            errors.append(RowError(0, "year is required", "year"))
        if cleaned["total_revenue"] is None and cleaned["noi"] is None:
            errors.append(RowError(0, "At least one of total_revenue or noi is required"))

        return cleaned, errors

    async def _find_duplicate(self, row: FinancialImportRow) -> UUID | None:
        from app.models.hotel import HotelFinancial
        stmt = select(HotelFinancial.id).where(
            HotelFinancial.asset_id == row.asset_id,
            HotelFinancial.year == row.year,
            HotelFinancial.period == row.period,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _insert_record(self, row: FinancialImportRow) -> None:
        from app.models.hotel import HotelFinancial
        self.db.add(HotelFinancial(**row.model_dump()))

    async def _update_record(self, record_id: UUID, row: FinancialImportRow) -> None:
        from app.models.hotel import HotelFinancial
        result = await self.db.execute(
            select(HotelFinancial).where(HotelFinancial.id == record_id)
        )
        record = result.scalar_one()
        for field, value in row.model_dump(exclude_none=True, exclude={"asset_id", "year", "period"}).items():
            if hasattr(record, field):
                setattr(record, field, value)
