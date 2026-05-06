import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class FinancialScenario(BaseModel):
    __tablename__ = "financial_scenarios"

    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("hotel_assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    scenario_name: Mapped[str] = mapped_column(String(255), nullable=False)
    holding_period: Mapped[int] = mapped_column(Integer, nullable=False)  # years

    # Core underwriting assumptions
    exit_cap_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    discount_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    occupancy: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))  # 0.00–1.00
    adr: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    revpar: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))

    # Extended assumptions
    entry_cap_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    revenue_growth_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    expense_growth_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    noi_margin: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    acquisition_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    equity_investment: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))

    currency: Mapped[str] = mapped_column(String(3), default="EUR", nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="draft", nullable=False
    )  # draft | review | final | archived
    notes: Mapped[str | None] = mapped_column(Text)

    asset: Mapped["HotelAsset"] = relationship(  # noqa: F821
        back_populates="scenarios"
    )
    dcf_outputs: Mapped[list["DCFModelOutput"]] = relationship(
        back_populates="scenario", cascade="all, delete-orphan"
    )


class DCFModelOutput(BaseModel):
    __tablename__ = "dcf_model_outputs"

    scenario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("financial_scenarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Core returns
    irr: Mapped[Decimal | None] = mapped_column(Numeric(8, 6))
    npv: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    equity_multiple: Mapped[Decimal | None] = mapped_column(Numeric(8, 4))
    terminal_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    stabilized_noi: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))

    # Extended return metrics
    cash_on_cash_return: Mapped[Decimal | None] = mapped_column(Numeric(8, 6))
    dscr: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    total_return: Mapped[Decimal | None] = mapped_column(Numeric(8, 6))

    # Full year-by-year cash flow schedule
    cash_flows: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # Sensitivity matrix (exit_cap × discount_rate grid)
    sensitivity: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    scenario: Mapped["FinancialScenario"] = relationship(back_populates="dcf_outputs")
