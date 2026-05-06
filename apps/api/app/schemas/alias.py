from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import field_validator, model_validator

from app.schemas.common import ValoraBase

# ── Constrained value sets ────────────────────────────────────────────────────

_ALIAS_TYPES = frozenset(
    {"canonical", "common", "multilingual", "operator", "historical", "source_raw"}
)
_MERGE_STRATEGIES = frozenset({"auto_exact", "auto_fuzzy", "manual"})
_CONFLICT_RESOLUTION_STRATEGIES = frozenset(
    {"manual", "confidence_winner", "override", "ignored"}
)
_CONFIDENCE_LABELS = frozenset({"HIGH", "MEDIUM", "LOW"})


# ═══════════════════════════════════════════════════════════════════════════════
# Hotel alias entries
# ═══════════════════════════════════════════════════════════════════════════════


class HotelAliasEntryCreate(ValoraBase):
    alias_text: str
    alias_type: str = "common"
    language: str | None = None
    source: str | None = None
    is_manual_override: bool = False
    confidence: Decimal | None = None
    valid_from: date | None = None
    valid_to: date | None = None
    notes: str | None = None

    @field_validator("alias_text")
    @classmethod
    def alias_text_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("alias_text must not be blank")
        if len(v) > 255:
            raise ValueError("alias_text must be ≤ 255 characters")
        return v

    @field_validator("alias_type")
    @classmethod
    def validate_alias_type(cls, v: str) -> str:
        if v not in _ALIAS_TYPES:
            raise ValueError(f"alias_type must be one of {sorted(_ALIAS_TYPES)}")
        return v

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and not (Decimal("0") <= v <= Decimal("1")):
            raise ValueError("confidence must be between 0 and 1")
        return v

    @model_validator(mode="after")
    def valid_to_after_valid_from(self) -> HotelAliasEntryCreate:
        if self.valid_from and self.valid_to and self.valid_to < self.valid_from:
            raise ValueError("valid_to must be on or after valid_from")
        return self


class HotelAliasEntryUpdate(ValoraBase):
    alias_text: str | None = None
    alias_type: str | None = None
    language: str | None = None
    source: str | None = None
    is_manual_override: bool | None = None
    is_active: bool | None = None
    confidence: Decimal | None = None
    valid_from: date | None = None
    valid_to: date | None = None
    notes: str | None = None

    @field_validator("alias_type")
    @classmethod
    def validate_alias_type(cls, v: str | None) -> str | None:
        if v is not None and v not in _ALIAS_TYPES:
            raise ValueError(f"alias_type must be one of {sorted(_ALIAS_TYPES)}")
        return v

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and not (Decimal("0") <= v <= Decimal("1")):
            raise ValueError("confidence must be between 0 and 1")
        return v


class HotelAliasEntryRead(ValoraBase):
    id: UUID
    asset_id: UUID | None
    alias_text: str
    alias_key: str
    alias_type: str
    language: str | None
    source: str | None
    is_active: bool
    is_manual_override: bool
    confidence: Decimal | None
    valid_from: date | None
    valid_to: date | None
    notes: str | None
    created_by_id: UUID | None
    created_at: datetime
    updated_at: datetime


class HotelAliasEntryListItem(ValoraBase):
    id: UUID
    asset_id: UUID | None
    alias_text: str
    alias_key: str
    alias_type: str
    language: str | None
    is_active: bool
    is_manual_override: bool
    confidence: Decimal | None
    valid_from: date | None
    valid_to: date | None


# ═══════════════════════════════════════════════════════════════════════════════
# Operator aliases
# ═══════════════════════════════════════════════════════════════════════════════


class OperatorAliasCreate(ValoraBase):
    alias_text: str
    canonical_operator: str
    brand_family: str | None = None
    chain_scale: str | None = None
    parent_company: str | None = None
    source: str | None = None
    is_manual_override: bool = False
    notes: str | None = None

    @field_validator("alias_text", "canonical_operator")
    @classmethod
    def not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v


class OperatorAliasUpdate(ValoraBase):
    alias_text: str | None = None
    canonical_operator: str | None = None
    brand_family: str | None = None
    chain_scale: str | None = None
    parent_company: str | None = None
    source: str | None = None
    is_manual_override: bool | None = None
    is_active: bool | None = None
    notes: str | None = None


class OperatorAliasRead(ValoraBase):
    id: UUID
    alias_text: str
    alias_key: str
    canonical_operator: str
    brand_family: str | None
    chain_scale: str | None
    parent_company: str | None
    source: str | None
    is_active: bool
    is_manual_override: bool
    notes: str | None
    created_by_id: UUID | None
    created_at: datetime
    updated_at: datetime


class OperatorAliasListItem(ValoraBase):
    id: UUID
    alias_text: str
    alias_key: str
    canonical_operator: str
    brand_family: str | None
    chain_scale: str | None
    is_active: bool
    is_manual_override: bool


class OperatorAliasBulkCreate(ValoraBase):
    items: list[OperatorAliasCreate]

    @field_validator("items")
    @classmethod
    def at_least_one(cls, v: list) -> list:
        if not v:
            raise ValueError("items must contain at least one entry")
        if len(v) > 500:
            raise ValueError("maximum 500 items per bulk request")
        return v


class BulkCreateResult(ValoraBase):
    created: int
    skipped: int
    errors: list[str] = []


# ═══════════════════════════════════════════════════════════════════════════════
# Merge history
# ═══════════════════════════════════════════════════════════════════════════════


class MergeCreate(ValoraBase):
    winner_asset_id: UUID
    loser_asset_id: UUID
    loser_asset_name: str
    loser_city: str | None = None
    merge_strategy: str
    confidence_score: Decimal | None = None
    confidence_label: str | None = None
    triggered_by: str | None = None
    snapshot_before: dict = {}
    aliases_transferred: list = []
    notes: str | None = None

    @field_validator("merge_strategy")
    @classmethod
    def validate_strategy(cls, v: str) -> str:
        if v not in _MERGE_STRATEGIES:
            raise ValueError(f"merge_strategy must be one of {sorted(_MERGE_STRATEGIES)}")
        return v

    @field_validator("confidence_label")
    @classmethod
    def validate_label(cls, v: str | None) -> str | None:
        if v is not None and v not in _CONFIDENCE_LABELS:
            raise ValueError(f"confidence_label must be one of {sorted(_CONFIDENCE_LABELS)}")
        return v

    @field_validator("confidence_score")
    @classmethod
    def validate_score(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and not (Decimal("0") <= v <= Decimal("1")):
            raise ValueError("confidence_score must be between 0 and 1")
        return v

    @model_validator(mode="after")
    def winner_not_loser(self) -> MergeCreate:
        if self.winner_asset_id == self.loser_asset_id:
            raise ValueError("winner_asset_id and loser_asset_id must be different")
        return self


class MergeRead(ValoraBase):
    id: UUID
    winner_asset_id: UUID | None
    loser_asset_id: UUID
    loser_asset_name: str
    loser_city: str | None
    merge_strategy: str
    confidence_score: Decimal | None
    confidence_label: str | None
    triggered_by: str | None
    reviewed_by_id: UUID | None
    reviewed_at: datetime | None
    is_reversed: bool
    reversed_at: datetime | None
    reversed_by_id: UUID | None
    snapshot_before: dict
    aliases_transferred: list
    notes: str | None
    created_at: datetime
    updated_at: datetime


class MergeReverseRequest(ValoraBase):
    reversed_by_id: UUID | None = None
    notes: str | None = None


# ═══════════════════════════════════════════════════════════════════════════════
# Alias conflicts
# ═══════════════════════════════════════════════════════════════════════════════


class AliasConflictRead(ValoraBase):
    id: UUID
    alias_key: str
    alias_text: str
    conflicting_asset_ids: list[UUID]
    status: str
    detected_at: datetime
    resolved_asset_id: UUID | None
    resolution_strategy: str | None
    resolution_notes: str | None
    resolved_at: datetime | None
    resolved_by_id: UUID | None
    created_at: datetime
    updated_at: datetime


class AliasConflictListItem(ValoraBase):
    id: UUID
    alias_key: str
    alias_text: str
    conflicting_asset_ids: list[UUID]
    status: str
    detected_at: datetime
    resolved_at: datetime | None


class ConflictResolveRequest(ValoraBase):
    resolved_asset_id: UUID
    resolution_strategy: Literal["manual", "confidence_winner", "override"] = "manual"
    resolution_notes: str | None = None
    resolved_by_id: UUID | None = None


class ConflictIgnoreRequest(ValoraBase):
    resolution_notes: str | None = None
    resolved_by_id: UUID | None = None
