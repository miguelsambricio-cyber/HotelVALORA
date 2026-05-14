#!/usr/bin/env python3
"""
Inbox organizer · harvest + classify + plan + execute.

Step 1: Exhaustively paginate Gmail inbox and save thread JSONs.
Step 2: For each thread, classify into target label + pending_response + is_noise.
Step 3: Write plan CSV for operator review.
Step 4: Execute label/unlabel operations in batches.
"""
from __future__ import annotations

import csv
import json
import sys
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent.parent
HARVEST_DIR = ROOT / "CONTACTOS DATASITE" / "google-contacts" / "inbox-harvest"
REPORTS_DIR = ROOT / "CONTACTOS DATASITE" / "reports"
HARVEST_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Miguel's addresses
MIGUEL_ADDRS = {
    "miguel.sambricio@metcub.com",
    "miguel.sambricio@build3rent.com",
    "miguel.sambricio@gmail.com",
}

# Noise patterns (expanded from harvest_untagged.py)
NOISE_DOMAINS = {
    "messerbranding.com", "signaturit.com", "posthog.com",
    "buttondown.email", "growthoptimizationbuzz.com",
    "growth-buzz.com", "gosmartflowautomation.lat",
    "startzetaautomations.com", "metlabs.io", "esfaronics.es",
    "niceleads.io", "mindfulabs.tech", "cre.niceleads.io",
    "panelcliente.net", "online.mdanderson.es",
    "surveys.cigna.com", "events.caixabank.com",
    "hubspotfree.hs-send.com", "hedgestone.ccsend.com",
    "leadscavviar.com", "ccsend.com",
    "fremap.es", "fremap_comunica@fremap.es",
    "rebuildexpo.com", "acelerapyme.gob.es",
    "send.zapier.com", "mail.zapier.com",
    "salesforce.com", "spglobal.com",
    "platform.datasite.com",
    "webguestadmin.com",
    "studiohc.es", "puntmobles.com", "estiluz.pro",
    "munka.es", "exclama.es",
    "solredprofesionales@email.repsol.com", "email.repsol.com",
    "uam.ventas-uam-asistencia", "fuerzacomercial.es",
    "mvfinancehq.com", "ai@mindfulabs.tech",
    # Tech providers & onboarding noise
    "events.sentry.io", "notifications.stripe.com", "noreply.github.com",
    "googledev-noreply@google.com", "noreply.supabase.com", "welcome.supabase.com",
    "onboarding.resend.dev", "zeno.rocha.resend.com", "developer.email.apple.com",
    "hello.mapbox.com", "joe.posthog.com", "notifications.vercel.com",
    "noreply.enviocfdi.com", "ceofeedback.namecheap.com",
}

NOISE_SUBJECT_PATTERNS = (
    "factura electrónica", "factura electronica",
    "cita confirmada", "cita médica", "encuesta de satisfacción",
    "docusign", "ficha cliente", "reporte mensual",
    "salarios", "nóminas", "nominas",
    "cheque regalo", "promoción", "promocion",
    "newsletter", "subscription", "suscripción", "suscripcion",
    "welcome to", "your enrollment", "your zaps",
    "automatic reply", "respuesta automática",
    "out of office", "out of the office",
    "tokenización", "tokenizacion",
    "podcast", "rebuild ", "kit digital",
    "onboarding", "oauth", "github", "verify", "verification",
    "your invoice", "billing", "account", "configuration",
)

# Label ID mapping
LABEL_IDS = {
    "INBOX": "INBOX",
    "UNREAD": "UNREAD",
    "PENDIENTE_RESPUESTA": "Label_2",  # 0. PENDIENTE RESPUESTA
    "A_HOTEL_ABIERTO": "Label_1904714253200927916",
    "PROVEEDORES": "Label_3933472503415887671",
    "IA_APLICACIONES": "Label_2838605109516578648",
    "FINANCIADORES_SEGUIMIENTO": "Label_7695816251656907005",
    "INTERMEDIARIO": "Label_196241810819333247",
    "PROMOTOR_CONSTRUCTOR": "Label_2554658493175486194",
}


def is_noise(thread: dict[str, Any]) -> bool:
    """Detect if thread is pure noise (newsletters, billing, etc.)."""
    if not thread.get("messages"):
        return False

    # Check last message sender
    last_msg = thread["messages"][-1]
    sender = (last_msg.get("sender") or "").lower()
    domain = sender.split("@", 1)[-1] if "@" in sender else ""

    subject = (last_msg.get("subject") or "").lower()

    # Domain-based noise
    if domain in NOISE_DOMAINS:
        return True

    # Subject pattern-based noise
    for pat in NOISE_SUBJECT_PATTERNS:
        if pat in subject:
            return True

    return False


def compute_pending_response(thread: dict[str, Any]) -> bool:
    """True if the LAST message is NOT from Miguel."""
    if not thread.get("messages"):
        return False

    last_msg = thread["messages"][-1]
    sender = (last_msg.get("sender") or "").lower()

    return sender not in MIGUEL_ADDRS


def infer_category_from_thread(thread: dict[str, Any]) -> tuple[str, str, str]:
    """
    Infer contact category (Principal/Broker/Lender/Developer/Proveedor/IA/Other)
    and return (category, target_label_name, reason).

    Uses sender domain + subject + existing labels.
    """
    if not thread.get("messages"):
        return "Other", "A_HOTEL_ABIERTO", "empty thread"

    last_msg = thread["messages"][-1]
    sender = (last_msg.get("sender") or "").lower()
    domain = sender.split("@", 1)[-1] if "@" in sender else ""
    subject = (last_msg.get("subject") or "").lower()

    # Collect all labels from all messages
    all_labels = set()
    for msg in thread.get("messages", []):
        for lbl in msg.get("labelIds", []) or []:
            all_labels.add(lbl)

    labels_str = " ".join(str(l).upper() for l in all_labels)

    # Tech providers → IA aplicaciones
    tech_domains = {
        "rapidapi.com", "mapbox.com", "supabase.com", "resend.com", "vercel.com",
        "posthog.com", "sentry.io", "mailchimp.com", "namecheap.com", "datasite.com",
        "salesforce.com", "zapier.com", "anthropic.com", "openai.com", "github.com",
        "wordpress.com", "hubspot.com", "intercom.com", "stripe.com", "figma.com",
    }
    if domain in tech_domains or "IA APLICACIONES" in labels_str:
        return "IA", "IA_APLICACIONES", f"tech domain {domain}"

    # Lenders
    if "FINANCIADOR" in labels_str:
        return "Lender", "FINANCIADORES_SEGUIMIENTO", "FINANCIADOR label"
    lender_domains = {"bbva.com", "bbva.es", "caixabank.com", "caixabank.es", "santander.com", "bankinter.com"}
    if domain in lender_domains:
        return "Lender", "FINANCIADORES_SEGUIMIENTO", f"lender domain {domain}"

    # Brokers
    if "INTERMEDIARIO" in labels_str:
        return "Broker", "INTERMEDIARIO", "INTERMEDIARIO label"
    broker_domains = {"cbre.com", "jll.com", "savills.com", "colliers.com", "berkadia.com"}
    if domain in broker_domains:
        return "Broker", "INTERMEDIARIO", f"broker domain {domain}"

    # Developers
    if "PROMOTOR" in labels_str or "CONSTRUCTOR" in labels_str:
        return "Developer", "PROMOTOR_CONSTRUCTOR", "promotor/constructor label"

    # Principal (hotel ops/investors)
    if any(tag in labels_str for tag in ["INVERSOR", "CADENA", "PROPIETARIO", "LOI", "MOU"]):
        return "Principal", "A_HOTEL_ABIERTO", "investor/hotel label"
    hotel_domains = {"melia.com", "nh.com", "marriott.com", "hilton.com"}
    if domain in hotel_domains:
        return "Principal", "A_HOTEL_ABIERTO", f"hotel domain {domain}"

    # Default to hotel opportunity
    return "Other", "A_HOTEL_ABIERTO", "default classification"


def classify_thread(thread: dict[str, Any]) -> dict[str, Any]:
    """
    Classify a single thread.
    Returns: {
        thread_id, last_date, sender, subject,
        target_label_name, target_label_id,
        pending_response, is_noise, classification_reason
    }
    """
    if not thread.get("messages"):
        return {}

    thread_id = thread.get("id", "")
    last_msg = thread["messages"][-1]
    sender = last_msg.get("sender", "")
    subject = last_msg.get("subject", "")
    date = last_msg.get("date", "")

    is_noise_flag = is_noise(thread)
    pending_resp = compute_pending_response(thread)
    category, target_label_name, reason = infer_category_from_thread(thread)

    target_label_id = LABEL_IDS.get(target_label_name, "")

    return {
        "thread_id": thread_id,
        "last_date": date[:10] if date else "",
        "sender": sender,
        "subject": subject[:80],
        "target_label_name": target_label_name,
        "target_label_id": target_label_id,
        "pending_response": "yes" if pending_resp else "no",
        "is_noise": "yes" if is_noise_flag else "no",
        "classification_reason": reason,
    }


def harvest_inbox_from_file(harvest_file: Path) -> list[dict[str, Any]]:
    """
    Load harvested threads from a JSON file saved by Gmail MCP pagination.
    Expected format: {"threads": [...], "nextPageToken": "..."}
    """
    if not harvest_file.exists():
        return []

    try:
        with harvest_file.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("threads", [])
    except Exception as e:
        print(f"  ERROR reading {harvest_file.name}: {e}")
        return []


def main() -> int:
    """Main orchestrator."""
    print("=" * 70)
    print("INBOX ORGANIZER · Step 1: Harvest Gmail inbox")
    print("=" * 70)

    # NOTE: In a real scenario, here we'd paginate Gmail with multiple
    # search_threads calls, following nextPageToken. For now, we'll
    # document the expected flow.

    print("\nNOTE: Gmail MCP pagination requires manual tool invocation.")
    print("Run these commands to harvest the inbox in batches:")
    print("  1. mcp__claude_ai_Gmail__search_threads(query='in:inbox', pageSize=50)")
    print("  2. Save each response as inbox-harvest-pg{N}.json")
    print("  3. Use nextPageToken from response to paginate")
    print("\nFor now, we'll look for any existing harvest files...")

    harvest_files = sorted(HARVEST_DIR.glob("inbox-harvest-pg*.json"))
    print(f"\nFound {len(harvest_files)} harvest file(s)")

    all_threads: dict[str, dict] = {}
    for hf in harvest_files:
        threads = harvest_inbox_from_file(hf)
        for t in threads:
            tid = t.get("id")
            if tid:
                all_threads[tid] = t
        print(f"  {hf.name}: {len(threads)} threads")

    print(f"\nTotal unique threads: {len(all_threads)}")

    # ────────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("INBOX ORGANIZER · Step 2: Classify threads")
    print("=" * 70)

    plan_rows = []
    for thread in all_threads.values():
        classified = classify_thread(thread)
        if classified:
            plan_rows.append(classified)

    print(f"Classified {len(plan_rows)} threads")

    # Distribution
    label_counts = defaultdict(int)
    noise_count = sum(1 for r in plan_rows if r["is_noise"] == "yes")
    pending_count = sum(1 for r in plan_rows if r["pending_response"] == "yes")

    for r in plan_rows:
        label_counts[r["target_label_name"]] += 1

    print(f"\nDistribution by target label:")
    for label, count in sorted(label_counts.items(), key=lambda x: -x[1]):
        print(f"  {label:30s}: {count:4d}")
    print(f"  {'is_noise':30s}: {noise_count:4d}")
    print(f"  {'pending_response':30s}: {pending_count:4d}")

    # ────────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("INBOX ORGANIZER · Step 3: Write plan CSV")
    print("=" * 70)

    ts = datetime.now().strftime("%Y%m%dT%H%M%SZ")
    plan_csv = REPORTS_DIR / f"inbox-cleanup-plan-{ts}.csv"

    with plan_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[
            "thread_id", "last_date", "sender", "subject",
            "target_label_name", "target_label_id",
            "pending_response", "is_noise", "classification_reason",
        ])
        w.writeheader()
        for row in plan_rows:
            w.writerow(row)

    print(f"Plan written to {plan_csv.name}")
    print(f"Total threads in plan: {len(plan_rows)}")
    print("\nOperator: review plan before proceeding to Step 4 (execution)")

    # ────────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("INBOX ORGANIZER · Step 4: Auto-execute (BATCHED, NO ERRORS YET)")
    print("=" * 70)

    # NOTE: In a real scenario, here we'd call Gmail MCP tools:
    # - For noise: unlabel_thread(threadId, labelIds=["INBOX"])
    # - For real contacts: label_thread(threadId, labelIds=[target_id])
    #   + add pending label if pending_response == "yes"
    #   + then unlabel INBOX

    # For now, just summarize what WOULD happen
    execute_plan = []
    for row in plan_rows:
        tid = row["thread_id"]
        is_noise = row["is_noise"] == "yes"
        pending = row["pending_response"] == "yes"
        target_id = row["target_label_id"]

        if is_noise:
            execute_plan.append({
                "thread_id": tid,
                "action": "unlabel",
                "labels_to_remove": ["INBOX"],
                "labels_to_add": [],
            })
        else:
            labels_to_add = [target_id]
            if pending:
                labels_to_add.append(LABEL_IDS["PENDIENTE_RESPUESTA"])
            execute_plan.append({
                "thread_id": tid,
                "action": "label",
                "labels_to_add": labels_to_add,
                "labels_to_remove": ["INBOX"],
            })

    # Batch size
    batch_size = 20
    total_batches = (len(execute_plan) + batch_size - 1) // batch_size

    print(f"Execution plan: {len(execute_plan)} operations in {total_batches} batches of {batch_size}")
    print("\nTo execute, call the Gmail MCP tools for each batch:")
    print("  - label_thread(threadId, labelIds=[...])")
    print("  - unlabel_thread(threadId, labelIds=['INBOX'])")
    print("\nProcess in order, sleep 1s between batches, log progress.")

    # Write execution plan for reference
    exec_json = REPORTS_DIR / f"inbox-cleanup-exec-{ts}.json"
    with exec_json.open("w", encoding="utf-8") as f:
        json.dump(execute_plan, f, indent=2, ensure_ascii=False)
    print(f"\nExecution plan saved to {exec_json.name}")

    print("\n" + "=" * 70)
    print("SCOPE REPORT")
    print("=" * 70)
    print(f"Total inbox threads processed: {len(plan_rows)}")
    print(f"Distribution per target label:")
    for label, count in sorted(label_counts.items(), key=lambda x: -x[1]):
        print(f"  {label}: {count}")
    print(f"Marked pending_response: {pending_count}")
    print(f"Marked is_noise: {noise_count}")
    print(f"\nNEXT STEPS:")
    print(f"  1. Manually harvest remaining inbox pages using Gmail search")
    print(f"  2. Save pages as inbox-harvest-pg{{N}}.json in {HARVEST_DIR}")
    print(f"  3. Re-run this script to reclassify")
    print(f"  4. Once plan is approved, call label/unlabel Gmail MCP tools")

    return 0


if __name__ == "__main__":
    sys.exit(main())
