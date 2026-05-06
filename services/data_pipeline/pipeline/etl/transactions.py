from __future__ import annotations

from uuid import UUID

import pandas as pd
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pipeline.cleaning.geography import normalize_city, normalize_country
from pipeline.cleaning.numeric import parse_currency, parse_percent, safe_float, safe_int
from pipeline.cleaning.text import clean_string, normalize_chain_scale
from pipeline.core.result import RowError
from pipeline.etl.base import BaseETL, alias


class TransactionImportRow(BaseModel):
    property_name: str = Field(min_length=1, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    country: str = Field(default="ES", max_length=3)
    transaction_date: str  # ISO YYYY-MM-DD

    transaction_price: float | None = Field(default=None, ge=0)
    price_per_key: float | None = Field(default=None, ge=0)
    cap_rate: float | None = Field(default=None, ge=0, le=0.5)
    total_keys: int | None = Field(default=None, ge=1, le=50_000)

    brand: str | None = None
    chain_scale: str | None = None
    property_type: str | None = None
    star_rating: float | None = Field(default=None, ge=1, le=5)
    year_built: int | None = Field(default=None, ge=1800, le=2035)

    buyer: str | None = None
    seller: str | None = None
    transaction_type: str | None = None

    occupancy_at_sale: float | None = Field(default=None, ge=0, le=1)
    adr_at_sale: float | None = Field(default=None, ge=0)
    revpar_at_sale: float | None = Field(default=None, ge=0)
    noi_at_sale: float | None = None

    source: str = "import"
    source_id: str | None = None
    notes: str | None = None


_ALIASES = {
    "sale_date": "transaction_date",
    "close_date": "transaction_date",
    "date": "transaction_date",
    "sale_price": "transaction_price",
    "price": "transaction_price",
    "price_per_room": "price_per_key",
    "num_rooms": "total_keys",
    "number_of_rooms": "total_keys",
    "rooms": "total_keys",
    "name": "property_name",
}


class TransactionETL(BaseETL[TransactionImportRow]):
    SOURCE_TYPE = "excel_transactions"
    ROW_SCHEMA = TransactionImportRow

    def _clean_row(self, raw: dict) -> tuple[dict, list[RowError]]:
        errors: list[RowError] = []
        r = alias(raw, _ALIASES)

        # Normalize date
        raw_date = r.get("transaction_date")
        transaction_date = None
        if raw_date is not None:
            try:
                transaction_date = pd.to_datetime(str(raw_date)).strftime("%Y-%m-%d")
            except Exception:
                errors.append(RowError(
                    row_number=0,
                    column="transaction_date",
                    message=f"Cannot parse date: {raw_date!r}",
                    raw_value=raw_date,
                ))

        cleaned = {
            "property_name": clean_string(r.get("property_name"), 255),
            "city": normalize_city(r.get("city")),
            "country": normalize_country(r.get("country"), "ES"),
            "transaction_date": transaction_date,
            "transaction_price": parse_currency(r.get("transaction_price")),
            "price_per_key": parse_currency(r.get("price_per_key")),
            "cap_rate": parse_percent(r.get("cap_rate")),
            "total_keys": safe_int(r.get("total_keys")),
            "brand": clean_string(r.get("brand"), 255),
            "chain_scale": normalize_chain_scale(r.get("chain_scale")),
            "property_type": clean_string(r.get("property_type"), 100),
            "star_rating": safe_float(r.get("star_rating")),
            "year_built": safe_int(r.get("year_built")),
            "buyer": clean_string(r.get("buyer"), 255),
            "seller": clean_string(r.get("seller"), 255),
            "transaction_type": clean_string(r.get("transaction_type"), 100),
            "occupancy_at_sale": parse_percent(r.get("occupancy_at_sale")),
            "adr_at_sale": safe_float(r.get("adr_at_sale")),
            "revpar_at_sale": safe_float(r.get("revpar_at_sale")),
            "noi_at_sale": parse_currency(r.get("noi_at_sale")),
            "source": clean_string(r.get("source")) or "import",
            "source_id": clean_string(r.get("source_id"), 255),
            "notes": clean_string(r.get("notes")),
        }

        if not cleaned["property_name"]:
            errors.append(RowError(0, "property_name is required", "property_name"))
        if not cleaned["city"]:
            errors.append(RowError(0, "city is required", "city"))
        if not cleaned["transaction_date"]:
            errors.append(RowError(0, "transaction_date is required", "transaction_date"))

        return cleaned, errors

    async def _find_duplicate(self, row: TransactionImportRow) -> UUID | None:
        from app.models.transaction import ComparableTransaction
        stmt = select(ComparableTransaction.id).where(
            ComparableTransaction.property_name == row.property_name,
            ComparableTransaction.city == row.city,
            ComparableTransaction.transaction_date == row.transaction_date,
        )
        if row.transaction_price is not None:
            stmt = stmt.where(
                ComparableTransaction.transaction_price == row.transaction_price
            )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _insert_record(self, row: TransactionImportRow) -> None:
        from app.models.transaction import ComparableTransaction
        self.db.add(ComparableTransaction(**row.model_dump()))

    async def _update_record(self, record_id: UUID, row: TransactionImportRow) -> None:
        from app.models.transaction import ComparableTransaction
        result = await self.db.execute(
            select(ComparableTransaction).where(ComparableTransaction.id == record_id)
        )
        record = result.scalar_one()
        for field, value in row.model_dump(exclude_none=True).items():
            if hasattr(record, field):
                setattr(record, field, value)
