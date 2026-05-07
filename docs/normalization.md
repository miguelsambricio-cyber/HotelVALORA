# Normalization

Text normalization pipeline for hotel name matching and deduplication.  
**Canonical source:** `services/data_pipeline/pipeline/cleaning/multilingual.py`

---

## Two-Level Normalisation

The codebase uses two distinct normalisation levels:

| Function | Removes stopwords | Used for |
|---|---|---|
| `normalize_for_matching(text, remove_stopwords=True)` | Yes | Fuzzy matching, scoring, dedup |
| `normalize_for_matching(text, remove_stopwords=False)` | No | `hotel_dedup_key()` — preserves "de" in "Hôtel de Paris" |
| `_key(raw)` | No, simpler | Alias lookup, operator comparison |

---

## `normalize_for_matching()` Pipeline

```
input text
  │
strip + lowercase
  │
NFKD unicode decomposition
  │
strip combining characters (diacritics)
  │
_CHAR_MAP substitution (ß→ss, æ→ae, œ→oe, ø→o, ł→l, ı→i)
  │
abbreviation expansion (Sto.→Santo, St.→Saint, Av.→Avenida, Str.→Strasse)
  │
multilingual prefix strip (hotel, gran hotel, parador de, auberge, pousada…)
  │
multilingual suffix strip (inn, lodge, manor, resort, spa, suites…)
  │
punctuation → space  ([-,'"()/&+|])
  │
collapse whitespace
  │
[if remove_stopwords=True] remove stopwords
  │
output
```

---

## Character Map

```python
"ß"→"ss", "æ"→"ae", "Æ"→"ae", "œ"→"oe", "Œ"→"oe",
"ø"→"o",  "Ø"→"o",  "ł"→"l",  "Ł"→"l",  "ı"→"i"
```

---

## Prefixes Stripped (longest-match, order matters)

```
grand hotel, boutique hotel, palace hotel, the hotel,
gran hotel, hotel palacio, parador de, parador,
auberge de, auberge du, auberge,
pousada de, pousada, grande hotel, gasthof, gasthaus,
hotel
```

Note: `parador de ` includes the trailing "de " — stripping it removes "parador de Granada" → "granada", not "de granada".

## Suffixes Stripped

```
grand hotel, boutique hotel, hotel & spa, hotel and spa,
suite hotel, hotel garni, hotel, inn, lodge,
manor, resort, suites, spa
```

---

## Abbreviation Expansion

Applied before prefix stripping (word-boundary safe):

| Pattern | Expansion |
|---|---|
| `Sto.` | `Santo ` |
| `Sta.` | `Santa ` |
| `St.` | `Saint ` |
| `Av.` | `Avenida ` |
| `Str.` (standalone) | `Strasse ` |

`\b` boundary: `Str.` matches standalone only — `Hauptstr.` is NOT expanded (embedded abbreviation).

---

## Stopwords (removed when `remove_stopwords=True`)

| Language | Words |
|---|---|
| English | the, a, an, at, in, on, of, and, or, by |
| Spanish | el, la, los, las, un, una, de, del, en, al |
| French | le, les, du, au, aux, des |
| Portuguese | os, as, do, da, dos, das |
| German | der, die, dem, den, ein, eine, am, im, von, vom |

---

## `hotel_dedup_key(name, city)`

Located in `services/data_pipeline/pipeline/cleaning/names.py`.

```python
def hotel_dedup_key(name: str, city: str) -> str:
    k = normalize_for_matching(name, remove_stopwords=False)
    city_k = _key(city)
    return f"{k}|{city_k}"
```

Uses `remove_stopwords=False` to preserve structural words like "de" in "Hôtel de Paris" → key becomes `"de paris|paris"`.

---

## `_key(raw)` — Lightweight normalisation

Used for alias lookup and operator comparison. Simpler than `normalize_for_matching`:

```python
def _key(raw: str) -> str:
    nfd = unicodedata.normalize("NFKD", raw.strip().lower())
    stripped = "".join(c for c in nfd if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", stripped).strip()
```

No prefix stripping, no stopwords, no abbreviation expansion. Three inlined copies exist:
- `services/data_pipeline/pipeline/cleaning/names.py` (canonical)
- `app/services/alias_service.py` (inlined — pipeline not importable)
- `app/services/dedup_service.py` (inlined)

---

## Geography Normalisation

In `services/data_pipeline/pipeline/cleaning/geography.py`:

- `normalize_city(raw)` — 118 registered city aliases; unregistered → title-case as-is
- `normalize_country(raw, default="ES")` — 103 registered country aliases; unknown → upper(raw[:3]) or default

Examples: `"BARCELONA"→"Barcelona"`, `"nueva york"→"Nueva York"`, `"España"→"ES"`, `"Deutschland"→"DE"`.

---

## Inlining Rule

`services/data_pipeline` is **not importable** from `apps/api`. When normalisation logic is needed in the API, it is re-implemented inline. The three inline copies must stay in sync with the canonical source manually.
