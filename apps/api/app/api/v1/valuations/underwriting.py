from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import SingleResponse
from app.schemas.valuation import UnderwritingCreate, UnderwritingRead
from app.services.valuation_service import ValuationService

router = APIRouter()


@router.post("/{valuation_id}", response_model=SingleResponse[UnderwritingRead], status_code=201)
async def create_underwriting(
    valuation_id: UUID,
    payload: UnderwritingCreate,
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[UnderwritingRead]:
    svc = ValuationService(db)
    uw = await svc.create_underwriting(valuation_id, payload)
    return SingleResponse(data=UnderwritingRead.model_validate(uw))


@router.get("/{valuation_id}", response_model=SingleResponse[UnderwritingRead])
async def get_underwriting(
    valuation_id: UUID, db: AsyncSession = Depends(get_db)
) -> SingleResponse[UnderwritingRead]:
    svc = ValuationService(db)
    uw = await svc.get_underwriting(valuation_id)
    return SingleResponse(data=UnderwritingRead.model_validate(uw))
