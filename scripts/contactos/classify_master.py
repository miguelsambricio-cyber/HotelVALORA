#!/usr/bin/env python3
"""
Classify all Master contacts by contact_category (column 63).

Categories (Spanish, case-sensitive):
  - Principal: hotel owners, investors
  - Broker: intermediaries, consultants, brokers
  - Lender: financiers, banks
  - Developer: constructors, promoters, renovators
  - Proveedor: services/materials suppliers (NOT HotelVALORA tech stack)
  - IA aplicaciones: HotelVALORA's own integrations + tech providers
  - Uncategorized: fallback

Classifier inputs per row: email, company, role, investor_type, industry, title, gmail_labels.
Priority order: first match wins.

Re-runnable: checks for existing contact_category column, updates in-place.
"""
from __future__ import annotations

import sys
import os
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook

from _phase_b_repair_freeze import abort_if_frozen

abort_if_frozen("classify_master.py")

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent.parent
MASTER_PATH = ROOT / "CONTACTOS DATASITE" / "master" / "metcub-contacts-master.xlsx"


# Tech provider domains / companies (IA aplicaciones)
TECH_DOMAINS = {
    "rapidapi.com", "mapbox.com", "supabase.com", "resend.com", "vercel.com",
    "posthog.com", "sentry.io", "mailchimp.com", "namecheap.com", "datasite.com",
    "salesforce.com", "zapier.com", "anthropic.com", "openai.com", "github.com",
    "wordpress.com", "hubspot.com", "intercom.com", "stripe.com", "figma.com",
    "claude.ai"
}

# Lender domains
LENDER_DOMAINS = {
    "bbva.com", "bbva.es", "bancsabadell.com", "caixabank.com", "caixabank.es",
    "bankinter.com", "santander.com", "gruposantander.es", "ing.com", "novobanco.es",
    "ibercaja.es", "sareb.es", "libertymutual.com", "sabadell.com", "bancamarch.es",
    "bancomarch.es"
}

# Broker domains
BROKER_DOMAINS = {
    "cbre.com", "cbrehotels.com", "jll.com", "eu.jll.com", "savills.com",
    "savills-aguirrenewman.es", "colliers.com", "email.colliers.com", "christie.com",
    "labordemarcet.com", "engelvoelkers.com", "berkadia.com", "e.berkadia.com",
    "forcadell.com", "mapesainversiones.com", "dparealestate.com", "hlb.com.pt",
    "iberolat.com", "tcapital.es", "pierrecelestin-group.com", "qualyx.es",
    "arnold.investments", "cushwake.com", "matamalayasociados.es", "foodbox.es",
    "arcofood.com", "rcm1.com", "datasite.com"
}

# Developer companies
DEVELOPER_PATTERN = re.compile(
    r'\b(promotor|constructor|construccion|construcción|aedas|metrovacesa|neinor|'
    r'grupo lar|colonial|monthisa|inmoglaciar|fernandez molina|strabag|drees|'
    r'gettys|ubm|reig|exclusive|ardid|ard-id)\b',
    re.IGNORECASE
)

# Principal (hotel/chain) companies
PRINCIPAL_PATTERN = re.compile(
    r'\b(hotel|hoteles|resort|melia|nh|hyatt|marriott|hilton|accor|wyndham|'
    r'iberostar|hotusa|citizenm|catalonia|barcelo|riu|grupo posadas|kempinski|'
    r'mandarin|virgin|h10|hospes|alda|ihg|fattal|covivio|invesco)\b',
    re.IGNORECASE
)

# Proveedor companies (non-tech)
PROVEEDOR_PATTERN = re.compile(
    r'\b(foodbox|restalia|mentidero|grupo azotea|brunchit|grupo escondite|'
    r'streetsense|gestoria|abogados|legal|notario|arquitecto|architects|'
    r'architecture|interiorismo|dipsa|workmanager|mazars|deloitte)\b',
    re.IGNORECASE
)

# Lender company pattern
LENDER_PATTERN = re.compile(
    r'\b(bank|banc|banco|caixa|sabadell|santander|liberty|sareb|march)\b',
    re.IGNORECASE
)

# Broker company pattern
BROKER_PATTERN = re.compile(
    r'\b(cbre|jll|colliers|savills|christie|engel|laborde|berkadia|forcadell|'
    r'cushman|wakefield)\b',
    re.IGNORECASE
)


def extract_domain(email: str) -> str:
    """Extract domain from email address."""
    if "@" not in email:
        return ""
    return email.split("@", 1)[1].lower() if email else ""


def classify_row(row: dict[str, str | None]) -> str:
    """
    Classify a single row using priority-ordered rules.
    Returns the category name (Spanish, case-sensitive).
    """
    email = (row.get("email") or "").strip()
    company = (row.get("company") or "").strip()
    role = (row.get("role") or "").strip()
    investor_type = (row.get("investor_type") or "").strip()
    industry = (row.get("industry") or "").strip()
    title = (row.get("title") or "").strip()
    gmail_labels = (row.get("gmail_labels") or "").strip()

    domain = extract_domain(email)

    # 1. IA aplicaciones
    if domain in TECH_DOMAINS or "IA APLICACIONES" in gmail_labels.upper():
        return "IA aplicaciones"

    # 2. Lender
    if "FINANCIADOR" in gmail_labels.upper():
        return "Lender"
    if domain in LENDER_DOMAINS or LENDER_PATTERN.search(company):
        return "Lender"

    # 3. Broker
    if "INTERMEDIARIO" in gmail_labels.upper():
        return "Broker"
    if domain in BROKER_DOMAINS or BROKER_PATTERN.search(company):
        return "Broker"
    if re.search(r'\b(broker|agent|consultant|advisor|asesor|intermediario|consultor)\b', title, re.IGNORECASE):
        return "Broker"

    # 4. Developer
    gmail_upper = gmail_labels.upper()
    if "PROMOTOR" in gmail_upper or "CONSTRUCTOR" in gmail_upper:
        return "Developer"
    if DEVELOPER_PATTERN.search(company):
        return "Developer"

    # 5. Principal
    gmail_check = any(tag in gmail_upper for tag in ["INVERSOR", "INVERSORES", "CADENA", "PROPIETARIO", "BRANDED", "RONDA", "LOI", "MoU"])
    if gmail_check:
        return "Principal"
    if investor_type and investor_type.lower() not in ("broker", "lender", "developer"):
        return "Principal"
    if PRINCIPAL_PATTERN.search(company):
        return "Principal"
    if re.search(r'\b(principal|investor|owner|propietario)\b', role, re.IGNORECASE):
        return "Principal"

    # 6. Proveedor
    if "F&B" in gmail_labels.upper() or "PROVEEDOR" in gmail_labels.upper():
        return "Proveedor"
    if PROVEEDOR_PATTERN.search(company) and domain not in TECH_DOMAINS:
        return "Proveedor"

    # 7. Uncategorized fallback
    return "Uncategorized"


def main() -> int:
    if not MASTER_PATH.exists():
        print(f"ERROR: Master file not found at {MASTER_PATH}")
        return 1

    # Step 1: Read in read-mode to assess current state
    print(f"Reading Master from {MASTER_PATH}...")
    wb_read = load_workbook(MASTER_PATH, read_only=True)
    ws_read = wb_read["Master"]

    header_row = []
    for cell in ws_read[1]:
        header_row.append(cell.value or "")

    has_contact_category = "contact_category" in header_row
    print(f"Current column count: {len(header_row)}")
    print(f"contact_category column exists: {has_contact_category}")
    print(f"Total data rows: {ws_read.max_row - 1}")

    # Read all data rows
    data_rows = []
    for row_idx, row in enumerate(ws_read.iter_rows(min_row=2, values_only=False), start=2):
        row_dict = {}
        for col_idx, cell in enumerate(row):
            if col_idx < len(header_row):
                col_name = header_row[col_idx]
                row_dict[col_name] = cell.value
        data_rows.append(row_dict)

    wb_read.close()

    print(f"Loaded {len(data_rows)} data rows")

    # Step 2: Open in write mode and classify
    print("Opening Master in write mode for classification...")
    wb = load_workbook(MASTER_PATH)
    ws = wb["Master"]

    # Add header if missing
    if not has_contact_category:
        ws.cell(row=1, column=63).value = "contact_category"
        print("Added contact_category column header at column 63")

    # Classify each row
    classifications = defaultdict(int)
    for row_idx, row_dict in enumerate(data_rows, start=2):
        category = classify_row(row_dict)
        ws.cell(row=row_idx, column=63).value = category
        classifications[category] += 1

    # Step 3: Save
    print("Saving Master workbook...")
    wb.save(MASTER_PATH)
    wb.close()

    # Step 4: Print distribution
    print("\n" + "=" * 70)
    print("CLASSIFICATION DISTRIBUTION")
    print("=" * 70)
    total = sum(classifications.values())
    for category in ["Principal", "Broker", "Lender", "Developer", "Proveedor", "IA aplicaciones", "Uncategorized"]:
        count = classifications.get(category, 0)
        pct = (count / total * 100) if total > 0 else 0
        print(f"  {category:20s}: {count:5d} ({pct:5.1f}%)")
    print(f"  {'TOTAL':20s}: {total:5d} (100.0%)")
    print("=" * 70)

    print(f"\n✓ Master classified successfully")
    return 0


if __name__ == "__main__":
    sys.exit(main())
