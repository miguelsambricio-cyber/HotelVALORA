from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import SingleResponse
from app.services.import_service import ExcelImportService

router = APIRouter()


@router.post("/hotels", status_code=202)
async def import_hotels_excel(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[dict]:
    svc = ExcelImportService(db)
    result = await svc.import_hotels(file)
    return SingleResponse(data=result)


@router.post("/financials/{hotel_id}", status_code=202)
async def import_financials_excel(
    hotel_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[dict]:
    svc = ExcelImportService(db)
    result = await svc.import_financials(hotel_id, file)
    return SingleResponse(data=result)


@router.post("/transactions", status_code=202)
async def import_transactions_excel(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> SingleResponse[dict]:
    svc = ExcelImportService(db)
    result = await svc.import_transactions(file)
    return SingleResponse(data=result)


@router.get("/templates/{template_name}")
async def download_template(template_name: str) -> dict:
    return {"template": template_name, "url": f"/static/templates/{template_name}.xlsx"}
