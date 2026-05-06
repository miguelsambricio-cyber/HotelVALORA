import io
from uuid import UUID

import pandas as pd
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ImportError
from app.models.hotel import Hotel, HotelFinancial
from app.models.transaction import ComparableTransaction
from app.models.market import MarketSnapshot

# ─── CoStar column → internal field mappings ────────────────────────────────

COSTAR_PROPERTY_MAP = {
    "Property Name": "name",
    "City": "city",
    "State": "state",
    "Zip": "zip_code",
    "Number of Rooms": "total_keys",
    "Year Built": "year_built",
    "Star Rating": "star_rating",
    "Property Type": "chain_scale",
    "Brand": "brand",
    "Latitude": "latitude",
    "Longitude": "longitude",
}

COSTAR_TRANSACTION_MAP = {
    "Property Name": "property_name",
    "City": "city",
    "State": "state",
    "Close Date": "sale_date",
    "Sale Price": "sale_price",
    "Price/Key": "price_per_key",
    "Going-In Cap Rate": "cap_rate",
    "Buyer": "buyer",
    "Seller": "seller",
    "Number of Rooms": "total_keys",
    "CoStar Property ID": "source_id",
}

COSTAR_MARKET_MAP = {
    "Submarket": "submarket",
    "City": "city",
    "State": "state",
    "Year": "period_year",
    "Occupancy": "market_occupancy",
    "ADR": "market_adr",
    "RevPAR": "market_revpar",
    "Supply": "market_supply",
    "Demand": "market_demand",
    "RevPAR Change": "revpar_growth_yoy",
}


class ExcelImportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _read_excel(self, file: UploadFile) -> pd.DataFrame:
        try:
            content = await file.read()
            return pd.read_excel(io.BytesIO(content))
        except Exception as e:
            raise ImportError(f"Cannot parse Excel file: {e}")

    async def import_hotels(self, file: UploadFile) -> dict:
        df = await self._read_excel(file)
        required = {"name", "city", "total_keys"}
        missing = required - set(df.columns.str.strip().str.lower())
        if missing:
            raise ImportError(f"Missing required columns: {missing}")

        created, errors = 0, []
        for i, row in df.iterrows():
            try:
                from python_slugify import slugify
                name = str(row.get("name", "")).strip()
                hotel = Hotel(
                    name=name,
                    slug=slugify(name),
                    city=str(row.get("city", "")).strip(),
                    total_keys=int(row.get("total_keys", 0)),
                    brand=str(row.get("brand", "")).strip() or None,
                    year_built=int(row["year_built"]) if pd.notna(row.get("year_built")) else None,
                )
                self.db.add(hotel)
                created += 1
            except Exception as e:
                errors.append({"row": i + 2, "error": str(e)})
        await self.db.flush()
        return {"created": created, "errors": errors, "total_rows": len(df)}

    async def import_financials(self, hotel_id: str, file: UploadFile) -> dict:
        df = await self._read_excel(file)
        created, errors = 0, []
        for i, row in df.iterrows():
            try:
                record = HotelFinancial(
                    hotel_id=UUID(hotel_id),
                    year=int(row["year"]),
                    rooms_revenue=float(row["rooms_revenue"]) if pd.notna(row.get("rooms_revenue")) else None,
                    total_revenue=float(row["total_revenue"]) if pd.notna(row.get("total_revenue")) else None,
                    occupancy_rate=float(row["occupancy_rate"]) if pd.notna(row.get("occupancy_rate")) else None,
                    adr=float(row["adr"]) if pd.notna(row.get("adr")) else None,
                    revpar=float(row["revpar"]) if pd.notna(row.get("revpar")) else None,
                    noi=float(row["noi"]) if pd.notna(row.get("noi")) else None,
                    source="import",
                )
                self.db.add(record)
                created += 1
            except Exception as e:
                errors.append({"row": i + 2, "error": str(e)})
        await self.db.flush()
        return {"created": created, "errors": errors}

    async def import_transactions(self, file: UploadFile) -> dict:
        df = await self._read_excel(file)
        created, errors = 0, []
        for i, row in df.iterrows():
            try:
                comp = ComparableTransaction(
                    property_name=str(row["property_name"]).strip(),
                    city=str(row["city"]).strip(),
                    sale_date=str(row["sale_date"]).strip()[:10],
                    total_keys=int(row["total_keys"]) if pd.notna(row.get("total_keys")) else None,
                    sale_price=float(row["sale_price"]) if pd.notna(row.get("sale_price")) else None,
                    price_per_key=float(row["price_per_key"]) if pd.notna(row.get("price_per_key")) else None,
                    cap_rate=float(row["cap_rate"]) if pd.notna(row.get("cap_rate")) else None,
                    source="import",
                )
                self.db.add(comp)
                created += 1
            except Exception as e:
                errors.append({"row": i + 2, "error": str(e)})
        await self.db.flush()
        return {"created": created, "errors": errors}


class CoStarImportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def _normalize(self, df: pd.DataFrame, col_map: dict) -> pd.DataFrame:
        df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})
        df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
        return df

    async def _read(self, file: UploadFile) -> pd.DataFrame:
        content = await file.read()
        try:
            return pd.read_excel(io.BytesIO(content))
        except Exception:
            return pd.read_csv(io.BytesIO(content))

    async def import_properties(self, file: UploadFile) -> dict:
        df = self._normalize(await self._read(file), COSTAR_PROPERTY_MAP)
        created, errors = 0, []
        for i, row in df.iterrows():
            try:
                from python_slugify import slugify
                name = str(row.get("name", "")).strip()
                hotel = Hotel(
                    name=name,
                    slug=slugify(name),
                    city=str(row.get("city", "")).strip(),
                    total_keys=int(row["total_keys"]) if pd.notna(row.get("total_keys")) else 0,
                    brand=str(row.get("brand", "")).strip() or None,
                    source_id=str(row.get("costar_property_id", "")) or None,
                    meta={"source": "costar"},
                )
                self.db.add(hotel)
                created += 1
            except Exception as e:
                errors.append({"row": i + 2, "error": str(e)})
        await self.db.flush()
        return {"created": created, "errors": errors}

    async def import_transactions(self, file: UploadFile) -> dict:
        df = self._normalize(await self._read(file), COSTAR_TRANSACTION_MAP)
        created, errors = 0, []
        for i, row in df.iterrows():
            try:
                comp = ComparableTransaction(
                    property_name=str(row["property_name"]).strip(),
                    city=str(row.get("city", "")).strip(),
                    sale_date=str(row.get("sale_date", ""))[:10],
                    total_keys=int(row["total_keys"]) if pd.notna(row.get("total_keys")) else None,
                    sale_price=float(row["sale_price"]) if pd.notna(row.get("sale_price")) else None,
                    price_per_key=float(row["price_per_key"]) if pd.notna(row.get("price_per_key")) else None,
                    cap_rate=float(row["cap_rate"]) if pd.notna(row.get("cap_rate")) else None,
                    buyer=str(row.get("buyer", "")) or None,
                    seller=str(row.get("seller", "")) or None,
                    source="costar",
                    source_id=str(row.get("source_id", "")) or None,
                )
                self.db.add(comp)
                created += 1
            except Exception as e:
                errors.append({"row": i + 2, "error": str(e)})
        await self.db.flush()
        return {"created": created, "errors": errors}

    async def import_market_stats(self, file: UploadFile) -> dict:
        df = self._normalize(await self._read(file), COSTAR_MARKET_MAP)
        created, errors = 0, []
        for i, row in df.iterrows():
            try:
                snap = MarketSnapshot(
                    submarket=str(row.get("submarket", "")).strip(),
                    city=str(row.get("city", "")).strip(),
                    state=str(row.get("state", "")).strip() or None,
                    period_year=int(row["period_year"]),
                    period_type="annual",
                    market_occupancy=float(row["market_occupancy"]) if pd.notna(row.get("market_occupancy")) else None,
                    market_adr=float(row["market_adr"]) if pd.notna(row.get("market_adr")) else None,
                    market_revpar=float(row["market_revpar"]) if pd.notna(row.get("market_revpar")) else None,
                    revpar_growth_yoy=float(row["revpar_growth_yoy"]) if pd.notna(row.get("revpar_growth_yoy")) else None,
                    source="costar",
                )
                self.db.add(snap)
                created += 1
            except Exception as e:
                errors.append({"row": i + 2, "error": str(e)})
        await self.db.flush()
        return {"created": created, "errors": errors}
