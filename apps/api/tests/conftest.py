"""
Shared test fixtures for the alias API test suite.

Environment variables are set at the top of this module — before any
app code is imported — so that pydantic-settings can construct Settings
without a real .env file.
"""
from __future__ import annotations

import os

# Must precede all app imports so pydantic-settings can build Settings.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test_valora")
os.environ.setdefault("APP_SECRET_KEY", "test-only-secret-key-not-used-in-production-32c")

from unittest.mock import AsyncMock, MagicMock  # noqa: E402

import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.database import get_db  # noqa: E402
from app.main import app  # noqa: E402


# ── DB session mock ───────────────────────────────────────────────────────────

@pytest.fixture
def mock_db() -> AsyncMock:
    """AsyncSession stand-in. Configure return values per test."""
    db = AsyncMock()
    db.add = MagicMock()        # synchronous in the real implementation
    db.delete = MagicMock()
    return db


# ── HTTP client ───────────────────────────────────────────────────────────────

@pytest.fixture
async def client(mock_db: AsyncMock) -> AsyncClient:
    """AsyncClient wired to the FastAPI app with get_db overridden.

    Services are always patched at the class level in individual tests so the
    mock_db is never actually exercised by route tests — it just prevents the
    app from attempting a real database connection.
    """
    async def _override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
