from decimal import Decimal

from sqlalchemy import Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class Market(BaseModel):
    __tablename__ = "markets"

    country: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    submarket: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    market_tier: Mapped[str | None] = mapped_column(
        String(50)
    )  # tier_1 | tier_2 | tier_3 | resort_destination
    tourism_demand: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    seasonality_index: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 4)
    )  # 0.0 (flat) → 1.0 (highly seasonal)

    # Supply
    total_supply_keys: Mapped[int | None] = mapped_column(Integer)
    pipeline_keys: Mapped[int | None] = mapped_column(Integer)
    costar_submarket_id: Mapped[str | None] = mapped_column(String(100), unique=True)

    meta: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)


class MarketSnapshot(BaseModel):
    __tablename__ = "market_snapshots"

    submarket: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    country: Mapped[str] = mapped_column(String(100), default="ES", nullable=False)

    # Period
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int | None] = mapped_column(Integer)
    period_type: Mapped[str] = mapped_column(
        String(20), default="annual"
    )  # annual | monthly | ytd

    # Market KPIs
    market_occupancy: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    market_adr: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    market_revpar: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    market_supply: Mapped[int | None] = mapped_column(Integer)
    market_demand: Mapped[int | None] = mapped_column(Integer)

    # YoY growth
    revpar_growth_yoy: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    adr_growth_yoy: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    occupancy_change_yoy: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))

    source: Mapped[str | None] = mapped_column(String(100))
    meta: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
