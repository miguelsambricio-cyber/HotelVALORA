from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "HOTEL VALORA"
    app_env: Literal["development", "staging", "production"] = "development"
    app_debug: bool = False
    app_secret_key: str

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_allowed_origins: list[str] = ["http://localhost:3000"]

    @field_validator("api_allowed_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # Database
    database_url: str
    database_pool_size: int = 20
    database_max_overflow: int = 10

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # Auth
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 30

    # S3 / Storage
    s3_endpoint_url: str | None = None
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_bucket_documents: str = "valora-documents"
    s3_bucket_exports: str = "valora-exports"
    s3_region: str = "us-east-1"

    # CoStar
    costar_api_key: str = ""
    costar_api_base_url: str = "https://api.costar.com/v1"
    costar_username: str = ""
    costar_password: str = ""

    # Financial defaults
    default_discount_rate: float = 0.10
    default_terminal_cap_rate: float = 0.07
    default_projection_years: int = 10
    default_currency: str = "USD"

    # Observability
    sentry_dsn: str = ""
    log_level: str = "INFO"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
