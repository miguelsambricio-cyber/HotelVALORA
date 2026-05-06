import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ComparableTransaction(BaseModel):
    __tablename__ = "comparable_transactions"

    # Optional FK to a tracked asset (null for external comps)
    asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("hotel_assets.id", ondelete="SET NULL"),
        index=True,
    )

    # Denormalized property info (preserved for comps not in the system)
    property_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    brand: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    country: Mapped[str] = mapped_column(String(100), default="ES", nullable=False)
    property_type: Mapped[str | None] = mapped_column(
        String(100)
    )  # full_service | select | extended_stay
    chain_scale: Mapped[str | None] = mapped_column(String(100))
    total_keys: Mapped[int | None] = mapped_column(Integer)
    year_built: Mapped[int | None] = mapped_column(Integer)
    star_rating: Mapped[Decimal | None] = mapped_column(Numeric(2, 1))

    # Transaction
    transaction_date: Mapped[str] = mapped_column(
        String(10), nullable=False, index=True
    )  # ISO date YYYY-MM-DD
    transaction_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    price_per_key: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    cap_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    buyer: Mapped[str | None] = mapped_column(String(255))
    seller: Mapped[str | None] = mapped_column(String(255))
    transaction_type: Mapped[str | None] = mapped_column(
        String(100)
    )  # acquisition | portfolio | recapitalization | distressed

    # Operating metrics at time of sale
    occupancy_at_sale: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    adr_at_sale: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    revpar_at_sale: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    noi_at_sale: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))

    source: Mapped[str | None] = mapped_column(
        String(100)
    )  # costar | manual | broker | rca
    source_id: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    meta: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    asset: Mapped["HotelAsset"] = relationship(  # noqa: F821
        back_populates="transactions"
    )
