import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Valuation(BaseModel):
    __tablename__ = "valuations"

    # Asset FK (either hotel or flex_living, not both)
    hotel_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hotel_assets.id", ondelete="SET NULL")
    )
    flex_asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("flex_living_assets.id", ondelete="SET NULL")
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    valuation_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # dcf | income_cap | sales_comp | replacement_cost
    status: Mapped[str] = mapped_column(
        String(50), default="draft", nullable=False
    )  # draft | review | final | archived

    # Valuation date & currency
    effective_date: Mapped[str] = mapped_column(String(10), nullable=False)  # ISO date
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)

    # Results
    concluded_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    value_per_key: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    implied_cap_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))

    # DCF assumptions (stored as JSON for full flexibility)
    assumptions: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # Full DCF cash flow schedule & sensitivity table
    cash_flows: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    sensitivity: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    notes: Mapped[str | None] = mapped_column(Text)

    hotel: Mapped["HotelAsset"] = relationship(back_populates="valuations")  # noqa: F821
    flex_asset: Mapped["FlexLivingAsset"] = relationship(back_populates="valuations")  # noqa: F821
    underwriting: Mapped["Underwriting"] = relationship(
        back_populates="valuation", uselist=False, cascade="all, delete-orphan"
    )


class Underwriting(BaseModel):
    __tablename__ = "underwritings"

    valuation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("valuations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    # Stabilized year assumptions
    projection_years: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    stabilized_occupancy: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    stabilized_adr: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    stabilized_revpar: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    revenue_growth_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    expense_growth_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    noi_margin: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    cap_rate_entry: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    cap_rate_exit: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    discount_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    ltv_ratio: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    debt_service_coverage: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    irr: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    equity_multiple: Mapped[Decimal | None] = mapped_column(Numeric(6, 3))

    detail: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    valuation: Mapped["Valuation"] = relationship(back_populates="underwriting")
