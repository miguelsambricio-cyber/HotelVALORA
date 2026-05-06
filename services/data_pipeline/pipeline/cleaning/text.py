from __future__ import annotations

import re
from python_slugify import slugify as _slugify

_WHITESPACE = re.compile(r"\s+")


def clean_string(value: object, max_length: int | None = None) -> str | None:
    if value is None:
        return None
    cleaned = _WHITESPACE.sub(" ", str(value).strip())
    if not cleaned or cleaned.lower() in {"nan", "none", "null", "n/a", "-", "—"}:
        return None
    if max_length:
        cleaned = cleaned[:max_length]
    return cleaned


def make_slug(name: str) -> str:
    return _slugify(name)


_CHAIN_SCALE_MAP: dict[str, str] = {
    "luxury": "luxury",
    "upper upscale": "upper_upscale",
    "upper-upscale": "upper_upscale",
    "upper_upscale": "upper_upscale",
    "upscale": "upscale",
    "upper midscale": "upper_midscale",
    "upper-midscale": "upper_midscale",
    "upper_midscale": "upper_midscale",
    "midscale": "midscale",
    "economy": "economy",
    "budget": "economy",
    "select service": "select",
    "select-service": "select",
    "select_service": "select",
    "select": "select",
    "extended stay": "extended_stay",
    "extended-stay": "extended_stay",
    "extended_stay": "extended_stay",
}

_ASSET_TYPE_MAP: dict[str, str] = {
    "full service": "full_service",
    "full-service": "full_service",
    "full_service": "full_service",
    "select service": "select_service",
    "select-service": "select_service",
    "select_service": "select_service",
    "extended stay": "extended_stay",
    "extended-stay": "extended_stay",
    "extended_stay": "extended_stay",
    "resort": "resort",
    "boutique": "boutique",
    "apart hotel": "apart_hotel",
    "apart-hotel": "apart_hotel",
    "aparthotel": "apart_hotel",
    "apart_hotel": "apart_hotel",
    "serviced apartment": "apart_hotel",
    "serviced apartments": "apart_hotel",
}

_STATUS_MAP: dict[str, str] = {
    "active": "operating",
    "open": "operating",
    "operating": "operating",
    "operational": "operating",
    "pipeline": "pipeline",
    "under construction": "pipeline",
    "planned": "pipeline",
    "development": "pipeline",
    "under renovation": "under_renovation",
    "renovation": "under_renovation",
    "under_renovation": "under_renovation",
    "refurbishment": "under_renovation",
    "distressed": "distressed",
    "closed": "distressed",
    "nla": "distressed",
}


def normalize_chain_scale(raw: str | None) -> str | None:
    if not raw:
        return None
    return _CHAIN_SCALE_MAP.get(raw.strip().lower(), raw.strip().lower())


def normalize_asset_type(raw: str | None) -> str | None:
    if not raw:
        return None
    return _ASSET_TYPE_MAP.get(raw.strip().lower(), raw.strip().lower())


def normalize_status(raw: str | None, default: str = "operating") -> str:
    if not raw:
        return default
    return _STATUS_MAP.get(raw.strip().lower(), default)
