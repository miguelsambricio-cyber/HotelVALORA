"""
Integration tests for /api/v1/aliases/operators endpoints.
"""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.core.exceptions import ConflictError, NotFoundError
from app.schemas.alias import BulkCreateResult, OperatorAliasListItem, OperatorAliasRead
from app.schemas.common import PagedResponse, Pagination
from tests.factories import OperatorAliasFactory

pytestmark = pytest.mark.integration

BASE = "/api/v1/aliases/operators"
SVC = "app.api.v1.aliases.operator_aliases.OperatorAliasService"


def _paged(items=None):
    items = items or []
    return PagedResponse(
        data=items,
        meta=Pagination(total=len(items), limit=20, offset=0, has_next=False),
    )


# ── List ──────────────────────────────────────────────────────────────────────


class TestListOperatorAliases:
    async def test_empty_list_returns_200(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.list = AsyncMock(return_value=_paged())
            r = await client.get(BASE)

        assert r.status_code == 200
        assert r.json()["data"] == []
        assert r.json()["meta"]["total"] == 0

    async def test_list_with_item(self, client):
        entry = OperatorAliasFactory()
        item = OperatorAliasListItem.model_validate(entry)
        with patch(SVC) as MockSvc:
            MockSvc.return_value.list = AsyncMock(return_value=_paged([item]))
            r = await client.get(BASE)

        assert r.status_code == 200
        assert r.json()["meta"]["total"] == 1
        assert r.json()["data"][0]["canonical_operator"] == entry.canonical_operator

    async def test_list_forwards_filter_params(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.list = AsyncMock(return_value=_paged())
            r = await client.get(
                f"{BASE}?canonical_operator=Marriott&brand_family=Bonvoy"
                "&active_only=false&limit=10&offset=5"
            )

        assert r.status_code == 200
        kwargs = MockSvc.return_value.list.call_args.kwargs
        assert kwargs["canonical_operator"] == "Marriott"
        assert kwargs["brand_family"] == "Bonvoy"
        assert kwargs["active_only"] is False

    async def test_limit_zero_returns_422(self, client):
        r = await client.get(f"{BASE}?limit=0")
        assert r.status_code == 422


# ── Create ────────────────────────────────────────────────────────────────────


class TestCreateOperatorAlias:
    async def test_create_returns_201(self, client):
        entry = OperatorAliasFactory()
        with patch(SVC) as MockSvc:
            MockSvc.return_value.create = AsyncMock(return_value=entry)
            r = await client.post(
                BASE,
                json={
                    "alias_text": "marriott international",
                    "canonical_operator": "Marriott International",
                },
            )

        assert r.status_code == 201
        assert r.json()["data"]["canonical_operator"] == entry.canonical_operator

    async def test_create_missing_canonical_operator_returns_422(self, client):
        r = await client.post(BASE, json={"alias_text": "marriott"})
        assert r.status_code == 422

    async def test_create_missing_alias_text_returns_422(self, client):
        r = await client.post(
            BASE, json={"canonical_operator": "Marriott International"}
        )
        assert r.status_code == 422

    async def test_create_blank_alias_text_returns_422(self, client):
        r = await client.post(
            BASE,
            json={"alias_text": "   ", "canonical_operator": "Marriott International"},
        )
        assert r.status_code == 422

    async def test_create_duplicate_key_returns_409(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.create = AsyncMock(
                side_effect=ConflictError("alias key already exists.")
            )
            r = await client.post(
                BASE,
                json={
                    "alias_text": "marriott",
                    "canonical_operator": "Marriott International",
                },
            )

        assert r.status_code == 409
        assert r.json()["errors"][0]["code"] == "CONFLICT"


# ── Bulk create ───────────────────────────────────────────────────────────────


class TestBulkCreateOperatorAliases:
    async def test_bulk_create_returns_200(self, client):
        result = BulkCreateResult(created=2, skipped=1, errors=[])
        with patch(SVC) as MockSvc:
            MockSvc.return_value.bulk_create = AsyncMock(return_value=result)
            r = await client.post(
                f"{BASE}/bulk",
                json={
                    "items": [
                        {
                            "alias_text": "marriott",
                            "canonical_operator": "Marriott International",
                        },
                        {
                            "alias_text": "hilton hotels",
                            "canonical_operator": "Hilton Worldwide",
                        },
                    ]
                },
            )

        assert r.status_code == 200
        assert r.json()["data"]["created"] == 2
        assert r.json()["data"]["skipped"] == 1
        assert r.json()["data"]["errors"] == []

    async def test_bulk_create_empty_items_returns_422(self, client):
        r = await client.post(f"{BASE}/bulk", json={"items": []})
        assert r.status_code == 422

    async def test_bulk_create_missing_items_returns_422(self, client):
        r = await client.post(f"{BASE}/bulk", json={})
        assert r.status_code == 422


# ── Get ───────────────────────────────────────────────────────────────────────


class TestGetOperatorAlias:
    async def test_get_found_returns_200(self, client):
        entry = OperatorAliasFactory()
        with patch(SVC) as MockSvc:
            MockSvc.return_value.get = AsyncMock(return_value=entry)
            r = await client.get(f"{BASE}/{entry.id}")

        assert r.status_code == 200
        assert r.json()["data"]["id"] == str(entry.id)
        assert r.json()["data"]["alias_key"] == entry.alias_key

    async def test_get_not_found_returns_404(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.get = AsyncMock(
                side_effect=NotFoundError("Operator alias not found.")
            )
            r = await client.get(f"{BASE}/{uuid.uuid4()}")

        assert r.status_code == 404
        assert r.json()["errors"][0]["code"] == "NOT_FOUND"


# ── Update ────────────────────────────────────────────────────────────────────


class TestUpdateOperatorAlias:
    async def test_update_returns_200(self, client):
        entry = OperatorAliasFactory(canonical_operator="Updated Corp")
        with patch(SVC) as MockSvc:
            MockSvc.return_value.update = AsyncMock(return_value=entry)
            r = await client.patch(
                f"{BASE}/{entry.id}", json={"canonical_operator": "Updated Corp"}
            )

        assert r.status_code == 200
        assert r.json()["data"]["canonical_operator"] == "Updated Corp"

    async def test_update_key_conflict_returns_409(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.update = AsyncMock(
                side_effect=ConflictError("alias key already taken.")
            )
            r = await client.patch(
                f"{BASE}/{uuid.uuid4()}", json={"alias_text": "existing key"}
            )

        assert r.status_code == 409

    async def test_update_not_found_returns_404(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.update = AsyncMock(
                side_effect=NotFoundError("Operator alias not found.")
            )
            r = await client.patch(
                f"{BASE}/{uuid.uuid4()}", json={"alias_text": "something"}
            )

        assert r.status_code == 404


# ── Deactivate ────────────────────────────────────────────────────────────────


class TestDeactivateOperatorAlias:
    async def test_deactivate_returns_204(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.deactivate = AsyncMock(return_value=None)
            r = await client.delete(f"{BASE}/{uuid.uuid4()}")

        assert r.status_code == 204
        assert r.content == b""

    async def test_deactivate_not_found_returns_404(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.deactivate = AsyncMock(
                side_effect=NotFoundError("Operator alias not found.")
            )
            r = await client.delete(f"{BASE}/{uuid.uuid4()}")

        assert r.status_code == 404
