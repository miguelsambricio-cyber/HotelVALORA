"""
Unit smoke for ingest_consolidated.py · checkpoint (a) of β plan.

5 synthetic FASE 1/2/3-style raw rows + assertions covering:
  - per-row build_candidate_from_raw (mapping + identity gate)
  - identity_key per candidate
  - aggregate_candidates collapses duplicates (rows 1+5 share email)
  - build_notes_for_master payload prefixed correctly
  - merge_consolidated_into_master_row NORMAL mode (gap-fill)
  - merge_consolidated_into_master_row PARANOID mode (Datasite-seeded · only notes)
  - categoria_to_lane mapping (full taxonomy)

Master is NEVER touched. Cero side effects on disk.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_consolidated import (
    aggregate_candidates,
    build_candidate_from_raw,
    build_notes_for_master,
    candidate_identity_key,
    categoria_to_lane,
    is_datasite_master_row,
    merge_consolidated_into_master_row,
)


def main() -> int:
    print("=" * 70)
    print("UNIT SMOKE · 5 sintetic rows + sanity checks")
    print("=" * 70)

    raw_inputs = [
        # 1. Institutional email · Outlook Contactos
        {
            "Nombre": "Jane", "Apellidos": "Investor",
            "Email": "jane.investor@blackstone.com",
            "Telefono": "+34 91 555 0001", "Movil": "+34 600 111 222",
            "Empresa": "Blackstone Real Estate Partners",
            "Cargo": "Managing Director", "Departamento": "Hotels EMEA",
            "Direccion": "Plaza Castilla 1", "Ciudad": "Madrid", "Pais": "Spain",
            "Web": "https://www.linkedin.com/in/janeinvestor/",
            "Notas": "Met at IHIF 2024 · interested in branded residences",
            "Categoria": "Outlook Contactos", "Fuente_Archivo": "1 excel.xlsx",
        },
        # 2. LinkedIn URL only · no email · LinkedIn Outlook fmt
        {
            "Nombre": "Marcus", "Apellidos": "Operator",
            "Email": "",
            "Empresa": "Marriott International",
            "Cargo": "VP Development",
            "Web": "linkedin.com/in/marcusoperator",
            "Notas": "Conf call 2023",
            "Categoria": "LinkedIn (Outlook fmt)",
            "Fuente_Archivo": "linkedin_connections_export_microsoft_outlook.csv",
        },
        # 3. Name + company only · no email no linkedin · VCF Movil
        {
            "Nombre": "Carlos", "Apellidos": "Banker",
            "Empresa": "Banco Santander - Hotel Lending",
            "Cargo": "Head of RE Lending",
            "Telefono": "+34 91 333 4444",
            "Categoria": "VCF Movil",
            "Fuente_Archivo": "Contactos.vcf",
        },
        # 4. Garbage row · no identifier · should be REJECTED
        {
            "Nombre": "", "Apellidos": "",
            "Email": "", "Telefono": "",
            "Empresa": "",
            "Categoria": "Outlook Contactos",
            "Fuente_Archivo": "1 excel.xlsx",
        },
        # 5. SAME PERSON as row 1 from PST source · case difference in email
        {
            "Nombre": "Jane", "Apellidos": "Investor",
            "Email": "JANE.INVESTOR@blackstone.com",
            "Empresa": "Blackstone REP",
            "Cargo": "MD",
            "Rol": "Sender", "Asunto": "Re: NDA executed - Senator Playa",
            "Fecha": "2024-12-15",
            "Carpeta_PST": "Inbox/Senator Playa",
            "PST": "miguel.sam@hotusa.com.pst",
            "Categoria": "PST: Outlook",
            "Fuente_Archivo": "miguel.sam@hotusa.com.pst",
        },
    ]

    print("\n[A] build_candidate_from_raw on 5 rows")
    candidates = []
    for i, raw in enumerate(raw_inputs, 1):
        c = build_candidate_from_raw(raw, source_file="test_input.xlsx")
        if c is None:
            mark = "OK" if i == 4 else "UNEXPECTED"
            print(f"  row {i} REJECTED (no identifier) [{mark}]")
        else:
            print(f"  row {i} kept · name='{c['full_name']}' email='{c['primary_email']}'"
                  f" linkedin='{c['linkedin']}' lane='{c['source_capa_a']}'")
            candidates.append(c)

    assert len(candidates) == 4, f"FAIL: expected 4 valid candidates, got {len(candidates)}"
    print(f"  -> {len(candidates)} valid (expected 4) OK")

    print("\n[B] identity_key per candidate")
    for c in candidates:
        k = candidate_identity_key(c)
        print(f"  {c['full_name'][:25]:<25} -> {k}")

    print("\n[C] aggregate_candidates collapses rows 1 and 5 by email")
    aggregated = aggregate_candidates(candidates)
    print(f"  aggregated count: {len(aggregated)} (expected 3)")
    assert len(aggregated) == 3, f"FAIL: expected 3, got {len(aggregated)}"

    for agg in aggregated:
        print(f"\n  AGG {agg['full_name']} (raw_count={agg['raw_count']})")
        print(f"     email={agg['primary_email']}  phone={agg['primary_phone']}")
        print(f"     linkedin={agg['linkedin'][:60]}")
        print(f"     company={agg['company']}  title={agg['title']}")
        print(f"     city={agg['city']}  country={agg['country']}")
        print(f"     source_capa_a={agg['source_capa_a']}")
        print(f"     categorias={agg['categorias']}")
        print(f"     roles_display={agg['roles_display']!r}")
        print(f"     top_subjects={agg['top_subjects']}")
        print(f"     top_pst_folders={agg['top_pst_folders']}")
        print(f"     max_fecha={agg['max_fecha']}")
        print(f"     notas_combined={agg['notas_combined'][:80]!r}")

    jane = next((a for a in aggregated if "Jane" in a["full_name"]), None)
    assert jane is not None, "FAIL: Jane disappeared"
    assert jane["raw_count"] == 2, f"FAIL: Jane raw_count={jane['raw_count']}"
    assert jane["primary_email"] == "jane.investor@blackstone.com", \
        f"FAIL: email not normalized lowercase: {jane['primary_email']}"
    assert jane["max_fecha"] == "2024-12-15", f"FAIL: max_fecha={jane['max_fecha']}"
    assert "outlook_pst" in jane["source_capa_a"] or "outlook_libreta" in jane["source_capa_a"], \
        f"FAIL: lane mix lost: {jane['source_capa_a']}"
    print(f"\n  -> Jane merged OK · raw=2 · lanes={jane['source_capa_a']}"
          f" · fecha_max={jane['max_fecha']}")

    print("\n[D] build_notes_for_master sample for Jane")
    notes = build_notes_for_master(jane, "2026-05-29")
    print(f"  notes:\n    {notes}")
    assert "[2026-05-29" in notes, "FAIL: timestamp prefix missing"
    print("  -> notes payload OK")

    print("\n[E1] NORMAL MODE merge into empty Master row (gap-fill)")
    fake_empty = {
        "master_id": "abc123",
        "full_name": "Jane Investor",
        "email": "", "phone": "", "linkedin": "",
        "title": "", "company": "", "city": "", "country": "",
        "notes_consolidated": "",
        "source_file": "google-contacts-imported",
        "datasite_contact_number": "",
        "last_seen_batch_id": "", "last_updated_at": "",
    }
    changed = merge_consolidated_into_master_row(fake_empty, jane, batch_id="20260529T000000Z")
    print(f"     fields changed: {changed}")
    print(f"     email='{fake_empty['email']}'  phone='{fake_empty['phone']}'")
    print(f"     company='{fake_empty['company']}'  city='{fake_empty['city']}'")
    print(f"     source_file='{fake_empty['source_file']}'")
    assert "email" in changed, "FAIL: email not gap-filled"
    assert "phone" in changed, "FAIL: phone not gap-filled"
    assert "company" in changed, "FAIL: company not gap-filled"
    assert fake_empty["email"] == "jane.investor@blackstone.com"
    print("  -> normal mode OK")

    print("\n[E2] PARANOID MODE · Datasite-seeded row · ONLY notes should change")
    fake_datasite = {
        "master_id": "def456",
        "full_name": "Jane Investor",
        "email": "jane.different@datasite.com",
        "phone": "+999EXISTING",
        "linkedin": "linkedin.com/in/datasite-version",
        "title": "Director (Datasite)",
        "company": "Blackstone (Datasite canonical)",
        "city": "London", "country": "UK",
        "notes_consolidated": "Original Datasite note",
        "source_file": "datasite-20260512_METCUB_Full_Report.xlsm",
        "datasite_contact_number": "12345",
        "last_seen_batch_id": "", "last_updated_at": "",
    }
    before = dict(fake_datasite)
    assert is_datasite_master_row(fake_datasite), "FAIL: paranoid detection broken"
    changed_p = merge_consolidated_into_master_row(fake_datasite, jane, batch_id="20260529T000001Z")
    print(f"     fields changed: {changed_p}")
    print(f"     email AFTER: '{fake_datasite['email']}' (was '{before['email']}')")
    print(f"     phone AFTER: '{fake_datasite['phone']}'")
    print(f"     company AFTER: '{fake_datasite['company']}'")
    print(f"     notes AFTER: '{fake_datasite['notes_consolidated'][:120]}'")
    for protected in ("email", "phone", "linkedin", "title", "company", "city", "country"):
        assert fake_datasite[protected] == before[protected], \
            f"PARANOID FAIL: {protected} was overwritten"
    # Paranoid allowed changes: notes_consolidated and/or source_capa_a (provenance metadata)
    allowed = {"notes_consolidated", "source_capa_a"}
    illegal = [c for c in changed_p if c not in allowed]
    assert not illegal, f"PARANOID FAIL: illegal canonical changes: {illegal}"
    print(f"  -> paranoid mode OK · allowed changes={changed_p}")

    print("\n[F] categoria_to_lane mapping")
    cases = [
        ("Outlook Contactos", "outlook_libreta"),
        ("Outlook Historico", "unknown"),  # without accent · expected unknown
        ("LinkedIn", "linkedin_csv"),
        ("LinkedIn (Outlook fmt)", "linkedin_outlook_fmt"),
        ("LinkedIn Imported", "linkedin_imported"),
        ("VCF Movil", "vcf"),
        ("Access Contactos", "access"),
        ("PST: Inbox/Senator", "outlook_pst"),
        ("Brokers", "outlook_msg"),
        ("Correo Personal", "outlook_msg"),
        ("Unknown thing", "unknown"),
        ("", "unknown"),
    ]
    for cat, expected in cases:
        got = categoria_to_lane(cat)
        mark = "OK" if got == expected else "FAIL"
        print(f"  '{cat}' -> '{got}' (expected '{expected}') [{mark}]")
        assert got == expected, f"FAIL: '{cat}' -> '{got}' != '{expected}'"

    print("\n" + "=" * 70)
    print("ALL SMOKE ASSERTIONS PASS · Master never touched")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
