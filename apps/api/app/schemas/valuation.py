from decimal import Decimal
from uuid import UUID

from app.schemas.common import ValoraBase


class DCFAssumptions(ValoraBase):
    projection_years: int = 10
    discount_rate: Decimal
    terminal_cap_rate: Decimal
    revenue_growth_rates: list[Decimal]      # one per projection year
    expense_growth_rates: list[Decimal]
    stabilized_occupancy: Decimal
    stabilized_adr: Decimal
    capex_reserve_pct: Decimal = Decimal("0.04")
    management_fee_pct: Decimal = Decimal("0.03")
    franchise_fee_pct: Decimal = Decimal("0.05")
    debt_amount: Decimal | None = None
    interest_rate: Decimal | None = None
    amortization_years: int | None = None


class UnderwritingCreate(ValoraBase):
    projection_years: int = 10
    stabilized_occupancy: Decimal | None = None
    stabilized_adr: Decimal | None = None
    revenue_growth_rate: Decimal | None = None
    expense_growth_rate: Decimal | None = None
    noi_margin: Decimal | None = None
    cap_rate_entry: Decimal | None = None
    cap_rate_exit: Decimal | None = None
    discount_rate: Decimal | None = None
    ltv_ratio: Decimal | None = None
    detail: dict = {}


class UnderwritingRead(UnderwritingCreate):
    id: UUID
    valuation_id: UUID
    debt_service_coverage: Decimal | None = None
    irr: Decimal | None = None
    equity_multiple: Decimal | None = None


class ValuationCreate(ValoraBase):
    name: str
    hotel_id: UUID | None = None
    flex_asset_id: UUID | None = None
    valuation_type: str
    effective_date: str
    currency: str = "USD"
    assumptions: DCFAssumptions | dict = {}
    notes: str | None = None


class ValuationUpdate(ValoraBase):
    name: str | None = None
    status: str | None = None
    concluded_value: Decimal | None = None
    notes: str | None = None
    assumptions: dict | None = None


class ValuationRead(ValoraBase):
    id: UUID
    name: str
    hotel_id: UUID | None
    flex_asset_id: UUID | None
    valuation_type: str
    status: str
    effective_date: str
    currency: str
    concluded_value: Decimal | None
    value_per_key: Decimal | None
    implied_cap_rate: Decimal | None
    assumptions: dict
    cash_flows: list
    sensitivity: dict
    notes: str | None
    underwriting: UnderwritingRead | None = None
