from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import SingleResponse
from app.services.import_service import CoStarImportService

router = APIRouter()


@router.post("/properties", status_code=202)
async def import_costar_properties(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[dict]:
    svc = CoStarImportService(db)
    result = await svc.import_properties(file)
    return SingleResponse(data=result)


@router.post("/transactions", status_code=202)
async def import_costar_transactions(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[dict]:
    svc = CoStarImportService(db)
    result = await svc.import_transactions(file)
    return SingleResponse(data=result)


@router.post("/market-stats", status_code=202)
async def import_costar_market_stats(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[dict]:
    svc = CoStarImportService(db)
    result = await svc.import_market_stats(file)
    return SingleResponse(data=result)
