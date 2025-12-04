from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os
import shutil
import uuid
from pathlib import Path
from ...core.database import get_db
from ...core.security import get_super_admin_user
from ...models.user import User
from ...models.settings import SystemSettings
from ...core.logger import get_logger

router = APIRouter(tags=["Settings"])
logger = get_logger(__name__)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/logos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class GeneralSettingsResponse(BaseModel):
    company_name: str
    system_name: str
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True


class UpdateGeneralSettingsRequest(BaseModel):
    company_name: str
    system_name: str
    logo_url: Optional[str] = None


@router.get("/general", response_model=GeneralSettingsResponse)
def get_general_settings(
    db: Session = Depends(get_db)
):
    """Get general system settings (public endpoint)"""

    # Get the first (and should be only) settings record
    settings = db.query(SystemSettings).first()

    # If no settings exist, create default settings
    if not settings:
        settings = SystemSettings(
            company_name="Your Company",
            system_name="PPE Compliance System"
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
        logger.info("Created default system settings")

    return GeneralSettingsResponse(
        company_name=settings.company_name,
        system_name=settings.system_name,
        logo_url=settings.logo_url
    )


@router.post("/upload-logo")
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_super_admin_user)
):
    """Upload company logo (Super Admin only)"""

    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PNG, JPG, and SVG are allowed."
        )

    # Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Admin {current_user.email} uploaded logo: {unique_filename}")

        return {"logo_url": f"/uploads/logos/{unique_filename}"}
    except Exception as e:
        logger.error(f"Failed to upload logo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload logo"
        )


@router.put("/general", response_model=GeneralSettingsResponse)
def update_general_settings(
    request: UpdateGeneralSettingsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_super_admin_user)
):
    """Update general system settings (Super Admin only)"""

    # Validate input
    if not request.company_name or not request.company_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company name cannot be empty"
        )

    if not request.system_name or not request.system_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System name cannot be empty"
        )

    # Get or create settings
    settings = db.query(SystemSettings).first()

    if not settings:
        settings = SystemSettings(
            company_name=request.company_name,
            system_name=request.system_name,
            logo_url=request.logo_url
        )
        db.add(settings)
        logger.info(f"Admin {current_user.email} created system settings")
    else:
        settings.company_name = request.company_name
        settings.system_name = request.system_name
        if request.logo_url is not None:
            settings.logo_url = request.logo_url
        logger.info(f"Admin {current_user.email} updated system settings")

    db.commit()
    db.refresh(settings)

    return GeneralSettingsResponse(
        company_name=settings.company_name,
        system_name=settings.system_name,
        logo_url=settings.logo_url
    )
