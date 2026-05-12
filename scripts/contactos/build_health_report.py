#!/usr/bin/env python3
"""
Phase 2.B.2 · Relationship health intelligence report.

Reads:
  - Master xlsx (with the 7 new Phase 2.B.2 fields: relationship_band,
    collaboration_potential_score, email_validity, bounce_count, etc.)
  - ALL Gmail signal JSONL files (incoming/ + old/gmail-signals/) for
    cross-referencing bounce signals across emails NOT in Master.

Outputs:
  - CONTACTOS DATASITE/google-contacts/relationship-health-report.md
      11-section institutional health analysis:
        1. Health totals
        2. Email validity breakdown
        3. Relationship band distribution
        4. Collaboration potential ranking
        5. Bounce rate
        6. Strongest counterparties
        7. Most responsive institutions
        8. Hottest relationship clusters
        9. Contacts needing correction (sample)
       10. Dead domains
       11. Operator next steps

  - CONTACTOS DATASITE/reports/contacts-needing-correction_<batch_id>.csv
      Per-row with: current_email · inferred_correct_company · reason_flagged
      · last_failed_interaction · suggested_replacement (when inferable from
      other addresses with same surname @ same domain)

Privacy: all outputs under the gitignored CONTACTOS DATASITE/ tree.
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
OUT_REPORT = ROOT / "google-contacts" / "relationship-health-report.md"

REPORTS.mkdir(parents=True, exist_ok=True)
OUT_REPORT.parent.mkdir(parents=True, exist_ok=True)


PERSONAL_DOMAINS = {
    "gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "outlook.es",
    "live.com", "yahoo.com", "yahoo.es", "icloud.com", "me.com", "mac.com",
    "protonmail.com", "proton.me", "yandex.com", "mail.ru", "aol.com",
    "msn.com", "ymail.com", "telefonica.net", "terra.es",
}


def title_company(email: str) -> str:
    if "@" not in email:
        return ""
    dom = email.split("@", 1)[-1].lower()
    if dom in PERSONAL_DOMAINS:
        return "(personal)"
    return dom.split(".")[0].replace("-", " ").title()


def domain_of(email: str) -> str:
    return email.split("@", 1)[-1].lower() if "@" in email else ""


# ── Gmail signal loader (same shape as ingest_gmail.py read_jsonl_snapshots) ─


def load_all_signals() -> dict[str, dict[str, Any]]:
    aggregated: dict[str, dict[str, Any]] = {}
    paths: list[Path] = []
    for d in (GMAIL_INCOMING, GMAIL_OLD):
        if not d.exists():
            continue
        for p in d.iterdir():
            if p.is_file() and p.suffix.lower() in (".jsonl", ".json"):
                paths.append(p)
    paths.sort(key=lambda p: p.stat().st_mtime)
    for path in paths:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    continue
                em = norm_email(rec.get("email"))
                if not em:
                    continue
                cur = aggregated.get(em)
                if cur is None:
                    aggregated[em] = {**rec, "email": em, "_files": {path.name}}
                else:
                    # Latest wins for state · sum for counts
                    cur["labels"] = sorted(set((cur.get("labels") or []) + (rec.get("labels") or [])))
                    cur["thread_count"] = max(int(cur.get("thread_count") or 0), int(rec.get("thread_count") or 0))
                    cur["bounce_count"] = max(int(cur.get("bounce_count") or 0), int(rec.get("bounce_count") or 0))
                    new_lb = rec.get("last_bounce_date") or ""
                    if new_lb and new_lb > (cur.get("last_bounce_date") or ""):
                        cur["last_bounce_date"] = new_lb
                    cur["bounce_reasons"] = (cur.get("bounce_reasons") or []) + (rec.get("bounce_reasons") or [])
                    cur["_files"].add(path.name)
    return aggregated


# ── main ────────────────────────────────────────────────────────────────────


def main() -> int:
    print("→ Phase 2.B.2 · institutional relationship health report")
    master_rows, _, _, _ = load_existing_master()
    master_by_email = {norm_email(r.get("email")): r for r in master_rows if norm_email(r.get("email"))}
    print(f"  master loaded: {len(master_rows)} rows · {len(master_by_email)} with email")

    signals = load_all_signals()
    print(f"  Gmail signals: {len(signals)} unique emails")

    batch_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    # ── per-Master analytics ─────────────────────────────────────────────
    by_band: Counter[str] = Counter()
    by_validity: Counter[str] = Counter()
    by_bucket: Counter[str] = Counter()
    flagged_count = 0
    collab_pairs: list[tuple[int, dict[str, Any]]] = []
    for r in master_rows:
        b = (r.get("relationship_band") or "").strip()
        v = (r.get("email_validity") or "").strip()
        bk = (r.get("bucket") or "").strip()
        if b:
            by_band[b] += 1
        if v:
            by_validity[v] += 1
        if bk:
            by_bucket[bk] += 1
        if (r.get("flagged_for_correction") or "") == "yes":
            flagged_count += 1
        cs = r.get("collaboration_potential_score")
        if isinstance(cs, (int, float)) and cs > 0:
            collab_pairs.append((int(cs), r))

    collab_pairs.sort(key=lambda kv: -kv[0])

    # Master rows without ANY Gmail signal · these are unenriched
    unenriched = sum(1 for r in master_rows if not (r.get("relationship_band") or "").strip())

    # ── bounce analytics (across all signals, including not-in-Master) ───
    bounced_signals = [s for s in signals.values() if int(s.get("bounce_count") or 0) > 0]
    bounced_in_master = [s for s in bounced_signals if s["email"] in master_by_email]
    bounced_not_in_master = [s for s in bounced_signals if s["email"] not in master_by_email]

    # Dead-domain detection · domains where 60%+ of contacts bounced
    by_domain_bounce_ratio: dict[str, tuple[int, int]] = {}
    domain_emails: dict[str, list[str]] = defaultdict(list)
    domain_bounces: dict[str, int] = defaultdict(int)
    for em, s in signals.items():
        dom = domain_of(em)
        if not dom or dom in PERSONAL_DOMAINS:
            continue
        domain_emails[dom].append(em)
        if int(s.get("bounce_count") or 0) > 0:
            domain_bounces[dom] += 1
    dead_domains: list[tuple[str, int, int, float]] = []
    for dom, emails in domain_emails.items():
        if len(emails) < 2:
            continue
        bcount = domain_bounces.get(dom, 0)
        ratio = bcount / len(emails)
        if ratio >= 0.5 and bcount >= 2:
            dead_domains.append((dom, bcount, len(emails), ratio))
    dead_domains.sort(key=lambda x: (-x[3], -x[1]))

    # ── contacts-needing-correction CSV ──────────────────────────────────
    # Combines: (a) Master rows flagged for correction · (b) bounced signals
    # that are in Master with explicit bounce evidence.
    corr_rows: list[dict[str, Any]] = []
    for s in bounced_signals:
        em = s["email"]
        master_row = master_by_email.get(em)
        full_name = (master_row or {}).get("full_name", "") if master_row else ""
        company = (master_row or {}).get("company", "") if master_row else ""
        inferred_company = company or title_company(em)
        # Suggested replacement: another email with same surname @ same domain
        # in either Master or Gmail signals
        suggested = ""
        if full_name:
            last_part = full_name.split()[-1].lower() if full_name.split() else ""
            dom = domain_of(em)
            if last_part:
                for other_em in (set(master_by_email.keys()) | set(signals.keys())):
                    if other_em == em or domain_of(other_em) != dom:
                        continue
                    # Local part contains the surname or first 3 chars
                    local = other_em.split("@", 1)[0].lower()
                    if last_part in local:
                        # Check this OTHER email isn't ALSO bounced
                        other_sig = signals.get(other_em, {})
                        if int(other_sig.get("bounce_count") or 0) == 0:
                            suggested = other_em
                            break
        reasons = s.get("bounce_reasons") or []
        reason_text = reasons[0] if reasons else "delivery failure (no snippet captured)"
        corr_rows.append({
            "current_email": em,
            "full_name_known": full_name,
            "inferred_correct_company": inferred_company,
            "in_master": "yes" if master_row else "no",
            "reason_flagged": reason_text[:200],
            "bounce_count": int(s.get("bounce_count") or 0),
            "last_failed_interaction": s.get("last_bounce_date", ""),
            "suggested_replacement": suggested,
            "source_labels": "; ".join(s.get("labels") or []),
        })
    corr_rows.sort(key=lambda r: (-r["bounce_count"], r["current_email"]))

    corr_path = REPORTS / f"contacts-needing-correction_{batch_id}.csv"
    with corr_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[
            "current_email", "full_name_known", "inferred_correct_company",
            "in_master", "reason_flagged", "bounce_count", "last_failed_interaction",
            "suggested_replacement", "source_labels",
        ])
        w.writeheader()
        for r in corr_rows:
            w.writerow(r)
    print(f"  contacts-needing-correction → {corr_path.name} · {len(corr_rows)} rows")

    # ── most responsive institutions (bidirectional + high inbound) ──────
    responsive: list[tuple[str, int, int]] = []
    for em, s in signals.items():
        if em not in master_by_email:
            continue
        if s.get("directionality") != "bidirectional":
            continue
        inbound = int(s.get("inbound_count") or 0)
        if inbound < 1:
            continue
        master_row = master_by_email[em]
        company = master_row.get("company", "") or title_company(em)
        responsive.append((company, inbound, int(s.get("thread_count") or 0)))
    by_company_resp: dict[str, tuple[int, int]] = defaultdict(lambda: (0, 0))
    for c, ib, tc in responsive:
        cur = by_company_resp[c]
        by_company_resp[c] = (cur[0] + ib, cur[1] + tc)
    top_responsive = sorted(by_company_resp.items(), key=lambda kv: (-kv[1][0], kv[0].lower()))[:20]

    # ── hottest relationship clusters (band == active or strategic) ──────
    hot_companies: Counter[str] = Counter()
    for r in master_rows:
        b = (r.get("relationship_band") or "").strip()
        if b in ("active", "strategic"):
            c = r.get("company") or "(unknown)"
            hot_companies[c] += 1
    top_hot = hot_companies.most_common(20)

    # ── Markdown ─────────────────────────────────────────────────────────
    md: list[str] = []
    md.append("# Relationship Health · Institutional Intelligence\n")
    md.append(f"**Generated:** {datetime.now(timezone.utc).replace(microsecond=0).isoformat()}")
    md.append(f"**Batch:** `{batch_id}`")
    md.append(f"**Master:** {len(master_rows)} canonical contacts · {len(signals)} Gmail signals analysed\n")

    md.append("## 1 · Health totals\n")
    md.append(f"- Master contacts enriched with Gmail signal: **{len(master_rows) - unenriched}**")
    md.append(f"- Master contacts with no Gmail signal yet: {unenriched}")
    md.append(f"- **Master contacts flagged for correction (invalid email):** {flagged_count}")
    md.append(f"- Gmail signals with at least 1 bounce: **{len(bounced_signals)}** ({100*len(bounced_signals)/max(1,len(signals)):.1f}% bounce rate)")
    md.append(f"  - of those, in Master: {len(bounced_in_master)}")
    md.append(f"  - of those, NOT in Master (would-be junk inserts): {len(bounced_not_in_master)}")
    md.append("")

    md.append("## 2 · Email validity (Master rows)\n")
    md.append("| Validity | Count | Meaning |")
    md.append("|---|---|---|")
    md.append(f"| valid | {by_validity.get('valid', 0)} | At least one real inbound · alive |")
    md.append(f"| uncertain | {by_validity.get('uncertain', 0)} | Sent · no reply · no bounce · could be alive |")
    md.append(f"| invalid | {by_validity.get('invalid', 0)} | Bounced ≥ 2× OR bounced + no inbound · DEAD |")
    md.append("")

    md.append("## 3 · Relationship band distribution\n")
    md.append("| Band | Count | Meaning |")
    md.append("|---|---|---|")
    md.append(f"| strategic | {by_band.get('strategic', 0)} | Live LOI/MoU + strong bidirectional · top deal counterparties |")
    md.append(f"| active | {by_band.get('active', 0)} | Ongoing bidirectional + recent or live Datasite pipeline |")
    md.append(f"| warm | {by_band.get('warm', 0)} | Positive signal · recent enough to re-engage easily |")
    md.append(f"| cold | {by_band.get('cold', 0)} | Low engagement · needs outreach effort |")
    md.append(f"| dormant | {by_band.get('dormant', 0)} | > 3 yrs OR rejected · low priority |")
    md.append(f"| invalid | {by_band.get('invalid', 0)} | Bounced · excluded from active graph |")
    md.append("")

    md.append("## 4 · Top institutional collaboration potential\n")
    md.append("Master rows ranked by `collaboration_potential_score` · the institutionally-useful relationships for HotelVALORA outreach:\n")
    if collab_pairs:
        md.append("| Score | Name | Company | Band | Stage | Threads | Last Email |")
        md.append("|---|---|---|---|---|---|---|")
        for cs, r in collab_pairs[:25]:
            md.append(
                f"| {cs} "
                f"| {(r.get('full_name', '') or '')[:28]} "
                f"| {(r.get('company', '') or '')[:30]} "
                f"| {r.get('relationship_band', '')} "
                f"| {r.get('inferred_relationship_stage', '') or '—'} "
                f"| {r.get('active_threads', 0)} "
                f"| {r.get('last_email_date', '') or '—'} |"
            )
    else:
        md.append("_(no scored rows · run pipeline first)_")
    md.append("")

    md.append("## 5 · Bounce rate\n")
    domain_bounce_view = [(d, b, t, b/t) for d, b, t, ratio in dead_domains]
    md.append(f"- Total emails with bounce signal: **{len(bounced_signals)}** of {len(signals)} ({100*len(bounced_signals)/max(1,len(signals)):.1f}%)")
    md.append(f"- Master contacts now marked `invalid_email`: **{flagged_count}**")
    md.append(f"- Master bucket = `DATASITE-CORREGIR`: **{by_bucket.get('DATASITE-CORREGIR', 0)}**")
    md.append("")

    md.append("## 6 · Strongest counterparties (active + strategic bands)\n")
    if top_hot:
        md.append("| Company | Active/Strategic contacts |")
        md.append("|---|---|")
        for c, n in top_hot:
            md.append(f"| {c} | {n} |")
    else:
        md.append("_(no active/strategic relationships yet · need LOI/MoU label extractions or more recent Gmail data)_")
    md.append("")

    md.append("## 7 · Most responsive institutions\n")
    md.append("Companies whose contacts have the highest inbound reply volume from Miguel's outreach · these are the *receptive* counterparties (regardless of deal stage):\n")
    if top_responsive:
        md.append("| Company | Inbound replies | Threads |")
        md.append("|---|---|---|")
        for c, (ib, tc) in top_responsive:
            md.append(f"| {c} | {ib} | {tc} |")
    else:
        md.append("_(no bidirectional matched contacts yet)_")
    md.append("")

    md.append("## 8 · Hottest relationship clusters\n")
    md.append("Companies with 2+ active/strategic contacts · highest leverage outreach targets:\n")
    multi_hot = [(c, n) for c, n in hot_companies.items() if n >= 2]
    multi_hot.sort(key=lambda kv: (-kv[1], kv[0].lower()))
    if multi_hot:
        md.append("| Company | Contacts in active/strategic band |")
        md.append("|---|---|")
        for c, n in multi_hot[:20]:
            md.append(f"| {c} | {n} |")
    else:
        md.append("_(no multi-person hot clusters yet)_")
    md.append("")

    md.append("## 9 · Contacts needing correction (top 25 by bounce count)\n")
    md.append(f"Total flagged: **{len(corr_rows)}** · full detail in `reports/contacts-needing-correction_{batch_id}.csv`\n")
    if corr_rows:
        md.append("| Email | In Master | Bounces | Last failure | Suggested replacement |")
        md.append("|---|---|---|---|---|")
        for r in corr_rows[:25]:
            md.append(
                f"| {r['current_email']} "
                f"| {r['in_master']} "
                f"| {r['bounce_count']} "
                f"| {r['last_failed_interaction'] or '—'} "
                f"| {r['suggested_replacement'] or '—'} |"
            )
    else:
        md.append("_(no contacts flagged for correction)_")
    md.append("")

    md.append("## 10 · Dead domains (≥50% bounce rate · 2+ contacts)\n")
    if dead_domains:
        md.append("| Domain | Bounced contacts | Total contacts | Bounce ratio |")
        md.append("|---|---|---|---|")
        for d, b, t, ratio in dead_domains[:20]:
            md.append(f"| {d} | {b} | {t} | {100*ratio:.0f}% |")
        md.append("\n_These domains have widespread delivery failure · likely rebrand · domain change · or company shutdown. Flag for manual corporate-domain update._")
    else:
        md.append("_(no dead-domain clusters detected)_")
    md.append("")

    md.append("## 11 · Operator next steps\n")
    md.append(f"1. **Open** `reports/contacts-needing-correction_{batch_id}.csv` · review the {len(corr_rows)} flagged · update emails OR move to DATASITE-CORREGIR bucket")
    md.append("2. **Investigate dead domains** above · check LinkedIn for the contact's new corporate email")
    md.append("3. **Prioritise outreach** to Active + Strategic bands · these are your warmest institutional relationships")
    md.append("4. **Re-engage** the high-collaboration-score contacts (Section 4) · use the inferred stage to time the outreach")
    md.append("5. **Expand Gmail extraction** to LOI / MoU / RONDA INVERSORES labels next to populate the `strategic` band")
    md.append("6. **NOT touch** Supabase / UI yet · stabilize institutional graph first per directive")
    md.append("")
    md.append("---")
    md.append("*Generated by `scripts/contactos/build_health_report.py` · everything gitignored · run again after each Gmail extraction.*")

    OUT_REPORT.write_text("\n".join(md), encoding="utf-8")
    print(f"  health report → {OUT_REPORT.name}")
    print()
    print(f"✓ done · {flagged_count} flagged for correction · {by_validity.get('invalid', 0)} invalid emails · {by_band.get('active', 0) + by_band.get('strategic', 0)} active+strategic")
    return 0


if __name__ == "__main__":
    sys.exit(main())
