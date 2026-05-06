from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import SingleResponse
from app.schemas.valuation import DCFAssumptions, ValuationCreate, ValuationRead, ValuationUpdate
from app.services.valuation_service import ValuationService

router = APIRouter()


@router.post("", response_model=SingleResponse[ValuationRead], status_code=201)
async def create_dcf_valuation(
    payload: ValuationCreate, db: AsyncSession = Depends(get_db)
) -> SingleResponse[ValuationRead]:
    payload.valuation_type = "dcf"
    svc = ValuationService(db)
    valuation = await svc.create_valuation(payload)
    return SingleResponse(data=ValuationRead.model_validate(valuation))


@router.post("/{valuation_id}/run", response_model=SingleResponse[ValuationRead])
async def run_dcf(
    valuation_id: UUID, db: AsyncSession = Depends(get_db)
) -> SingleResponse[ValuationRead]:
    svc = ValuationService(db)
    valuation = await svc.run_dcf(valuation_id)
    return SingleResponse(data=ValuationRead.model_validate(valuation))


@router.get("/{valuation_id}", response_model=SingleResponse[ValuationRead])
async def get_valuation(
    valuation_id: UUID, db: AsyncSession = Depends(get_db)
) -> SingleResponse[ValuationRead]:
    svc = ValuationService(db)
    valuation = await svc.get_valuation(valuation_id)
    return SingleResponse(data=ValuationRead.model_validate(valuation))


@router.patch("/{valuation_id}", response_model=SingleResponse[ValuationRead])
async def update_valuation(
    valuation_id: UUID, payload: ValuationUpdate, db: AsyncSession = Depends(get_db)
) -> SingleResponse[ValuationRead]:
    svc = ValuationService(db)
    valuation = await svc.update_valuation(valuation_id, payload)
    return SingleResponse(data=ValuationRead.model_validate(valuation))


@router.post("/{valuation_id}/sensitivity", response_model=SingleResponse[dict])
async def sensitivity_analysis(
    valuation_id: UUID,
    discount_rates: list[float],
    exit_cap_rates: list[float],
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[dict]:
    svc = ValuationService(db)
    table = await svc.sensitivity_table(valuation_id, discount_rates, exit_cap_rates)
    return SingleResponse(data=table)
