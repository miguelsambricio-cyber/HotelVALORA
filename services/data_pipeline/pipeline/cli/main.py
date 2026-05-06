"""
HotelVALORA Import CLI

Usage (from repo root):
    PYTHONPATH=apps/api:services/data_pipeline python -m pipeline.cli.main --help

Commands:
    import-hotels          Import hotel assets from Excel
    import-transactions    Import comparable transactions from Excel
    import-market          Import market snapshots from Excel or CoStar export
    import-financials      Import hotel financials from Excel
    import-costar-props    Import CoStar property export
    import-costar-trans    Import CoStar transaction export
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path
from uuid import UUID

import click
import structlog
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Ensure pipeline modules are importable
_ROOT = Path(__file__).parents[4]
for _p in [str(_ROOT / "apps" / "api"), str(_ROOT / "services" / "data_pipeline")]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from pipeline.core.logging import configure_logging, get_logger
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

log = get_logger(__name__)


def _get_engine():
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        click.echo("ERROR: DATABASE_URL environment variable is not set.", err=True)
        sys.exit(1)
    # Convert sync postgres:// → async postgresql+asyncpg://
    url = url.replace("postgresql://", "postgresql+asyncpg://").replace(
        "postgres://", "postgresql+asyncpg://"
    )
    return create_async_engine(url, echo=False)


def _print_result(result_summary: dict, errors: list[dict]) -> None:
    click.echo("\n── Import Result ────────────────────────────────")
    for k, v in result_summary.items():
        click.echo(f"  {k:<20} {v}")
    if errors:
        click.echo(f"\n── Errors ({len(errors)}) ─────────────────────────────")
        for e in errors[:20]:
            click.echo(f"  row {e['row']:>4}  [{e.get('column','?')}]  {e['message']}")
        if len(errors) > 20:
            click.echo(f"  ... and {len(errors) - 20} more errors")
    click.echo("")


@click.group()
@click.option("--log-level", default="INFO", type=click.Choice(["DEBUG", "INFO", "WARNING", "ERROR"]))
def cli(log_level: str) -> None:
    """HotelVALORA data import pipeline."""
    configure_logging(log_level)


# ── import-hotels ──────────────────────────────────────────────────────────────

@cli.command()
@click.option("--file", "-f", type=click.Path(exists=True), required=True, help="Excel file path")
@click.option("--mode", default="upsert", type=click.Choice(["insert", "upsert", "dry_run"]))
@click.option("--sheet", default=0, help="Sheet name or 0-based index")
@click.option("--validate-only", is_flag=True, help="Run validation only, skip DB write")
def import_hotels(file: str, mode: str, sheet: int | str, validate_only: bool) -> None:
    """Import hotel assets from an Excel template."""

    async def _run() -> None:
        df = parse_excel(file, "hotels", sheet_name=sheet)
        df = coerce_types(df, "hotels")

        val = validate_dataframe(df, "hotels")
        click.echo(f"Validation: {val.row_count} rows, {val.error_count} errors")
        if not val.is_valid:
            for e in val.errors[:10]:
                click.echo(f"  row {e['row']} [{e['column']}]: {e['message']}", err=True)
            if not validate_only and not click.confirm("Continue with errors?"):
                return

        if validate_only:
            click.echo("--validate-only: skipping DB write")
            return

        engine = _get_engine()
        Session = async_sessionmaker(engine, expire_on_commit=False)
        async with Session() as db:
            etl = HotelETL(db)
            result = await etl.run(df, mode=mode, file_name=str(file))
        await engine.dispose()
        _print_result(result.summary(), result.error_report())

    asyncio.run(_run())


# ── import-transactions ────────────────────────────────────────────────────────

@cli.command()
@click.option("--file", "-f", type=click.Path(exists=True), required=True)
@click.option("--mode", default="upsert", type=click.Choice(["insert", "upsert", "dry_run"]))
@click.option("--sheet", default=0)
def import_transactions(file: str, mode: str, sheet: int) -> None:
    """Import comparable transactions from an Excel template."""

    async def _run() -> None:
        df = parse_excel(file, "transactions", sheet_name=sheet)
        df = coerce_types(df, "transactions")
        engine = _get_engine()
        Session = async_sessionmaker(engine, expire_on_commit=False)
        async with Session() as db:
            result = await TransactionETL(db).run(df, mode=mode, file_name=str(file))
        await engine.dispose()
        _print_result(result.summary(), result.error_report())

    asyncio.run(_run())


# ── import-market ──────────────────────────────────────────────────────────────

@cli.command()
@click.option("--file", "-f", type=click.Path(exists=True), required=True)
@click.option("--mode", default="upsert", type=click.Choice(["insert", "upsert", "dry_run"]))
@click.option("--source", default="import", help="Data source label (e.g. costar, str)")
@click.option("--sheet", default=0)
def import_market(file: str, mode: str, source: str, sheet: int) -> None:
    """Import market snapshots from an Excel file."""

    async def _run() -> None:
        df = parse_excel(file, "market", sheet_name=sheet)
        df = coerce_types(df, "market")
        if "source" not in df.columns:
            df["source"] = source
        engine = _get_engine()
        Session = async_sessionmaker(engine, expire_on_commit=False)
        async with Session() as db:
            result = await MarketSnapshotETL(db).run(df, mode=mode, file_name=str(file))
        await engine.dispose()
        _print_result(result.summary(), result.error_report())

    asyncio.run(_run())


# ── import-financials ──────────────────────────────────────────────────────────

@cli.command()
@click.option("--file", "-f", type=click.Path(exists=True), required=True)
@click.option("--hotel-id", required=True, help="UUID of the hotel asset")
@click.option("--mode", default="upsert", type=click.Choice(["insert", "upsert", "dry_run"]))
@click.option("--sheet", default=0)
def import_financials(file: str, hotel_id: str, mode: str, sheet: int) -> None:
    """Import hotel financials for a specific hotel asset."""

    async def _run() -> None:
        asset_id = UUID(hotel_id)
        df = parse_excel(file, "financials", sheet_name=sheet)
        df = coerce_types(df, "financials")
        engine = _get_engine()
        Session = async_sessionmaker(engine, expire_on_commit=False)
        async with Session() as db:
            result = await FinancialETL(db, asset_id=asset_id).run(
                df, mode=mode, file_name=str(file)
            )
        await engine.dispose()
        _print_result(result.summary(), result.error_report())

    asyncio.run(_run())


# ── import-costar-props ────────────────────────────────────────────────────────

@cli.command()
@click.option("--file", "-f", type=click.Path(exists=True), required=True)
@click.option("--mode", default="upsert", type=click.Choice(["insert", "upsert", "dry_run"]))
def import_costar_props(file: str, mode: str) -> None:
    """Import a CoStar property export (Excel or CSV)."""
    import pandas as pd

    async def _run() -> None:
        try:
            df = pd.read_excel(file)
        except Exception:
            df = pd.read_csv(file)
        df = normalize_properties(df)
        engine = _get_engine()
        Session = async_sessionmaker(engine, expire_on_commit=False)
        async with Session() as db:
            etl = HotelETL(db)
            etl.SOURCE_TYPE = "costar_properties"
            result = await etl.run(df, mode=mode, file_name=str(file))
        await engine.dispose()
        _print_result(result.summary(), result.error_report())

    asyncio.run(_run())


# ── import-costar-trans ────────────────────────────────────────────────────────

@cli.command()
@click.option("--file", "-f", type=click.Path(exists=True), required=True)
@click.option("--mode", default="upsert", type=click.Choice(["insert", "upsert", "dry_run"]))
def import_costar_trans(file: str, mode: str) -> None:
    """Import a CoStar transaction export (Excel or CSV)."""
    import pandas as pd

    async def _run() -> None:
        try:
            df = pd.read_excel(file)
        except Exception:
            df = pd.read_csv(file)
        df = normalize_transactions(df)
        engine = _get_engine()
        Session = async_sessionmaker(engine, expire_on_commit=False)
        async with Session() as db:
            etl = TransactionETL(db)
            etl.SOURCE_TYPE = "costar_transactions"
            result = await etl.run(df, mode=mode, file_name=str(file))
        await engine.dispose()
        _print_result(result.summary(), result.error_report())

    asyncio.run(_run())


# ── validate ───────────────────────────────────────────────────────────────────

@cli.command()
@click.option("--file", "-f", type=click.Path(exists=True), required=True)
@click.option("--type", "template_type", required=True,
              type=click.Choice(["hotels", "financials", "transactions", "market"]))
@click.option("--sheet", default=0)
@click.option("--output", type=click.Path(), help="Write error report to JSON file")
def validate(file: str, template_type: str, sheet: int, output: str | None) -> None:
    """Validate an Excel file against a template schema (no DB required)."""
    try:
        df = parse_excel(file, template_type, sheet_name=sheet)
        df = coerce_types(df, template_type)
    except ParseError as exc:
        click.echo(f"Parse error: {exc}", err=True)
        sys.exit(1)

    result = validate_dataframe(df, template_type)
    click.echo(f"\nFile:    {file}")
    click.echo(f"Type:    {template_type}")
    click.echo(f"Rows:    {result.row_count}")
    click.echo(f"Errors:  {result.error_count}")
    click.echo(f"Valid:   {result.is_valid}")

    if result.errors:
        click.echo("\nFirst 20 errors:")
        for e in result.errors[:20]:
            click.echo(f"  row {e['row']:>4} [{e.get('column','?')}]: {e['message']}")

    if output:
        Path(output).write_text(json.dumps(result.errors, indent=2))
        click.echo(f"\nFull error report → {output}")

    sys.exit(0 if result.is_valid else 1)


if __name__ == "__main__":
    cli()
