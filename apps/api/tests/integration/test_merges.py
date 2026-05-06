"""
Integration tests for /api/v1/aliases/merges endpoints.
"""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.core.exceptions import NotFoundError, ValidationError
from app.schemas.alias import MergeRead
from app.schemas.common import PagedResponse, Pagination
from tests.factories import HotelMergeHistoryFactory

pytestmark = pytest.mark.integration

BASE = "/api/v1/aliases/merges"
SVC = "app.api.v1.aliases.merges.HotelMergeService"


def _paged(items=None):
    items = items or []
    return PagedResponse(
        data=items,
        meta=Pagination(total=len(items), limit=20, offset=0, has_next=False),
    )


def _merge_payload(**overrides):
    base = {
        "winner_asset_id": str(uuid.uuid4()),
        "loser_asset_id": str(uuid.uuid4()),
        "loser_asset_name": "Hotel Miramar",
        "merge_strategy": "manual",
    }
    base.update(overrides)
    return base


# ── List ──────────────────────────────────────────────────────────────────────


class TestListMerges:
    async def test_empty_list_returns_200(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.list = AsyncMock(return_value=_paged())
            r = await client.get(BASE)

        assert r.status_code == 200
        assert r.json()["data"] == []
        assert r.json()["meta"]["total"] == 0

    async def test_list_with_item(self, client):
        row = HotelMergeHistoryFactory()
        item = MergeRead.model_validate(row)
        with patch(SVC) as MockSvc:
            MockSvc.return_value.list = AsyncMock(return_value=_paged([item]))
            r = await client.get(BASE)

        assert r.status_code == 200
        assert r.json()["meta"]["total"] == 1
        assert r.json()["data"][0]["loser_asset_name"] == row.loser_asset_name

    async def test_list_forwards_filter_params(self, client):
        winner_id = uuid.uuid4()
        loser_id = uuid.uuid4()
        with patch(SVC) as MockSvc:
            MockSvc.return_value.list = AsyncMock(return_value=_paged())
            r = await client.get(
                f"{BASE}?winner_asset_id={winner_id}"
                f"&loser_asset_id={loser_id}&is_reversed=false"
            )

        assert r.status_code == 200
        kwargs = MockSvc.return_value.list.call_args.kwargs
        assert kwargs["winner_asset_id"] == winner_id
        assert kwargs["loser_asset_id"] == loser_id
        assert kwargs["is_reversed"] is False

    async def test_limit_zero_returns_422(self, client):
        r = await client.get(f"{BASE}?limit=0")
        assert r.status_code == 422


# ── Record (create) ───────────────────────────────────────────────────────────


class TestRecordMerge:
    async def test_record_returns_201(self, client):
        row = HotelMergeHistoryFactory()
        with patch(SVC) as MockSvc:
            MockSvc.return_value.record = AsyncMock(return_value=row)
            r = await client.post(BASE, json=_merge_payload())

        assert r.status_code == 201
        body = r.json()
        assert body["data"]["loser_asset_name"] == row.loser_asset_name
        assert body["data"]["merge_strategy"] == row.merge_strategy

    async def test_record_with_optional_fields(self, client):
        row = HotelMergeHistoryFactory(
            confidence_score="0.92",
            confidence_label="HIGH",
            loser_city="Barcelona",
        )
        with patch(SVC) as MockSvc:
            MockSvc.return_value.record = AsyncMock(return_value=row)
            winner_id = str(uuid.uuid4())
            r = await client.post(
                BASE,
                json=_merge_payload(
                    winner_asset_id=winner_id,
                    confidence_score="0.92",
                    confidence_label="HIGH",
                    loser_city="Barcelona",
                    triggered_by="etl_pipeline",
                ),
            )

        assert r.status_code == 201

    async def test_record_missing_required_fields_returns_422(self, client):
        r = await client.post(BASE, json={"winner_asset_id": str(uuid.uuid4())})
        assert r.status_code == 422

    async def test_record_invalid_merge_strategy_returns_422(self, client):
        r = await client.post(
            BASE, json=_merge_payload(merge_strategy="unknown_strategy")
        )
        assert r.status_code == 422

    async def test_record_invalid_confidence_label_returns_422(self, client):
        r = await client.post(
            BASE,
            json=_merge_payload(confidence_label="EXTREME"),
        )
        assert r.status_code == 422

    async def test_record_winner_equals_loser_returns_422(self, client):
        shared_id = str(uuid.uuid4())
        r = await client.post(
            BASE,
            json=_merge_payload(winner_asset_id=shared_id, loser_asset_id=shared_id),
        )
        assert r.status_code == 422

    async def test_record_confidence_score_out_of_range_returns_422(self, client):
        r = await client.post(
            BASE, json=_merge_payload(confidence_score="1.5")
        )
        assert r.status_code == 422

    async def test_record_winner_not_found_returns_404(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.record = AsyncMock(
                side_effect=NotFoundError("Winner asset not found.")
            )
            r = await client.post(BASE, json=_merge_payload())

        assert r.status_code == 404
        assert r.json()["errors"][0]["code"] == "NOT_FOUND"


# ── Get ───────────────────────────────────────────────────────────────────────


class TestGetMerge:
    async def test_get_found_returns_200(self, client):
        row = HotelMergeHistoryFactory()
        with patch(SVC) as MockSvc:
            MockSvc.return_value.get = AsyncMock(return_value=row)
            r = await client.get(f"{BASE}/{row.id}")

        assert r.status_code == 200
        assert r.json()["data"]["id"] == str(row.id)
        assert r.json()["data"]["is_reversed"] is False

    async def test_get_not_found_returns_404(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.get = AsyncMock(
                side_effect=NotFoundError("Merge record not found.")
            )
            r = await client.get(f"{BASE}/{uuid.uuid4()}")

        assert r.status_code == 404


# ── Reverse ───────────────────────────────────────────────────────────────────


class TestReverseMerge:
    async def test_reverse_returns_200(self, client):
        row = HotelMergeHistoryFactory(is_reversed=True)
        with patch(SVC) as MockSvc:
            MockSvc.return_value.reverse = AsyncMock(return_value=row)
            r = await client.post(
                f"{BASE}/{row.id}/reverse",
                json={"notes": "Merger undone after review"},
            )

        assert r.status_code == 200
        assert r.json()["data"]["is_reversed"] is True

    async def test_reverse_empty_body_allowed(self, client):
        row = HotelMergeHistoryFactory(is_reversed=True)
        with patch(SVC) as MockSvc:
            MockSvc.return_value.reverse = AsyncMock(return_value=row)
            r = await client.post(f"{BASE}/{row.id}/reverse", json={})

        assert r.status_code == 200

    async def test_reverse_not_found_returns_404(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.reverse = AsyncMock(
                side_effect=NotFoundError("Merge record not found.")
            )
            r = await client.post(f"{BASE}/{uuid.uuid4()}/reverse", json={})

        assert r.status_code == 404

    async def test_reverse_already_reversed_returns_422(self, client):
        with patch(SVC) as MockSvc:
            MockSvc.return_value.reverse = AsyncMock(
                side_effect=ValidationError("Merge has already been reversed.")
            )
            r = await client.post(f"{BASE}/{uuid.uuid4()}/reverse", json={})

        assert r.status_code == 422
        assert r.json()["errors"][0]["code"] == "VALIDATION_ERROR"
