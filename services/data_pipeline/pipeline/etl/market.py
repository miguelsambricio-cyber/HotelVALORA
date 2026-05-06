from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pipeline.cleaning.geography import normalize_city, normalize_country
from pipeline.cleaning.numeric import parse_percent, safe_float, safe_int
from pipeline.cleaning.text import clean_string
from pipeline.core.result import RowError
from pipeline.etl.base import BaseETL, alias


class MarketSnapshotImportRow(BaseModel):
    submarket: str = Field(min_length=1, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    country: str = Field(default="ES", max_length=3)
    period_year: int = Field(ge=1990, le=2040)
    period_month: int | None = Field(default=None, ge=1, le=12)
    period_type: str = "annual"

    market_occupancy: float | None = Field(default=None, ge=0, le=1)
    market_adr: float | None = Field(default=None, ge=0)
    market_revpar: float | None = Field(default=None, ge=0)
    market_supply: int | None = Field(default=None, ge=0)
    market_demand: int | None = Field(default=None, ge=0)

    revpar_growth_yoy: float | None = Field(default=None, ge=-1, le=5)
    adr_growth_yoy: float | None = Field(default=None, ge=-1, le=5)
    occupancy_change_yoy: float | None = Field(default=None, ge=-1, le=1)

    source: str = "import"


_ALIASES = {
    "year": "period_year",
    "period": "period_year",
    "month": "period_month",
    "occupancy": "market_occupancy",
    "occ": "market_occupancy",
    "adr": "market_adr",
    "revpar": "market_revpar",
    "supply": "market_supply",
    "demand": "market_demand",
    "revpar_change": "revpar_growth_yoy",
    "revpar_pct_chg": "revpar_growth_yoy",
    "revpar_%_chg": "revpar_growth_yoy",
    "adr_change": "adr_growth_yoy",
}


class MarketSnapshotETL(BaseETL[MarketSnapshotImportRow]):
    SOURCE_TYPE = "excel_market"
    ROW_SCHEMA = MarketSnapshotImportRow

    def _clean_row(self, raw: dict) -> tuple[dict, list[RowError]]:
        errors: list[RowError] = []
        r = alias(raw, _ALIASES)

        # Detect period_type from period_month presence
        period_month = safe_int(r.get("period_month"))
        period_type = "monthly" if period_month else "annual"
        if r.get("period_type"):
            period_type = str(r["period_type"]).strip().lower()

        cleaned = {
            "submarket": clean_string(r.get("submarket"), 255),
            "city": normalize_city(r.get("city")),
            "country": normalize_country(r.get("country"), "ES"),
            "period_year": safe_int(r.get("period_year")),
            "period_month": period_month,
            "period_type": period_type,
            "market_occupancy": parse_percent(r.get("market_occupancy")),
            "market_adr": safe_float(r.get("market_adr")),
            "market_revpar": safe_float(r.get("market_revpar")),
            "market_supply": safe_int(r.get("market_supply")),
            "market_demand": safe_int(r.get("market_demand")),
            "revpar_growth_yoy": parse_percent(r.get("revpar_growth_yoy")),
            "adr_growth_yoy": parse_percent(r.get("adr_growth_yoy")),
            "occupancy_change_yoy": parse_percent(r.get("occupancy_change_yoy")),
            "source": clean_string(r.get("source")) or "import",
        }

        if not cleaned["submarket"]:
            errors.append(RowError(0, "submarket is required", "submarket"))
        if not cleaned["city"]:
            errors.append(RowError(0, "city is required", "city"))
        if cleaned["period_year"] is None:
            errors.append(RowError(0, "period_year is required", "period_year"))

        return cleaned, errors

    async def _find_duplicate(self, row: MarketSnapshotImportRow) -> UUID | None:
        from app.models.market import MarketSnapshot
        stmt = select(MarketSnapshot.id).where(
            MarketSnapshot.submarket == row.submarket,
            MarketSnapshot.period_year == row.period_year,
            MarketSnapshot.source == row.source,
        )
        if row.period_month is not None:
            stmt = stmt.where(MarketSnapshot.period_month == row.period_month)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _insert_record(self, row: MarketSnapshotImportRow) -> None:
        from app.models.market import MarketSnapshot
        self.db.add(MarketSnapshot(**row.model_dump()))

    async def _update_record(self, record_id: UUID, row: MarketSnapshotImportRow) -> None:
        from app.models.market import MarketSnapshot
        result = await self.db.execute(
            select(MarketSnapshot).where(MarketSnapshot.id == record_id)
        )
        record = result.scalar_one()
        for field, value in row.model_dump(exclude_none=True).items():
            if hasattr(record, field):
                setattr(record, field, value)
