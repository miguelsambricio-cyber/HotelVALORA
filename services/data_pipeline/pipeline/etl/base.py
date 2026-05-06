from __future__ import annotations

import abc
from typing import Any, Generic, Literal, Type, TypeVar
from uuid import UUID

import pandas as pd
import structlog
from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from pipeline.core.result import ImportResult, RowError, RowResult

Schema = TypeVar("Schema", bound=BaseModel)
MODE = Literal["insert", "upsert", "dry_run"]


def _sanitize(value: Any) -> Any:
    """Make a value safe for JSON storage (handles NaN, Timestamps, etc.)."""
    if value is None:
        return None
    if isinstance(value, float) and (value != value):  # NaN check
        return None
    try:
        import pandas as pd
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    return value


class BaseETL(abc.ABC, Generic[Schema]):
    SOURCE_TYPE: str
    ROW_SCHEMA: Type[Schema]

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.log = structlog.get_logger(self.__class__.__name__)

    async def run(
        self,
        df: pd.DataFrame,
        mode: MODE = "upsert",
        file_name: str = "",
    ) -> ImportResult:
        result = ImportResult(
            source_type=self.SOURCE_TYPE,
            file_name=file_name,
            total_rows=len(df),
        )
        self.log.info("import_start", source=self.SOURCE_TYPE, rows=len(df), mode=mode)

        for idx, row in df.iterrows():
            row_num = int(idx) + 2  # +1 for 0-index, +1 for header
            raw: dict = {k: _sanitize(v) for k, v in row.to_dict().items()}

            # ── 1. Clean ──────────────────────────────────────────────────────
            cleaned, clean_errors = self._clean_row(raw)
            # Back-fill row_number on errors emitted without context
            for e in clean_errors:
                e.row_number = row_num

            if clean_errors:
                result.rows.append(RowResult(
                    row_number=row_num,
                    status="invalid",
                    raw_data=raw,
                    cleaned_data=cleaned,
                    errors=clean_errors,
                ))
                result.invalid_rows += 1
                self.log.warning("row_clean_error", row=row_num, errors=len(clean_errors))
                continue

            # ── 2. Validate (Pydantic) ────────────────────────────────────────
            try:
                validated: Schema = self.ROW_SCHEMA(**cleaned)
            except ValidationError as exc:
                errors = [
                    RowError(
                        row_number=row_num,
                        column=str(e["loc"][0]) if e["loc"] else None,
                        message=e["msg"],
                        raw_value=e.get("input"),
                    )
                    for e in exc.errors()
                ]
                result.rows.append(RowResult(
                    row_number=row_num,
                    status="invalid",
                    raw_data=raw,
                    cleaned_data=cleaned,
                    errors=errors,
                ))
                result.invalid_rows += 1
                self.log.warning("row_validation_error", row=row_num, errors=len(errors))
                continue

            result.valid_rows += 1

            # ── 3. Deduplicate ─────────────────────────────────────────────────
            dup_id = await self._find_duplicate(validated)

            if dup_id is not None and mode == "insert":
                result.rows.append(RowResult(
                    row_number=row_num,
                    status="duplicate",
                    raw_data=raw,
                    cleaned_data=validated.model_dump(),
                    duplicate_of=dup_id,
                ))
                result.duplicate_rows += 1
                self.log.debug("row_duplicate", row=row_num, existing_id=str(dup_id))
                continue

            # ── 4. Load ────────────────────────────────────────────────────────
            if mode != "dry_run":
                if dup_id is not None:
                    await self._update_record(dup_id, validated)
                    result.updated_rows += 1
                else:
                    await self._insert_record(validated)
                    result.inserted_rows += 1

            result.rows.append(RowResult(
                row_number=row_num,
                status="loaded" if mode != "dry_run" else "valid",
                raw_data=raw,
                cleaned_data=validated.model_dump(),
                duplicate_of=dup_id,
            ))

        if mode != "dry_run":
            await self.db.commit()

        self.log.info("import_complete", **result.summary())
        return result

    @abc.abstractmethod
    def _clean_row(self, raw: dict) -> tuple[dict, list[RowError]]:
        """Apply cleaning transforms. Return (cleaned_dict, errors_list)."""

    @abc.abstractmethod
    async def _find_duplicate(self, row: Schema) -> UUID | None:
        """Return existing record UUID if a duplicate exists, else None."""

    @abc.abstractmethod
    async def _insert_record(self, row: Schema) -> None:
        """Insert a new record into the database."""

    @abc.abstractmethod
    async def _update_record(self, record_id: UUID, row: Schema) -> None:
        """Update an existing record by ID."""


def alias(raw: dict, aliases: dict[str, str]) -> dict:
    """Remap source column name variants to canonical field names."""
    out = dict(raw)
    for src, dst in aliases.items():
        if src in out and dst not in out:
            out[dst] = out.pop(src)
    return out
