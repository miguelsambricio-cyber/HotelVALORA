from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class DCFInput(BaseModel):
    total_keys: int
    projection_years: int = 10
    discount_rate: float = Field(gt=0, lt=1)
    terminal_cap_rate: float = Field(gt=0, lt=1)
    stabilized_occupancy: float = Field(gt=0, le=1)
    stabilized_adr: float = Field(gt=0)
    revenue_growth_rates: list[float]     # length == projection_years
    expense_ratio: float = 0.65           # total expenses / total revenue
    capex_reserve_pct: float = 0.04
    management_fee_pct: float = 0.03
    franchise_fee_pct: float = 0.05
    currency: str = "USD"


class CashFlowYear(BaseModel):
    year: int
    gross_revenue: float
    total_expenses: float
    noi: float
    capex_reserve: float
    free_cash_flow: float
    discount_factor: float
    pv_fcf: float


class TerminalValue(BaseModel):
    terminal_noi: float
    terminal_value: float
    pv_terminal: float


class DCFResult(BaseModel):
    npv: float
    value_per_key: float
    implied_cap_rate: float
    equity_value: float | None = None
    cash_flows: list[CashFlowYear]
    terminal_value: TerminalValue
    assumptions: DCFInput
