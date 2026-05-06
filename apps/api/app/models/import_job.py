import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel, UUIDMixin
from app.database import Base


class ImportJob(BaseModel):
    __tablename__ = "import_jobs"

    # excel_hotels | excel_financials | excel_transactions | costar_properties
    # costar_transactions | costar_market_stats
    source_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    file_name: Mapped[str | None] = mapped_column(String(500))

    # pending | parsing | validating | loading | completed | failed
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False, index=True)

    total_rows: Mapped[int | None] = mapped_column(Integer)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    invalid_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duplicate_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    inserted_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    error_message: Mapped[str | None] = mapped_column(Text)
    meta: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    rows: Mapped[list["ImportStagingRow"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )

    @property
    def summary(self) -> dict:
        return {
            "id": str(self.id),
            "source_type": self.source_type,
            "file_name": self.file_name,
            "status": self.status,
            "total_rows": self.total_rows,
            "valid_rows": self.valid_rows,
            "invalid_rows": self.invalid_rows,
            "duplicate_rows": self.duplicate_rows,
            "inserted_rows": self.inserted_rows,
            "updated_rows": self.updated_rows,
        }


class ImportStagingRow(UUIDMixin, Base):
    __tablename__ = "import_staging_rows"

    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("import_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # pending | valid | invalid | duplicate | loaded
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False, index=True)

    raw_data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    cleaned_data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    validation_errors: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    duplicate_of: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )

    job: Mapped["ImportJob"] = relationship(back_populates="rows")
