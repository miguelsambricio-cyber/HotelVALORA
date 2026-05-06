import uuid
from decimal import Decimal

from sqlalchemy import Integer, Numeric, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class HotelAsset(BaseModel):
    __tablename__ = "hotel_assets"

    asset_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    asset_type: Mapped[str | None] = mapped_column(
        String(100)
    )  # full_service | select_service | extended_stay | resort | boutique

    # Identity
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    brand: Mapped[str | None] = mapped_column(String(255))
    chain_scale: Mapped[str | None] = mapped_column(
        String(100)
    )  # luxury | upscale | select | economy
    operator: Mapped[str | None] = mapped_column(String(255))
    owner: Mapped[str | None] = mapped_column(String(255))

    # Location
    address: Mapped[str | None] = mapped_column(String(500))
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False, default="ES")
    submarket: Mapped[str | None] = mapped_column(String(255), index=True)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))

    # Property
    keys: Mapped[int] = mapped_column(Integer, nullable=False)
    star_rating: Mapped[Decimal | None] = mapped_column(Numeric(2, 1))
    meeting_space_sqft: Mapped[int | None] = mapped_column(Integer)
    opening_year: Mapped[int | None] = mapped_column(Integer)
    year_renovated: Mapped[int | None] = mapped_column(Integer)
    gfa_sqft: Mapped[int | None] = mapped_column(Integer)

    # Operational
    status: Mapped[str] = mapped_column(
        String(50), default="operating", nullable=False
    )  # operating | pipeline | under_renovation | distressed
    franchise_agreement: Mapped[str | None] = mapped_column(String(255))

    meta: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # Relationships
    financials: Mapped[list["HotelFinancial"]] = relationship(
        back_populates="asset", cascade="all, delete-orphan"
    )
    valuations: Mapped[list["Valuation"]] = relationship(  # noqa: F821
        back_populates="hotel", cascade="all, delete-orphan"
    )
    transactions: Mapped[list["ComparableTransaction"]] = relationship(  # noqa: F821
        back_populates="asset"
    )
    scenarios: Mapped[list["FinancialScenario"]] = relationship(  # noqa: F821
        back_populates="asset", cascade="all, delete-orphan"
    )


class HotelFinancial(BaseModel):
    __tablename__ = "hotel_financials"

    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("hotel_assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    period: Mapped[str] = mapped_column(
        String(20), default="annual"
    )  # annual | ttm | q1 | q2 | q3 | q4

    # Revenue
    rooms_revenue: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    fb_revenue: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    other_revenue: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    total_revenue: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))

    # KPIs
    occupancy_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))  # 0.00–1.00
    adr: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    revpar: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))

    # Expenses & NOI
    total_expenses: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    ebitda: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    noi: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    noi_margin: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))

    source: Mapped[str | None] = mapped_column(
        String(100)
    )  # operator | costar | import

    asset: Mapped["HotelAsset"] = relationship(back_populates="financials")
