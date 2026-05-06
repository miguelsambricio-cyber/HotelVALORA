from uuid import UUID

from pydantic import EmailStr

from app.schemas.common import ValoraBase


class UserCreate(ValoraBase):
    email: EmailStr
    full_name: str
    password: str
    role: str = "analyst"


class UserRead(ValoraBase):
    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool


class TokenPair(ValoraBase):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginRequest(ValoraBase):
    email: EmailStr
    password: str


class RefreshRequest(ValoraBase):
    refresh_token: str
