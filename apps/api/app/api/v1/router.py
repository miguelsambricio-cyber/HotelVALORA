from fastapi import APIRouter

from app.api.v1.aliases.conflicts import router as conflicts_router
from app.api.v1.aliases.hotel_aliases import router as hotel_aliases_router
from app.api.v1.aliases.merges import router as merges_router
from app.api.v1.aliases.operator_aliases import router as operator_aliases_router
from app.api.v1.assets.hotels import router as hotels_router
from app.api.v1.assets.flex_living import router as flex_router
from app.api.v1.auth.auth import router as auth_router
from app.api.v1.imports.costar import router as costar_router
from app.api.v1.imports.excel import router as excel_router
from app.api.v1.review.router import router as review_router
from app.api.v1.market.comparables import router as comps_router
from app.api.v1.market.intelligence import router as market_router
from app.api.v1.valuations.dcf import router as dcf_router
from app.api.v1.valuations.underwriting import router as underwriting_router

api_router = APIRouter()

# ── Core domain ───────────────────────────────────────────────────────────────
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(hotels_router, prefix="/assets/hotels", tags=["hotel-assets"])
api_router.include_router(flex_router, prefix="/assets/flex-living", tags=["flex-living"])

# ── Alias registry ────────────────────────────────────────────────────────────
api_router.include_router(hotel_aliases_router, prefix="/aliases/hotels", tags=["aliases"])
api_router.include_router(operator_aliases_router, prefix="/aliases/operators", tags=["aliases"])
api_router.include_router(merges_router, prefix="/aliases/merges", tags=["aliases"])
api_router.include_router(conflicts_router, prefix="/aliases/conflicts", tags=["aliases"])

# ── Valuations & finance ──────────────────────────────────────────────────────
api_router.include_router(dcf_router, prefix="/valuations/dcf", tags=["dcf"])
api_router.include_router(underwriting_router, prefix="/valuations/underwriting", tags=["underwriting"])

# ── Market intelligence ───────────────────────────────────────────────────────
api_router.include_router(market_router, prefix="/market/intelligence", tags=["market"])
api_router.include_router(comps_router, prefix="/market/comparables", tags=["comparables"])

# ── Review queue ─────────────────────────────────────────────────────────────
api_router.include_router(review_router, prefix="/review", tags=["review"])

# ── Imports ───────────────────────────────────────────────────────────────────
api_router.include_router(excel_router, prefix="/imports/excel", tags=["imports"])
api_router.include_router(costar_router, prefix="/imports/costar", tags=["imports"])
