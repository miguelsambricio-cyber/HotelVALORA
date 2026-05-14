"""Transaction deduplication · Phase 3.f.next 4 · 2026-05-14.

Real-world hotel transactions surface in multiple data sources (CoStar
export · operator's private file · individual news articles tracked
separately). Each report can carry slightly different metadata —
typically the price drifts ±5–10% across sources because news outlets
publish rumored vs confirmed numbers at different times.

Naive ingestion keeps all rows · the UI then shows 3-5 "transactions"
for what is one institutional deal. This module folds those into one
canonical row per (asset, year-month) bucket, picking the modal price
and keeping the sibling rows tagged `is_duplicate=True` for audit.

Algorithm:
  1. Group transactions by (normalised_asset_name, year-month of
     closed_at). Rows without closed_at land in a "no_date" bucket
     keyed by asset only.
  2. Within each group with ≥2 rows:
     a. Collect non-null prices.
     b. Count modal price using ±2% tolerance bands (so €290M and
        €291M count as same · €290M and €310M don't).
     c. The row carrying the modal price (most-common band) wins.
        Ties broken by: row with non-null closed_at, then earliest
        closed_at (most-conservative confirmed date), then first seen.
     d. Other rows get `is_duplicate=True`, `duplicate_of=<canonical_id>`.
     e. Canonical row gets `price_variants[]` listing every distinct
        (source, price_eur, closed_at) seen across siblings.
  3. Groups with 1 row pass through unchanged.

Output: same list shape · same transaction_ids · only metadata added.
The snapshot writer persists the duplicates so an operator can audit
the fold decisions; the web UI filters them at render time.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any


PRICE_TOLERANCE = 0.02  # ±2% bands


def _norm_asset(name: str | None) -> str:
    if not name:
        return ""
    return " ".join(str(name).lower().strip().split())


def _ym(closed_at: str | None) -> str:
    if not closed_at or len(closed_at) < 7:
        return "no_date"
    return closed_at[:7]  # YYYY-MM


def _modal_band(prices: list[float]) -> float | None:
    """Return the modal price band's centre · `None` when no prices."""
    if not prices:
        return None
    # Build bands: each price defines a ±tolerance interval. Count how
    # many sibling prices fall within each band; the centre with the
    # highest membership wins. Ties → highest band centre (most-confirmed
    # bid signal · errs on the side of the bigger number).
    bands: list[tuple[float, int]] = []
    for centre in prices:
        lo = centre * (1 - PRICE_TOLERANCE)
        hi = centre * (1 + PRICE_TOLERANCE)
        count = sum(1 for p in prices if lo <= p <= hi)
        bands.append((centre, count))
    bands.sort(key=lambda b: (-b[1], -b[0]))
    return bands[0][0]


def dedupe_transactions(transactions: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    """Return (transactions_with_dup_metadata, duplicate_count).

    Mutates each transaction dict in-place to add:
      - is_duplicate: bool
      - duplicate_of: str (canonical transaction_id) on duplicates
      - price_variants: list[dict] on the canonical row

    `transactions` shape per row is whatever ingest.py produced · we
    only touch the metadata fields named above.
    """
    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for t in transactions:
        if not t.get("asset_name"):
            continue
        key = (_norm_asset(t["asset_name"]), _ym(t.get("closed_at")))
        groups[key].append(t)

    duplicate_count = 0
    for key, members in groups.items():
        if len(members) < 2:
            continue
        prices = [
            float(m["price_eur"]) for m in members
            if isinstance(m.get("price_eur"), (int, float))
        ]
        modal = _modal_band(prices)

        # Pick canonical row · prefer one whose price is at the modal
        # band · then row with closed_at · then first in list.
        def _rank(t: dict[str, Any]) -> tuple[int, int, str]:
            p = t.get("price_eur")
            on_modal = 0
            if modal is not None and isinstance(p, (int, float)):
                lo = modal * (1 - PRICE_TOLERANCE)
                hi = modal * (1 + PRICE_TOLERANCE)
                if lo <= p <= hi:
                    on_modal = 1
            has_date = 1 if t.get("closed_at") else 0
            # Lower closed_at sorts earlier
            return (-on_modal, -has_date, t.get("closed_at") or "")

        members_sorted = sorted(members, key=_rank)
        canonical = members_sorted[0]

        variants = [
            {
                "source": m.get("source"),
                "price_eur": m.get("price_eur"),
                "closed_at": m.get("closed_at"),
                "transaction_id": m.get("transaction_id"),
            }
            for m in members
        ]
        canonical["price_variants"] = variants
        canonical["is_duplicate"] = False

        for dup in members_sorted[1:]:
            dup["is_duplicate"] = True
            dup["duplicate_of"] = canonical["transaction_id"]
            duplicate_count += 1

    return transactions, duplicate_count
