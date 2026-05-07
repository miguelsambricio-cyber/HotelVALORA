"""
Services for the alias registry.

_key() is inlined here because pipeline.cleaning.names is a separate,
uninstalled package. The logic is identical: NFKD normalise → strip combining
chars → collapse whitespace.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.alias import AliasConflict, HotelAliasEntry, HotelMergeHistory, OperatorAlias
from app.models.hotel import HotelAsset
from app.schemas.alias import (
    AliasConflictListItem,
    AliasConflictRead,
    BulkCreateResult,
    ConflictIgnoreRequest,
    ConflictResolveRequest,
    HotelAliasEntryCreate,
    HotelAliasEntryListItem,
    HotelAliasEntryRead,
    HotelAliasEntryUpdate,
    MergeCreate,
    MergeRead,
    MergeReverseRequest,
    OperatorAliasCreate,
    OperatorAliasListItem,
    OperatorAliasRead,
    OperatorAliasUpdate,
)
from app.schemas.common import PagedResponse, Pagination

# ── Key normalisation (mirrors pipeline.cleaning.names._key) ──────────────────

_COLLAPSE_RE = re.compile(r"\s+")


def _key(raw: str) -> str:
    nfd = unicodedata.normalize("NFKD", raw.strip().lower())
    stripped = "".join(c for c in nfd if not unicodedata.combining(c))
    return _COLLAPSE_RE.sub(" ", stripped).strip()


# ═══════════════════════════════════════════════════════════════════════════════
# Hotel alias entries
# ═══════════════════════════════════════════════════════════════════════════════


class HotelAliasService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _get_or_404(self, alias_id: UUID) -> HotelAliasEntry:
        row = await self.db.get(HotelAliasEntry, alias_id)
        if not row:
            raise NotFoundError(f"Alias entry {alias_id} not found.")
        return row

    async def _assert_asset_exists(self, asset_id: UUID) -> None:
        if not await self.db.get(HotelAsset, asset_id):
            raise NotFoundError(f"Hotel asset {asset_id} not found.")

    async def _detect_and_record_conflict(
        self, alias_key: str, alias_text: str, asset_id: UUID
    ) -> None:
        """If another active entry already holds alias_key for a different asset,
        create or update an AliasConflict record."""
        competing = list(
            await self.db.scalars(
                select(HotelAliasEntry).where(
                    HotelAliasEntry.alias_key == alias_key,
                    HotelAliasEntry.is_active.is_(True),
                    HotelAliasEntry.asset_id != asset_id,
                )
            )
        )
        if not competing:
            return

        competing_ids = [e.asset_id for e in competing if e.asset_id]
        all_ids = list({asset_id, *competing_ids})

        existing_conflict: AliasConflict | None = await self.db.scalar(
            select(AliasConflict).where(
                AliasConflict.alias_key == alias_key,
                AliasConflict.status == "open",
            )
        )
        if existing_conflict:
            merged = list({*existing_conflict.conflicting_asset_ids, *all_ids})
            existing_conflict.conflicting_asset_ids = merged
        else:
            self.db.add(
                AliasConflict(
                    alias_key=alias_key,
                    alias_text=alias_text,
                    conflicting_asset_ids=all_ids,
                    status="open",
                    detected_at=datetime.now(timezone.utc),
                )
            )

    # ── Queries ───────────────────────────────────────────────────────────────

    async def list(
        self,
        *,
        asset_id: UUID | None,
        alias_key: str | None,
        alias_type: str | None,
        language: str | None,
        active_only: bool,
        confidence_max: float | None = None,
        limit: int,
        offset: int,
    ) -> PagedResponse[HotelAliasEntryListItem]:
        q = select(HotelAliasEntry)
        if asset_id:
            q = q.where(HotelAliasEntry.asset_id == asset_id)
        if alias_key:
            q = q.where(HotelAliasEntry.alias_key == _key(alias_key))
        if alias_type:
            q = q.where(HotelAliasEntry.alias_type == alias_type)
        if language:
            q = q.where(HotelAliasEntry.language == language)
        if active_only:
            q = q.where(HotelAliasEntry.is_active.is_(True))
        if confidence_max is not None:
            q = q.where(
                HotelAliasEntry.confidence.is_not(None),
                HotelAliasEntry.confidence <= Decimal(str(confidence_max)),
            )
        q = q.order_by(HotelAliasEntry.alias_key)

        total = await self.db.scalar(select(func.count()).select_from(q.subquery()))
        rows = list(await self.db.scalars(q.offset(offset).limit(limit)))
        return PagedResponse(
            data=[HotelAliasEntryListItem.model_validate(r) for r in rows],
            meta=Pagination(
                total=total or 0,
                limit=limit,
                offset=offset,
                has_next=(offset + limit) < (total or 0),
            ),
        )

    async def list_for_asset(
        self,
        asset_id: UUID,
        *,
        active_only: bool = True,
        limit: int = 50,
        offset: int = 0,
    ) -> PagedResponse[HotelAliasEntryListItem]:
        await self._assert_asset_exists(asset_id)
        return await self.list(
            asset_id=asset_id,
            alias_key=None,
            alias_type=None,
            language=None,
            active_only=active_only,
            limit=limit,
            offset=offset,
        )

    async def get(self, alias_id: UUID) -> HotelAliasEntry:
        return await self._get_or_404(alias_id)

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def create(
        self,
        asset_id: UUID,
        payload: HotelAliasEntryCreate,
        created_by_id: UUID | None = None,
    ) -> HotelAliasEntry:
        await self._assert_asset_exists(asset_id)
        computed_key = _key(payload.alias_text)

        entry = HotelAliasEntry(
            asset_id=asset_id,
            alias_text=payload.alias_text.strip(),
            alias_key=computed_key,
            alias_type=payload.alias_type,
            language=payload.language,
            source=payload.source,
            is_active=True,
            is_manual_override=payload.is_manual_override,
            confidence=payload.confidence,
            valid_from=payload.valid_from,
            valid_to=payload.valid_to,
            notes=payload.notes,
            created_by_id=created_by_id,
        )
        self.db.add(entry)
        await self.db.flush()  # get the id, surface unique-constraint violations early

        await self._detect_and_record_conflict(computed_key, payload.alias_text.strip(), asset_id)
        return entry

    async def update(
        self, alias_id: UUID, payload: HotelAliasEntryUpdate
    ) -> HotelAliasEntry:
        entry = await self._get_or_404(alias_id)
        updates = payload.model_dump(exclude_none=True)

        if "alias_text" in updates:
            new_key = _key(updates["alias_text"])
            updates["alias_key"] = new_key
            # Conflict detection for the new key (if asset_id is set)
            if entry.asset_id:
                await self._detect_and_record_conflict(
                    new_key, updates["alias_text"], entry.asset_id
                )

        for field, value in updates.items():
            setattr(entry, field, value)

        await self.db.flush()
        return entry

    async def deactivate(self, alias_id: UUID) -> None:
        entry = await self._get_or_404(alias_id)
        entry.is_active = False
        entry.valid_to = entry.valid_to or date.today()
        await self.db.flush()


# ═══════════════════════════════════════════════════════════════════════════════
# Operator aliases
# ═══════════════════════════════════════════════════════════════════════════════


class OperatorAliasService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _get_or_404(self, alias_id: UUID) -> OperatorAlias:
        row = await self.db.get(OperatorAlias, alias_id)
        if not row:
            raise NotFoundError(f"Operator alias {alias_id} not found.")
        return row

    # ── Queries ───────────────────────────────────────────────────────────────

    async def list(
        self,
        *,
        canonical_operator: str | None,
        brand_family: str | None,
        active_only: bool,
        limit: int,
        offset: int,
    ) -> PagedResponse[OperatorAliasListItem]:
        q = select(OperatorAlias)
        if canonical_operator:
            q = q.where(OperatorAlias.canonical_operator.ilike(f"%{canonical_operator}%"))
        if brand_family:
            q = q.where(OperatorAlias.brand_family.ilike(f"%{brand_family}%"))
        if active_only:
            q = q.where(OperatorAlias.is_active.is_(True))
        q = q.order_by(OperatorAlias.canonical_operator, OperatorAlias.alias_key)

        total = await self.db.scalar(select(func.count()).select_from(q.subquery()))
        rows = list(await self.db.scalars(q.offset(offset).limit(limit)))
        return PagedResponse(
            data=[OperatorAliasListItem.model_validate(r) for r in rows],
            meta=Pagination(
                total=total or 0,
                limit=limit,
                offset=offset,
                has_next=(offset + limit) < (total or 0),
            ),
        )

    async def get(self, alias_id: UUID) -> OperatorAlias:
        return await self._get_or_404(alias_id)

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: OperatorAliasCreate,
        created_by_id: UUID | None = None,
    ) -> OperatorAlias:
        computed_key = _key(payload.alias_text)
        if await self.db.scalar(
            select(OperatorAlias).where(OperatorAlias.alias_key == computed_key)
        ):
            raise ConflictError(
                f"An operator alias with key '{computed_key}' already exists."
            )
        entry = OperatorAlias(
            alias_text=payload.alias_text.strip(),
            alias_key=computed_key,
            canonical_operator=payload.canonical_operator.strip(),
            brand_family=payload.brand_family,
            chain_scale=payload.chain_scale,
            parent_company=payload.parent_company,
            source=payload.source,
            is_active=True,
            is_manual_override=payload.is_manual_override,
            notes=payload.notes,
            created_by_id=created_by_id,
        )
        self.db.add(entry)
        await self.db.flush()
        return entry

    async def update(self, alias_id: UUID, payload: OperatorAliasUpdate) -> OperatorAlias:
        entry = await self._get_or_404(alias_id)
        updates = payload.model_dump(exclude_none=True)

        if "alias_text" in updates:
            new_key = _key(updates["alias_text"])
            existing = await self.db.scalar(
                select(OperatorAlias).where(
                    OperatorAlias.alias_key == new_key,
                    OperatorAlias.id != alias_id,
                )
            )
            if existing:
                raise ConflictError(
                    f"Operator alias key '{new_key}' is already taken by another entry."
                )
            updates["alias_key"] = new_key

        for field, value in updates.items():
            setattr(entry, field, value)

        await self.db.flush()
        return entry

    async def deactivate(self, alias_id: UUID) -> None:
        entry = await self._get_or_404(alias_id)
        entry.is_active = False
        await self.db.flush()

    async def bulk_create(
        self,
        items: list[OperatorAliasCreate],
        created_by_id: UUID | None = None,
    ) -> BulkCreateResult:
        created = 0
        skipped = 0
        errors: list[str] = []

        for item in items:
            computed_key = _key(item.alias_text)
            try:
                existing = await self.db.scalar(
                    select(OperatorAlias).where(OperatorAlias.alias_key == computed_key)
                )
                if existing:
                    skipped += 1
                    continue
                self.db.add(
                    OperatorAlias(
                        alias_text=item.alias_text.strip(),
                        alias_key=computed_key,
                        canonical_operator=item.canonical_operator.strip(),
                        brand_family=item.brand_family,
                        chain_scale=item.chain_scale,
                        parent_company=item.parent_company,
                        source=item.source,
                        is_active=True,
                        is_manual_override=item.is_manual_override,
                        notes=item.notes,
                        created_by_id=created_by_id,
                    )
                )
                created += 1
            except Exception as exc:
                errors.append(f"{item.alias_text!r}: {exc}")

        await self.db.flush()
        return BulkCreateResult(created=created, skipped=skipped, errors=errors)


# ═══════════════════════════════════════════════════════════════════════════════
# Merge history
# ═══════════════════════════════════════════════════════════════════════════════


class HotelMergeService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _get_or_404(self, merge_id: UUID) -> HotelMergeHistory:
        row = await self.db.get(HotelMergeHistory, merge_id)
        if not row:
            raise NotFoundError(f"Merge record {merge_id} not found.")
        return row

    # ── Queries ───────────────────────────────────────────────────────────────

    async def list(
        self,
        *,
        winner_asset_id: UUID | None,
        loser_asset_id: UUID | None,
        is_reversed: bool | None,
        limit: int,
        offset: int,
    ) -> PagedResponse[MergeRead]:
        q = select(HotelMergeHistory)
        if winner_asset_id:
            q = q.where(HotelMergeHistory.winner_asset_id == winner_asset_id)
        if loser_asset_id:
            q = q.where(HotelMergeHistory.loser_asset_id == loser_asset_id)
        if is_reversed is not None:
            q = q.where(HotelMergeHistory.is_reversed.is_(is_reversed))
        q = q.order_by(HotelMergeHistory.created_at.desc())

        total = await self.db.scalar(select(func.count()).select_from(q.subquery()))
        rows = list(await self.db.scalars(q.offset(offset).limit(limit)))
        return PagedResponse(
            data=[MergeRead.model_validate(r) for r in rows],
            meta=Pagination(
                total=total or 0,
                limit=limit,
                offset=offset,
                has_next=(offset + limit) < (total or 0),
            ),
        )

    async def get(self, merge_id: UUID) -> HotelMergeHistory:
        return await self._get_or_404(merge_id)

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def record(self, payload: MergeCreate) -> HotelMergeHistory:
        if not await self.db.get(HotelAsset, payload.winner_asset_id):
            raise NotFoundError(f"Winner asset {payload.winner_asset_id} not found.")

        row = HotelMergeHistory(
            winner_asset_id=payload.winner_asset_id,
            loser_asset_id=payload.loser_asset_id,
            loser_asset_name=payload.loser_asset_name,
            loser_city=payload.loser_city,
            merge_strategy=payload.merge_strategy,
            confidence_score=payload.confidence_score,
            confidence_label=payload.confidence_label,
            triggered_by=payload.triggered_by,
            snapshot_before=payload.snapshot_before,
            aliases_transferred=payload.aliases_transferred,
            notes=payload.notes,
        )
        self.db.add(row)
        await self.db.flush()
        return row

    async def reverse(
        self, merge_id: UUID, payload: MergeReverseRequest
    ) -> HotelMergeHistory:
        row = await self._get_or_404(merge_id)
        if row.is_reversed:
            raise ValidationError(f"Merge {merge_id} has already been reversed.")
        row.is_reversed = True
        row.reversed_at = datetime.now(timezone.utc)
        row.reversed_by_id = payload.reversed_by_id
        if payload.notes:
            row.notes = (row.notes or "") + f"\n[reversal] {payload.notes}"
        await self.db.flush()
        return row


# ═══════════════════════════════════════════════════════════════════════════════
# Alias conflicts
# ═══════════════════════════════════════════════════════════════════════════════


class AliasConflictService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _get_or_404(self, conflict_id: UUID) -> AliasConflict:
        row = await self.db.get(AliasConflict, conflict_id)
        if not row:
            raise NotFoundError(f"Alias conflict {conflict_id} not found.")
        return row

    # ── Queries ───────────────────────────────────────────────────────────────

    async def list(
        self,
        *,
        status: str | None,
        limit: int,
        offset: int,
    ) -> PagedResponse[AliasConflictListItem]:
        q = select(AliasConflict)
        if status:
            q = q.where(AliasConflict.status == status)
        q = q.order_by(AliasConflict.detected_at.desc())

        total = await self.db.scalar(select(func.count()).select_from(q.subquery()))
        rows = list(await self.db.scalars(q.offset(offset).limit(limit)))
        return PagedResponse(
            data=[AliasConflictListItem.model_validate(r) for r in rows],
            meta=Pagination(
                total=total or 0,
                limit=limit,
                offset=offset,
                has_next=(offset + limit) < (total or 0),
            ),
        )

    async def get(self, conflict_id: UUID) -> AliasConflict:
        return await self._get_or_404(conflict_id)

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def resolve(
        self, conflict_id: UUID, payload: ConflictResolveRequest
    ) -> AliasConflict:
        row = await self._get_or_404(conflict_id)
        if row.status != "open":
            raise ValidationError(f"Conflict {conflict_id} is already {row.status!r}.")
        if payload.resolved_asset_id not in row.conflicting_asset_ids:
            raise ValidationError(
                f"resolved_asset_id {payload.resolved_asset_id} is not among the "
                "conflicting assets for this record."
            )
        row.status = "resolved_manual"
        row.resolved_asset_id = payload.resolved_asset_id
        row.resolution_strategy = payload.resolution_strategy
        row.resolution_notes = payload.resolution_notes
        row.resolved_at = datetime.now(timezone.utc)
        row.resolved_by_id = payload.resolved_by_id
        await self.db.flush()
        return row

    async def ignore(
        self, conflict_id: UUID, payload: ConflictIgnoreRequest
    ) -> AliasConflict:
        row = await self._get_or_404(conflict_id)
        if row.status != "open":
            raise ValidationError(f"Conflict {conflict_id} is already {row.status!r}.")
        row.status = "ignored"
        row.resolution_strategy = "ignored"
        row.resolution_notes = payload.resolution_notes
        row.resolved_at = datetime.now(timezone.utc)
        row.resolved_by_id = payload.resolved_by_id
        await self.db.flush()
        return row
