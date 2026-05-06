"""
Integration tests for /api/v1/aliases/conflicts endpoints.
"""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.core.exceptions import NotFoundError, ValidationError
from app.schemas.alias import AliasConflictListItem, AliasConflictRead
from app.schemas.common import PagedResponse, Pagination
from tests.factories import AliasConflictFactory

pytestmark = pytest.mark.integration

BASE = "/api/v1/aliases/conflicts"
SVC = "app.api.v1.aliases.conflicts.AliasConflictService"


def _paged(items=None):
    items = items or []
    return PagedResponse(
        data=items,
        meta=Pagination(total=len(items), limit=20, offset=0, has_next=False),
    )


# ── List ──────────────────────────────────────────────────────────────────────


class TestListConflicts:
    async def test_empty_list_returns_200(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.list = AsyncMock(return_value=_paged())
            r = await client.get(BASE)

        assert r.status_code == 200
        assert r.json()["data"] == []
        assert r.json()["meta"]["total"] == 0

    async def test_default_status_filter_is_open(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.list = AsyncMock(return_value=_paged())
            r = await client.get(BASE)

        assert r.status_code == 200
        kwargs = MockSvc.return_value.list.call_args.kwargs
        assert kwargs["status"] == "open"

    async def test_list_with_item(self, client):
        conflict = AliasConflictFactory()
        item = AliasConflictListItem.model_validate(conflict)
        with patch(SVC) as MockSvc:
            MockSvc.return_value.list = AsyncMock(return_value=_paged([item]))
            r = await client.get(BASE)

        assert r.status_code == 200
        assert r.json()["meta"]["total"] == 1
        assert r.json()["data"][0]["alias_key"] == conflict.alias_key
        assert r.json()["data"][0]["status"] == conflict.status
        assert len(r.json()["data"][0]["conflicting_asset_ids"]) == 2

    async def test_list_resolved_status_filter(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.list = AsyncMock(return_value=_paged())
            r = await client.get(f"{BASE}?status=resolved_manual")

        assert r.status_code == 200
        kwargs = MockSvc.return_value.list.call_args.kwargs
        assert kwargs["status"] == "resolved_manual"

    async def test_list_ignored_status_filter(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.list = AsyncMock(return_value=_paged())
            r = await client.get(f"{BASE}?status=ignored")

        assert r.status_code == 200

    async def test_limit_zero_returns_422(self, client):
        r = await client.get(f"{BASE}?limit=0")
        assert r.status_code == 422


# ── Get ───────────────────────────────────────────────────────────────────────


class TestGetConflict:
    async def test_get_found_returns_200(self, client):
        conflict = AliasConflictFactory()
        with patch(SVC) as MockSvc:
            MockSvc.return_value.get = AsyncMock(return_value=conflict)
            r = await client.get(f"{BASE}/{conflict.id}")

        assert r.status_code == 200
        body = r.json()
        assert body["data"]["id"] == str(conflict.id)
        assert body["data"]["alias_text"] == conflict.alias_text
        assert body["data"]["status"] == "open"
        assert len(body["data"]["conflicting_asset_ids"]) == 2

    async def test_get_not_found_returns_404(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.get = AsyncMock(
                side_effect=NotFoundError("Alias conflict not found.")
            )
            r = await client.get(f"{BASE}/{uuid.uuid4()}")

        assert r.status_code == 404
        assert r.json()["errors"][0]["code"] == "NOT_FOUND"

    async def test_invalid_uuid_returns_422(self, client):
        r = await client.get(f"{BASE}/not-a-uuid")
        assert r.status_code == 422


# ── Resolve ───────────────────────────────────────────────────────────────────


class TestResolveConflict:
    async def test_resolve_returns_200(self, client):
        winner_id = uuid.uuid4()
        conflict = AliasConflictFactory(
            status="resolved_manual",
            resolved_asset_id=winner_id,
            resolution_strategy="manual",
        )
        with patch(SVC) as MockSvc:
            MockSvc.return_value.resolve = AsyncMock(return_value=conflict)
            r = await client.post(
                f"{BASE}/{conflict.id}/resolve",
                json={"resolved_asset_id": str(winner_id)},
            )

        assert r.status_code == 200
        assert r.json()["data"]["status"] == "resolved_manual"

    async def test_resolve_with_strategy_and_notes(self, client):
        winner_id = uuid.uuid4()
        conflict = AliasConflictFactory(status="resolved_manual")
        with patch(SVC) as MockSvc:
            MockSvc.return_value.resolve = AsyncMock(return_value=conflict)
            r = await client.post(
                f"{BASE}/{conflict.id}/resolve",
                json={
                    "resolved_asset_id": str(winner_id),
                    "resolution_strategy": "confidence_winner",
                    "resolution_notes": "Higher confidence score wins",
                    "resolved_by_id": str(uuid.uuid4()),
                },
            )

        assert r.status_code == 200

    async def test_resolve_missing_asset_id_returns_422(self, client):
        r = await client.post(
            f"{BASE}/{uuid.uuid4()}/resolve",
            json={"resolution_strategy": "manual"},
        )
        assert r.status_code == 422

    async def test_resolve_invalid_strategy_returns_422(self, client):
        r = await client.post(
            f"{BASE}/{uuid.uuid4()}/resolve",
            json={
                "resolved_asset_id": str(uuid.uuid4()),
                "resolution_strategy": "invalid_strategy",
            },
        )
        assert r.status_code == 422

    async def test_resolve_not_found_returns_404(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.resolve = AsyncMock(
                side_effect=NotFoundError("Alias conflict not found.")
            )
            r = await client.post(
                f"{BASE}/{uuid.uuid4()}/resolve",
                json={"resolved_asset_id": str(uuid.uuid4())},
            )

        assert r.status_code == 404

    async def test_resolve_already_closed_returns_422(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.resolve = AsyncMock(
                side_effect=ValidationError("Conflict is already 'resolved_manual'.")
            )
            r = await client.post(
                f"{BASE}/{uuid.uuid4()}/resolve",
                json={"resolved_asset_id": str(uuid.uuid4())},
            )

        assert r.status_code == 422
        assert r.json()["errors"][0]["code"] == "VALIDATION_ERROR"


# ── Ignore ────────────────────────────────────────────────────────────────────


class TestIgnoreConflict:
    async def test_ignore_returns_200(self, client):
        conflict = AliasConflictFactory(status="ignored", resolution_strategy="ignored")
        with patch(SVC) as MockSvc:
            MockSvc.return_value.ignore = AsyncMock(return_value=conflict)
            r = await client.post(
                f"{BASE}/{conflict.id}/ignore",
                json={"resolution_notes": "Both hotels share a common shorthand name"},
            )

        assert r.status_code == 200
        assert r.json()["data"]["status"] == "ignored"

    async def test_ignore_empty_body_allowed(self, client):
        conflict = AliasConflictFactory(status="ignored")
        with patch(SVC) as MockSvc:
            MockSvc.return_value.ignore = AsyncMock(return_value=conflict)
            r = await client.post(f"{BASE}/{conflict.id}/ignore", json={})

        assert r.status_code == 200

    async def test_ignore_not_found_returns_404(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.ignore = AsyncMock(
                side_effect=NotFoundError("Alias conflict not found.")
            )
            r = await client.post(f"{BASE}/{uuid.uuid4()}/ignore", json={})

        assert r.status_code == 404

    async def test_ignore_already_closed_returns_422(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.ignore = AsyncMock(
                side_effect=ValidationError("Conflict is already 'ignored'.")
            )
            r = await client.post(f"{BASE}/{uuid.uuid4()}/ignore", json={})

        assert r.status_code == 422
        assert r.json()["errors"][0]["code"] == "VALIDATION_ERROR"
