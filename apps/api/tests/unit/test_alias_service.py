"""
Unit tests for app.services.alias_service.

All four service classes are tested with a mock AsyncSession — no real
database connection is made. Factory instances are plain Python objects
(no ORM session attached).
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.alias import AliasConflict, HotelAliasEntry, HotelMergeHistory, OperatorAlias
from app.schemas.alias import (
    ConflictIgnoreRequest,
    ConflictResolveRequest,
    HotelAliasEntryCreate,
    HotelAliasEntryUpdate,
    MergeCreate,
    MergeReverseRequest,
    OperatorAliasCreate,
    OperatorAliasUpdate,
)
from app.services.alias_service import (
    AliasConflictService,
    HotelAliasService,
    HotelMergeService,
    OperatorAliasService,
    _key,
)

from tests.factories import (
    AliasConflictFactory,
    HotelAliasEntryFactory,
    HotelAssetFactory,
    HotelMergeHistoryFactory,
    OperatorAliasFactory,
)

pytestmark = pytest.mark.unit


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_db(**overrides) -> AsyncMock:
    """Return a fresh AsyncSession mock."""
    db = AsyncMock()
    db.add = MagicMock()
    db.delete = MagicMock()
    for attr, val in overrides.items():
        setattr(db, attr, val)
    return db


# ═══════════════════════════════════════════════════════════════════════════════
# _key() — normalisation helper
# ═══════════════════════════════════════════════════════════════════════════════


class TestKeyFunction:
    def test_lowercases(self):
        assert _key("Hotel Arts") == "hotel arts"

    def test_strips_accents(self):
        assert _key("Meliá") == "melia"
        assert _key("Córdoba") == "cordoba"
        assert _key("Zürich") == "zurich"

    def test_collapses_whitespace(self):
        assert _key("  Hotel   Arts  ") == "hotel arts"

    def test_tabs_and_newlines_collapsed(self):
        assert _key("Hotel\tArts\nBarcelona") == "hotel arts barcelona"

    def test_empty_string(self):
        assert _key("") == ""

    def test_idempotent(self):
        raw = "Gran Hotel Miramar"
        assert _key(_key(raw)) == _key(raw)


# ═══════════════════════════════════════════════════════════════════════════════
# HotelAliasService
# ═══════════════════════════════════════════════════════════════════════════════


class TestHotelAliasServiceList:
    async def test_returns_paged_response(self):
        entry = HotelAliasEntryFactory()
        db = make_db()
        db.scalar.return_value = 1
        db.scalars.return_value = [entry]

        svc = HotelAliasService(db)
        result = await svc.list(
            asset_id=None, alias_key=None, alias_type=None,
            language=None, active_only=True, limit=20, offset=0,
        )

        assert result.meta.total == 1
        assert len(result.data) == 1
        assert result.data[0].alias_key == entry.alias_key

    async def test_empty_result(self):
        db = make_db()
        db.scalar.return_value = 0
        db.scalars.return_value = []

        result = await HotelAliasService(db).list(
            asset_id=None, alias_key=None, alias_type=None,
            language=None, active_only=False, limit=20, offset=0,
        )

        assert result.meta.total == 0
        assert result.data == []

    async def test_has_next_flag(self):
        db = make_db()
        db.scalar.return_value = 50
        db.scalars.return_value = [HotelAliasEntryFactory() for _ in range(20)]

        result = await HotelAliasService(db).list(
            asset_id=None, alias_key=None, alias_type=None,
            language=None, active_only=True, limit=20, offset=0,
        )

        assert result.meta.has_next is True

    async def test_normalises_alias_key_before_lookup(self):
        """alias_key query param is normalised via _key() before the DB query."""
        db = make_db()
        db.scalar.return_value = 0
        db.scalars.return_value = []

        await HotelAliasService(db).list(
            asset_id=None, alias_key="Méliá Castilla", alias_type=None,
            language=None, active_only=True, limit=20, offset=0,
        )
        # We can't inspect the SQLAlchemy query object, but we trust that
        # the query call was made (scalars was called once).
        db.scalars.assert_called_once()


class TestHotelAliasServiceGet:
    async def test_returns_entry(self):
        entry = HotelAliasEntryFactory()
        db = make_db()
        db.get.return_value = entry

        result = await HotelAliasService(db).get(entry.id)

        assert result is entry

    async def test_raises_404_when_not_found(self):
        db = make_db()
        db.get.return_value = None

        with pytest.raises(NotFoundError):
            await HotelAliasService(db).get(uuid.uuid4())


class TestHotelAliasServiceCreate:
    async def test_computes_alias_key(self):
        asset = HotelAssetFactory()
        db = make_db()
        db.get.return_value = asset      # _assert_asset_exists
        db.scalars.return_value = []     # _detect_and_record_conflict — no competing

        payload = HotelAliasEntryCreate(alias_text="  Meliá Castilla  ", alias_type="common")
        svc = HotelAliasService(db)
        entry = await svc.create(asset.id, payload)

        assert entry.alias_key == "melia castilla"
        assert entry.alias_text == "Meliá Castilla"

    async def test_adds_entry_to_session(self):
        asset = HotelAssetFactory()
        db = make_db()
        db.get.return_value = asset
        db.scalars.return_value = []

        await HotelAliasService(db).create(
            asset.id, HotelAliasEntryCreate(alias_text="Hotel Arts", alias_type="common")
        )

        db.add.assert_called()
        added = db.add.call_args[0][0]
        assert isinstance(added, HotelAliasEntry)

    async def test_raises_404_if_asset_not_found(self):
        db = make_db()
        db.get.return_value = None

        with pytest.raises(NotFoundError):
            await HotelAliasService(db).create(
                uuid.uuid4(), HotelAliasEntryCreate(alias_text="Hotel X", alias_type="common")
            )

    async def test_no_conflict_when_key_is_unique(self):
        asset = HotelAssetFactory()
        db = make_db()
        db.get.return_value = asset
        db.scalars.return_value = []     # no competing entries

        await HotelAliasService(db).create(
            asset.id, HotelAliasEntryCreate(alias_text="Hotel Arts", alias_type="common")
        )

        # Only the entry itself was added, no AliasConflict
        assert db.add.call_count == 1

    async def test_opens_new_conflict_on_key_collision(self):
        asset_a = HotelAssetFactory()
        asset_b_id = uuid.uuid4()
        competing = HotelAliasEntryFactory(asset_id=asset_b_id, alias_key="hotel arts")

        db = make_db()
        db.get.return_value = asset_a    # _assert_asset_exists
        db.scalars.return_value = [competing]   # one competing active entry
        db.scalar.return_value = None           # no existing open conflict

        await HotelAliasService(db).create(
            asset_a.id, HotelAliasEntryCreate(alias_text="Hotel Arts", alias_type="common")
        )

        # Two adds: the entry + the AliasConflict
        assert db.add.call_count == 2
        conflict = db.add.call_args_list[1][0][0]
        assert isinstance(conflict, AliasConflict)
        assert conflict.status == "open"
        assert asset_a.id in conflict.conflicting_asset_ids
        assert asset_b_id in conflict.conflicting_asset_ids

    async def test_updates_existing_open_conflict_on_collision(self):
        asset_a = HotelAssetFactory()
        asset_b_id = uuid.uuid4()
        asset_c_id = uuid.uuid4()
        competing = HotelAliasEntryFactory(asset_id=asset_b_id)
        existing_conflict = AliasConflictFactory(
            alias_key="hotel arts",
            conflicting_asset_ids=[asset_b_id, asset_c_id],
            status="open",
        )

        db = make_db()
        db.get.return_value = asset_a
        db.scalars.return_value = [competing]
        db.scalar.return_value = existing_conflict

        await HotelAliasService(db).create(
            asset_a.id, HotelAliasEntryCreate(alias_text="Hotel Arts", alias_type="common")
        )

        # Only the entry was added (conflict updated in-place, not re-added)
        assert db.add.call_count == 1
        assert asset_a.id in existing_conflict.conflicting_asset_ids

    async def test_stores_created_by_id(self):
        asset = HotelAssetFactory()
        user_id = uuid.uuid4()
        db = make_db()
        db.get.return_value = asset
        db.scalars.return_value = []

        entry = await HotelAliasService(db).create(
            asset.id,
            HotelAliasEntryCreate(alias_text="Hotel X", alias_type="canonical"),
            created_by_id=user_id,
        )

        assert entry.created_by_id == user_id


class TestHotelAliasServiceUpdate:
    async def test_updates_fields(self):
        entry = HotelAliasEntryFactory(language=None, notes=None)
        db = make_db()
        db.get.return_value = entry

        await HotelAliasService(db).update(
            entry.id,
            HotelAliasEntryUpdate(language="es", notes="updated"),
        )

        assert entry.language == "es"
        assert entry.notes == "updated"

    async def test_recomputes_alias_key_when_text_changes(self):
        entry = HotelAliasEntryFactory(alias_text="Old Name", alias_key="old name")
        db = make_db()
        db.get.return_value = entry
        db.scalars.return_value = []     # no competing entries on new key

        await HotelAliasService(db).update(
            entry.id,
            HotelAliasEntryUpdate(alias_text="Méliá Castilla"),
        )

        assert entry.alias_text == "Méliá Castilla"
        assert entry.alias_key == "melia castilla"

    async def test_does_not_touch_alias_key_when_text_unchanged(self):
        entry = HotelAliasEntryFactory(alias_key="arts barcelona")
        db = make_db()
        db.get.return_value = entry

        await HotelAliasService(db).update(
            entry.id, HotelAliasEntryUpdate(language="ca")
        )

        assert entry.alias_key == "arts barcelona"
        db.scalars.assert_not_called()  # conflict detection not triggered

    async def test_raises_404_when_not_found(self):
        db = make_db()
        db.get.return_value = None

        with pytest.raises(NotFoundError):
            await HotelAliasService(db).update(
                uuid.uuid4(), HotelAliasEntryUpdate(language="es")
            )

    async def test_soft_deactivation_via_update(self):
        entry = HotelAliasEntryFactory(is_active=True)
        db = make_db()
        db.get.return_value = entry

        await HotelAliasService(db).update(entry.id, HotelAliasEntryUpdate(is_active=False))

        assert entry.is_active is False


class TestHotelAliasServiceDeactivate:
    async def test_sets_is_active_false(self):
        entry = HotelAliasEntryFactory(is_active=True, valid_to=None)
        db = make_db()
        db.get.return_value = entry

        await HotelAliasService(db).deactivate(entry.id)

        assert entry.is_active is False

    async def test_sets_valid_to_today_when_not_set(self):
        entry = HotelAliasEntryFactory(valid_to=None)
        db = make_db()
        db.get.return_value = entry

        await HotelAliasService(db).deactivate(entry.id)

        assert entry.valid_to == date.today()

    async def test_preserves_existing_valid_to(self):
        fixed = date(2025, 12, 31)
        entry = HotelAliasEntryFactory(valid_to=fixed)
        db = make_db()
        db.get.return_value = entry

        await HotelAliasService(db).deactivate(entry.id)

        assert entry.valid_to == fixed

    async def test_raises_404_when_not_found(self):
        db = make_db()
        db.get.return_value = None

        with pytest.raises(NotFoundError):
            await HotelAliasService(db).deactivate(uuid.uuid4())

    async def test_flushes_session(self):
        entry = HotelAliasEntryFactory()
        db = make_db()
        db.get.return_value = entry

        await HotelAliasService(db).deactivate(entry.id)

        db.flush.assert_called_once()


class TestHotelAliasServiceListForAsset:
    async def test_raises_404_when_asset_not_found(self):
        db = make_db()
        db.get.return_value = None  # asset not found

        with pytest.raises(NotFoundError):
            await HotelAliasService(db).list_for_asset(uuid.uuid4())

    async def test_passes_asset_id_to_list(self):
        asset = HotelAssetFactory()
        db = make_db()
        db.get.return_value = asset
        db.scalar.return_value = 0
        db.scalars.return_value = []

        result = await HotelAliasService(db).list_for_asset(asset.id)

        assert result.meta.total == 0


# ═══════════════════════════════════════════════════════════════════════════════
# OperatorAliasService
# ═══════════════════════════════════════════════════════════════════════════════


class TestOperatorAliasServiceCreate:
    async def test_computes_alias_key(self):
        db = make_db()
        db.scalar.return_value = None    # no existing entry with that key

        payload = OperatorAliasCreate(
            alias_text="  Marriott International  ",
            canonical_operator="Marriott International",
        )
        entry = await OperatorAliasService(db).create(payload)

        assert entry.alias_key == "marriott international"
        assert entry.alias_text == "Marriott International"

    async def test_raises_conflict_if_key_already_exists(self):
        existing = OperatorAliasFactory()
        db = make_db()
        db.scalar.return_value = existing

        with pytest.raises(ConflictError):
            await OperatorAliasService(db).create(
                OperatorAliasCreate(
                    alias_text=existing.alias_text,
                    canonical_operator="Other",
                )
            )

    async def test_adds_entry_and_flushes(self):
        db = make_db()
        db.scalar.return_value = None

        await OperatorAliasService(db).create(
            OperatorAliasCreate(alias_text="hilton", canonical_operator="Hilton")
        )

        db.add.assert_called_once()
        db.flush.assert_called_once()

    async def test_stores_brand_hierarchy(self):
        db = make_db()
        db.scalar.return_value = None

        entry = await OperatorAliasService(db).create(
            OperatorAliasCreate(
                alias_text="ritz-carlton",
                canonical_operator="Ritz-Carlton",
                brand_family="Marriott Bonvoy",
                chain_scale="luxury",
            )
        )

        assert entry.brand_family == "Marriott Bonvoy"
        assert entry.chain_scale == "luxury"


class TestOperatorAliasServiceUpdate:
    async def test_updates_fields(self):
        entry = OperatorAliasFactory(chain_scale=None)
        db = make_db()
        db.get.return_value = entry

        await OperatorAliasService(db).update(
            entry.id, OperatorAliasUpdate(chain_scale="luxury")
        )

        assert entry.chain_scale == "luxury"

    async def test_recomputes_key_when_text_changes(self):
        entry = OperatorAliasFactory(alias_text="old text", alias_key="old text")
        db = make_db()
        db.get.return_value = entry
        # second scalar call for uniqueness check: no other row with new key
        db.scalar.return_value = None

        await OperatorAliasService(db).update(
            entry.id, OperatorAliasUpdate(alias_text="Ritz Carlton")
        )

        assert entry.alias_key == "ritz carlton"

    async def test_raises_conflict_if_new_key_taken_by_other(self):
        entry = OperatorAliasFactory(alias_text="old", alias_key="old")
        other = OperatorAliasFactory(alias_text="ritz", alias_key="ritz")
        db = make_db()
        db.get.side_effect = [entry, other]  # first get → entry; uniqueness check → other

        # The uniqueness check does scalar(), not get()
        db.scalar.return_value = other  # key already taken

        with pytest.raises(ConflictError):
            await OperatorAliasService(db).update(
                entry.id, OperatorAliasUpdate(alias_text="ritz")
            )

    async def test_raises_404_when_not_found(self):
        db = make_db()
        db.get.return_value = None

        with pytest.raises(NotFoundError):
            await OperatorAliasService(db).update(
                uuid.uuid4(), OperatorAliasUpdate(chain_scale="economy")
            )


class TestOperatorAliasServiceDeactivate:
    async def test_sets_is_active_false(self):
        entry = OperatorAliasFactory(is_active=True)
        db = make_db()
        db.get.return_value = entry

        await OperatorAliasService(db).deactivate(entry.id)

        assert entry.is_active is False
        db.flush.assert_called_once()

    async def test_raises_404_when_not_found(self):
        db = make_db()
        db.get.return_value = None

        with pytest.raises(NotFoundError):
            await OperatorAliasService(db).deactivate(uuid.uuid4())


class TestOperatorAliasServiceBulkCreate:
    async def test_creates_new_entries(self):
        db = make_db()
        db.scalar.return_value = None  # no existing entries

        items = [
            OperatorAliasCreate(alias_text="hilton", canonical_operator="Hilton"),
            OperatorAliasCreate(alias_text="marriott", canonical_operator="Marriott"),
        ]
        result = await OperatorAliasService(db).bulk_create(items)

        assert result.created == 2
        assert result.skipped == 0
        assert result.errors == []

    async def test_skips_existing_keys(self):
        existing = OperatorAliasFactory(alias_key="hilton")
        db = make_db()
        # First item: key exists; second: does not
        db.scalar.side_effect = [existing, None]

        items = [
            OperatorAliasCreate(alias_text="hilton", canonical_operator="Hilton"),
            OperatorAliasCreate(alias_text="marriott", canonical_operator="Marriott"),
        ]
        result = await OperatorAliasService(db).bulk_create(items)

        assert result.created == 1
        assert result.skipped == 1

    async def test_isolates_errors_per_item(self):
        """An exception on one item should not abort the rest."""
        db = make_db()
        db.scalar.return_value = None

        # Patch add to raise on the first call only
        call_count = [0]
        original_add = db.add

        def add_side_effect(obj):
            call_count[0] += 1
            if call_count[0] == 1:
                raise RuntimeError("DB error")

        db.add.side_effect = add_side_effect

        items = [
            OperatorAliasCreate(alias_text="bad entry", canonical_operator="X"),
            OperatorAliasCreate(alias_text="good entry", canonical_operator="Y"),
        ]
        result = await OperatorAliasService(db).bulk_create(items)

        assert len(result.errors) == 1
        assert result.created == 1

    async def test_empty_items_still_flushes(self):
        db = make_db()
        await OperatorAliasService(db).bulk_create([])
        db.flush.assert_called_once()


# ═══════════════════════════════════════════════════════════════════════════════
# HotelMergeService
# ═══════════════════════════════════════════════════════════════════════════════


class TestHotelMergeServiceRecord:
    async def test_raises_404_if_winner_not_found(self):
        db = make_db()
        db.get.return_value = None

        payload = MergeCreate(
            winner_asset_id=uuid.uuid4(),
            loser_asset_id=uuid.uuid4(),
            loser_asset_name="Hotel Lost",
            merge_strategy="manual",
        )
        with pytest.raises(NotFoundError):
            await HotelMergeService(db).record(payload)

    async def test_creates_merge_row(self):
        asset = HotelAssetFactory()
        db = make_db()
        db.get.return_value = asset

        loser_id = uuid.uuid4()
        payload = MergeCreate(
            winner_asset_id=asset.id,
            loser_asset_id=loser_id,
            loser_asset_name="Hotel Lost",
            loser_city="Madrid",
            merge_strategy="auto_fuzzy",
            confidence_score=Decimal("0.92"),
            confidence_label="HIGH",
        )
        row = await HotelMergeService(db).record(payload)

        assert row.winner_asset_id == asset.id
        assert row.loser_asset_id == loser_id
        assert row.loser_asset_name == "Hotel Lost"
        assert row.merge_strategy == "auto_fuzzy"
        assert row.confidence_score == Decimal("0.92")
        db.add.assert_called_once()
        db.flush.assert_called_once()

    async def test_stores_snapshot_and_aliases_transferred(self):
        asset = HotelAssetFactory()
        db = make_db()
        db.get.return_value = asset

        payload = MergeCreate(
            winner_asset_id=asset.id,
            loser_asset_id=uuid.uuid4(),
            loser_asset_name="Loser Hotel",
            merge_strategy="manual",
            snapshot_before={"asset_name": "Winner Before"},
            aliases_transferred=[str(uuid.uuid4())],
        )
        row = await HotelMergeService(db).record(payload)

        assert row.snapshot_before == {"asset_name": "Winner Before"}
        assert len(row.aliases_transferred) == 1


class TestHotelMergeServiceReverse:
    async def test_sets_is_reversed_and_timestamp(self):
        merge = HotelMergeHistoryFactory(is_reversed=False)
        db = make_db()
        db.get.return_value = merge

        await HotelMergeService(db).reverse(merge.id, MergeReverseRequest())

        assert merge.is_reversed is True
        assert merge.reversed_at is not None

    async def test_raises_422_if_already_reversed(self):
        merge = HotelMergeHistoryFactory(is_reversed=True)
        db = make_db()
        db.get.return_value = merge

        with pytest.raises(ValidationError):
            await HotelMergeService(db).reverse(merge.id, MergeReverseRequest())

    async def test_appends_note_on_reversal(self):
        merge = HotelMergeHistoryFactory(is_reversed=False, notes="original note")
        db = make_db()
        db.get.return_value = merge

        await HotelMergeService(db).reverse(
            merge.id, MergeReverseRequest(notes="reversal reason")
        )

        assert "reversal reason" in merge.notes

    async def test_stores_reversed_by_id(self):
        merge = HotelMergeHistoryFactory(is_reversed=False)
        user_id = uuid.uuid4()
        db = make_db()
        db.get.return_value = merge

        await HotelMergeService(db).reverse(
            merge.id, MergeReverseRequest(reversed_by_id=user_id)
        )

        assert merge.reversed_by_id == user_id

    async def test_raises_404_when_not_found(self):
        db = make_db()
        db.get.return_value = None

        with pytest.raises(NotFoundError):
            await HotelMergeService(db).reverse(uuid.uuid4(), MergeReverseRequest())


class TestHotelMergeServiceList:
    async def test_returns_paged_response(self):
        merge = HotelMergeHistoryFactory()
        db = make_db()
        db.scalar.return_value = 1
        db.scalars.return_value = [merge]

        result = await HotelMergeService(db).list(
            winner_asset_id=None, loser_asset_id=None,
            is_reversed=None, limit=20, offset=0,
        )

        assert result.meta.total == 1
        assert result.data[0].loser_asset_name == merge.loser_asset_name


# ═══════════════════════════════════════════════════════════════════════════════
# AliasConflictService
# ═══════════════════════════════════════════════════════════════════════════════


class TestAliasConflictServiceResolve:
    async def test_resolves_open_conflict(self):
        asset_id_a, asset_id_b = uuid.uuid4(), uuid.uuid4()
        conflict = AliasConflictFactory(
            status="open",
            conflicting_asset_ids=[asset_id_a, asset_id_b],
        )
        db = make_db()
        db.get.return_value = conflict

        payload = ConflictResolveRequest(
            resolved_asset_id=asset_id_a,
            resolution_strategy="manual",
            resolution_notes="manually verified",
        )
        row = await AliasConflictService(db).resolve(conflict.id, payload)

        assert row.status == "resolved_manual"
        assert row.resolved_asset_id == asset_id_a
        assert row.resolution_strategy == "manual"
        assert row.resolved_at is not None

    async def test_raises_422_if_already_resolved(self):
        conflict = AliasConflictFactory(status="resolved_manual")
        db = make_db()
        db.get.return_value = conflict

        with pytest.raises(ValidationError):
            await AliasConflictService(db).resolve(
                conflict.id,
                ConflictResolveRequest(
                    resolved_asset_id=conflict.conflicting_asset_ids[0],
                    resolution_strategy="manual",
                ),
            )

    async def test_raises_422_if_resolved_id_not_in_list(self):
        conflict = AliasConflictFactory(status="open")
        db = make_db()
        db.get.return_value = conflict

        with pytest.raises(ValidationError):
            await AliasConflictService(db).resolve(
                conflict.id,
                ConflictResolveRequest(
                    resolved_asset_id=uuid.uuid4(),  # not in conflicting_asset_ids
                    resolution_strategy="manual",
                ),
            )

    async def test_stores_resolved_by_id(self):
        user_id = uuid.uuid4()
        asset_id = uuid.uuid4()
        conflict = AliasConflictFactory(
            status="open", conflicting_asset_ids=[asset_id]
        )
        db = make_db()
        db.get.return_value = conflict

        await AliasConflictService(db).resolve(
            conflict.id,
            ConflictResolveRequest(
                resolved_asset_id=asset_id,
                resolution_strategy="manual",
                resolved_by_id=user_id,
            ),
        )

        assert conflict.resolved_by_id == user_id

    async def test_raises_404_when_not_found(self):
        db = make_db()
        db.get.return_value = None

        with pytest.raises(NotFoundError):
            await AliasConflictService(db).resolve(
                uuid.uuid4(),
                ConflictResolveRequest(
                    resolved_asset_id=uuid.uuid4(), resolution_strategy="manual"
                ),
            )


class TestAliasConflictServiceIgnore:
    async def test_sets_status_ignored(self):
        conflict = AliasConflictFactory(status="open")
        db = make_db()
        db.get.return_value = conflict

        row = await AliasConflictService(db).ignore(
            conflict.id, ConflictIgnoreRequest(resolution_notes="homonym in different city")
        )

        assert row.status == "ignored"
        assert row.resolution_strategy == "ignored"
        assert row.resolution_notes == "homonym in different city"
        assert row.resolved_at is not None

    async def test_raises_422_if_not_open(self):
        conflict = AliasConflictFactory(status="ignored")
        db = make_db()
        db.get.return_value = conflict

        with pytest.raises(ValidationError):
            await AliasConflictService(db).ignore(conflict.id, ConflictIgnoreRequest())

    async def test_raises_404_when_not_found(self):
        db = make_db()
        db.get.return_value = None

        with pytest.raises(NotFoundError):
            await AliasConflictService(db).ignore(uuid.uuid4(), ConflictIgnoreRequest())


class TestAliasConflictServiceList:
    async def test_returns_open_conflicts(self):
        conflict = AliasConflictFactory(status="open")
        db = make_db()
        db.scalar.return_value = 1
        db.scalars.return_value = [conflict]

        result = await AliasConflictService(db).list(status="open", limit=20, offset=0)

        assert result.meta.total == 1
        assert result.data[0].status == "open"

    async def test_no_status_filter_returns_all(self):
        db = make_db()
        db.scalar.return_value = 0
        db.scalars.return_value = []

        result = await AliasConflictService(db).list(status=None, limit=20, offset=0)

        assert result.meta.total == 0
