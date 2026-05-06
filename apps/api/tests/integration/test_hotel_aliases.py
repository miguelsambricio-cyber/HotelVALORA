"""
Integration tests for GET/PATCH/DELETE /api/v1/aliases/hotels endpoints.

Services are patched at the module level so no real DB connection is made.
The conftest `client` fixture wires in a mock DB session.
"""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.core.exceptions import NotFoundError
from app.schemas.alias import HotelAliasEntryListItem, HotelAliasEntryRead
from app.schemas.common import PagedResponse, Pagination
from tests.factories import HotelAliasEntryFactory

pytestmark = pytest.mark.integration

BASE = "/api/v1/aliases/hotels"
SVC = "app.api.v1.aliases.hotel_aliases.HotelAliasService"


def _paged(items=None):
    items = items or []
    return PagedResponse(
        data=items,
        meta=Pagination(total=len(items), limit=20, offset=0, has_next=False),
    )


# ── List ──────────────────────────────────────────────────────────────────────


class TestListHotelAliases:
    async def test_empty_list_returns_200(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.list = AsyncMock(return_value=_paged())
            r = await client.get(BASE)

        assert r.status_code == 200
        body = r.json()
        assert body["data"] == []
        assert body["meta"]["total"] == 0
        assert body["meta"]["has_next"] is False

    async def test_list_with_item(self, client):
        entry = HotelAliasEntryFactory()
        item = HotelAliasEntryListItem.model_validate(entry)
        with patch(SVC) as MockSvc:
            MockSvc.return_value.list = AsyncMock(return_value=_paged([item]))
            r = await client.get(BASE)

        assert r.status_code == 200
        assert r.json()["meta"]["total"] == 1
        assert r.json()["data"][0]["alias_text"] == entry.alias_text
        assert r.json()["data"][0]["alias_key"] == entry.alias_key

    async def test_list_forwards_query_params(self, client):
        asset_id = uuid.uuid4()
        with patch(SVC) as MockSvc:
            MockSvc.return_value.list = AsyncMock(return_value=_paged())
            r = await client.get(
                f"{BASE}?asset_id={asset_id}&alias_type=canonical"
                "&language=es&active_only=false&limit=5&offset=10"
            )

        assert r.status_code == 200
        call_kwargs = MockSvc.return_value.list.call_args.kwargs
        assert call_kwargs["asset_id"] == asset_id
        assert call_kwargs["alias_type"] == "canonical"
        assert call_kwargs["language"] == "es"
        assert call_kwargs["active_only"] is False
        assert call_kwargs["limit"] == 5
        assert call_kwargs["offset"] == 10

    async def test_limit_zero_returns_422(self, client):
        r = await client.get(f"{BASE}?limit=0")
        assert r.status_code == 422

    async def test_limit_over_max_returns_422(self, client):
        r = await client.get(f"{BASE}?limit=101")
        assert r.status_code == 422

    async def test_negative_offset_returns_422(self, client):
        r = await client.get(f"{BASE}?offset=-1")
        assert r.status_code == 422


# ── Get ───────────────────────────────────────────────────────────────────────


class TestGetHotelAlias:
    async def test_get_found_returns_200(self, client):
        entry = HotelAliasEntryFactory()
        with patch(SVC) as MockSvc:
            MockSvc.return_value.get = AsyncMock(return_value=entry)
            r = await client.get(f"{BASE}/{entry.id}")

        assert r.status_code == 200
        body = r.json()
        assert body["data"]["id"] == str(entry.id)
        assert body["data"]["alias_text"] == entry.alias_text

    async def test_get_not_found_returns_404(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.get = AsyncMock(
                side_effect=NotFoundError("Alias entry not found.")
            )
            r = await client.get(f"{BASE}/{uuid.uuid4()}")

        assert r.status_code == 404
        assert r.json()["errors"][0]["code"] == "NOT_FOUND"

    async def test_invalid_uuid_returns_422(self, client):
        r = await client.get(f"{BASE}/not-a-uuid")
        assert r.status_code == 422


# ── Update ────────────────────────────────────────────────────────────────────


class TestUpdateHotelAlias:
    async def test_update_text_returns_200(self, client):
        entry = HotelAliasEntryFactory(alias_text="Hotel Arts Updated")
        with patch(SVC) as MockSvc:
            MockSvc.return_value.update = AsyncMock(return_value=entry)
            r = await client.patch(
                f"{BASE}/{entry.id}", json={"alias_text": "Hotel Arts Updated"}
            )

        assert r.status_code == 200
        assert r.json()["data"]["alias_text"] == "Hotel Arts Updated"

    async def test_update_deactivate_returns_200(self, client):
        entry = HotelAliasEntryFactory(is_active=False)
        with patch(SVC) as MockSvc:
            MockSvc.return_value.update = AsyncMock(return_value=entry)
            r = await client.patch(
                f"{BASE}/{entry.id}", json={"is_active": False}
            )

        assert r.status_code == 200
        assert r.json()["data"]["is_active"] is False

    async def test_update_invalid_alias_type_returns_422(self, client):
        r = await client.patch(
            f"{BASE}/{uuid.uuid4()}", json={"alias_type": "not_a_valid_type"}
        )
        assert r.status_code == 422

    async def test_update_confidence_out_of_range_returns_422(self, client):
        r = await client.patch(
            f"{BASE}/{uuid.uuid4()}", json={"confidence": "1.5"}
        )
        assert r.status_code == 422

    async def test_update_valid_to_before_valid_from_returns_422(self, client):
        r = await client.patch(
            f"{BASE}/{uuid.uuid4()}",
            json={"valid_from": "2025-06-01", "valid_to": "2025-01-01"},
        )
        assert r.status_code == 422

    async def test_update_not_found_returns_404(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.update = AsyncMock(
                side_effect=NotFoundError("Alias entry not found.")
            )
            r = await client.patch(
                f"{BASE}/{uuid.uuid4()}", json={"alias_text": "Some Hotel"}
            )

        assert r.status_code == 404


# ── Deactivate ────────────────────────────────────────────────────────────────


class TestDeactivateHotelAlias:
    async def test_deactivate_returns_204(self, client):
        alias_id = uuid.uuid4()
        with patch(SVC) as MockSvc:
            MockSvc.return_value.deactivate = AsyncMock(return_value=None)
            r = await client.delete(f"{BASE}/{alias_id}")

        assert r.status_code == 204
        assert r.content == b""

    async def test_deactivate_not_found_returns_404(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.deactivate = AsyncMock(
                side_effect=NotFoundError("Alias entry not found.")
            )
            r = await client.delete(f"{BASE}/{uuid.uuid4()}")

        assert r.status_code == 404
        assert r.json()["errors"][0]["code"] == "NOT_FOUND"
