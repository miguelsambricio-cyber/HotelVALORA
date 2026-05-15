#!/usr/bin/env python3
"""Consolidate untagged inbox harvest + emit institutional candidates CSV."""
from __future__ import annotations
import json, os, sys, time, re, csv
from datetime import datetime
from collections import defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from _blocklist import load_blocklists, is_blocked  # type: ignore[import-not-found]
except ImportError:
    def load_blocklists():  # type: ignore[no-redef]
        return set(), set()

    def is_blocked(email, _e, _d):  # type: ignore[no-redef]
        return False

BLOCKED_EMAILS, BLOCKED_DOMAINS = load_blocklists()

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TRANSCRIPT = os.path.join(
    os.path.expanduser("~"),
    ".claude/projects/C--Users-migue-OneDrive-Desktop-HotelVALORA/73264e34-d36e-445f-8012-8a94d1699fbc.jsonl",
)
TOOLS_DIR = os.path.join(
    os.path.expanduser("~"),
    ".claude/projects/C--Users-migue-OneDrive-Desktop-HotelVALORA/73264e34-d36e-445f-8012-8a94d1699fbc/tool-results",
)
DEST = os.path.join(ROOT, "CONTACTOS DATASITE", "google-contacts", "gmail-raw")
REPORTS = os.path.join(ROOT, "CONTACTOS DATASITE", "reports")
EXISTING_PATH = os.path.join(DEST, "A.-INBOX-REVIEW.json")

WINDOW_SECONDS = 1800  # last 30 minutes

INTERNAL_DOMAINS = {
    "metcub.com", "build3rent.com", "fernandezmolina.com", "eurostarshotelcompany.com",
    "grupohotusa.com", "workmanager.es",
}
MARKETING_PATTERNS = (
    "noreply", "no-reply", "donotreply", "do-not-reply",
    "notifications@", "notification@", "marketing@", "newsletter@",
    "welcome@", "alerts@", "support@", "hello@", "info@",
    "service@", "contact@", "ceofeedback@", "clientservices@",
    "onboarding@", "reply@", "learn@", "webinar@",
    "envios@", "comunicacion@", "comunicacion1@", "comunicaciones@",
    "administracion@", "admsedeconta@", "facturacion@",
    "dse@", "developer@", "tickets@",
)
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
)
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
}
PERSONAL_DOMAINS = {
    "gmail.com", "yahoo.com", "yahoo.es", "hotmail.com", "hotmail.es",
    "outlook.com", "outlook.es", "live.com", "live.es", "aol.com",
    "icloud.com", "me.com",
}
MIGUEL_ADDRS = {
    "miguel.sambricio@metcub.com", "miguel.sambricio@build3rent.com", "miguel.sambricio@gmail.com",
}


def is_marketing_or_noise(email: str) -> bool:
    em = email.lower()
    for pat in MARKETING_PATTERNS:
        if em.startswith(pat):
            return True
    dom = em.split("@", 1)[-1] if "@" in em else ""
    if dom.startswith(("email.", "e.", "send.", "mail.", "learn.", "news.", "reply.")):
        return True
    if dom in NOISE_DOMAINS:
        return True
    return False


def is_noise_subject(subject: str) -> bool:
    s = (subject or "").lower()
    for pat in NOISE_SUBJECT_PATTERNS:
        if pat in s:
            return True
    return False


def consolidate_threads() -> list[dict]:
    cutoff = time.time() - WINDOW_SECONDS
    all_threads: dict[str, dict] = {}

    if os.path.exists(EXISTING_PATH):
        with open(EXISTING_PATH, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        for t in data.get("threads", []):
            tid = t.get("id")
            if tid:
                all_threads[tid] = t

    if os.path.isdir(TOOLS_DIR):
        for name in os.listdir(TOOLS_DIR):
            if "Gmail-search_threads" not in name:
                continue
            fp = os.path.join(TOOLS_DIR, name)
            if os.path.getmtime(fp) < cutoff:
                continue
            try:
                with open(fp, "r", encoding="utf-8") as fh:
                    d = json.load(fh)
            except Exception:
                continue
            for t in d.get("threads", []):
                tid = t.get("id")
                if tid:
                    all_threads[tid] = t

    if os.path.exists(TRANSCRIPT):
        with open(TRANSCRIPT, "r", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                ts_str = obj.get("timestamp") or ""
                if not ts_str:
                    continue
                try:
                    t_ = datetime.fromisoformat(ts_str.replace("Z", "+00:00")).timestamp()
                except Exception:
                    continue
                if t_ < cutoff:
                    continue
                msg = obj.get("message") or {}
                content = msg.get("content", [])
                if not isinstance(content, list):
                    continue
                for c in content:
                    if not (isinstance(c, dict) and c.get("type") == "tool_result"):
                        continue
                    inner = c.get("content")
                    txt = None
                    if isinstance(inner, list):
                        for ic in inner:
                            if isinstance(ic, dict) and ic.get("type") == "text":
                                txt = ic.get("text", "")
                                break
                    elif isinstance(inner, str):
                        txt = inner
                    if not txt or not txt.lstrip().startswith("{") or '"threads"' not in txt:
                        continue
                    try:
                        d = json.loads(txt)
                    except Exception:
                        continue
                    for t in d.get("threads", []):
                        tid = t.get("id")
                        if tid:
                            all_threads[tid] = t

    untagged: list[dict] = []
    for t in all_threads.values():
        has_user_label = False
        for m in t.get("messages", []):
            for l in m.get("labelIds", []) or []:
                if l.startswith("Label_"):
                    has_user_label = True
                    break
            if has_user_label:
                break
        if not has_user_label:
            untagged.append(t)

    print(f"Total threads consolidated (incl tagged): {len(all_threads)}")
    print(f"Untagged kept: {len(untagged)}")

    with open(EXISTING_PATH, "w", encoding="utf-8") as fh:
        json.dump({"threads": untagged}, fh, ensure_ascii=False)
    return untagged


def build_candidates(untagged: list[dict]) -> list[tuple[str, dict]]:
    per_email: dict[str, dict] = defaultdict(lambda: {
        "threads": 0, "inbound": 0, "outbound": 0,
        "last_date": "", "first_date": "",
        "subjects": [], "is_bidi": False, "has_starred": False,
    })

    for t in untagged:
        seen_in_thread: set[str] = set()
        has_starred = any(
            "STARRED" in (m.get("labelIds") or [])
            for m in t.get("messages", [])
        )
        for m in t.get("messages", []):
            s = (m.get("sender", "") or "").lower().strip()
            date = m.get("date", "")
            if s in MIGUEL_ADDRS:
                for rcpt in (m.get("toRecipients") or []) + (m.get("ccRecipients") or []):
                    r = (rcpt or "").lower().strip()
                    if not r or "@" not in r or r in MIGUEL_ADDRS or r == "undisclosed-recipients:;":
                        continue
                    if r not in seen_in_thread:
                        per_email[r]["threads"] += 1
                        seen_in_thread.add(r)
                    per_email[r]["outbound"] += 1
                    if not per_email[r]["first_date"] or date < per_email[r]["first_date"]:
                        per_email[r]["first_date"] = date
                    if date > per_email[r]["last_date"]:
                        per_email[r]["last_date"] = date
                    if has_starred:
                        per_email[r]["has_starred"] = True
            elif s and "@" in s:
                if s not in seen_in_thread:
                    per_email[s]["threads"] += 1
                    seen_in_thread.add(s)
                per_email[s]["inbound"] += 1
                subj = m.get("subject", "")[:80]
                if subj and len(per_email[s]["subjects"]) < 3:
                    per_email[s]["subjects"].append(subj)
                if not per_email[s]["first_date"] or date < per_email[s]["first_date"]:
                    per_email[s]["first_date"] = date
                if date > per_email[s]["last_date"]:
                    per_email[s]["last_date"] = date
                if has_starred:
                    per_email[s]["has_starred"] = True

    for info in per_email.values():
        if info["inbound"] > 0 and info["outbound"] > 0:
            info["is_bidi"] = True

    candidates: list[tuple[str, dict]] = []
    blocked = 0
    for em, info in per_email.items():
        if em in MIGUEL_ADDRS:
            continue
        dom = em.split("@", 1)[-1] if "@" in em else ""
        if dom in INTERNAL_DOMAINS:
            continue
        if is_marketing_or_noise(em):
            continue
        if dom in PERSONAL_DOMAINS and not (info["is_bidi"] or info["has_starred"]):
            continue
        # Reject if ALL their subjects are noise
        if info["subjects"] and all(is_noise_subject(s) for s in info["subjects"]):
            continue
        # Drop bounced / dead-domain / archived-invalid emails · prevent recontamination
        if is_blocked(em, BLOCKED_EMAILS, BLOCKED_DOMAINS):
            blocked += 1
            continue
        candidates.append((em, info))
    if blocked:
        print(f"  · skipped {blocked} email(s) on bounce/dead-domain blocklist")

    candidates.sort(key=lambda x: (not x[1]["is_bidi"], -x[1]["threads"], -x[1]["inbound"]))
    return candidates


def write_candidates_csv(candidates):
    os.makedirs(REPORTS, exist_ok=True)
    out_csv = os.path.join(REPORTS, f"untagged-inbox-candidates_{datetime.now().strftime('%Y%m%dT%H%M%SZ')}.csv")
    with open(out_csv, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["email", "domain", "threads", "inbound", "outbound",
                    "bidirectional", "starred", "first_date", "last_date", "sample_subjects"])
        for em, info in candidates:
            dom = em.split("@", 1)[-1]
            w.writerow([em, dom, info["threads"], info["inbound"], info["outbound"],
                        "yes" if info["is_bidi"] else "no",
                        "yes" if info["has_starred"] else "no",
                        info["first_date"], info["last_date"], " | ".join(info["subjects"])])
    return out_csv


def main():
    untagged = consolidate_threads()
    candidates = build_candidates(untagged)
    out_csv = write_candidates_csv(candidates)
    bidi = sum(1 for _, i in candidates if i["is_bidi"])
    inbound = sum(1 for _, i in candidates if not i["is_bidi"] and i["inbound"] > 0)
    outbound = sum(1 for _, i in candidates if not i["is_bidi"] and i["outbound"] > 0 and i["inbound"] == 0)
    print(f"\nInstitutional candidates: {len(candidates)} (bidi={bidi} inbound-only={inbound} outbound-only={outbound})")
    print(f"Report: {out_csv}")
    print("\nTop 30 (sorted bidi-first, then threads desc):")
    for em, info in candidates[:30]:
        flag = "<->" if info["is_bidi"] else "<-" if info["inbound"] > 0 else "->"
        star = "*" if info["has_starred"] else " "
        print(f"  {flag} {star} {em:55s}  thr={info['threads']:2d} in={info['inbound']:2d} out={info['outbound']:2d} last={info['last_date'][:10]}")


if __name__ == "__main__":
    main()
