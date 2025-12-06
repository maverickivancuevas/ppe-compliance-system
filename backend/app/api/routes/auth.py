from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel, EmailStr, validator
import re
from ...core.database import get_db
from ...core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user
)
from ...core.config import settings
from ...models.user import User
from ...schemas.user import UserCreate, UserLogin, Token, UserResponse
from ...services.otp_service import get_otp_service
from ...services.email_service import get_email_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user (DISABLED - Use admin endpoint instead)"""

    # Public registration is disabled
    if not settings.ALLOW_PUBLIC_REGISTRATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public registration is disabled. Please contact your system administrator to create an account."
        )

    # This code is unreachable when public registration is disabled
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponse.from_orm(new_user)


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login and get access token"""

    # Find user
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role.value},
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse.from_orm(current_user)


# New registration schemas
class SendOTPRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class RegisterWithOTPRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    otp: str

    @validator('password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v


@router.post("/send-otp")
def send_otp(request: SendOTPRequest, db: Session = Depends(get_db)):
    """Send OTP to email for registration"""

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Generate OTP
    otp_service = get_otp_service()
    otp = otp_service.generate_otp(request.email)

    # Send OTP via email
    email_service = get_email_service()

    # Check if email service is configured
    if not email_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email service is not configured. Please contact the system administrator."
        )

    # Send OTP email
    if not email_service.send_otp_email(request.email, otp):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email. Please try again later."
        )

    return {
        "message": "Verification code sent to your email",
        "expires_in_minutes": 10
    }


@router.post("/verify-otp")
def verify_otp(request: VerifyOTPRequest):
    """Verify OTP (for testing/validation before registration)"""
    otp_service = get_otp_service()

    if otp_service.verify_otp(request.email, request.otp):
        return {"message": "OTP verified successfully"}

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired OTP"
    )


@router.post("/register-with-otp", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_with_otp(request: RegisterWithOTPRequest, db: Session = Depends(get_db)):
    """Register a new user with OTP verification - First user becomes super_admin"""

    # Verify OTP
    otp_service = get_otp_service()
    if not otp_service.verify_otp(request.email, request.otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )

    # Check if email already exists (double check)
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if this is the first user (becomes super_admin)
    user_count = db.query(User).count()
    if user_count == 0:
        user_role = "super_admin"  # First user is super_admin
    else:
        # Subsequent registrations are not allowed - users must be created by super_admin or admin
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public registration is disabled. Please contact your super admin to create an account."
        )

    # Create new user
    new_user = User(
        email=request.email,
        full_name=request.full_name,
        hashed_password=get_password_hash(request.password),
        role=user_role,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Clear OTP after successful registration
    otp_service.clear_otp(request.email)

    return UserResponse.from_orm(new_user)


# Forgot Password schemas
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

    @validator('new_password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send password reset OTP to user's email"""

    # Check if user exists
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address"
        )

    # Generate OTP for password reset
    otp_service = get_otp_service()
    otp = otp_service.generate_otp(request.email)

    # Send password reset email
    email_service = get_email_service()

    # Check if email service is configured
    if not email_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email service is not configured. Please contact the system administrator."
        )

    # Send password reset email
    if not email_service.send_password_reset_email(request.email, otp):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send password reset email. Please try again later."
        )

    return {
        "message": "Password reset instructions have been sent to your email",
        "expires_in_minutes": 10
    }


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password with OTP verification"""

    # Verify OTP
    otp_service = get_otp_service()
    if not otp_service.verify_otp(request.email, request.otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )

    # Find user
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address"
        )

    # Update password
    user.hashed_password = get_password_hash(request.new_password)
    db.commit()

    # Clear OTP after successful password reset
    otp_service.clear_otp(request.email)

    return {"message": "Password has been reset successfully"}
