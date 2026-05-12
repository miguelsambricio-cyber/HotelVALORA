#!/usr/bin/env python3
"""
Build the institutional relationship-graph summary + unmatched candidates report.

Inputs
------
- Master: CONTACTOS DATASITE/master/metcub-contacts-master.xlsx
- Gmail signals: ALL JSONL files under
    CONTACTOS DATASITE/old/gmail-signals/      (processed)
    CONTACTOS DATASITE/incoming/gmail-signals/ (pending)
  Each line = one email's aggregated signal across labels.

Outputs
-------
- CONTACTOS DATASITE/reports/unmatched-candidates_<batch_id>.csv
    Per-email row · NEW (not in Master yet) · with rich enrichment:
      · confidence_score (0–100)
      · inferred_company (from email domain · capitalised)
      · inferred_investor_type (canonical · from labels touched)
      · source_labels (all Gmail labels)
      · thread_count
      · last_email_date
      · first_email_date
      · inbound_count · outbound_count · directionality
      · inbound_outbound_ratio
      · email_domain
      · domain_kind (institutional / personal)
      · pipeline_creator (gmail-signals)
      · snapshot_batch_id (provenance)

- CONTACTOS DATASITE/google-contacts/relationship-graph-summary.md
    Markdown analysis with the requested sections.

Privacy
-------
All outputs land under the gitignored CONTACTOS DATASITE/ tree.
No automatic Master mutation · candidates remain reviewable.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    from ingest import load_existing_master, norm_email, norm_text  # type: ignore[import-not-found]
except ImportError as err:
    print(f"ERROR: cannot import from ingest.py · {err}", file=sys.stderr)
    sys.exit(2)


# ── paths ───────────────────────────────────────────────────────────────────

REPO = Path(__file__).resolve().parent.parent.parent
ROOT = REPO / "CONTACTOS DATASITE"
GMAIL_OLD = ROOT / "old" / "gmail-signals"
GMAIL_INCOMING = ROOT / "incoming" / "gmail-signals"
REPORTS = ROOT / "reports"
OUT_REPORT = ROOT / "google-contacts" / "relationship-graph-summary.md"

REPORTS.mkdir(parents=True, exist_ok=True)
OUT_REPORT.parent.mkdir(parents=True, exist_ok=True)


# ── personal / noise filters ────────────────────────────────────────────────

PERSONAL_DOMAINS = {
    "gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "outlook.es",
    "live.com", "yahoo.com", "yahoo.es", "icloud.com", "me.com", "mac.com",
    "protonmail.com", "proton.me", "yandex.com", "mail.ru", "aol.com",
    "msn.com", "ymail.com", "telefonica.net", "terra.es",
}

# Gmail label → canonical (Master-compatible) investor_type
LABEL_TO_TYPE: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"FINANCIADOR|Financiador", re.IGNORECASE), "Lender"),
    (re.compile(r"INVERSOR|INVERSORES", re.IGNORECASE), "Investor"),
    (re.compile(r"CADENA\s+HOTEL|CADENAS\s+HOTEL", re.IGNORECASE), "Hotel Chain"),
    (re.compile(r"PROMOTOR.*CONSTRUCTOR", re.IGNORECASE), "Developer"),
    (re.compile(r"INTERMEDIARIO", re.IGNORECASE), "Broker"),
    (re.compile(r"PROPIETARIO", re.IGNORECASE), "Owner"),
    (re.compile(r"F&B", re.IGNORECASE), "F&B Operator"),
    (re.compile(r"BRANDED", re.IGNORECASE), "Branded Residences"),
    (re.compile(r"MoU", re.IGNORECASE), "Partner"),
    (re.compile(r"^LOI", re.IGNORECASE), "Active LOI Counterparty"),
]


def infer_investor_type(labels: list[str]) -> str:
    for label in labels:
        for pattern, canon in LABEL_TO_TYPE:
            if pattern.search(label):
                return canon
    return "Unknown"


def infer_company_from_domain(email: str) -> str:
    if "@" not in email:
        return ""
    domain = email.split("@", 1)[-1].lower()
    if domain in PERSONAL_DOMAINS:
        return "(personal domain)"
    # Capitalize the second-level domain · best-effort
    parts = domain.split(".")
    if len(parts) >= 2:
        return parts[0].replace("-", " ").title()
    return domain


def domain_kind(email: str) -> str:
    if "@" not in email:
        return "unknown"
    return "personal" if email.split("@", 1)[-1].lower() in PERSONAL_DOMAINS else "institutional"


def days_since(iso: str) -> int:
    if not iso:
        return 9999
    try:
        d = datetime.fromisoformat(iso) if "T" in iso else datetime.strptime(iso, "%Y-%m-%d")
        return (datetime.utcnow() - d).days
    except ValueError:
        return 9999


def compute_confidence(signal: dict[str, Any]) -> int:
    """0–100 score · how confident this is a real institutional contact worth onboarding."""
    score = 0
    labels = signal.get("labels", []) or []
    thread_count = int(signal.get("thread_count") or 0)
    inbound = int(signal.get("inbound_count") or 0)
    outbound = int(signal.get("outbound_count") or 0)
    last_email = signal.get("last_email_date", "")
    direction = signal.get("directionality", "")
    email = signal.get("email", "")

    # Volume
    score += min(thread_count, 10) * 4  # up to +40

    # Directionality: bidirectional means engaged · highest signal
    if direction == "bidirectional":
        score += 25
    elif direction == "outbound" and outbound >= 2:
        score += 10
    elif direction == "inbound" and inbound >= 1:
        score += 5

    # Label specificity (INTERESADO/SEGUIMIENTO > general buckets)
    if any(re.search(r"INTERESAD[OA]\b", lbl, re.IGNORECASE) and not re.search(r"NO\s+INTERESAD", lbl, re.IGNORECASE) for lbl in labels):
        score += 20
    elif any(re.search(r"SEGUIMIENTO", lbl, re.IGNORECASE) for lbl in labels):
        score += 15
    elif any(re.search(r"RECHAZAD|NO\s+INTERESAD", lbl, re.IGNORECASE) for lbl in labels):
        score -= 10  # explicit reject signal · lower confidence as institutional contact

    # Recency
    days = days_since(last_email)
    if days < 90:
        score += 15
    elif days < 365:
        score += 10
    elif days < 730:
        score += 5

    # Institutional domain bonus
    if domain_kind(email) == "institutional":
        score += 5

    return max(0, min(100, score))


# ── readers ─────────────────────────────────────────────────────────────────


def read_all_signals() -> dict[str, dict[str, Any]]:
    """Aggregate every Gmail signal JSONL ever produced · email → most-recent record."""
    aggregated: dict[str, dict[str, Any]] = {}
    sources: list[Path] = []
    for d in (GMAIL_INCOMING, GMAIL_OLD):
        if not d.exists():
            continue
        for p in d.iterdir():
            if p.is_file() and p.suffix.lower() in (".jsonl", ".json"):
                sources.append(p)
    sources.sort(key=lambda p: p.stat().st_mtime)
    for path in sources:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    continue
                email = norm_email(rec.get("email"))
                if not email:
                    continue
                cur = aggregated.get(email)
                if cur is None:
                    aggregated[email] = {**rec, "email": email, "_source_files": {path.name}}
                else:
                    # Merge: labels union · thread_count max · dates min/max
                    cur["labels"] = sorted(set((cur.get("labels") or []) + (rec.get("labels") or [])))
                    cur["thread_count"] = max(int(cur.get("thread_count") or 0), int(rec.get("thread_count") or 0))
                    cur["inbound_count"] = max(int(cur.get("inbound_count") or 0), int(rec.get("inbound_count") or 0))
                    cur["outbound_count"] = max(int(cur.get("outbound_count") or 0), int(rec.get("outbound_count") or 0))
                    cur_fd = cur.get("first_email_date") or ""
                    new_fd = rec.get("first_email_date") or ""
                    if new_fd and (not cur_fd or new_fd < cur_fd):
                        cur["first_email_date"] = new_fd
                    cur_ld = cur.get("last_email_date") or ""
                    new_ld = rec.get("last_email_date") or ""
                    if new_ld and (not cur_ld or new_ld > cur_ld):
                        cur["last_email_date"] = new_ld
                    # Re-derive directionality
                    if cur["inbound_count"] > 0 and cur["outbound_count"] > 0:
                        cur["directionality"] = "bidirectional"
                    elif cur["outbound_count"] > 0:
                        cur["directionality"] = "outbound"
                    elif cur["inbound_count"] > 0:
                        cur["directionality"] = "inbound"
                    cur["_source_files"].add(path.name)
    return aggregated


# ── main ────────────────────────────────────────────────────────────────────


def main() -> int:
    print("→ Building institutional relationship-graph report")
    master_rows, _, _, _ = load_existing_master()
    master_emails = {norm_email(r.get("email")): r for r in master_rows if norm_email(r.get("email"))}
    print(f"  master contacts loaded: {len(master_rows)} · {len(master_emails)} with email")

    signals = read_all_signals()
    print(f"  Gmail signals aggregated: {len(signals)} unique emails")

    # Partition
    matched_emails = [e for e in signals if e in master_emails]
    unmatched_emails = [e for e in signals if e not in master_emails]
    print(f"  matched={len(matched_emails)} · unmatched={len(unmatched_emails)}")

    # Build unmatched candidates with enrichment
    batch_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    candidates_path = REPORTS / f"unmatched-candidates_{batch_id}.csv"
    cand_fields = [
        "email", "confidence_score", "inferred_company", "inferred_investor_type",
        "source_labels", "thread_count", "last_email_date", "first_email_date",
        "inbound_count", "outbound_count", "directionality", "inbound_outbound_ratio",
        "email_domain", "domain_kind", "pipeline_creator", "snapshot_batch_id",
    ]
    candidates: list[dict[str, Any]] = []
    for em in unmatched_emails:
        s = signals[em]
        labels = s.get("labels") or []
        inbound = int(s.get("inbound_count") or 0)
        outbound = int(s.get("outbound_count") or 0)
        ratio = ""
        if outbound > 0 and inbound > 0:
            ratio = f"{inbound}:{outbound}"
        elif outbound > 0:
            ratio = f"0:{outbound}"
        elif inbound > 0:
            ratio = f"{inbound}:0"
        candidates.append({
            "email": em,
            "confidence_score": compute_confidence(s),
            "inferred_company": infer_company_from_domain(em),
            "inferred_investor_type": infer_investor_type(labels),
            "source_labels": "; ".join(labels),
            "thread_count": s.get("thread_count", 0),
            "last_email_date": s.get("last_email_date", ""),
            "first_email_date": s.get("first_email_date", ""),
            "inbound_count": inbound,
            "outbound_count": outbound,
            "directionality": s.get("directionality", ""),
            "inbound_outbound_ratio": ratio,
            "email_domain": em.split("@", 1)[-1] if "@" in em else "",
            "domain_kind": domain_kind(em),
            "pipeline_creator": "gmail-signals",
            "snapshot_batch_id": batch_id,
        })
    candidates.sort(key=lambda r: (-r["confidence_score"], r["email"]))

    with candidates_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cand_fields)
        w.writeheader()
        for c in candidates:
            w.writerow(c)
    print(f"  unmatched candidates → {candidates_path}")

    # ── analytics for the markdown summary ────────────────────────────────
    by_type: Counter[str] = Counter()
    by_type_matched: Counter[str] = Counter()
    by_type_unmatched: Counter[str] = Counter()
    for em, s in signals.items():
        t = infer_investor_type(s.get("labels") or [])
        by_type[t] += 1
        if em in master_emails:
            by_type_matched[t] += 1
        else:
            by_type_unmatched[t] += 1

    label_activity: Counter[str] = Counter()
    for em, s in signals.items():
        for label in s.get("labels") or []:
            label_activity[label] += 1

    company_counts: Counter[str] = Counter()
    for em in signals:
        c = infer_company_from_domain(em)
        if c and c != "(personal domain)":
            company_counts[c] += 1

    # Strongest clusters · companies with most contacts AND ≥2 in Master
    cluster_signal: dict[str, dict[str, Any]] = defaultdict(lambda: {"signal_count": 0, "master_count": 0})
    for em in signals:
        c = infer_company_from_domain(em)
        if not c or c == "(personal domain)":
            continue
        cluster_signal[c]["signal_count"] += 1
        if em in master_emails:
            cluster_signal[c]["master_count"] += 1

    # Master rows enriched with Gmail signal (relationship_strength > 0)
    enriched_count = sum(
        1 for r in master_rows
        if isinstance(r.get("relationship_strength"), (int, float)) and r.get("relationship_strength", 0) > 0
    )

    # Top relationships in Master · by relationship_strength
    top_master = sorted(
        [r for r in master_rows if isinstance(r.get("relationship_strength"), (int, float)) and r.get("relationship_strength", 0) > 0],
        key=lambda r: -float(r.get("relationship_strength", 0)),
    )[:20]

    # Hidden duplicates · same domain, different local parts, similar names
    hidden_dups: list[tuple[str, str, str]] = []
    by_domain_master: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for r in master_rows:
        em = norm_email(r.get("email"))
        if not em:
            continue
        dom = em.split("@", 1)[-1]
        by_domain_master[dom].append(r)
    for dom, rows in by_domain_master.items():
        if len(rows) < 2 or dom in PERSONAL_DOMAINS:
            continue
        # Look for similar surnames or first names
        for i in range(len(rows)):
            for j in range(i + 1, len(rows)):
                a = norm_text(rows[i].get("full_name", ""))
                b = norm_text(rows[j].get("full_name", ""))
                if not a or not b:
                    continue
                # Same last word (surname) within same domain · likely related
                a_parts = a.lower().split()
                b_parts = b.lower().split()
                if a_parts and b_parts and a_parts[-1] == b_parts[-1] and len(a_parts) >= 2:
                    hidden_dups.append((dom, a, b))
                    if len(hidden_dups) >= 50:
                        break
            if len(hidden_dups) >= 50:
                break
        if len(hidden_dups) >= 50:
            break

    # Master rows with NO Gmail signal yet · contacts you have in Datasite but no
    # Gmail engagement recorded · candidates for re-engagement
    no_gmail_overlap = sum(
        1 for r in master_rows
        if not (isinstance(r.get("relationship_strength"), (int, float)) and r.get("relationship_strength", 0) > 0)
    )

    # ── Markdown report ────────────────────────────────────────────────────
    md: list[str] = []
    md.append("# Relationship Graph · Institutional Intelligence Summary\n")
    md.append(f"**Generated:** {datetime.now(timezone.utc).replace(microsecond=0).isoformat()}")
    md.append(f"**Batch:** `{batch_id}`")
    md.append(f"**Pipeline:** CONTACTOS DATASITE · 3 lanes (Datasite + Google Contacts + Gmail signals)\n")

    md.append("## 1 · Totals\n")
    md.append(f"- **Master canonical contacts:** {len(master_rows)} (4,547 from Datasite + 0 inserted from Google so far)")
    md.append(f"- **Master contacts enriched with Gmail signal:** {enriched_count}")
    md.append(f"- **Master contacts WITHOUT any Gmail signal:** {no_gmail_overlap}")
    md.append(f"- **Unique Gmail signal emails (across all snapshots):** {len(signals)}")
    md.append(f"- **Matched (existing in Master):** {len(matched_emails)}")
    md.append(f"- **Unmatched (potential new institutional contacts):** {len(unmatched_emails)}")
    md.append(f"- **Match rate:** {100*len(matched_emails)/max(1,len(signals)):.1f}%")
    md.append("")

    md.append("## 2 · Strongest relationship clusters\n")
    md.append("Companies with 2+ Gmail contacts AND at least one in Master · these are the live institutional relationships with multi-person coverage:\n")
    top_clusters = sorted(
        [(c, info) for c, info in cluster_signal.items() if info["signal_count"] >= 2 and info["master_count"] >= 1],
        key=lambda kv: (-kv[1]["signal_count"], kv[0].lower()),
    )[:25]
    if top_clusters:
        md.append("| Company | Gmail contacts | In Master |")
        md.append("|---|---|---|")
        for c, info in top_clusters:
            md.append(f"| {c} | {info['signal_count']} | {info['master_count']} |")
    else:
        md.append("_(no multi-contact clusters yet · run more Gmail extractions to expand)_")
    md.append("")

    md.append("## 3 · Top institutional counterparties (Master + Gmail signal)\n")
    md.append("Master contacts ranked by `relationship_strength` · top 20:\n")
    if top_master:
        md.append("| Score | Name | Company | Inferred stage | Threads | Last email | Direction |")
        md.append("|---|---|---|---|---|---|---|")
        for r in top_master:
            md.append(
                f"| {r.get('relationship_strength', 0)} "
                f"| {r.get('full_name', '')[:32]} "
                f"| {r.get('company', '')[:32]} "
                f"| {r.get('inferred_relationship_stage', '') or '—'} "
                f"| {r.get('active_threads', 0)} "
                f"| {r.get('last_email_date', '') or '—'} "
                f"| {r.get('email_directionality', '') or '—'} |"
            )
    else:
        md.append("_(no scored relationships yet)_")
    md.append("")

    md.append("## 4 · Most active Gmail labels\n")
    if label_activity:
        md.append("| Label | Contacts touched |")
        md.append("|---|---|")
        for lbl, n in label_activity.most_common(20):
            md.append(f"| {lbl} | {n} |")
    else:
        md.append("_(no labels parsed)_")
    md.append("")

    md.append("## 5 · Investor type distribution (Gmail signal layer)\n")
    md.append("| Canonical type | Total | Matched in Master | Unmatched candidates |")
    md.append("|---|---|---|---|")
    for t, n in by_type.most_common():
        md.append(f"| {t} | {n} | {by_type_matched.get(t, 0)} | {by_type_unmatched.get(t, 0)} |")
    md.append("")

    md.append("## 6 · Warm network density (institutional vs personal)\n")
    inst = sum(1 for e in signals if domain_kind(e) == "institutional")
    pers = sum(1 for e in signals if domain_kind(e) == "personal")
    md.append(f"- **Institutional-domain emails:** {inst} ({100*inst/max(1,len(signals)):.1f}%)")
    md.append(f"- **Personal-domain emails:** {pers} ({100*pers/max(1,len(signals)):.1f}%)")
    bidirectional = sum(1 for s in signals.values() if s.get("directionality") == "bidirectional")
    md.append(f"- **Bidirectional threads (active two-way relationships):** {bidirectional} ({100*bidirectional/max(1,len(signals)):.1f}%)")
    md.append("")

    md.append("## 7 · Top companies by Gmail signal volume\n")
    md.append("| Company (inferred from email domain) | Contact count |")
    md.append("|---|---|")
    for c, n in company_counts.most_common(25):
        md.append(f"| {c} | {n} |")
    md.append("")

    md.append("## 8 · Potential hidden duplicates in Master\n")
    md.append("Same email domain + matching surname · likely the same person under different email addresses or aliases:\n")
    if hidden_dups:
        md.append("| Domain | Name A | Name B |")
        md.append("|---|---|---|")
        for dom, a, b in hidden_dups[:25]:
            md.append(f"| {dom} | {a} | {b} |")
    else:
        md.append("_(no candidates detected with current heuristic)_")
    md.append("")

    md.append("## 9 · Contacts with no Datasite overlap (unmatched candidates)\n")
    md.append(f"Total: **{len(unmatched_emails)}** · full enriched detail in:")
    md.append(f"`reports/unmatched-candidates_{batch_id}.csv`\n")
    md.append("Top 25 by confidence score (potential new institutional contacts to onboard):\n")
    top_cand = sorted(candidates, key=lambda c: -c["confidence_score"])[:25]
    if top_cand:
        md.append("| Score | Email | Inferred company | Type | Labels | Threads | Last email |")
        md.append("|---|---|---|---|---|---|---|")
        for c in top_cand:
            md.append(
                f"| {c['confidence_score']} | {c['email']} | {c['inferred_company']} | "
                f"{c['inferred_investor_type']} | {(c['source_labels'][:48] + '...') if len(c['source_labels'])>48 else c['source_labels']} | "
                f"{c['thread_count']} | {c['last_email_date']} |"
            )
    else:
        md.append("_(no unmatched candidates · every signal mapped to an existing Master row)_")
    md.append("")

    md.append("## 10 · Operator next steps\n")
    md.append("- **Review** `unmatched-candidates_<batch_id>.csv` · cherry-pick high-confidence rows you want to onboard")
    md.append("- **Decide** on Phase 2.B.2 · `apply_gmail_unmatched.py` (future tool) to promote selected candidates to Master")
    md.append("- **Expand** the Gmail extraction across remaining institutional labels (cadenas hotel · promotores · LOIs activos · intermediarios · propietarios · F&B · etc.)")
    md.append("- **Re-engage** Master contacts with no Gmail signal — there are " + str(no_gmail_overlap) + " of them and they're the cold-storage opportunity")
    md.append("- **Do NOT** push to Supabase / UI yet · stabilize the institutional graph first per the operator directive\n")

    md.append("---\n")
    md.append("*Generated by `scripts/contactos/build_relationship_report.py` · "
              "all outputs gitignored · run again after expanding the Gmail extraction.*")

    OUT_REPORT.write_text("\n".join(md), encoding="utf-8")
    print(f"  relationship-graph-summary.md → {OUT_REPORT}")

    print()
    print(f"✓ done · {len(signals)} signals · {len(matched_emails)} matched · {len(unmatched_emails)} unmatched candidates")
    return 0


if __name__ == "__main__":
    sys.exit(main())
