from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from ..models.user import UserRole
from ..core.validation import validate_password, validate_user_name


class UserBase(BaseModel):
    email: EmailStr
    full_name: str

    @field_validator('full_name')
    @classmethod
    def validate_name(cls, v):
        return validate_user_name(v)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.SAFETY_MANAGER

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v):
        return validate_password(v)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None  # Optional password reset (super admin only)

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v):
        if v is not None:  # Only validate if password is being changed
            return validate_password(v)
        return v


class UserResponse(UserBase):
    id: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        # is_active is now a proper boolean, no conversion needed
        data = {
            "id": obj.id,
            "email": obj.email,
            "full_name": obj.full_name,
            "role": obj.role,
            "is_active": obj.is_active,
            "created_at": obj.created_at,
            "updated_at": obj.updated_at,
        }
        return cls(**data)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
