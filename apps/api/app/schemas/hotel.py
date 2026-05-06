from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import field_validator

from app.schemas.common import ValoraBase

_VALID_STATUSES = frozenset({"operating", "pipeline", "under_renovation", "distressed"})
_VALID_ASSET_TYPES = frozenset(
    {"full_service", "select_service", "extended_stay", "resort", "boutique", "apart_hotel"}
)


# ── Financials ────────────────────────────────────────────────────────────────

class HotelFinancialBase(ValoraBase):
    year: int
    period: str = "annual"
    rooms_revenue: Decimal | None = None
    fb_revenue: Decimal | None = None
    other_revenue: Decimal | None = None
    total_revenue: Decimal | None = None
    occupancy_rate: Decimal | None = None
    adr: Decimal | None = None
    revpar: Decimal | None = None
    total_expenses: Decimal | None = None
    ebitda: Decimal | None = None
    noi: Decimal | None = None
    noi_margin: Decimal | None = None
    source: str | None = None


class HotelFinancialCreate(HotelFinancialBase):
    pass


class HotelFinancialRead(HotelFinancialBase):
    id: UUID
    asset_id: UUID
    created_at: datetime
    updated_at: datetime


# ── HotelAsset ────────────────────────────────────────────────────────────────

class HotelAssetBase(ValoraBase):
    asset_name: str
    asset_type: str | None = None
    brand: str | None = None
    chain_scale: str | None = None
    operator: str | None = None
    owner: str | None = None
    address: str | None = None
    city: str
    country: str = "ES"
    submarket: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    keys: int
    star_rating: Decimal | None = None
    meeting_space_sqft: int | None = None
    opening_year: int | None = None
    year_renovated: int | None = None
    gfa_sqft: int | None = None
    status: str = "operating"
    franchise_agreement: str | None = None
    meta: dict = {}

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in _VALID_STATUSES:
            raise ValueError(f"status must be one of {sorted(_VALID_STATUSES)}")
        return v

    @field_validator("asset_type")
    @classmethod
    def validate_asset_type(cls, v: str | None) -> str | None:
        if v is not None and v not in _VALID_ASSET_TYPES:
            raise ValueError(f"asset_type must be one of {sorted(_VALID_ASSET_TYPES)}")
        return v


class HotelAssetCreate(HotelAssetBase):
    pass


class HotelAssetUpdate(ValoraBase):
    asset_name: str | None = None
    asset_type: str | None = None
    brand: str | None = None
    chain_scale: str | None = None
    operator: str | None = None
    owner: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    submarket: str | None = None
    keys: int | None = None
    star_rating: Decimal | None = None
    meeting_space_sqft: int | None = None
    opening_year: int | None = None
    year_renovated: int | None = None
    gfa_sqft: int | None = None
    status: str | None = None
    franchise_agreement: str | None = None
    meta: dict | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is not None and v not in _VALID_STATUSES:
            raise ValueError(f"status must be one of {sorted(_VALID_STATUSES)}")
        return v

    @field_validator("asset_type")
    @classmethod
    def validate_asset_type(cls, v: str | None) -> str | None:
        if v is not None and v not in _VALID_ASSET_TYPES:
            raise ValueError(f"asset_type must be one of {sorted(_VALID_ASSET_TYPES)}")
        return v


class HotelAssetRead(HotelAssetBase):
    id: UUID
    slug: str
    created_at: datetime
    updated_at: datetime
    financials: list[HotelFinancialRead] = []


class HotelAssetListItem(ValoraBase):
    id: UUID
    asset_name: str
    slug: str
    asset_type: str | None
    brand: str | None
    city: str
    country: str
    submarket: str | None
    keys: int
    status: str
    star_rating: Decimal | None
    operator: str | None
    opening_year: int | None
