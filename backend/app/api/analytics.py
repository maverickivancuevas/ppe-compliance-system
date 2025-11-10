from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, extract
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from ..core.database import get_db
from ..core.security import get_current_user
from ..core.timezone import get_philippine_time_naive
from ..models.user import User
from ..models.detection import DetectionEvent
from ..models.camera import Camera
from ..models.alert import Alert

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/compliance-trend")
def get_compliance_trend(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get daily compliance trend for the past 30 days (or custom date range).
    Returns: [{date, compliance_rate, total_detections, compliant, violations}]
    """

    # Default to last 30 days if no dates provided
    if not end_date:
        end_dt = get_philippine_time_naive()
    else:
        end_dt = datetime.fromisoformat(end_date.replace('Z', ''))
        # Set to end of day to include the entire end date
        end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)

    if not start_date:
        start_dt = end_dt - timedelta(days=30)
    else:
        start_dt = datetime.fromisoformat(start_date.replace('Z', ''))

    # Set start to beginning of day
    start_dt = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)

    # Build filter conditions
    filter_conditions = [
        DetectionEvent.timestamp >= start_dt,
        DetectionEvent.timestamp <= end_dt,
        DetectionEvent.person_detected == True
    ]

    # Add camera filter if specified
    if camera_id:
        filter_conditions.append(DetectionEvent.camera_id == camera_id)

    # Query detections grouped by date
    results = db.query(
        func.date(DetectionEvent.timestamp).label('date'),
        func.count(DetectionEvent.id).label('total_detections'),
        func.sum(case((DetectionEvent.is_compliant == True, 1), else_=0)).label('compliant'),
        func.sum(case((DetectionEvent.is_compliant == False, 1), else_=0)).label('violations')
    ).filter(
        and_(*filter_conditions)
    ).group_by(
        func.date(DetectionEvent.timestamp)
    ).order_by(
        func.date(DetectionEvent.timestamp)
    ).all()

    # Format results
    trend_data = []
    for row in results:
        total = row.total_detections or 0
        compliant = row.compliant or 0
        violations = row.violations or 0
        compliance_rate = (compliant / total * 100) if total > 0 else 0

        trend_data.append({
            "date": str(row.date) if row.date else None,
            "compliance_rate": round(compliance_rate, 2),
            "total_detections": total,
            "compliant": compliant,
            "violations": violations
        })

    return trend_data


@router.get("/violations-by-camera")
def get_violations_by_camera(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get total violations grouped by camera.
    Returns: [{camera_id, camera_name, location, total_violations}]
    """

    # Default to last 30 days if no dates provided
    if not end_date:
        end_dt = get_philippine_time_naive()
    else:
        end_dt = datetime.fromisoformat(end_date.replace('Z', ''))
        # Set to end of day to include the entire end date
        end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)

    if not start_date:
        start_dt = end_dt - timedelta(days=30)
    else:
        start_dt = datetime.fromisoformat(start_date.replace('Z', ''))

    # Set start to beginning of day
    start_dt = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)

    # Build filter conditions
    filter_conditions = [
        DetectionEvent.timestamp >= start_dt,
        DetectionEvent.timestamp <= end_dt,
        DetectionEvent.person_detected == True,
        DetectionEvent.is_compliant == False
    ]

    # Add camera filter if specified
    if camera_id:
        filter_conditions.append(DetectionEvent.camera_id == camera_id)

    # Query violations grouped by camera
    results = db.query(
        Camera.id,
        Camera.name,
        Camera.location,
        func.count(DetectionEvent.id).label('total_violations')
    ).join(
        DetectionEvent, Camera.id == DetectionEvent.camera_id
    ).filter(
        and_(*filter_conditions)
    ).group_by(
        Camera.id, Camera.name, Camera.location
    ).order_by(
        func.count(DetectionEvent.id).desc()
    ).all()

    # Format results
    violations_data = []
    for row in results:
        violations_data.append({
            "camera_id": row.id,
            "camera_name": row.name,
            "location": row.location,
            "total_violations": row.total_violations
        })

    return violations_data


@router.get("/violation-types")
def get_violation_types(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get violation breakdown by PPE type.
    Returns: [{ppe_type, count, percentage}]
    """

    # Default to last 30 days if no dates provided
    if not end_date:
        end_dt = get_philippine_time_naive()
    else:
        end_dt = datetime.fromisoformat(end_date.replace('Z', ''))
        # Set to end of day to include the entire end date
        end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)

    if not start_date:
        start_dt = end_dt - timedelta(days=30)
    else:
        start_dt = datetime.fromisoformat(start_date.replace('Z', ''))

    # Set start to beginning of day
    start_dt = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)

    # Build query
    query = db.query(DetectionEvent).filter(
        and_(
            DetectionEvent.timestamp >= start_dt,
            DetectionEvent.timestamp <= end_dt,
            DetectionEvent.person_detected == True,
            DetectionEvent.is_compliant == False
        )
    )

    # Add camera filter if specified
    if camera_id:
        query = query.filter(DetectionEvent.camera_id == camera_id)

    detections = query.all()

    # Count violations by type
    violation_counts = {
        "No Hardhat": 0,
        "No Safety Vest": 0,
        "Both Missing": 0
    }

    for detection in detections:
        no_hardhat = detection.no_hardhat_detected
        no_vest = detection.no_safety_vest_detected

        if no_hardhat and no_vest:
            violation_counts["Both Missing"] += 1
        elif no_hardhat:
            violation_counts["No Hardhat"] += 1
        elif no_vest:
            violation_counts["No Safety Vest"] += 1

    # Calculate total and percentages
    total_violations = sum(violation_counts.values())

    violation_data = []
    for ppe_type, count in violation_counts.items():
        if count > 0:  # Only include types with violations
            percentage = (count / total_violations * 100) if total_violations > 0 else 0
            violation_data.append({
                "ppe_type": ppe_type,
                "count": count,
                "percentage": round(percentage, 2)
            })

    return violation_data


@router.get("/summary")
def get_analytics_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get overall analytics summary including week-over-week comparison.
    Returns: {total_detections, compliance_rate, total_violations, improvement_percentage}
    """

    # Default to last 7 days if no dates provided
    if not end_date:
        end_dt = get_philippine_time_naive()
    else:
        end_dt = datetime.fromisoformat(end_date.replace('Z', ''))
        # Set to end of day to include the entire end date
        end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)

    if not start_date:
        start_dt = end_dt - timedelta(days=7)
    else:
        start_dt = datetime.fromisoformat(start_date.replace('Z', ''))

    # Set start to beginning of day
    start_dt = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)

    # Build filter conditions for current period
    current_filter_conditions = [
        DetectionEvent.timestamp >= start_dt,
        DetectionEvent.timestamp <= end_dt,
        DetectionEvent.person_detected == True
    ]

    # Add camera filter if specified
    if camera_id:
        current_filter_conditions.append(DetectionEvent.camera_id == camera_id)

    # Current period stats
    current_stats = db.query(
        func.count(DetectionEvent.id).label('total'),
        func.sum(case((DetectionEvent.is_compliant == True, 1), else_=0)).label('compliant'),
        func.sum(case((DetectionEvent.is_compliant == False, 1), else_=0)).label('violations')
    ).filter(
        and_(*current_filter_conditions)
    ).first()

    total = current_stats.total or 0
    compliant = current_stats.compliant or 0
    violations = current_stats.violations or 0
    compliance_rate = (compliant / total * 100) if total > 0 else 0

    # Previous period stats (same duration, shifted back)
    period_duration = (end_dt - start_dt).days
    prev_start = start_dt - timedelta(days=period_duration)
    prev_end = start_dt

    # Build filter conditions for previous period
    prev_filter_conditions = [
        DetectionEvent.timestamp >= prev_start,
        DetectionEvent.timestamp < prev_end,
        DetectionEvent.person_detected == True
    ]

    # Add camera filter if specified
    if camera_id:
        prev_filter_conditions.append(DetectionEvent.camera_id == camera_id)

    prev_stats = db.query(
        func.count(DetectionEvent.id).label('total'),
        func.sum(case((DetectionEvent.is_compliant == True, 1), else_=0)).label('compliant')
    ).filter(
        and_(*prev_filter_conditions)
    ).first()

    prev_total = prev_stats.total or 0
    prev_compliant = prev_stats.compliant or 0
    prev_compliance_rate = (prev_compliant / prev_total * 100) if prev_total > 0 else 0

    # Calculate improvement
    improvement = compliance_rate - prev_compliance_rate

    return {
        "total_detections": total,
        "compliant_count": compliant,
        "violation_count": violations,
        "compliance_rate": round(compliance_rate, 2),
        "previous_compliance_rate": round(prev_compliance_rate, 2),
        "improvement_percentage": round(improvement, 2),
        "period_start": start_dt.isoformat(),
        "period_end": end_dt.isoformat()
    }


@router.get("/heatmap")
def get_violation_heatmap(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get violation heatmap data by camera location and time.
    Returns: [{camera_id, camera_name, location, violations_by_hour: [{hour, count}]}]
    """

    # Default to last 7 days if no dates provided
    if not end_date:
        end_dt = get_philippine_time_naive()
    else:
        end_dt = datetime.fromisoformat(end_date.replace('Z', ''))
        # Set to end of day to include the entire end date
        end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)

    if not start_date:
        start_dt = end_dt - timedelta(days=7)
    else:
        start_dt = datetime.fromisoformat(start_date.replace('Z', ''))

    # Set start to beginning of day
    start_dt = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)

    # Build filter conditions
    filter_conditions = [
        DetectionEvent.timestamp >= start_dt,
        DetectionEvent.timestamp <= end_dt,
        DetectionEvent.person_detected == True,
        DetectionEvent.is_compliant == False
    ]

    # Add camera filter if specified
    if camera_id:
        filter_conditions.append(DetectionEvent.camera_id == camera_id)

    # Query violations grouped by camera and hour
    results = db.query(
        Camera.id,
        Camera.name,
        Camera.location,
        extract('hour', DetectionEvent.timestamp).label('hour'),
        func.count(DetectionEvent.id).label('violation_count')
    ).join(
        DetectionEvent, Camera.id == DetectionEvent.camera_id
    ).filter(
        and_(*filter_conditions)
    ).group_by(
        Camera.id,
        Camera.name,
        Camera.location,
        extract('hour', DetectionEvent.timestamp)
    ).all()

    # Group by camera
    heatmap_data: Dict[str, Any] = {}
    for row in results:
        camera_id = row.id
        if camera_id not in heatmap_data:
            heatmap_data[camera_id] = {
                "camera_id": camera_id,
                "camera_name": row.name,
                "location": row.location,
                "total_violations": 0,
                "violations_by_hour": {str(i): 0 for i in range(24)}
            }

        hour = str(int(row.hour))
        heatmap_data[camera_id]["violations_by_hour"][hour] = row.violation_count
        heatmap_data[camera_id]["total_violations"] += row.violation_count

    return list(heatmap_data.values())


@router.get("/shift-analytics")
def get_shift_analytics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get analytics broken down by shift (day/night).
    Day shift: 6:00 AM - 6:00 PM
    Night shift: 6:00 PM - 6:00 AM
    Returns: {day_shift: {...}, night_shift: {...}}
    """

    # Default to last 30 days if no dates provided
    if not end_date:
        end_dt = get_philippine_time_naive()
    else:
        end_dt = datetime.fromisoformat(end_date.replace('Z', ''))
        # Set to end of day to include the entire end date
        end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)

    if not start_date:
        start_dt = end_dt - timedelta(days=30)
    else:
        start_dt = datetime.fromisoformat(start_date.replace('Z', ''))

    # Set start to beginning of day
    start_dt = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)

    # Build base query
    base_query = db.query(DetectionEvent).filter(
        and_(
            DetectionEvent.timestamp >= start_dt,
            DetectionEvent.timestamp <= end_dt,
            DetectionEvent.person_detected == True
        )
    )

    # Add camera filter if specified
    if camera_id:
        base_query = base_query.filter(DetectionEvent.camera_id == camera_id)

    all_detections = base_query.all()

    # Separate by shift
    day_shift_detections = []
    night_shift_detections = []

    for detection in all_detections:
        hour = detection.timestamp.hour
        # Day shift: 6 AM to 6 PM (6-17 inclusive)
        if 6 <= hour < 18:
            day_shift_detections.append(detection)
        else:
            night_shift_detections.append(detection)

    def calculate_shift_stats(detections):
        total = len(detections)
        compliant = sum(1 for d in detections if d.is_compliant)
        violations = sum(1 for d in detections if not d.is_compliant)
        compliance_rate = (compliant / total * 100) if total > 0 else 0

        # Count violation types
        violation_types = {
            "No Hardhat": 0,
            "No Safety Vest": 0,
            "Both Missing": 0
        }

        for d in detections:
            if not d.is_compliant:
                if d.no_hardhat_detected and d.no_safety_vest_detected:
                    violation_types["Both Missing"] += 1
                elif d.no_hardhat_detected:
                    violation_types["No Hardhat"] += 1
                elif d.no_safety_vest_detected:
                    violation_types["No Safety Vest"] += 1

        return {
            "total_detections": total,
            "compliant_count": compliant,
            "violation_count": violations,
            "compliance_rate": round(compliance_rate, 2),
            "violation_types": violation_types
        }

    day_stats = calculate_shift_stats(day_shift_detections)
    night_stats = calculate_shift_stats(night_shift_detections)

    return {
        "day_shift": {
            "name": "Day Shift",
            "time_range": "6:00 AM - 6:00 PM",
            **day_stats
        },
        "night_shift": {
            "name": "Night Shift",
            "time_range": "6:00 PM - 6:00 AM",
            **night_stats
        },
        "comparison": {
            "compliance_difference": round(day_stats["compliance_rate"] - night_stats["compliance_rate"], 2),
            "better_shift": "day" if day_stats["compliance_rate"] > night_stats["compliance_rate"] else "night"
        }
    }
