from typing import Any, Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ValoraBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class Pagination(BaseModel):
    total: int
    limit: int
    offset: int
    has_next: bool


class PagedResponse(BaseModel, Generic[T]):
    data: list[T]
    meta: Pagination


class SingleResponse(BaseModel, Generic[T]):
    data: T


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: str | None = None


class ErrorResponse(BaseModel):
    data: None = None
    errors: list[ErrorDetail]
