"""
Generate realistic sample datasets for the HotelVALORA import pipeline.

Produces five Excel files mimicking real CoStar exports and internal templates:
  - costar_hotels.xlsx        CoStar property export (Iberian + European hotels)
  - costar_transactions.xlsx  CoStar transaction export (2021-2024 sales)
  - costar_market.xlsx        CoStar submarket stats (Madrid/Barcelona submarkets)
  - hotel_financials.xlsx     Internal P&L template (two flagship assets, 3 years)
  - internal_hotels.xlsx      Internal hotel template (for direct Excel upload)

CSV mirrors are written alongside each .xlsx for quick inspection.

Run from repo root:
    python data/samples/generate_samples.py
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

OUT = Path(__file__).parent


# ── 1. CoStar Hotel Property Export ────────────────────────────────────────────

COSTAR_HOTELS = pd.DataFrame([
    {
        "Property Name": "Hotel Arts Barcelona",
        "City": "Barcelona",
        "State": "Cataluña",
        "Zip Code": "08005",
        "Number Of Rooms": 483,
        "Year Built": 1994,
        "Star Rating": 5,
        "Secondary Type": "Luxury",
        "Brand": "Ritz-Carlton",
        "Property Type": "Hotel",
        "Latitude": 41.3857,
        "Longitude": 2.1974,
        "CoStar Property ID": "COSTAR-ES-001",
    },
    {
        "Property Name": "Hotel W Barcelona",
        "City": "Barcelona",
        "State": "Cataluña",
        "Zip Code": "08039",
        "Number Of Rooms": 473,
        "Year Built": 2009,
        "Star Rating": 5,
        "Secondary Type": "Luxury",
        "Brand": "W Hotels",
        "Property Type": "Hotel",
        "Latitude": 41.3743,
        "Longitude": 2.1897,
        "CoStar Property ID": "COSTAR-ES-002",
    },
    {
        "Property Name": "Hilton Diagonal Mar Barcelona",
        "City": "Barcelona",
        "State": "Cataluña",
        "Zip Code": "08019",
        "Number Of Rooms": 433,
        "Year Built": 2002,
        "Star Rating": 4,
        "Secondary Type": "Upscale",
        "Brand": "Hilton",
        "Property Type": "Hotel",
        "Latitude": 41.4098,
        "Longitude": 2.2183,
        "CoStar Property ID": "COSTAR-ES-003",
    },
    {
        "Property Name": "NH Collection Madrid Eurobuilding",
        "City": "Madrid",
        "State": "Comunidad de Madrid",
        "Zip Code": "28020",
        "Number Of Rooms": 342,
        "Year Built": 2014,
        "Star Rating": 5,
        "Secondary Type": "Upper Upscale",
        "Brand": "NH Collection",
        "Property Type": "Hotel",
        "Latitude": 40.4543,
        "Longitude": -3.6892,
        "CoStar Property ID": "COSTAR-ES-004",
    },
    {
        "Property Name": "Meliá Castilla",
        "City": "Madrid",
        "State": "Comunidad de Madrid",
        "Zip Code": "28046",
        "Number Of Rooms": 936,
        "Year Built": 1976,
        "Star Rating": 4,
        "Secondary Type": "Upper Upscale",
        "Brand": "Meliá",
        "Property Type": "Hotel",
        "Latitude": 40.4590,
        "Longitude": -3.6877,
        "CoStar Property ID": "COSTAR-ES-005",
    },
    {
        "Property Name": "Iberostar Las Letras Gran Via",
        "City": "Madrid",
        "State": "Comunidad de Madrid",
        "Zip Code": "28013",
        "Number Of Rooms": 109,
        "Year Built": 2006,
        "Star Rating": 4,
        "Secondary Type": "Upper Upscale",
        "Brand": "Iberostar",
        "Property Type": "Hotel",
        "Latitude": 40.4195,
        "Longitude": -3.7040,
        "CoStar Property ID": "COSTAR-ES-006",
    },
    {
        "Property Name": "Gran Hotel Miramar",
        "City": "Málaga",
        "State": "Andalucía",
        "Zip Code": "29016",
        "Number Of Rooms": 204,
        "Year Built": 1926,
        "Star Rating": 5,
        "Secondary Type": "Luxury",
        "Brand": "Gran Hotel Miramar",
        "Property Type": "Hotel",
        "Latitude": 36.7157,
        "Longitude": -4.4073,
        "CoStar Property ID": "COSTAR-ES-007",
    },
    {
        "Property Name": "Hotel Alfonso XIII",
        "City": "Sevilla",
        "State": "Andalucía",
        "Zip Code": "41001",
        "Number Of Rooms": 148,
        "Year Built": 1928,
        "Star Rating": 5,
        "Secondary Type": "Luxury",
        "Brand": "A Luxury Collection",
        "Property Type": "Hotel",
        "Latitude": 37.3838,
        "Longitude": -5.9939,
        "CoStar Property ID": "COSTAR-ES-008",
    },
    {
        "Property Name": "Hospes Palacio del Bailío",
        "City": "Córdoba",
        "State": "Andalucía",
        "Zip Code": "14002",
        "Number Of Rooms": 53,
        "Year Built": 1867,
        "Star Rating": 5,
        "Secondary Type": "Luxury",
        "Brand": "Hospes",
        "Property Type": "Hotel",
        "Latitude": 37.8877,
        "Longitude": -4.7779,
        "CoStar Property ID": "COSTAR-ES-009",
    },
    {
        "Property Name": "Barceló Málaga",
        "City": "Málaga",
        "State": "Andalucía",
        "Zip Code": "29001",
        "Number Of Rooms": 221,
        "Year Built": 2007,
        "Star Rating": 4,
        "Secondary Type": "Upscale",
        "Brand": "Barceló",
        "Property Type": "Hotel",
        "Latitude": 36.7213,
        "Longitude": -4.4214,
        "CoStar Property ID": "COSTAR-ES-010",
    },
    {
        "Property Name": "Palacio de los Duques Gran Meliá",
        "City": "Madrid",
        "State": "Comunidad de Madrid",
        "Zip Code": "28013",
        "Number Of Rooms": 180,
        "Year Built": 2018,
        "Star Rating": 5,
        "Secondary Type": "Luxury",
        "Brand": "Gran Meliá",
        "Property Type": "Hotel",
        "Latitude": 40.4149,
        "Longitude": -3.7090,
        "CoStar Property ID": "COSTAR-ES-011",
    },
    {
        "Property Name": "AC Hotel Málaga Palacio",
        "City": "Málaga",
        "State": "Andalucía",
        "Zip Code": "29015",
        "Number Of Rooms": 214,
        "Year Built": 2005,
        "Star Rating": 4,
        "Secondary Type": "Upscale",
        "Brand": "AC Hotels by Marriott",
        "Property Type": "Hotel",
        "Latitude": 36.7234,
        "Longitude": -4.4194,
        "CoStar Property ID": "COSTAR-ES-012",
    },
])


# ── 2. CoStar Transaction Export ───────────────────────────────────────────────

COSTAR_TRANSACTIONS = pd.DataFrame([
    {
        "Property Name": "Hotel Arts Barcelona",
        "City": "Barcelona",
        "State": "Cataluña",
        "Close Date": "2024-03-22",
        "Sale Price": "310000000",
        "Price/Key": "641614",
        "Going-In Cap Rate": "3.8%",
        "Number Of Rooms": 483,
        "Buyer": "Brookfield Asset Management",
        "Seller": "Deka Immobilien",
        "CoStar Property ID": "COSTAR-ES-001",
    },
    {
        "Property Name": "Hotel Casa Fuster",
        "City": "Barcelona",
        "State": "Cataluña",
        "Close Date": "2023-11-08",
        "Sale Price": "45000000",
        "Price/Key": "312500",
        "Going-In Cap Rate": "5.2%",
        "Number Of Rooms": 144,
        "Buyer": "Grupo Hotusa",
        "Seller": "Private Equity Fund",
        "CoStar Property ID": "COSTAR-ES-013",
    },
    {
        "Property Name": "Meliá Castilla",
        "City": "Madrid",
        "State": "Comunidad de Madrid",
        "Close Date": "2023-06-15",
        "Sale Price": "120000000",
        "Price/Key": "128205",
        "Going-In Cap Rate": "4.8%",
        "Number Of Rooms": 936,
        "Buyer": "Meliá Hotels International",
        "Seller": "CBRE Investment Management",
        "CoStar Property ID": "COSTAR-ES-005",
    },
    {
        "Property Name": "Gran Hotel Miramar",
        "City": "Málaga",
        "State": "Andalucía",
        "Close Date": "2022-09-30",
        "Sale Price": "75000000",
        "Price/Key": "367647",
        "Going-In Cap Rate": "4.1%",
        "Number Of Rooms": 204,
        "Buyer": "Grupo Inversor Hesperia",
        "Seller": "Junta de Andalucía",
        "CoStar Property ID": "COSTAR-ES-007",
    },
    {
        "Property Name": "Hotel Orfila",
        "City": "Madrid",
        "State": "Comunidad de Madrid",
        "Close Date": "2022-04-12",
        "Sale Price": "28500000",
        "Price/Key": "890625",
        "Going-In Cap Rate": "3.5%",
        "Number Of Rooms": 32,
        "Buyer": "Relais & Châteaux",
        "Seller": "Private Family Office",
        "CoStar Property ID": "COSTAR-ES-014",
    },
    {
        "Property Name": "NH Collection Gran Calderón",
        "City": "Madrid",
        "State": "Comunidad de Madrid",
        "Close Date": "2021-12-01",
        "Sale Price": "39800000",
        "Price/Key": "250000",
        "Going-In Cap Rate": "5.0%",
        "Number Of Rooms": 159,
        "Buyer": "Axa Investment Managers",
        "Seller": "NH Hotel Group",
        "CoStar Property ID": "COSTAR-ES-015",
    },
    {
        "Property Name": "Hotel Alfonso XIII",
        "City": "Sevilla",
        "State": "Andalucía",
        "Close Date": "2024-01-19",
        "Sale Price": "87000000",
        "Price/Key": "587838",
        "Going-In Cap Rate": "4.3%",
        "Number Of Rooms": 148,
        "Buyer": "Archer Hotel Capital",
        "Seller": "Starwood Capital Group",
        "CoStar Property ID": "COSTAR-ES-008",
    },
    {
        "Property Name": "Hospes Palacio del Bailío",
        "City": "Córdoba",
        "State": "Andalucía",
        "Close Date": "2023-03-28",
        "Sale Price": "18500000",
        "Price/Key": "349057",
        "Going-In Cap Rate": "4.6%",
        "Number Of Rooms": 53,
        "Buyer": "Hospes Hotels SL",
        "Seller": "PATRIZIA AG",
        "CoStar Property ID": "COSTAR-ES-009",
    },
])


# ── 3. CoStar Submarket Market Stats ───────────────────────────────────────────

COSTAR_MARKET = pd.DataFrame([
    # Barcelona CBD
    {"Submarket": "Barcelona CBD", "City": "Barcelona", "State": "Cataluña", "Year": 2022, "Occupancy": "71.4%", "ADR": 182.50, "RevPAR": 130.35, "Supply": 12450, "Demand": 8889, "RevPAR % Chg": "18.2%"},
    {"Submarket": "Barcelona CBD", "City": "Barcelona", "State": "Cataluña", "Year": 2023, "Occupancy": "74.8%", "ADR": 201.30, "RevPAR": 150.57, "Supply": 12620, "Demand": 9440, "RevPAR % Chg": "15.5%"},
    {"Submarket": "Barcelona CBD", "City": "Barcelona", "State": "Cataluña", "Year": 2024, "Occupancy": "76.2%", "ADR": 218.40, "RevPAR": 166.43, "Supply": 12850, "Demand": 9792, "RevPAR % Chg": "10.5%"},
    # Barcelona Beach
    {"Submarket": "Barcelona Beach", "City": "Barcelona", "State": "Cataluña", "Year": 2022, "Occupancy": "69.8%", "ADR": 195.60, "RevPAR": 136.53, "Supply": 8340, "Demand": 5821, "RevPAR % Chg": "22.1%"},
    {"Submarket": "Barcelona Beach", "City": "Barcelona", "State": "Cataluña", "Year": 2023, "Occupancy": "73.1%", "ADR": 217.80, "RevPAR": 159.21, "Supply": 8340, "Demand": 6097, "RevPAR % Chg": "16.6%"},
    {"Submarket": "Barcelona Beach", "City": "Barcelona", "State": "Cataluña", "Year": 2024, "Occupancy": "75.4%", "ADR": 236.50, "RevPAR": 178.32, "Supply": 8520, "Demand": 6424, "RevPAR % Chg": "12.0%"},
    # Madrid CBD
    {"Submarket": "Madrid CBD", "City": "Madrid", "State": "Comunidad de Madrid", "Year": 2022, "Occupancy": "68.2%", "ADR": 168.40, "RevPAR": 114.85, "Supply": 18920, "Demand": 12903, "RevPAR % Chg": "32.4%"},
    {"Submarket": "Madrid CBD", "City": "Madrid", "State": "Comunidad de Madrid", "Year": 2023, "Occupancy": "72.5%", "ADR": 186.20, "RevPAR": 134.99, "Supply": 19100, "Demand": 13848, "RevPAR % Chg": "17.5%"},
    {"Submarket": "Madrid CBD", "City": "Madrid", "State": "Comunidad de Madrid", "Year": 2024, "Occupancy": "74.1%", "ADR": 199.80, "RevPAR": 148.06, "Supply": 19350, "Demand": 14338, "RevPAR % Chg": "9.7%"},
    # Madrid IFEMA/Airport
    {"Submarket": "Madrid IFEMA", "City": "Madrid", "State": "Comunidad de Madrid", "Year": 2022, "Occupancy": "58.3%", "ADR": 112.50, "RevPAR": 65.59, "Supply": 6280, "Demand": 3661, "RevPAR % Chg": "45.1%"},
    {"Submarket": "Madrid IFEMA", "City": "Madrid", "State": "Comunidad de Madrid", "Year": 2023, "Occupancy": "64.7%", "ADR": 125.40, "RevPAR": 81.13, "Supply": 6350, "Demand": 4108, "RevPAR % Chg": "23.7%"},
    {"Submarket": "Madrid IFEMA", "City": "Madrid", "State": "Comunidad de Madrid", "Year": 2024, "Occupancy": "67.9%", "ADR": 131.20, "RevPAR": 89.08, "Supply": 6420, "Demand": 4359, "RevPAR % Chg": "9.8%"},
    # Sevilla Centro
    {"Submarket": "Sevilla Centro", "City": "Sevilla", "State": "Andalucía", "Year": 2022, "Occupancy": "65.8%", "ADR": 143.20, "RevPAR": 94.23, "Supply": 7840, "Demand": 5159, "RevPAR % Chg": "28.9%"},
    {"Submarket": "Sevilla Centro", "City": "Sevilla", "State": "Andalucía", "Year": 2023, "Occupancy": "70.2%", "ADR": 158.90, "RevPAR": 111.55, "Supply": 7920, "Demand": 5560, "RevPAR % Chg": "18.4%"},
    {"Submarket": "Sevilla Centro", "City": "Sevilla", "State": "Andalucía", "Year": 2024, "Occupancy": "72.1%", "ADR": 171.30, "RevPAR": 123.51, "Supply": 8050, "Demand": 5804, "RevPAR % Chg": "10.7%"},
    # Málaga Centro
    {"Submarket": "Málaga Centro", "City": "Málaga", "State": "Andalucía", "Year": 2022, "Occupancy": "66.5%", "ADR": 138.40, "RevPAR": 92.04, "Supply": 5620, "Demand": 3737, "RevPAR % Chg": "35.2%"},
    {"Submarket": "Málaga Centro", "City": "Málaga", "State": "Andalucía", "Year": 2023, "Occupancy": "71.3%", "ADR": 155.70, "RevPAR": 111.01, "Supply": 5750, "Demand": 4100, "RevPAR % Chg": "20.6%"},
    {"Submarket": "Málaga Centro", "City": "Málaga", "State": "Andalucía", "Year": 2024, "Occupancy": "73.8%", "ADR": 167.40, "RevPAR": 123.54, "Supply": 5860, "Demand": 4325, "RevPAR % Chg": "11.3%"},
])


# ── 4. Hotel Financials — internal template ────────────────────────────────────
# Two flagship hotels, 3 years of annual P&L (in €)

HOTEL_FINANCIALS = pd.DataFrame([
    # Hotel Arts Barcelona
    {
        "year": 2021, "period": "annual", "asset_name": "Hotel Arts Barcelona",
        "rooms_revenue": 28_450_000, "fb_revenue": 8_920_000, "other_revenue": 3_110_000,
        "total_revenue": 40_480_000, "total_expenses": 28_750_000, "noi": 11_730_000,
        "ebitda": 12_890_000, "noi_margin": 0.2897,
        "occupancy_rate": 0.624, "adr": 256.40, "revpar": 160.00,
    },
    {
        "year": 2022, "period": "annual", "asset_name": "Hotel Arts Barcelona",
        "rooms_revenue": 38_640_000, "fb_revenue": 11_850_000, "other_revenue": 4_200_000,
        "total_revenue": 54_690_000, "total_expenses": 36_420_000, "noi": 18_270_000,
        "ebitda": 19_840_000, "noi_margin": 0.3341,
        "occupancy_rate": 0.738, "adr": 298.50, "revpar": 220.50,
    },
    {
        "year": 2023, "period": "annual", "asset_name": "Hotel Arts Barcelona",
        "rooms_revenue": 47_210_000, "fb_revenue": 14_380_000, "other_revenue": 5_050_000,
        "total_revenue": 66_640_000, "total_expenses": 43_100_000, "noi": 23_540_000,
        "ebitda": 25_220_000, "noi_margin": 0.3533,
        "occupancy_rate": 0.768, "adr": 338.20, "revpar": 259.80,
    },
    # NH Collection Madrid Eurobuilding
    {
        "year": 2021, "period": "annual", "asset_name": "NH Collection Madrid Eurobuilding",
        "rooms_revenue": 12_340_000, "fb_revenue": 3_850_000, "other_revenue": 1_420_000,
        "total_revenue": 17_610_000, "total_expenses": 13_240_000, "noi": 4_370_000,
        "ebitda": 4_920_000, "noi_margin": 0.2482,
        "occupancy_rate": 0.581, "adr": 192.40, "revpar": 111.80,
    },
    {
        "year": 2022, "period": "annual", "asset_name": "NH Collection Madrid Eurobuilding",
        "rooms_revenue": 18_920_000, "fb_revenue": 5_680_000, "other_revenue": 2_100_000,
        "total_revenue": 26_700_000, "total_expenses": 18_650_000, "noi": 8_050_000,
        "ebitda": 8_780_000, "noi_margin": 0.3015,
        "occupancy_rate": 0.694, "adr": 221.80, "revpar": 153.90,
    },
    {
        "year": 2023, "period": "annual", "asset_name": "NH Collection Madrid Eurobuilding",
        "rooms_revenue": 24_180_000, "fb_revenue": 7_230_000, "other_revenue": 2_680_000,
        "total_revenue": 34_090_000, "total_expenses": 22_980_000, "noi": 11_110_000,
        "ebitda": 11_990_000, "noi_margin": 0.3259,
        "occupancy_rate": 0.728, "adr": 248.60, "revpar": 181.00,
    },
])


# ── 5. Internal Hotels Template ────────────────────────────────────────────────
# Matches the parser.py "hotels" schema exactly

INTERNAL_HOTELS = pd.DataFrame([
    {
        "name": "Hotel Arts Barcelona",
        "city": "Barcelona",
        "country": "ES",
        "total_keys": 483,
        "brand": "Ritz-Carlton",
        "chain_scale": "Luxury",
        "year_built": 1994,
        "star_rating": 5.0,
        "asset_status": "operating",
        "operator": "Four Seasons Hotels and Resorts",
        "submarket": "Barcelona Beach",
        "latitude": 41.3857,
        "longitude": 2.1974,
    },
    {
        "name": "Hotel W Barcelona",
        "city": "Barcelona",
        "country": "ES",
        "total_keys": 473,
        "brand": "W Hotels",
        "chain_scale": "Luxury",
        "year_built": 2009,
        "star_rating": 5.0,
        "asset_status": "operating",
        "operator": "Marriott International",
        "submarket": "Barcelona Beach",
        "latitude": 41.3743,
        "longitude": 2.1897,
    },
    {
        "name": "Hilton Diagonal Mar Barcelona",
        "city": "Barcelona",
        "country": "ES",
        "total_keys": 433,
        "brand": "Hilton",
        "chain_scale": "Upscale",
        "year_built": 2002,
        "star_rating": 4.0,
        "asset_status": "operating",
        "operator": "Hilton Worldwide",
        "submarket": "Barcelona Beach",
        "latitude": 41.4098,
        "longitude": 2.2183,
    },
    {
        "name": "NH Collection Madrid Eurobuilding",
        "city": "Madrid",
        "country": "ES",
        "total_keys": 342,
        "brand": "NH Collection",
        "chain_scale": "Upper Upscale",
        "year_built": 2014,
        "star_rating": 5.0,
        "asset_status": "operating",
        "operator": "NH Hotel Group",
        "submarket": "Madrid CBD",
        "latitude": 40.4543,
        "longitude": -3.6892,
    },
    {
        "name": "Meliá Castilla",
        "city": "Madrid",
        "country": "ES",
        "total_keys": 936,
        "brand": "Meliá",
        "chain_scale": "Upper Upscale",
        "year_built": 1976,
        "star_rating": 4.0,
        "asset_status": "operating",
        "operator": "Meliá Hotels International",
        "submarket": "Madrid CBD",
        "latitude": 40.4590,
        "longitude": -3.6877,
    },
    {
        "name": "Gran Hotel Miramar",
        "city": "Málaga",
        "country": "ES",
        "total_keys": 204,
        "brand": "Gran Hotel Miramar",
        "chain_scale": "Luxury",
        "year_built": 1926,
        "star_rating": 5.0,
        "asset_status": "operating",
        "operator": "GL Hotels",
        "submarket": "Málaga Centro",
        "latitude": 36.7157,
        "longitude": -4.4073,
    },
    {
        "name": "Hotel Alfonso XIII",
        "city": "Sevilla",
        "country": "ES",
        "total_keys": 148,
        "brand": "A Luxury Collection",
        "chain_scale": "Luxury",
        "year_built": 1928,
        "star_rating": 5.0,
        "asset_status": "operating",
        "operator": "Marriott International",
        "submarket": "Sevilla Centro",
        "latitude": 37.3838,
        "longitude": -5.9939,
    },
    {
        # Intentional errors for pipeline testing:
        # missing name, invalid star_rating
        "name": "",
        "city": "Valencia",
        "country": "ES",
        "total_keys": 220,
        "brand": "Marriott",
        "chain_scale": "Upscale",
        "year_built": 2010,
        "star_rating": 9.0,    # out of range → validation error
        "asset_status": "operating",
    },
])


# ── Write files ─────────────────────────────────────────────────────────────────

def _write(df: pd.DataFrame, stem: str) -> None:
    xlsx_path = OUT / f"{stem}.xlsx"
    csv_path = OUT / f"{stem}.csv"
    df.to_excel(xlsx_path, index=False)
    df.to_csv(csv_path, index=False)
    print(f"  wrote {xlsx_path.name}  ({len(df)} rows)  +  {csv_path.name}")


if __name__ == "__main__":
    print(f"Generating sample data -> {OUT}/\n")
    _write(COSTAR_HOTELS, "costar_hotels")
    _write(COSTAR_TRANSACTIONS, "costar_transactions")
    _write(COSTAR_MARKET, "costar_market")
    _write(HOTEL_FINANCIALS, "hotel_financials")
    _write(INTERNAL_HOTELS, "internal_hotels")
    print("\nDone. Run validate_samples.py to test the pipeline against these files.")
