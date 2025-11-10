"""
Report Generation Service
Generates PDF and CSV reports for compliance analytics
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path
import io
import csv

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import pandas as pd

from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.models.detection import DetectionEvent
from app.models.camera import Camera
from app.models.incident import Incident, IncidentSeverity


class ReportGenerator:
    """Generate compliance reports in various formats"""

    def __init__(self, db: Session):
        self.db = db
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=30,
            alignment=TA_CENTER
        ))

        self.styles.add(ParagraphStyle(
            name='CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#374151'),
            spaceAfter=12,
            spaceBefore=12
        ))

    def _get_detection_stats(self, start_date: datetime, end_date: datetime) -> Dict:
        """Get detection statistics for date range"""
        detections = self.db.query(DetectionEvent).filter(
            and_(
                DetectionEvent.timestamp >= start_date,
                DetectionEvent.timestamp <= end_date
            )
        ).all()

        total_detections = len(detections)
        violations = [d for d in detections if not d.is_compliant]
        compliant = [d for d in detections if d.is_compliant]

        compliance_rate = (len(compliant) / total_detections * 100) if total_detections > 0 else 0

        # Violation breakdown
        violation_types = {}
        for d in violations:
            vtype = d.violation_type or "Unknown"
            violation_types[vtype] = violation_types.get(vtype, 0) + 1

        # Camera breakdown
        camera_stats = {}
        for d in detections:
            cam_id = d.camera_id
            camera = self.db.query(Camera).filter(Camera.id == cam_id).first()
            cam_name = camera.name if camera else f"Camera {cam_id}"

            if cam_name not in camera_stats:
                camera_stats[cam_name] = {"total": 0, "violations": 0}

            camera_stats[cam_name]["total"] += 1
            if not d.is_compliant:
                camera_stats[cam_name]["violations"] += 1

        return {
            "total_detections": total_detections,
            "violations": len(violations),
            "compliant": len(compliant),
            "compliance_rate": compliance_rate,
            "violation_types": violation_types,
            "camera_stats": camera_stats,
            "start_date": start_date,
            "end_date": end_date
        }

    def _get_incident_stats(self, start_date: datetime, end_date: datetime) -> Dict:
        """Get incident statistics for date range"""
        incidents = self.db.query(Incident).filter(
            and_(
                Incident.incident_time >= start_date,
                Incident.incident_time <= end_date
            )
        ).all()

        total_incidents = len(incidents)

        # Status breakdown
        status_breakdown = {}
        for incident in incidents:
            status = incident.status.value
            status_breakdown[status] = status_breakdown.get(status, 0) + 1

        # Severity breakdown
        severity_breakdown = {}
        for incident in incidents:
            severity = incident.severity.value
            severity_breakdown[severity] = severity_breakdown.get(severity, 0) + 1

        return {
            "total_incidents": total_incidents,
            "status_breakdown": status_breakdown,
            "severity_breakdown": severity_breakdown
        }

    def generate_pdf_report(
        self,
        report_type: str,
        start_date: datetime,
        end_date: datetime,
        output_path: Optional[Path] = None
    ) -> io.BytesIO:
        """Generate PDF report"""

        # Create buffer or file
        if output_path:
            buffer = str(output_path)
        else:
            buffer = io.BytesIO()

        # Create document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )

        # Container for the 'Flowable' objects
        elements = []

        # Title
        title_text = f"PPE Compliance {report_type.title()} Report"
        elements.append(Paragraph(title_text, self.styles['CustomTitle']))
        elements.append(Spacer(1, 12))

        # Date range
        date_range = f"Period: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
        elements.append(Paragraph(date_range, self.styles['Normal']))
        elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", self.styles['Normal']))
        elements.append(Spacer(1, 20))

        # Get statistics
        stats = self._get_detection_stats(start_date, end_date)
        incident_stats = self._get_incident_stats(start_date, end_date)

        # Executive Summary
        elements.append(Paragraph("Executive Summary", self.styles['CustomHeading']))
        summary_data = [
            ['Metric', 'Value'],
            ['Total Detections', str(stats['total_detections'])],
            ['Compliance Rate', f"{stats['compliance_rate']:.2f}%"],
            ['Total Violations', str(stats['violations'])],
            ['Total Incidents', str(incident_stats['total_incidents'])],
        ]

        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))

        elements.append(summary_table)
        elements.append(Spacer(1, 20))

        # Violation Breakdown
        if stats['violation_types']:
            elements.append(Paragraph("Violations by Type", self.styles['CustomHeading']))
            violation_data = [['Violation Type', 'Count']]
            for vtype, count in stats['violation_types'].items():
                violation_data.append([vtype, str(count)])

            violation_table = Table(violation_data, colWidths=[3*inch, 2*inch])
            violation_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))

            elements.append(violation_table)
            elements.append(Spacer(1, 20))

        # Camera Statistics
        if stats['camera_stats']:
            elements.append(Paragraph("Performance by Camera", self.styles['CustomHeading']))
            camera_data = [['Camera', 'Total Detections', 'Violations', 'Compliance Rate']]
            for cam_name, cam_stats in stats['camera_stats'].items():
                total = cam_stats['total']
                violations = cam_stats['violations']
                compliance = ((total - violations) / total * 100) if total > 0 else 0
                camera_data.append([
                    cam_name,
                    str(total),
                    str(violations),
                    f"{compliance:.1f}%"
                ])

            camera_table = Table(camera_data, colWidths=[2*inch, 1.5*inch, 1.5*inch, 1.5*inch])
            camera_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))

            elements.append(camera_table)
            elements.append(Spacer(1, 20))

        # Incident Summary
        elements.append(Paragraph("Incident Summary", self.styles['CustomHeading']))

        incident_data = [['Category', 'Details']]
        incident_data.append(['Total Incidents', str(incident_stats['total_incidents'])])

        for status, count in incident_stats['status_breakdown'].items():
            incident_data.append([f"Status: {status.replace('_', ' ').title()}", str(count)])

        for severity, count in incident_stats['severity_breakdown'].items():
            incident_data.append([f"Severity: {severity.title()}", str(count)])

        incident_table = Table(incident_data, colWidths=[3*inch, 2*inch])
        incident_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))

        elements.append(incident_table)
        elements.append(Spacer(1, 20))

        # Recommendations
        elements.append(Paragraph("Recommendations", self.styles['CustomHeading']))
        recommendations = []

        if stats['compliance_rate'] < 80:
            recommendations.append("• Compliance rate is below 80%. Consider additional training for workers.")
        if stats['compliance_rate'] >= 95:
            recommendations.append("• Excellent compliance rate! Maintain current safety protocols.")

        if stats['violation_types']:
            most_common = max(stats['violation_types'].items(), key=lambda x: x[1])
            recommendations.append(f"• Most common violation: {most_common[0]}. Focus on this area.")

        if incident_stats['total_incidents'] > 10:
            recommendations.append("• High number of incidents reported. Review safety procedures.")

        if not recommendations:
            recommendations.append("• Continue monitoring and maintaining safety standards.")

        for rec in recommendations:
            elements.append(Paragraph(rec, self.styles['Normal']))

        # Build PDF
        doc.build(elements)

        if isinstance(buffer, io.BytesIO):
            buffer.seek(0)
            return buffer

        return None

    def generate_csv_report(
        self,
        report_type: str,
        start_date: datetime,
        end_date: datetime,
        output_path: Optional[Path] = None
    ) -> io.BytesIO:
        """Generate CSV report"""

        # Get all detections in range
        detections = self.db.query(DetectionEvent).filter(
            and_(
                DetectionEvent.timestamp >= start_date,
                DetectionEvent.timestamp <= end_date
            )
        ).all()

        # Prepare data
        data = []
        for detection in detections:
            camera = self.db.query(Camera).filter(Camera.id == detection.camera_id).first()
            data.append({
                'Timestamp': detection.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                'Camera': camera.name if camera else detection.camera_id,
                'Location': camera.location if camera else 'N/A',
                'Compliant': 'Yes' if detection.is_compliant else 'No',
                'Violation Type': detection.violation_type or 'N/A',
                'Person Detected': 'Yes' if detection.person_detected else 'No',
                'Hardhat Detected': 'Yes' if detection.hardhat_detected else 'No',
                'No Hardhat': 'Yes' if detection.no_hardhat_detected else 'No',
                'Safety Vest Detected': 'Yes' if detection.safety_vest_detected else 'No',
                'No Safety Vest': 'Yes' if detection.no_safety_vest_detected else 'No'
            })

        # Create DataFrame
        df = pd.DataFrame(data)

        # Create buffer or file
        if output_path:
            df.to_csv(output_path, index=False)
            return None
        else:
            buffer = io.StringIO()
            df.to_csv(buffer, index=False)
            buffer.seek(0)

            # Convert to BytesIO
            bytes_buffer = io.BytesIO(buffer.getvalue().encode('utf-8'))
            bytes_buffer.seek(0)
            return bytes_buffer

    def generate_template(self, template_type: str) -> io.BytesIO:
        """Generate downloadable report template"""

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []

        # Title
        title_map = {
            "executive_summary": "Executive Summary Template",
            "detailed_violations": "Detailed Violations Template",
            "compliance_certificate": "Compliance Certificate Template",
            "audit_report": "Audit Report Template"
        }

        title = title_map.get(template_type, "Report Template")
        elements.append(Paragraph(title, self.styles['CustomTitle']))
        elements.append(Spacer(1, 20))

        # Template content
        if template_type == "executive_summary":
            elements.append(Paragraph("Company Name: _______________________", self.styles['Normal']))
            elements.append(Spacer(1, 12))
            elements.append(Paragraph("Report Period: _______________________", self.styles['Normal']))
            elements.append(Spacer(1, 12))
            elements.append(Paragraph("Prepared By: _______________________", self.styles['Normal']))
            elements.append(Spacer(1, 20))

            elements.append(Paragraph("Key Metrics", self.styles['CustomHeading']))
            elements.append(Paragraph("• Overall Compliance Rate: ______%", self.styles['Normal']))
            elements.append(Paragraph("• Total Detections: ______", self.styles['Normal']))
            elements.append(Paragraph("• Violations Detected: ______", self.styles['Normal']))
            elements.append(Spacer(1, 20))

            elements.append(Paragraph("Summary", self.styles['CustomHeading']))
            elements.append(Paragraph("_" * 80, self.styles['Normal']))
            elements.append(Paragraph("_" * 80, self.styles['Normal']))
            elements.append(Paragraph("_" * 80, self.styles['Normal']))

        elif template_type == "compliance_certificate":
            elements.append(Spacer(1, 40))
            elements.append(Paragraph("This is to certify that", self.styles['Normal']))
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("_______________________", self.styles['CustomHeading']))
            elements.append(Paragraph("Company Name", self.styles['Normal']))
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("has achieved a compliance rate of", self.styles['Normal']))
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("_______%", self.styles['CustomHeading']))
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("for the period: _______________________", self.styles['Normal']))
            elements.append(Spacer(1, 40))
            elements.append(Paragraph("Authorized Signature: _______________________", self.styles['Normal']))
            elements.append(Spacer(1, 12))
            elements.append(Paragraph("Date: _______________________", self.styles['Normal']))

        else:
            elements.append(Paragraph("Template Instructions", self.styles['CustomHeading']))
            elements.append(Paragraph("Fill in the following sections:", self.styles['Normal']))
            elements.append(Spacer(1, 12))
            elements.append(Paragraph("1. Executive Summary", self.styles['Normal']))
            elements.append(Paragraph("2. Methodology", self.styles['Normal']))
            elements.append(Paragraph("3. Findings", self.styles['Normal']))
            elements.append(Paragraph("4. Recommendations", self.styles['Normal']))
            elements.append(Paragraph("5. Conclusion", self.styles['Normal']))

        doc.build(elements)
        buffer.seek(0)
        return buffer
