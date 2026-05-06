from decimal import Decimal
from uuid import UUID

from pydantic import field_validator

from app.schemas.common import ValoraBase


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
    hotel_id: UUID


class HotelBase(ValoraBase):
    name: str
    brand: str | None = None
    chain_scale: str | None = None
    address: str | None = None
    city: str
    state: str | None = None
    country: str = "US"
    zip_code: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    star_rating: Decimal | None = None
    total_keys: int
    meeting_space_sqft: int | None = None
    year_built: int | None = None
    year_renovated: int | None = None
    gfa_sqft: int | None = None
    asset_status: str = "operating"
    management_company: str | None = None
    franchise_agreement: str | None = None
    owner_entity: str | None = None
    meta: dict = {}


class HotelCreate(HotelBase):
    pass


class HotelUpdate(ValoraBase):
    name: str | None = None
    brand: str | None = None
    chain_scale: str | None = None
    total_keys: int | None = None
    asset_status: str | None = None
    meta: dict | None = None


class HotelRead(HotelBase):
    id: UUID
    slug: str
    financials: list[HotelFinancialRead] = []


class HotelListItem(ValoraBase):
    id: UUID
    name: str
    slug: str
    brand: str | None
    city: str
    state: str | None
    country: str
    total_keys: int
    asset_status: str
    star_rating: Decimal | None
