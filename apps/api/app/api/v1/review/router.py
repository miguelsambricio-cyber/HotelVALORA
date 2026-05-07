"""
Review queue aggregation endpoint.

Returns counts of items needing human attention:
- Open alias conflicts
- Active aliases with confidence below the MEDIUM threshold (0.65)
"""
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.alias import AliasConflict, HotelAliasEntry
from app.models.merge_recommendation import MergeRecommendation
from app.schemas.common import SingleResponse
from app.schemas.review import ReviewSummary

LOW_CONFIDENCE_THRESHOLD = Decimal("0.65")

router = APIRouter()


@router.get(
    "/summary",
    response_model=SingleResponse[ReviewSummary],
    summary="Review queue summary",
    description=(
        "Returns the count of items currently in the review queue: "
        "open alias conflicts and active aliases with a confidence score "
        f"below the MEDIUM threshold ({LOW_CONFIDENCE_THRESHOLD})."
    ),
)
async def get_review_summary(
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[ReviewSummary]:
    open_conflicts = await db.scalar(
        select(func.count()).select_from(AliasConflict).where(
            AliasConflict.status == "open"
        )
    )
    low_confidence_aliases = await db.scalar(
        select(func.count()).select_from(HotelAliasEntry).where(
            HotelAliasEntry.is_active.is_(True),
            HotelAliasEntry.confidence.is_not(None),
            HotelAliasEntry.confidence < LOW_CONFIDENCE_THRESHOLD,
        )
    )
    pending_merges = await db.scalar(
        select(func.count()).select_from(MergeRecommendation).where(
            MergeRecommendation.status == "pending_review"
        )
    )
    return SingleResponse(
        data=ReviewSummary(
            open_conflicts=open_conflicts or 0,
            low_confidence_aliases=low_confidence_aliases or 0,
            low_confidence_threshold=float(LOW_CONFIDENCE_THRESHOLD),
            pending_merge_recommendations=pending_merges or 0,
        )
    )
