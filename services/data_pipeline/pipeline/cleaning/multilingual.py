"""
Multilingual normalization for hotel name matching across EN/ES/FR/PT/DE.

Pipeline (in order):
    1. NFKD unicode normalization + accent stripping
    2. ß / ligature char-map (not decomposed by NFKD)
    3. Abbreviation expansion (Sto.→Santo, St.→Saint, Str.→Strasse, …)
    4. Hotel prefix stripping (longest-first)
    5. Hotel suffix stripping
    6. Punctuation → space, whitespace collapse
    7. Stopword removal

Public API
----------
normalize_for_matching(text)   → str   comparison key (lowercase, no accents)
expand_abbreviations(text)     → str   after lowercasing, before prefix strip
strip_hotel_tokens(text)       → str   strip prefixes + suffixes only
"""
from __future__ import annotations

import re
import unicodedata

# ── 1. Char-map for characters NFKD cannot decompose ──────────────────────────

_CHAR_MAP: dict[str, str] = {
    "ß": "ss",
    "æ": "ae",
    "Æ": "ae",
    "œ": "oe",
    "Œ": "oe",
    "ø": "o",
    "Ø": "o",
    "ł": "l",
    "Ł": "l",
    "ı": "i",
    "ð": "d",
    "þ": "th",
    "ñ": "n",   # fallback when NFKD keeps tilde
    "ç": "c",   # fallback when NFKD keeps cedilla
}

_CHAR_PATTERN = re.compile("|".join(re.escape(k) for k in _CHAR_MAP))


def _apply_char_map(s: str) -> str:
    return _CHAR_PATTERN.sub(lambda m: _CHAR_MAP[m.group()], s)


# ── 2. Accent stripping ────────────────────────────────────────────────────────

def _strip_accents(s: str) -> str:
    """NFKD + drop combining characters, then apply char-map for leftovers."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return _apply_char_map(s)


# ── 3. Abbreviation expansion ──────────────────────────────────────────────────

# Each rule: (compiled pattern, replacement).
# Applied in order after lowercasing, before prefix stripping.
_RAW_ABBREVS: list[tuple[str, str]] = [
    # Spanish / Portuguese
    (r"\bsto\.\s*", "santo "),
    (r"\bsta\.\s*", "santa "),
    (r"\bsra\.\s*", "senhora "),
    (r"\bsr\.\s*",  "senhor "),
    (r"\bav\.\s*",  "avenida "),
    (r"\bavda\.\s*","avenida "),
    (r"\bc/\s*",    "calle "),
    # French
    (r"\bste\.\s*", "sainte "),
    (r"\bbd\.\s*",  "boulevard "),
    (r"\bpl\.\s*",  "place "),
    # German
    (r"\bstr\.\s*", "strasse "),
    (r"\bpl\.\s*",  "platz "),
    (r"\bgmbh\b",   ""),
    (r"\bag\b",     ""),
    # English
    (r"\bst\.\s*",  "saint "),
    (r"\bmt\.\s*",  "mount "),
    (r"\bft\.\s*",  "fort "),
    (r"\bdr\.\s*",  "drive "),
]

_ABBREV_RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(pat), repl) for pat, repl in _RAW_ABBREVS
]


def expand_abbreviations(text: str) -> str:
    """Expand language-specific abbreviations (input already lowercased)."""
    for pattern, repl in _ABBREV_RULES:
        text = pattern.sub(repl, text)
    return text


# ── 4 & 5. Hotel prefix / suffix lists (all 5 languages) ─────────────────────
# Longest entries first so "grand hotel" is stripped before "hotel".

_PREFIXES: list[str] = [
    # English
    "grand hotel ",
    "boutique hotel ",
    "palace hotel ",
    "the hotel ",
    "the ",
    # Spanish
    "gran hotel ",
    "hotel palacio ",
    "parador de ",
    "parador ",
    # French
    "auberge de ",
    "auberge du ",
    "auberge ",
    # Portuguese
    "pousada de ",
    "pousada ",
    "grande hotel ",
    "estalagem ",
    # German
    "gasthof ",
    "gasthaus ",
    # Generic (must be last — shortest)
    "hotel ",
]

_SUFFIXES: list[str] = [
    " grand hotel",
    " boutique hotel",
    " hotel & spa",
    " hotel and spa",
    " suite hotel",
    " hotel garni",
    " hotel",
    " inn",
    " lodge",
    " manor",
    " resort",
    " suites",
    " spa",
]


def strip_hotel_tokens(text: str) -> str:
    """Strip one leading prefix and one trailing suffix (already lowercased)."""
    for prefix in _PREFIXES:
        if text.startswith(prefix):
            text = text[len(prefix):]
            break
    for suffix in _SUFFIXES:
        if text.endswith(suffix):
            text = text[: -len(suffix)]
            break
    return text


# ── 6. Stopwords ───────────────────────────────────────────────────────────────

_STOPWORDS: frozenset[str] = frozenset({
    # English
    "the", "a", "an", "at", "in", "on", "of", "and", "or", "by",
    # Spanish
    "el", "la", "los", "las", "un", "una", "unos", "unas",
    "de", "del", "en", "al", "con", "por", "para",
    # French
    "le", "les", "du", "au", "aux", "des", "un", "une",
    "et", "ou", "de", "en", "sur",
    # Portuguese
    "o", "os", "as", "do", "da", "dos", "das",
    "no", "na", "nos", "nas", "ao", "aos",
    # German
    "der", "die", "dem", "den", "ein", "eine", "eines", "einem",
    "am", "im", "im", "von", "vom", "zum", "zur", "zu",
    # Italian (common in luxury hotel names)
    "di", "il", "lo", "gli",
    # Dutch (common in chains)
    "van", "het", "de",
})


def _remove_stopwords(text: str) -> str:
    tokens = text.split()
    filtered = [t for t in tokens if t not in _STOPWORDS]
    return " ".join(filtered) if filtered else text


# ── Public entry point ─────────────────────────────────────────────────────────

_PUNCT_RE = re.compile(r"[-,'\"()/&+|]")
_WS_RE = re.compile(r"\s+")


def normalize_for_matching(text: str, *, remove_stopwords: bool = True) -> str:
    """
    Full multilingual normalization pipeline.

    Returns a lowercase ASCII-ish string suitable for dedup / fuzzy matching.
    The result is NOT suitable as a display name — use only for comparisons.

    Args:
        text: Raw hotel name.
        remove_stopwords: When True (default) strips articles/prepositions for
            aggressive fuzzy matching. Pass False to preserve structural words
            like "de", "la", "von" — required for exact dedup keys where those
            words are load-bearing (e.g. "Hôtel de Paris" → "de paris").

    Example:
        normalize_for_matching("Hôtel du Palais")             → "palais"
        normalize_for_matching("Gran Hotel Miramar")           → "miramar"
        normalize_for_matching("Gasthof zur Straße")           → "strasse"
        normalize_for_matching("Hôtel de Paris", remove_stopwords=False) → "de paris"
    """
    if not text or not text.strip():
        return ""

    s = text.strip().lower()
    s = _strip_accents(s)
    s = expand_abbreviations(s)
    s = strip_hotel_tokens(s)
    s = _PUNCT_RE.sub(" ", s)
    s = _WS_RE.sub(" ", s).strip()
    if remove_stopwords:
        s = _remove_stopwords(s)
        s = _WS_RE.sub(" ", s).strip()
    return s
