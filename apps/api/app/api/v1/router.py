from fastapi import APIRouter

from app.api.v1.auth.auth import router as auth_router
from app.api.v1.assets.hotels import router as hotels_router
from app.api.v1.assets.flex_living import router as flex_router
from app.api.v1.valuations.dcf import router as dcf_router
from app.api.v1.valuations.underwriting import router as underwriting_router
from app.api.v1.market.intelligence import router as market_router
from app.api.v1.market.comparables import router as comps_router
from app.api.v1.imports.excel import router as excel_router
from app.api.v1.imports.costar import router as costar_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(hotels_router, prefix="/assets/hotels", tags=["hotel-assets"])
api_router.include_router(flex_router, prefix="/assets/flex-living", tags=["flex-living"])
api_router.include_router(dcf_router, prefix="/valuations/dcf", tags=["dcf"])
api_router.include_router(underwriting_router, prefix="/valuations/underwriting", tags=["underwriting"])
api_router.include_router(market_router, prefix="/market/intelligence", tags=["market"])
api_router.include_router(comps_router, prefix="/market/comparables", tags=["comparables"])
api_router.include_router(excel_router, prefix="/imports/excel", tags=["imports"])
api_router.include_router(costar_router, prefix="/imports/costar", tags=["imports"])
