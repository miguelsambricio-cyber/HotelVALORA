import sentry_sdk
import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.config import settings
from app.core.exceptions import ValoraException
from app.core.middleware import RequestIDMiddleware, TimingMiddleware

log = structlog.get_logger(__name__)

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.app_env,
        traces_sample_rate=0.2,
    )


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description="Hotel Intelligence & Valuation Platform API",
        openapi_url="/openapi.json" if not settings.is_production else None,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )

    # Middleware (order matters — outermost first)
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(TimingMiddleware)
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.api_allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(api_router, prefix="/api/v1")

    # Global exception handler
    @app.exception_handler(ValoraException)
    async def valora_exception_handler(
        request: Request, exc: ValoraException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "data": None,
                "errors": [{"code": exc.code, "message": exc.message}],
            },
        )

    @app.get("/health", tags=["health"], include_in_schema=False)
    async def health_check() -> dict:
        return {"status": "ok", "env": settings.app_env}

    return app


app = create_app()
