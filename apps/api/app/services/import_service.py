from __future__ import annotations

import io
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

import pandas as pd
import structlog
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

# Pipeline service on sys.path so the API can import ETL modules
_PIPELINE_PATH = str(Path(__file__).parents[5] / "services" / "data_pipeline")
if _PIPELINE_PATH not in sys.path:
    sys.path.insert(0, _PIPELINE_PATH)

from pipeline.core.result import ImportResult
from pipeline.excel.parser import ParseError, coerce_types, parse_excel
from pipeline.excel.validator import validate_dataframe
from pipeline.etl.financials import FinancialETL
from pipeline.etl.hotels import HotelETL
from pipeline.etl.market import MarketSnapshotETL
from pipeline.etl.transactions import TransactionETL
from pipeline.costar.normalizer import (
    normalize_market_stats,
    normalize_properties,
    normalize_transactions,
)

from app.models.import_job import ImportJob, ImportStagingRow

log = structlog.get_logger(__name__)
MODE = str  # "insert" | "upsert" | "dry_run"


# ── Job lifecycle helpers ──────────────────────────────────────────────────────

async def _create_job(db: AsyncSession, source_type: str, file_name: str) -> ImportJob:
    job = ImportJob(
        source_type=source_type,
        file_name=file_name,
        status="parsing",
        started_at=datetime.now(timezone.utc),
    )
    db.add(job)
    await db.flush()
    return job


async def _finish_job(db: AsyncSession, job: ImportJob, result: ImportResult) -> None:
    job.status = "completed"
    job.total_rows = result.total_rows
    job.valid_rows = result.valid_rows
    job.invalid_rows = result.invalid_rows
    job.duplicate_rows = result.duplicate_rows
    job.inserted_rows = result.inserted_rows
    job.updated_rows = result.updated_rows
    job.completed_at = datetime.now(timezone.utc)
    for row in result.rows:
        db.add(ImportStagingRow(job_id=job.id, **row.to_staging_dict()))
    await db.commit()


async def _fail_job(db: AsyncSession, job: ImportJob, message: str) -> None:
    job.status = "failed"
    job.error_message = message[:2000]
    job.completed_at = datetime.now(timezone.utc)
    await db.commit()


def _read_file(content: bytes) -> pd.DataFrame:
    try:
        return pd.read_excel(io.BytesIO(content))
    except Exception:
        return pd.read_csv(io.BytesIO(content))


# ── Excel import service ───────────────────────────────────────────────────────

class ExcelImportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def import_hotels(self, file: UploadFile, mode: MODE = "upsert") -> dict:
        job = await _create_job(self.db, "excel_hotels", file.filename or "")
        try:
            content = await file.read()
            df = parse_excel(content, "hotels")
            df = coerce_types(df, "hotels")
            validate_dataframe(df, "hotels")

            result = await HotelETL(self.db).run(df, mode=mode, file_name=file.filename or "")
            await _finish_job(self.db, job, result)
            return {"job_id": str(job.id), **result.summary()}
        except Exception as exc:
            await _fail_job(self.db, job, str(exc))
            log.exception("import_hotels_failed", error=str(exc))
            raise

    async def import_financials(
        self, hotel_id: str, file: UploadFile, mode: MODE = "upsert"
    ) -> dict:
        job = await _create_job(self.db, "excel_financials", file.filename or "")
        try:
            content = await file.read()
            df = parse_excel(content, "financials")
            df = coerce_types(df, "financials")

            result = await FinancialETL(self.db, asset_id=UUID(hotel_id)).run(
                df, mode=mode, file_name=file.filename or ""
            )
            await _finish_job(self.db, job, result)
            return {"job_id": str(job.id), **result.summary()}
        except Exception as exc:
            await _fail_job(self.db, job, str(exc))
            raise

    async def import_transactions(self, file: UploadFile, mode: MODE = "upsert") -> dict:
        job = await _create_job(self.db, "excel_transactions", file.filename or "")
        try:
            content = await file.read()
            df = parse_excel(content, "transactions")
            df = coerce_types(df, "transactions")

            result = await TransactionETL(self.db).run(df, mode=mode, file_name=file.filename or "")
            await _finish_job(self.db, job, result)
            return {"job_id": str(job.id), **result.summary()}
        except Exception as exc:
            await _fail_job(self.db, job, str(exc))
            raise


# ── CoStar import service ──────────────────────────────────────────────────────

class CoStarImportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def import_properties(self, file: UploadFile, mode: MODE = "upsert") -> dict:
        job = await _create_job(self.db, "costar_properties", file.filename or "")
        try:
            df = normalize_properties(_read_file(await file.read()))
            etl = HotelETL(self.db)
            etl.SOURCE_TYPE = "costar_properties"
            result = await etl.run(df, mode=mode, file_name=file.filename or "")
            await _finish_job(self.db, job, result)
            return {"job_id": str(job.id), **result.summary()}
        except Exception as exc:
            await _fail_job(self.db, job, str(exc))
            raise

    async def import_transactions(self, file: UploadFile, mode: MODE = "upsert") -> dict:
        job = await _create_job(self.db, "costar_transactions", file.filename or "")
        try:
            df = normalize_transactions(_read_file(await file.read()))
            etl = TransactionETL(self.db)
            etl.SOURCE_TYPE = "costar_transactions"
            result = await etl.run(df, mode=mode, file_name=file.filename or "")
            await _finish_job(self.db, job, result)
            return {"job_id": str(job.id), **result.summary()}
        except Exception as exc:
            await _fail_job(self.db, job, str(exc))
            raise

    async def import_market_stats(self, file: UploadFile, mode: MODE = "upsert") -> dict:
        job = await _create_job(self.db, "costar_market_stats", file.filename or "")
        try:
            df = normalize_market_stats(_read_file(await file.read()))
            etl = MarketSnapshotETL(self.db)
            etl.SOURCE_TYPE = "costar_market_stats"
            result = await etl.run(df, mode=mode, file_name=file.filename or "")
            await _finish_job(self.db, job, result)
            return {"job_id": str(job.id), **result.summary()}
        except Exception as exc:
            await _fail_job(self.db, job, str(exc))
            raise
