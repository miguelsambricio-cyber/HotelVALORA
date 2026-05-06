from __future__ import annotations

# ISO-2 country code lookup — covers the most common aliases seen in CoStar/Excel exports
COUNTRY_ALIASES: dict[str, str] = {
    "españa": "ES", "spain": "ES", "espana": "ES", "es": "ES",
    "united states": "US", "united states of america": "US", "usa": "US", "u.s.a.": "US", "us": "US",
    "france": "FR", "fr": "FR", "francia": "FR",
    "united kingdom": "GB", "uk": "GB", "gb": "GB", "great britain": "GB", "england": "GB",
    "germany": "DE", "alemania": "DE", "de": "DE", "deutschland": "DE",
    "italy": "IT", "italia": "IT", "it": "IT",
    "portugal": "PT", "pt": "PT",
    "netherlands": "NL", "holanda": "NL", "nl": "NL", "holland": "NL",
    "mexico": "MX", "méxico": "MX", "mx": "MX",
    "uae": "AE", "united arab emirates": "AE", "ae": "AE",
    "switzerland": "CH", "suiza": "CH", "ch": "CH",
    "austria": "AT", "at": "AT",
    "belgium": "BE", "bélgica": "BE", "be": "BE",
    "greece": "GR", "grecia": "GR", "gr": "GR",
    "turkey": "TR", "turquia": "TR", "tr": "TR",
    "poland": "PL", "polonia": "PL", "pl": "PL",
    "czech republic": "CZ", "czechia": "CZ", "cz": "CZ",
    "hungary": "HU", "hungria": "HU", "hu": "HU",
    "romania": "RO", "rumania": "RO", "ro": "RO",
    "denmark": "DK", "dinamarca": "DK", "dk": "DK",
    "sweden": "SE", "suecia": "SE", "se": "SE",
    "norway": "NO", "noruega": "NO", "no": "NO",
    "finland": "FI", "finlandia": "FI", "fi": "FI",
    "brazil": "BR", "brasil": "BR", "br": "BR",
    "argentina": "AR", "ar": "AR",
    "colombia": "CO", "co": "CO",
    "chile": "CL", "cl": "CL",
    "japan": "JP", "japon": "JP", "jp": "JP",
    "china": "CN", "cn": "CN",
    "singapore": "SG", "sg": "SG",
    "australia": "AU", "au": "AU",
    "canada": "CA", "ca": "CA",
    "south africa": "ZA", "sudáfrica": "ZA", "za": "ZA",
    "morocco": "MA", "marruecos": "MA", "ma": "MA",
    "egypt": "EG", "egipto": "EG", "eg": "EG",
}

# Canonical city name lookup — lowercase key → display name
CITY_CANONICAL: dict[str, str] = {
    # Spain
    "madrid": "Madrid",
    "barcelona": "Barcelona",
    "valencia": "Valencia",
    "sevilla": "Sevilla", "seville": "Sevilla",
    "málaga": "Málaga", "malaga": "Málaga",
    "bilbao": "Bilbao",
    "san sebastián": "San Sebastián", "san sebastian": "San Sebastián",
    "donostia": "San Sebastián", "donostia-san sebastián": "San Sebastián",
    "palma": "Palma de Mallorca", "palma de mallorca": "Palma de Mallorca",
    "zaragoza": "Zaragoza",
    "granada": "Granada",
    "alicante": "Alicante",
    "córdoba": "Córdoba", "cordoba": "Córdoba",
    "valladolid": "Valladolid",
    "vigo": "Vigo",
    "las palmas": "Las Palmas de Gran Canaria",
    "las palmas de gran canaria": "Las Palmas de Gran Canaria",
    "santa cruz de tenerife": "Santa Cruz de Tenerife", "tenerife": "Santa Cruz de Tenerife",
    "coruña": "A Coruña", "a coruña": "A Coruña", "la coruña": "A Coruña",
    "san sebastián de la gomera": "San Sebastián de la Gomera",
    "ibiza": "Ibiza", "eivissa": "Ibiza",
    # Europe
    "london": "London", "Londres": "London",
    "paris": "Paris",
    "berlin": "Berlin",
    "amsterdam": "Amsterdam",
    "rome": "Rome", "roma": "Rome",
    "milan": "Milan", "milano": "Milan",
    "lisbon": "Lisbon", "lisboa": "Lisbon",
    "athens": "Athens", "atenas": "Athens",
    "vienna": "Vienna", "wien": "Vienna", "viena": "Vienna",
    "brussels": "Brussels", "bruselas": "Brussels", "bruxelles": "Brussels",
    "zurich": "Zurich", "zürich": "Zurich",
    "geneva": "Geneva", "ginebra": "Geneva", "genève": "Geneva",
    "munich": "Munich", "münchen": "Munich",
    "frankfurt": "Frankfurt",
    "hamburg": "Hamburg",
    "copenhagen": "Copenhagen", "copenhague": "Copenhagen", "københavn": "Copenhagen",
    "stockholm": "Stockholm",
    "oslo": "Oslo",
    "helsinki": "Helsinki",
    "warsaw": "Warsaw", "varsovia": "Warsaw", "warszawa": "Warsaw",
    "prague": "Prague", "praga": "Prague", "praha": "Prague",
    "budapest": "Budapest",
    "bucharest": "Bucharest", "bucarest": "Bucharest",
    "istanbul": "Istanbul", "estambul": "Istanbul",
    # Americas
    "new york": "New York", "nyc": "New York", "new york city": "New York",
    "los angeles": "Los Angeles", "la": "Los Angeles",
    "miami": "Miami",
    "chicago": "Chicago",
    "houston": "Houston",
    "las vegas": "Las Vegas",
    "san francisco": "San Francisco", "sf": "San Francisco",
    "boston": "Boston",
    "washington": "Washington DC", "washington dc": "Washington DC",
    "toronto": "Toronto",
    "vancouver": "Vancouver",
    "montreal": "Montreal",
    "mexico city": "Mexico City", "ciudad de mexico": "Mexico City",
    "cdmx": "Mexico City", "ciudad de méxico": "Mexico City",
    "buenos aires": "Buenos Aires",
    "bogota": "Bogotá", "bogotá": "Bogotá",
    "santiago": "Santiago",
    "sao paulo": "São Paulo", "são paulo": "São Paulo",
    "rio de janeiro": "Rio de Janeiro",
    # Asia / MENA / Oceania
    "dubai": "Dubai",
    "abu dhabi": "Abu Dhabi",
    "tokyo": "Tokyo",
    "singapore": "Singapore",
    "hong kong": "Hong Kong",
    "shanghai": "Shanghai",
    "beijing": "Beijing",
    "sydney": "Sydney",
    "melbourne": "Melbourne",
    "cairo": "Cairo", "el cairo": "Cairo",
    "casablanca": "Casablanca",
    "johannesburg": "Johannesburg",
    "cape town": "Cape Town",
}


def normalize_country(raw: str | None, default: str = "ES") -> str:
    if not raw:
        return default
    key = raw.strip().lower()
    return COUNTRY_ALIASES.get(key, raw.strip().upper()[:3])


def normalize_city(raw: str | None) -> str | None:
    if not raw:
        return None
    key = raw.strip().lower()
    return CITY_CANONICAL.get(key, raw.strip().title())
