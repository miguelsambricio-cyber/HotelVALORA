import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class FlexLivingAsset(BaseModel):
    __tablename__ = "flex_living_assets"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    asset_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # apart_hotel | serviced_apartment | co_living | extended_stay

    # Location
    address: Mapped[str | None] = mapped_column(String(500))
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str] = mapped_column(String(100), default="US", nullable=False)

    # Unit mix
    total_units: Mapped[int] = mapped_column(Integer, nullable=False)
    studio_units: Mapped[int | None] = mapped_column(Integer)
    one_bed_units: Mapped[int | None] = mapped_column(Integer)
    two_bed_units: Mapped[int | None] = mapped_column(Integer)
    three_plus_bed_units: Mapped[int | None] = mapped_column(Integer)

    # Building
    year_built: Mapped[int | None] = mapped_column(Integer)
    year_renovated: Mapped[int | None] = mapped_column(Integer)
    gfa_sqft: Mapped[int | None] = mapped_column(Integer)

    # Financials
    avg_daily_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    monthly_rental_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    occupancy_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))

    # Minimum stay model
    min_stay_days: Mapped[int | None] = mapped_column(Integer)
    mix_short_term_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    mix_long_term_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))

    asset_status: Mapped[str] = mapped_column(String(50), default="operating", nullable=False)
    operator: Mapped[str | None] = mapped_column(String(255))
    meta: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    valuations: Mapped[list["Valuation"]] = relationship(  # noqa: F821
        back_populates="flex_asset", cascade="all, delete-orphan"
    )
