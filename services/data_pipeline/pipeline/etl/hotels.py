from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pipeline.cleaning.geography import normalize_city, normalize_country
from pipeline.cleaning.names import hotel_dedup_key, normalize_hotel_name, normalize_operator, normalize_submarket
from pipeline.cleaning.numeric import safe_float, safe_int
from pipeline.cleaning.text import (
    clean_string, make_slug,
    normalize_asset_type, normalize_chain_scale, normalize_status,
)
from pipeline.core.result import RowError
from pipeline.etl.base import BaseETL, alias


class HotelImportRow(BaseModel):
    asset_name: str = Field(min_length=1, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    country: str = Field(default="ES", max_length=3)
    keys: int = Field(gt=0, le=10_000)

    asset_type: str | None = None
    brand: str | None = None
    chain_scale: str | None = None
    operator: str | None = None
    owner: str | None = None
    address: str | None = None
    submarket: str | None = None

    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    star_rating: float | None = Field(default=None, ge=1, le=5)
    opening_year: int | None = Field(default=None, ge=1800, le=2035)
    year_renovated: int | None = Field(default=None, ge=1800, le=2035)
    gfa_sqft: int | None = Field(default=None, ge=0)
    meeting_space_sqft: int | None = Field(default=None, ge=0)

    status: str = "operating"
    franchise_agreement: str | None = None


_ALIASES = {
    "name": "asset_name",
    "hotel_name": "asset_name",
    "property_name": "asset_name",
    "total_keys": "keys",
    "rooms": "keys",
    "num_rooms": "keys",
    "number_of_rooms": "keys",
    "year_built": "opening_year",
    "year_opened": "opening_year",
    "type": "asset_type",
}


class HotelETL(BaseETL[HotelImportRow]):
    SOURCE_TYPE = "excel_hotels"
    ROW_SCHEMA = HotelImportRow

    def _clean_row(self, raw: dict) -> tuple[dict, list[RowError]]:
        errors: list[RowError] = []
        r = alias(raw, _ALIASES)

        cleaned = {
            "asset_name": normalize_hotel_name(r.get("asset_name")) or clean_string(r.get("asset_name"), 255),
            "city": normalize_city(r.get("city")),
            "country": normalize_country(r.get("country"), "ES"),
            "keys": safe_int(r.get("keys")),
            "asset_type": normalize_asset_type(r.get("asset_type")),
            "brand": clean_string(r.get("brand"), 255),
            "chain_scale": normalize_chain_scale(r.get("chain_scale")),
            "operator": normalize_operator(r.get("operator")),
            "owner": clean_string(r.get("owner"), 255),
            "address": clean_string(r.get("address"), 500),
            "submarket": normalize_submarket(r.get("submarket")),
            "latitude": safe_float(r.get("latitude")),
            "longitude": safe_float(r.get("longitude")),
            "star_rating": safe_float(r.get("star_rating")),
            "opening_year": safe_int(r.get("opening_year")),
            "year_renovated": safe_int(r.get("year_renovated")),
            "gfa_sqft": safe_int(r.get("gfa_sqft")),
            "meeting_space_sqft": safe_int(r.get("meeting_space_sqft")),
            "status": normalize_status(r.get("status"), "operating"),
            "franchise_agreement": clean_string(r.get("franchise_agreement"), 255),
        }

        if not cleaned["asset_name"]:
            errors.append(RowError(0, "asset_name is required", "asset_name"))
        if not cleaned["city"]:
            errors.append(RowError(0, "city is required", "city"))
        if cleaned["keys"] is None:
            errors.append(RowError(0, "keys (room count) is required", "keys"))

        return cleaned, errors

    async def _find_duplicate(self, row: HotelImportRow) -> UUID | None:
        from app.models.hotel import HotelAsset
        # Fetch all hotels in the same city and compare dedup keys in Python.
        # This handles accent and prefix variations that exact SQL == misses
        # (e.g. "Gran Hotel Miramar" == "Hotel Miramar", "Meliá" == "Melia").
        stmt = select(HotelAsset.id, HotelAsset.asset_name).where(
            HotelAsset.city == row.city,
        )
        result = await self.db.execute(stmt)
        incoming_key = hotel_dedup_key(row.asset_name, row.city)
        for existing_id, existing_name in result.fetchall():
            if hotel_dedup_key(existing_name, row.city) == incoming_key:
                return existing_id
        return None

    async def _insert_record(self, row: HotelImportRow) -> None:
        from app.models.hotel import HotelAsset
        slug = make_slug(row.asset_name)
        # Ensure slug uniqueness by appending city if needed
        existing = await self.db.execute(
            select(HotelAsset.id).where(HotelAsset.slug == slug)
        )
        if existing.scalar_one_or_none():
            slug = make_slug(f"{row.asset_name} {row.city}")

        self.db.add(HotelAsset(
            asset_name=row.asset_name,
            slug=slug,
            city=row.city,
            country=row.country,
            keys=row.keys,
            asset_type=row.asset_type,
            brand=row.brand,
            chain_scale=row.chain_scale,
            operator=row.operator,
            owner=row.owner,
            address=row.address,
            submarket=row.submarket,
            latitude=row.latitude,
            longitude=row.longitude,
            star_rating=row.star_rating,
            opening_year=row.opening_year,
            year_renovated=row.year_renovated,
            gfa_sqft=row.gfa_sqft,
            meeting_space_sqft=row.meeting_space_sqft,
            status=row.status,
            franchise_agreement=row.franchise_agreement,
        ))

    async def _update_record(self, record_id: UUID, row: HotelImportRow) -> None:
        from app.models.hotel import HotelAsset
        result = await self.db.execute(
            select(HotelAsset).where(HotelAsset.id == record_id)
        )
        hotel = result.scalar_one()
        update_fields = row.model_dump(exclude_none=True, exclude={"asset_name", "city"})
        for field, value in update_fields.items():
            if hasattr(hotel, field):
                setattr(hotel, field, value)
