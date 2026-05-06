"""
Normalization rules for hotel names, submarket names, market names,
and hotel operators.

All lookups are case-insensitive. Accent normalization (NFKD) is applied
before dictionary lookup so "Málaga" and "Malaga" resolve identically.

Public API
----------
hotel_dedup_key(name, city)   -> str   for duplicate detection comparisons
normalize_hotel_name(raw)     -> str   canonical display name
normalize_submarket(raw)      -> str   canonical submarket
normalize_market(raw)         -> str   canonical market (city-level)
normalize_operator(raw)       -> str   canonical operating company
normalize_region(raw)         -> str   canonical region / state
"""
from __future__ import annotations

import re
import unicodedata


# ── Shared helpers ──────────────────────────────────────────────────────────────

def _key(raw: str) -> str:
    """Lowercase + strip accents + collapse whitespace. Used for all lookups."""
    s = unicodedata.normalize("NFKD", raw.strip().lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s)


# ── Hotel name normalization ────────────────────────────────────────────────────

# Prefixes stripped from hotel names when building the dedup comparison key.
# Order matters: longest-first to avoid partial matches.
_HOTEL_PREFIXES = [
    "gran hotel ", "grand hotel ", "palace hotel ", "hotel palacio ",
    "hotel ", "the hotel ", "boutique hotel ",
]

# Suffixes stripped from the dedup key (not from the display name).
_HOTEL_SUFFIXES = [
    " hotel",
]

# Known CoStar / third-party name variants → canonical internal display name.
# Keys are already _key()-normalized (lowercase, no accents).
HOTEL_NAME_ALIASES: dict[str, str] = {
    # Barcelona
    "arts hotel barcelona": "Hotel Arts Barcelona",
    "ritz-carlton barcelona": "Hotel Arts Barcelona",
    "ritz carlton barcelona": "Hotel Arts Barcelona",
    "w hotel barcelona": "Hotel W Barcelona",
    "w barcelona hotel": "Hotel W Barcelona",
    "hilton diagonal mar": "Hilton Diagonal Mar Barcelona",
    "diagonal mar hilton": "Hilton Diagonal Mar Barcelona",
    "casa fuster barcelona": "Hotel Casa Fuster",
    # Madrid
    "nh collection eurobuilding": "NH Collection Madrid Eurobuilding",
    "eurobuilding hotel": "NH Collection Madrid Eurobuilding",
    "nh eurobuilding": "NH Collection Madrid Eurobuilding",
    "melia castilla madrid": "Meliá Castilla",
    "melia castilla": "Meliá Castilla",
    "iberostar gran via": "Iberostar Las Letras Gran Via",
    "las letras hotel": "Iberostar Las Letras Gran Via",
    "palacio de los duques": "Palacio de los Duques Gran Meliá",
    "gran melia duques": "Palacio de los Duques Gran Meliá",
    # Sevilla
    "hotel alfonso xiii sevilla": "Hotel Alfonso XIII",
    "alfonso xiii sevilla": "Hotel Alfonso XIII",
    # Málaga
    "miramar malaga": "Gran Hotel Miramar",
    "hotel miramar malaga": "Gran Hotel Miramar",
    "ac malaga palacio": "AC Hotel Málaga Palacio",
    "ac palacio malaga": "AC Hotel Málaga Palacio",
    # Córdoba
    "palacio del bailio": "Hospes Palacio del Bailío",
    "hospes bailio": "Hospes Palacio del Bailío",
}


def normalize_hotel_name(raw: str | None) -> str | None:
    """
    Return the canonical display name for a hotel.
    Falls back to title-casing the raw value if no alias is found.
    """
    if not raw or not raw.strip():
        return None
    k = _key(raw)
    if k in HOTEL_NAME_ALIASES:
        return HOTEL_NAME_ALIASES[k]
    return raw.strip()


def hotel_dedup_key(name: str, city: str) -> str:
    """
    Build a normalized comparison key for duplicate detection.
    Strips leading article prefixes and trailing suffixes, removes accents.

    Example:
        hotel_dedup_key("Hotel Arts Barcelona", "Barcelona") -> "arts barcelona|barcelona"
        hotel_dedup_key("Gran Hotel Miramar", "Málaga")     -> "miramar|malaga"
        hotel_dedup_key("Meliá Castilla", "Madrid")         -> "melia castilla|madrid"
    """
    k = _key(name)
    for prefix in _HOTEL_PREFIXES:
        if k.startswith(prefix):
            k = k[len(prefix):]
            break
    for suffix in _HOTEL_SUFFIXES:
        if k.endswith(suffix):
            k = k[: -len(suffix)]
            break
    k = re.sub(r"[-,'\"()]", " ", k)
    k = re.sub(r"\s+", " ", k).strip()

    city_k = _key(city)
    return f"{k}|{city_k}"


# ── Submarket normalization ─────────────────────────────────────────────────────

# Maps any known alias (lowercased + accent-stripped) → canonical submarket name.
SUBMARKET_ALIASES: dict[str, str] = {
    # ── Barcelona ──
    "barcelona cbd": "Barcelona CBD",
    "barcelona city center": "Barcelona CBD",
    "barcelona city centre": "Barcelona CBD",
    "barcelona centro": "Barcelona CBD",
    "barcelona center": "Barcelona CBD",
    "bcn cbd": "Barcelona CBD",
    "bcn centro": "Barcelona CBD",
    "center barcelona": "Barcelona CBD",
    "barcelona eixample": "Barcelona CBD",
    "eixample": "Barcelona CBD",
    "barcelona gothic": "Barcelona Gótico",
    "barcelona gotico": "Barcelona Gótico",
    "barrio gotico": "Barcelona Gótico",
    "gothic quarter": "Barcelona Gótico",
    "old town barcelona": "Barcelona Gótico",
    "barcelona born": "Barcelona Gótico",
    "el born": "Barcelona Gótico",
    "barcelona beach": "Barcelona Beach",
    "barcelona waterfront": "Barcelona Beach",
    "barcelona seafront": "Barcelona Beach",
    "barceloneta": "Barcelona Beach",
    "barcelona beachfront": "Barcelona Beach",
    "barcelona littoral": "Barcelona Beach",
    "barcelona 22@": "Barcelona 22@",
    "22@ barcelona": "Barcelona 22@",
    "poblenou": "Barcelona 22@",
    "barcelona diagonal": "Barcelona Diagonal",
    "pedrera area": "Barcelona Diagonal",
    "zona alta": "Barcelona Zona Alta",
    "zona alta barcelona": "Barcelona Zona Alta",
    "barcelona zona alta": "Barcelona Zona Alta",
    "pedralbes": "Barcelona Zona Alta",
    "sarria": "Barcelona Zona Alta",
    "sant gervasi": "Barcelona Zona Alta",
    "barcelona airport": "Barcelona Airport",
    "el prat": "Barcelona Airport",
    "prat de llobregat": "Barcelona Airport",
    "bcn airport": "Barcelona Airport",

    # ── Madrid ──
    "madrid cbd": "Madrid CBD",
    "madrid city center": "Madrid CBD",
    "madrid city centre": "Madrid CBD",
    "madrid centro": "Madrid CBD",
    "centro madrid": "Madrid CBD",
    "madrid historic center": "Madrid CBD",
    "casco historico madrid": "Madrid CBD",
    "sol gran via": "Madrid CBD",
    "gran via madrid": "Madrid CBD",
    "retiro": "Madrid CBD",
    "madrid retiro": "Madrid CBD",
    "madrid salamanca": "Madrid CBD",
    "barrio de salamanca": "Madrid CBD",
    "madrid ifema": "Madrid IFEMA",
    "ifema": "Madrid IFEMA",
    "madrid airport": "Madrid IFEMA",
    "madrid aeropuerto": "Madrid IFEMA",
    "barajas": "Madrid IFEMA",
    "ifema barajas": "Madrid IFEMA",
    "adolfo suarez madrid barajas": "Madrid IFEMA",
    "madrid north": "Madrid Norte",
    "madrid norte": "Madrid Norte",
    "madrid sanchinarro": "Madrid Norte",
    "las tablas": "Madrid Norte",
    "madrid castellana": "Madrid Castellana",
    "castellana": "Madrid Castellana",
    "paseo de la castellana": "Madrid Castellana",
    "azca": "Madrid Castellana",

    # ── Sevilla ──
    "sevilla centro": "Sevilla Centro",
    "sevilla city center": "Sevilla Centro",
    "sevilla city centre": "Sevilla Centro",
    "seville city center": "Sevilla Centro",
    "seville city centre": "Sevilla Centro",
    "seville centro": "Sevilla Centro",
    "seville center": "Sevilla Centro",
    "sevilla old town": "Sevilla Centro",
    "sevilla casco historico": "Sevilla Centro",
    "santa cruz sevilla": "Sevilla Centro",
    "sevilla triana": "Sevilla Triana",
    "triana": "Sevilla Triana",

    # ── Málaga ──
    "malaga centro": "Málaga Centro",
    "malaga city center": "Málaga Centro",
    "malaga city centre": "Málaga Centro",
    "malaga center": "Málaga Centro",
    "malaga historic": "Málaga Centro",
    "malaga old town": "Málaga Centro",
    "centro malaga": "Málaga Centro",
    "malaga port": "Málaga Puerto",
    "malaga harbor": "Málaga Puerto",
    "malaga waterfront": "Málaga Puerto",
    "puerto malaga": "Málaga Puerto",

    # ── Bilbao ──
    "bilbao centro": "Bilbao Centro",
    "bilbao city center": "Bilbao Centro",
    "bilbao city centre": "Bilbao Centro",
    "bilbao cbd": "Bilbao Centro",
    "bilbao casco viejo": "Bilbao Casco Viejo",
    "casco viejo bilbao": "Bilbao Casco Viejo",
    "bilbao old town": "Bilbao Casco Viejo",

    # ── San Sebastián ──
    "san sebastian centro": "San Sebastián Centro",
    "donostia centro": "San Sebastián Centro",
    "san sebastian city center": "San Sebastián Centro",
    "san sebastian center": "San Sebastián Centro",
    "donostia-san sebastian": "San Sebastián Centro",

    # ── Palma de Mallorca ──
    "palma centro": "Palma Centro",
    "palma city center": "Palma Centro",
    "palma old town": "Palma Centro",
    "palma casco": "Palma Centro",
    "palma de mallorca centro": "Palma Centro",
    "palma port": "Palma Puerto",
    "palma harbor": "Palma Puerto",
    "palma puerto": "Palma Puerto",

    # ── Valencia ──
    "valencia centro": "Valencia Centro",
    "valencia city center": "Valencia Centro",
    "valencia city centre": "Valencia Centro",
    "valencia cbd": "Valencia Centro",
    "valencia old town": "Valencia Centro",
    "ciudad de las artes": "Valencia Ruzafa",
    "ruzafa": "Valencia Ruzafa",
    "valencia ruzafa": "Valencia Ruzafa",

    # ── Córdoba ──
    "cordoba centro": "Córdoba Centro",
    "cordoba city center": "Córdoba Centro",
    "cordoba old town": "Córdoba Centro",
    "mezquita area": "Córdoba Centro",
    "cordoba juderia": "Córdoba Centro",

    # ── Granada ──
    "granada centro": "Granada Centro",
    "granada city center": "Granada Centro",
    "alhambra district": "Granada Centro",
    "granada old town": "Granada Centro",

    # ── Canarias / Baleares ──
    "playa de las americas": "Tenerife Sur",
    "tenerife sur": "Tenerife Sur",
    "tenerife north": "Tenerife Norte",
    "tenerife norte": "Tenerife Norte",
    "santa cruz tenerife": "Tenerife Norte",
    "las palmas centro": "Las Palmas Centro",
    "gran canaria sur": "Gran Canaria Sur",
    "ibiza town": "Ibiza Centro",
    "ibiza centro": "Ibiza Centro",
    "ibiza port": "Ibiza Puerto",

    # ── International (most common) ──
    "london city": "London City",
    "london west end": "London West End",
    "london mayfair": "London Mayfair",
    "london west end/mayfair": "London Mayfair",
    "london kensington": "London Kensington",
    "paris cbd": "Paris CBD",
    "paris center": "Paris CBD",
    "paris 1er": "Paris CBD",
    "lisbon centro": "Lisbon Centro",
    "lisbon baixa": "Lisbon Centro",
}


def normalize_submarket(raw: str | None) -> str | None:
    """Return the canonical submarket display name, or title-case if unknown."""
    if not raw or not raw.strip():
        return None
    k = _key(raw)
    if k in SUBMARKET_ALIASES:
        return SUBMARKET_ALIASES[k]
    return raw.strip()


# ── Market (city-level) normalization ──────────────────────────────────────────

# CoStar market names → canonical city name (maps to geography.CITY_CANONICAL values).
MARKET_ALIASES: dict[str, str] = {
    "barcelona": "Barcelona",
    "barcelona market": "Barcelona",
    "barcelona metropolitan": "Barcelona",
    "barcelona metropolitan area": "Barcelona",
    "barcelona msa": "Barcelona",
    "gran barcelona": "Barcelona",
    "madrid": "Madrid",
    "madrid market": "Madrid",
    "madrid metropolitan": "Madrid",
    "madrid metropolitan area": "Madrid",
    "madrid msa": "Madrid",
    "comunidad de madrid": "Madrid",
    "sevilla": "Sevilla",
    "seville": "Sevilla",
    "sevilla market": "Sevilla",
    "malaga": "Málaga",
    "malaga market": "Málaga",
    "costa del sol": "Málaga",
    "bilbao": "Bilbao",
    "pais vasco": "Bilbao",
    "san sebastian": "San Sebastián",
    "donostia": "San Sebastián",
    "palma": "Palma de Mallorca",
    "palma de mallorca": "Palma de Mallorca",
    "mallorca": "Palma de Mallorca",
    "baleares": "Palma de Mallorca",
    "ibiza": "Ibiza",
    "eivissa": "Ibiza",
    "valencia": "Valencia",
    "comunidad valenciana": "Valencia",
    "tenerife": "Santa Cruz de Tenerife",
    "santa cruz de tenerife": "Santa Cruz de Tenerife",
    "las palmas": "Las Palmas de Gran Canaria",
    "gran canaria": "Las Palmas de Gran Canaria",
    "cordoba": "Córdoba",
    "granada": "Granada",
    "alicante": "Alicante",
    "costa blanca": "Alicante",
    "zaragoza": "Zaragoza",
    "aragon": "Zaragoza",
    "valladolid": "Valladolid",
    "vigo": "Vigo",
    "a coruna": "A Coruña",
    "la coruna": "A Coruña",
    "galicia": "A Coruña",
    "santander": "Santander",
    "cantabria": "Santander",
    "pamplona": "Pamplona",
    "navarra": "Pamplona",
    "logrono": "Logroño",
    "la rioja": "Logroño",
}


def normalize_market(raw: str | None) -> str | None:
    """Return the canonical city name for a market label."""
    if not raw or not raw.strip():
        return None
    k = _key(raw)
    if k in MARKET_ALIASES:
        return MARKET_ALIASES[k]
    return raw.strip()


# ── Operator normalization ──────────────────────────────────────────────────────

# Maps brand names and operator variants → canonical parent operating company.
# Used to resolve "Ritz-Carlton", "W Hotels", "AC Hotels by Marriott" all → "Marriott International".
OPERATOR_CANONICAL: dict[str, str] = {
    # ── Marriott International ──
    "marriott": "Marriott International",
    "marriott international": "Marriott International",
    "marriott hotels": "Marriott International",
    "marriott hotels resorts": "Marriott International",
    "marriott hotels & resorts": "Marriott International",
    "marriott hotels and resorts": "Marriott International",
    "ritz-carlton": "Marriott International",
    "ritz carlton": "Marriott International",
    "the ritz-carlton": "Marriott International",
    "w hotels": "Marriott International",
    "w hotels & resorts": "Marriott International",
    "westin": "Marriott International",
    "westin hotels & resorts": "Marriott International",
    "sheraton": "Marriott International",
    "sheraton hotels & resorts": "Marriott International",
    "st regis": "Marriott International",
    "st. regis": "Marriott International",
    "the st. regis": "Marriott International",
    "luxury collection": "Marriott International",
    "a luxury collection": "Marriott International",
    "the luxury collection": "Marriott International",
    "renaissance": "Marriott International",
    "renaissance hotels": "Marriott International",
    "autograph collection": "Marriott International",
    "ac hotels": "Marriott International",
    "ac hotels by marriott": "Marriott International",
    "ac hotel": "Marriott International",
    "courtyard": "Marriott International",
    "courtyard by marriott": "Marriott International",
    "four points": "Marriott International",
    "four points by sheraton": "Marriott International",
    "le meridien": "Marriott International",
    "le meridien hotels": "Marriott International",
    "tribute portfolio": "Marriott International",
    "design hotels": "Marriott International",
    "moxy": "Marriott International",
    "moxy hotels": "Marriott International",
    "aloft": "Marriott International",
    "aloft hotels": "Marriott International",
    "element": "Marriott International",
    "element hotels": "Marriott International",
    "edition": "Marriott International",
    "the edition": "Marriott International",
    "delta hotels": "Marriott International",
    "gaylord hotels": "Marriott International",

    # ── Hilton Worldwide ──
    "hilton": "Hilton Worldwide",
    "hilton worldwide": "Hilton Worldwide",
    "hilton hotels": "Hilton Worldwide",
    "hilton hotels & resorts": "Hilton Worldwide",
    "hilton hotels and resorts": "Hilton Worldwide",
    "doubletree": "Hilton Worldwide",
    "doubletree by hilton": "Hilton Worldwide",
    "doubletree hotels": "Hilton Worldwide",
    "curio collection": "Hilton Worldwide",
    "curio collection by hilton": "Hilton Worldwide",
    "tapestry collection": "Hilton Worldwide",
    "tapestry collection by hilton": "Hilton Worldwide",
    "waldorf astoria": "Hilton Worldwide",
    "waldorf astoria hotels": "Hilton Worldwide",
    "lxr hotels": "Hilton Worldwide",
    "lxr hotels & resorts": "Hilton Worldwide",
    "conrad": "Hilton Worldwide",
    "conrad hotels": "Hilton Worldwide",
    "canopy by hilton": "Hilton Worldwide",
    "hilton garden inn": "Hilton Worldwide",
    "garden inn": "Hilton Worldwide",
    "hampton inn": "Hilton Worldwide",
    "hampton by hilton": "Hilton Worldwide",
    "embassy suites": "Hilton Worldwide",
    "embassy suites by hilton": "Hilton Worldwide",
    "homewood suites": "Hilton Worldwide",
    "homewood suites by hilton": "Hilton Worldwide",
    "home2 suites": "Hilton Worldwide",
    "motto by hilton": "Hilton Worldwide",
    "tru by hilton": "Hilton Worldwide",
    "tempo by hilton": "Hilton Worldwide",
    "signia by hilton": "Hilton Worldwide",
    "spark by hilton": "Hilton Worldwide",

    # ── IHG Hotels & Resorts ──
    "ihg": "IHG Hotels & Resorts",
    "ihg hotels": "IHG Hotels & Resorts",
    "ihg hotels & resorts": "IHG Hotels & Resorts",
    "intercontinental": "IHG Hotels & Resorts",
    "intercontinental hotels": "IHG Hotels & Resorts",
    "intercontinental hotels group": "IHG Hotels & Resorts",
    "intercontinental hotels & resorts": "IHG Hotels & Resorts",
    "crowne plaza": "IHG Hotels & Resorts",
    "crowne plaza hotels": "IHG Hotels & Resorts",
    "holiday inn": "IHG Hotels & Resorts",
    "holiday inn express": "IHG Hotels & Resorts",
    "holiday inn resort": "IHG Hotels & Resorts",
    "kimpton": "IHG Hotels & Resorts",
    "kimpton hotels": "IHG Hotels & Resorts",
    "hotel indigo": "IHG Hotels & Resorts",
    "six senses": "IHG Hotels & Resorts",
    "six senses hotels": "IHG Hotels & Resorts",
    "regent": "IHG Hotels & Resorts",
    "regent hotels": "IHG Hotels & Resorts",
    "voco": "IHG Hotels & Resorts",
    "even hotels": "IHG Hotels & Resorts",
    "avid hotels": "IHG Hotels & Resorts",
    "atwell suites": "IHG Hotels & Resorts",
    "staybridge suites": "IHG Hotels & Resorts",

    # ── Accor ──
    "accor": "Accor",
    "accorhotels": "Accor",
    "accor hotels": "Accor",
    "sofitel": "Accor",
    "sofitel hotels & resorts": "Accor",
    "pullman": "Accor",
    "pullman hotels & resorts": "Accor",
    "mgallery": "Accor",
    "mgallery by sofitel": "Accor",
    "fairmont": "Accor",
    "fairmont hotels & resorts": "Accor",
    "raffles": "Accor",
    "raffles hotels & resorts": "Accor",
    "novotel": "Accor",
    "novotel hotels": "Accor",
    "mercure": "Accor",
    "mercure hotels": "Accor",
    "ibis": "Accor",
    "ibis styles": "Accor",
    "ibis budget": "Accor",
    "swissotel": "Accor",
    "movenpick": "Accor",
    "25hours": "Accor",
    "25hours hotels": "Accor",
    "mama shelter": "Accor",
    "tribe": "Accor",
    "hyde": "Accor",
    "mondrian": "Accor",
    "sls": "Accor",
    "delano": "Accor",
    "banyan tree": "Accor",
    "mantis": "Accor",

    # ── Hyatt Hotels Corporation ──
    "hyatt": "Hyatt Hotels Corporation",
    "hyatt hotels": "Hyatt Hotels Corporation",
    "hyatt hotels corporation": "Hyatt Hotels Corporation",
    "park hyatt": "Hyatt Hotels Corporation",
    "grand hyatt": "Hyatt Hotels Corporation",
    "hyatt regency": "Hyatt Hotels Corporation",
    "hyatt centric": "Hyatt Hotels Corporation",
    "hyatt place": "Hyatt Hotels Corporation",
    "hyatt house": "Hyatt Hotels Corporation",
    "thompson hotels": "Hyatt Hotels Corporation",
    "andaz": "Hyatt Hotels Corporation",
    "alila": "Hyatt Hotels Corporation",
    "destination hotels": "Hyatt Hotels Corporation",
    "slh": "Hyatt Hotels Corporation",
    "small luxury hotels": "Hyatt Hotels Corporation",
    "caption by hyatt": "Hyatt Hotels Corporation",
    "zoetry": "Hyatt Hotels Corporation",
    "secrets": "Hyatt Hotels Corporation",

    # ── Meliá Hotels International ──
    "melia": "Meliá Hotels International",
    "meliá": "Meliá Hotels International",
    "melia hotels": "Meliá Hotels International",
    "melia hotels international": "Meliá Hotels International",
    "meliá hotels international": "Meliá Hotels International",
    "gran melia": "Meliá Hotels International",
    "gran meliá": "Meliá Hotels International",
    "me by melia": "Meliá Hotels International",
    "me hotels": "Meliá Hotels International",
    "paradisus": "Meliá Hotels International",
    "innside": "Meliá Hotels International",
    "innside by melia": "Meliá Hotels International",
    "sol hotels": "Meliá Hotels International",
    "sol by melia": "Meliá Hotels International",
    "circle by melia": "Meliá Hotels International",
    "zel": "Meliá Hotels International",

    # ── Minor Hotels (NH Hotel Group) ──
    "nh": "Minor Hotels",
    "nh hotels": "Minor Hotels",
    "nh hotel group": "Minor Hotels",
    "nh collection": "Minor Hotels",
    "nhow": "Minor Hotels",
    "nhow hotels": "Minor Hotels",
    "minor hotels": "Minor Hotels",
    "minor hotel group": "Minor Hotels",
    "anantara": "Minor Hotels",
    "avani": "Minor Hotels",
    "oaks hotels": "Minor Hotels",
    "tivoli hotels": "Minor Hotels",
    "elewana": "Minor Hotels",

    # ── Barceló Hotel Group ──
    "barcelo": "Barceló Hotel Group",
    "barceló": "Barceló Hotel Group",
    "barcelo hotel group": "Barceló Hotel Group",
    "barceló hotel group": "Barceló Hotel Group",
    "royal hideaway": "Barceló Hotel Group",
    "allegro hotels": "Barceló Hotel Group",

    # ── Iberostar Group ──
    "iberostar": "Iberostar Group",
    "iberostar group": "Iberostar Group",
    "iberostar hotels": "Iberostar Group",
    "iberostar hotels & resorts": "Iberostar Group",
    "iberostar selection": "Iberostar Group",
    "iberostar grand": "Iberostar Group",
    "iberostar beachfront": "Iberostar Group",

    # ── Riu Hotels & Resorts ──
    "riu": "Riu Hotels & Resorts",
    "riu hotels": "Riu Hotels & Resorts",
    "riu hotels & resorts": "Riu Hotels & Resorts",
    "riu palace": "Riu Hotels & Resorts",
    "riu plaza": "Riu Hotels & Resorts",

    # ── Four Seasons Hotels and Resorts ──
    "four seasons": "Four Seasons Hotels and Resorts",
    "four seasons hotels": "Four Seasons Hotels and Resorts",
    "four seasons hotels and resorts": "Four Seasons Hotels and Resorts",
    "four seasons hotels & resorts": "Four Seasons Hotels and Resorts",

    # ── Mandarin Oriental Hotel Group ──
    "mandarin oriental": "Mandarin Oriental Hotel Group",
    "mandarin oriental hotel group": "Mandarin Oriental Hotel Group",

    # ── Rosewood Hotels & Resorts ──
    "rosewood": "Rosewood Hotels & Resorts",
    "rosewood hotels": "Rosewood Hotels & Resorts",
    "rosewood hotels & resorts": "Rosewood Hotels & Resorts",

    # ── Belmond ──
    "belmond": "Belmond",
    "orient-express": "Belmond",
    "orient express": "Belmond",

    # ── Aman Resorts ──
    "aman": "Aman Resorts",
    "aman resorts": "Aman Resorts",
    "amanresorts": "Aman Resorts",
    "amanruya": "Aman Resorts",

    # ── Relais & Châteaux ──
    "relais & chateaux": "Relais & Châteaux",
    "relais & châteaux": "Relais & Châteaux",
    "relais chateaux": "Relais & Châteaux",
    "relais and chateaux": "Relais & Châteaux",

    # ── Spanish independents / boutique groups ──
    "hospes": "Hospes Hotels",
    "hospes hotels": "Hospes Hotels",
    "hospes hotels sl": "Hospes Hotels",
    "gl hotels": "GL Hotels",
    "gl hotels & resorts": "GL Hotels",
    "gl hotels resorts": "GL Hotels",
    "palladium hotel group": "Palladium Hotel Group",
    "palladium": "Palladium Hotel Group",
    "hard rock hotel": "Hard Rock Hotels",
    "hard rock": "Hard Rock Hotels",
    "vincci hotels": "Vincci Hotels",
    "vincci": "Vincci Hotels",
    "silken hotels": "Silken Hotels",
    "silken": "Silken Hotels",
    "hesperia": "Grupo Inversor Hesperia",
    "grupo hesperia": "Grupo Inversor Hesperia",
    "grupo inversor hesperia": "Grupo Inversor Hesperia",
    "hotusa": "Grupo Hotusa",
    "grupo hotusa": "Grupo Hotusa",
    "eurostars hotels": "Grupo Hotusa",
    "exe hotels": "Grupo Hotusa",
    "apartamentos hotusa": "Grupo Hotusa",
}


def normalize_operator(raw: str | None) -> str | None:
    """
    Return the canonical parent operating company for a hotel operator or brand name.
    Returns the input title-cased if no match is found (preserves unknown operators).
    """
    if not raw or not raw.strip():
        return None
    k = _key(raw)
    if k in OPERATOR_CANONICAL:
        return OPERATOR_CANONICAL[k]
    return raw.strip()


# ── Region / state normalization ────────────────────────────────────────────────

# Maps CoStar "State" field variants → canonical English region name.
REGION_ALIASES: dict[str, str] = {
    # Spain
    "cataluna": "Catalonia",
    "cataluña": "Catalonia",
    "catalonia": "Catalonia",
    "catalunya": "Catalonia",
    "cat": "Catalonia",
    "andalucia": "Andalusia",
    "andalucía": "Andalusia",
    "andalusia": "Andalusia",
    "and": "Andalusia",
    "comunidad de madrid": "Community of Madrid",
    "community of madrid": "Community of Madrid",
    "region de madrid": "Community of Madrid",
    "madrid region": "Community of Madrid",
    "madrid": "Community of Madrid",  # when used as state field
    "comunidad valenciana": "Valencian Community",
    "valencian community": "Valencian Community",
    "comunitat valenciana": "Valencian Community",
    "pais vasco": "Basque Country",
    "país vasco": "Basque Country",
    "basque country": "Basque Country",
    "euskadi": "Basque Country",
    "euskal herria": "Basque Country",
    "galicia": "Galicia",
    "aragon": "Aragón",
    "aragón": "Aragón",
    "castilla y leon": "Castile and León",
    "castilla y león": "Castile and León",
    "castile and leon": "Castile and León",
    "castile leon": "Castile and León",
    "castilla-la mancha": "Castile-La Mancha",
    "castile la mancha": "Castile-La Mancha",
    "region de murcia": "Region of Murcia",
    "murcia": "Region of Murcia",
    "islas baleares": "Balearic Islands",
    "balearic islands": "Balearic Islands",
    "baleares": "Balearic Islands",
    "illes balears": "Balearic Islands",
    "islas canarias": "Canary Islands",
    "canary islands": "Canary Islands",
    "canarias": "Canary Islands",
    "islas canarias": "Canary Islands",
    "principado de asturias": "Asturias",
    "asturias": "Asturias",
    "cantabria": "Cantabria",
    "la rioja": "La Rioja",
    "navarra": "Navarre",
    "comunidad foral de navarra": "Navarre",
    "navarre": "Navarre",
    "extremadura": "Extremadura",
    # Portugal
    "lisboa": "Lisbon",
    "lisbon": "Lisbon",
    "porto": "Porto",
    "algarve": "Algarve",
    # Common UK / FR / DE
    "england": "England",
    "greater london": "England",
    "ile-de-france": "Île-de-France",
    "ile de france": "Île-de-France",
    "paris": "Île-de-France",  # when used as region
    "bayern": "Bavaria",
    "bavaria": "Bavaria",
}


def normalize_region(raw: str | None) -> str | None:
    """Return canonical region/state name. Title-cases unknown values."""
    if not raw or not raw.strip():
        return None
    k = _key(raw)
    if k in REGION_ALIASES:
        return REGION_ALIASES[k]
    return raw.strip()
