"""
factory-boy factories for ORM model instances.

These produce plain Python objects (no DB write) suitable for unit tests and
as return values from mocked service methods in route tests.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

import factory

from app.models.alias import AliasConflict, HotelAliasEntry, HotelMergeHistory, OperatorAlias
from app.models.hotel import HotelAsset


def _now() -> datetime:
    return datetime.now(timezone.utc)


class HotelAssetFactory(factory.Factory):
    class Meta:
        model = HotelAsset

    id = factory.LazyFunction(uuid.uuid4)
    asset_name = factory.Sequence(lambda n: f"Hotel Test {n}")
    asset_type = "full_service"
    slug = factory.Sequence(lambda n: f"hotel-test-{n}")
    brand = None
    chain_scale = None
    operator = None
    owner = None
    address = None
    city = "Barcelona"
    country = "ES"
    submarket = None
    latitude = None
    longitude = None
    keys = 100
    star_rating = None
    meeting_space_sqft = None
    opening_year = None
    year_renovated = None
    gfa_sqft = None
    status = "operating"
    franchise_agreement = None
    meta = {}
    created_at = factory.LazyFunction(_now)
    updated_at = factory.LazyFunction(_now)


class HotelAliasEntryFactory(factory.Factory):
    class Meta:
        model = HotelAliasEntry

    id = factory.LazyFunction(uuid.uuid4)
    asset_id = factory.LazyFunction(uuid.uuid4)
    alias_text = "Hotel Arts Barcelona"
    alias_key = "hotel arts barcelona"
    alias_type = "common"
    language = None
    source = "manual"
    is_active = True
    is_manual_override = False
    confidence = None
    valid_from = None
    valid_to = None
    notes = None
    created_by_id = None
    created_at = factory.LazyFunction(_now)
    updated_at = factory.LazyFunction(_now)


class OperatorAliasFactory(factory.Factory):
    class Meta:
        model = OperatorAlias

    id = factory.LazyFunction(uuid.uuid4)
    alias_text = "marriott international"
    alias_key = "marriott international"
    canonical_operator = "Marriott International"
    brand_family = "Marriott Bonvoy"
    chain_scale = "upscale"
    parent_company = None
    source = "manual"
    is_active = True
    is_manual_override = False
    notes = None
    created_by_id = None
    created_at = factory.LazyFunction(_now)
    updated_at = factory.LazyFunction(_now)


class HotelMergeHistoryFactory(factory.Factory):
    class Meta:
        model = HotelMergeHistory

    id = factory.LazyFunction(uuid.uuid4)
    winner_asset_id = factory.LazyFunction(uuid.uuid4)
    loser_asset_id = factory.LazyFunction(uuid.uuid4)
    loser_asset_name = "Hotel Miramar"
    loser_city = "Barcelona"
    merge_strategy = "manual"
    confidence_score = None
    confidence_label = None
    triggered_by = "manual"
    reviewed_by_id = None
    reviewed_at = None
    is_reversed = False
    reversed_at = None
    reversed_by_id = None
    snapshot_before = {}
    aliases_transferred = []
    notes = None
    created_at = factory.LazyFunction(_now)
    updated_at = factory.LazyFunction(_now)


class AliasConflictFactory(factory.Factory):
    class Meta:
        model = AliasConflict

    id = factory.LazyFunction(uuid.uuid4)
    alias_key = "arts hotel barcelona"
    alias_text = "Arts Hotel Barcelona"
    conflicting_asset_ids = factory.LazyFunction(lambda: [uuid.uuid4(), uuid.uuid4()])
    status = "open"
    detected_at = factory.LazyFunction(_now)
    resolved_asset_id = None
    resolution_strategy = None
    resolution_notes = None
    resolved_at = None
    resolved_by_id = None
    created_at = factory.LazyFunction(_now)
    updated_at = factory.LazyFunction(_now)
