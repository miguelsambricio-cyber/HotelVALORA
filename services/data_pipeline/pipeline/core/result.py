from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal
from uuid import UUID


@dataclass
class RowError:
    row_number: int
    message: str
    column: str | None = None
    raw_value: Any = None

    def to_dict(self) -> dict:
        return {
            "row": self.row_number,
            "column": self.column,
            "message": self.message,
            "raw_value": str(self.raw_value) if self.raw_value is not None else None,
        }


@dataclass
class RowResult:
    row_number: int
    status: Literal["valid", "invalid", "duplicate", "loaded"]
    raw_data: dict
    cleaned_data: dict
    errors: list[RowError] = field(default_factory=list)
    duplicate_of: UUID | None = None

    def to_staging_dict(self) -> dict:
        return {
            "row_number": self.row_number,
            "status": self.status,
            "raw_data": {k: str(v) if v is not None else None for k, v in self.raw_data.items()},
            "cleaned_data": self.cleaned_data,
            "validation_errors": [e.to_dict() for e in self.errors],
            "duplicate_of": str(self.duplicate_of) if self.duplicate_of else None,
        }


@dataclass
class ImportResult:
    source_type: str
    file_name: str = ""
    total_rows: int = 0
    valid_rows: int = 0
    invalid_rows: int = 0
    duplicate_rows: int = 0
    inserted_rows: int = 0
    updated_rows: int = 0
    rows: list[RowResult] = field(default_factory=list)

    @property
    def is_success(self) -> bool:
        return self.invalid_rows == 0

    def summary(self) -> dict:
        return {
            "source_type": self.source_type,
            "file_name": self.file_name,
            "total_rows": self.total_rows,
            "valid": self.valid_rows,
            "invalid": self.invalid_rows,
            "duplicates": self.duplicate_rows,
            "inserted": self.inserted_rows,
            "updated": self.updated_rows,
            "success": self.is_success,
        }

    def error_report(self) -> list[dict]:
        return [
            err.to_dict()
            for row in self.rows
            for err in row.errors
        ]

    def invalid_rows_detail(self) -> list[dict]:
        return [
            {
                "row_number": r.row_number,
                "errors": [e.to_dict() for e in r.errors],
                "raw_data": r.raw_data,
            }
            for r in self.rows
            if r.status == "invalid"
        ]
