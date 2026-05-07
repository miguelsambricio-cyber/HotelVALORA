from app.schemas.common import ValoraBase


class ReviewSummary(ValoraBase):
    open_conflicts: int
    low_confidence_aliases: int
    low_confidence_threshold: float
    pending_merge_recommendations: int = 0
