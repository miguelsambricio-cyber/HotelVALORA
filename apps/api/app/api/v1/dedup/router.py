"""Dedup / merge recommendation API routes."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.security import get_optional_actor_id
from app.database import get_db
from app.schemas.common import PagedResponse, SingleResponse
from app.schemas.merge_recommendation import (
    DedupSummary,
    MergeRecommendationListItem,
    MergeRecommendationRead,
    ReviewAction,
    ScanResult,
)
from app.services.dedup_service import DedupService

router = APIRouter()


def _svc(db=Depends(get_db)) -> DedupService:
    return DedupService(db)


@router.get("/summary", response_model=SingleResponse[DedupSummary])
async def get_summary(svc: DedupService = Depends(_svc)):
    return SingleResponse(data=await svc.get_summary())


@router.post("/scan", response_model=SingleResponse[ScanResult])
async def run_scan(
    city: Optional[str] = Query(default=None),
    svc: DedupService = Depends(_svc),
):
    return SingleResponse(data=await svc.run_scan(city=city))


@router.get(
    "/recommendations",
    response_model=PagedResponse[MergeRecommendationListItem],
)
async def list_recommendations(
    status: Optional[str] = Query(default="pending_review"),
    recommendation: Optional[str] = Query(default=None),
    confidence_label: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    svc: DedupService = Depends(_svc),
):
    return await svc.list_recommendations(
        status=status,
        recommendation=recommendation,
        confidence_label=confidence_label,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/recommendations/{rec_id}",
    response_model=SingleResponse[MergeRecommendationRead],
)
async def get_recommendation(
    rec_id: UUID,
    svc: DedupService = Depends(_svc),
):
    return SingleResponse(data=await svc.get_recommendation(rec_id))


@router.post(
    "/recommendations/{rec_id}/accept",
    response_model=SingleResponse[MergeRecommendationRead],
)
async def accept_recommendation(
    rec_id: UUID,
    body: ReviewAction = ReviewAction(),
    actor_id: Optional[UUID] = Depends(get_optional_actor_id),
    svc: DedupService = Depends(_svc),
):
    return SingleResponse(data=await svc.accept(rec_id, notes=body.notes, actor_id=actor_id))


@router.post(
    "/recommendations/{rec_id}/dismiss",
    response_model=SingleResponse[MergeRecommendationRead],
)
async def dismiss_recommendation(
    rec_id: UUID,
    body: ReviewAction = ReviewAction(),
    actor_id: Optional[UUID] = Depends(get_optional_actor_id),
    svc: DedupService = Depends(_svc),
):
    return SingleResponse(data=await svc.dismiss(rec_id, notes=body.notes, actor_id=actor_id))
