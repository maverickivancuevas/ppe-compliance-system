"""
Reports API Routes
Generate and download compliance reports
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.services.report_generator import ReportGenerator

router = APIRouter(prefix="/reports", tags=["reports"])


class ReportRequest(BaseModel):
    """Report generation request"""
    report_type: str  # daily, weekly, monthly, custom
    format: str  # pdf, csv
    start_date: str
    end_date: str


@router.post("/generate")
async def generate_report(
    request: ReportRequest,
    db: Session = Depends(get_db)
):
    """Generate a compliance report"""
    try:
        # Parse dates
        start_date = datetime.fromisoformat(request.start_date)
        end_date = datetime.fromisoformat(request.end_date)

        # Validate date range
        if start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="start_date must be before end_date"
            )

        # Create report generator
        generator = ReportGenerator(db)

        # Generate report based on format
        if request.format.lower() == 'pdf':
            buffer = generator.generate_pdf_report(
                report_type=request.report_type,
                start_date=start_date,
                end_date=end_date
            )

            filename = f"compliance_report_{request.report_type}_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.pdf"

            return StreamingResponse(
                buffer,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}"
                }
            )

        elif request.format.lower() == 'csv':
            buffer = generator.generate_csv_report(
                report_type=request.report_type,
                start_date=start_date,
                end_date=end_date
            )

            filename = f"compliance_report_{request.report_type}_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.csv"

            return StreamingResponse(
                buffer,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}"
                }
            )

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid format. Use 'pdf' or 'csv'"
            )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating report: {str(e)}"
        )


@router.get("/quick/{report_type}")
async def generate_quick_report(
    report_type: str,  # today, week, month
    format: str = Query("pdf", regex="^(pdf|csv)$"),
    db: Session = Depends(get_db)
):
    """Generate quick reports (today, this week, last 30 days)"""
    try:
        end_date = datetime.now()

        if report_type == "today":
            start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
        elif report_type == "week":
            start_date = end_date - timedelta(days=7)
        elif report_type == "month":
            start_date = end_date - timedelta(days=30)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid report type. Use 'today', 'week', or 'month'"
            )

        # Create report generator
        generator = ReportGenerator(db)

        # Generate report
        if format.lower() == 'pdf':
            buffer = generator.generate_pdf_report(
                report_type=report_type,
                start_date=start_date,
                end_date=end_date
            )

            filename = f"quick_report_{report_type}_{end_date.strftime('%Y%m%d')}.pdf"

            return StreamingResponse(
                buffer,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}"
                }
            )
        else:
            buffer = generator.generate_csv_report(
                report_type=report_type,
                start_date=start_date,
                end_date=end_date
            )

            filename = f"quick_report_{report_type}_{end_date.strftime('%Y%m%d')}.csv"

            return StreamingResponse(
                buffer,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}"
                }
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating quick report: {str(e)}"
        )


@router.get("/template/{template_type}")
async def download_template(
    template_type: str,  # executive_summary, detailed_violations, compliance_certificate, audit_report
    db: Session = Depends(get_db)
):
    """Download report template"""
    try:
        valid_templates = [
            "executive_summary",
            "detailed_violations",
            "compliance_certificate",
            "audit_report"
        ]

        if template_type not in valid_templates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid template type. Use one of: {', '.join(valid_templates)}"
            )

        # Create report generator
        generator = ReportGenerator(db)

        # Generate template
        buffer = generator.generate_template(template_type)

        filename = f"{template_type}_template.pdf"

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating template: {str(e)}"
        )
