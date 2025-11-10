"""
Quick script to check database contents
"""
import sqlite3
from datetime import datetime
import sys
import io

# Fix encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Connect to the database
db_path = "ppe_compliance.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 80)
print("DATABASE INSPECTION REPORT")
print("=" * 80)
print()

# Check Detection Events
print("📊 DETECTION EVENTS:")
print("-" * 80)
cursor.execute("SELECT COUNT(*) FROM detection_events")
total_detections = cursor.fetchone()[0]
print(f"Total Detection Events: {total_detections}")

if total_detections > 0:
    cursor.execute("""
        SELECT
            id,
            camera_id,
            timestamp,
            person_detected,
            is_compliant,
            violation_type,
            no_hardhat_detected,
            no_safety_vest_detected
        FROM detection_events
        ORDER BY timestamp DESC
        LIMIT 10
    """)

    print("\nLast 10 Detections:")
    print("-" * 80)
    for row in cursor.fetchall():
        det_id, cam_id, ts, person, compliant, vtype, no_hat, no_vest = row
        status = "✅ COMPLIANT" if compliant else "❌ VIOLATION"
        print(f"  ID: {det_id[:8]}...")
        print(f"  Camera: {cam_id[:8]}...")
        print(f"  Time: {ts}")
        print(f"  Status: {status}")
        if not compliant:
            print(f"  Violation: {vtype}")
            print(f"  No Hardhat: {no_hat}, No Safety Vest: {no_vest}")
        print()
else:
    print("  ⚠️  No detections found in database!")
    print("  💡 Go to Live Monitoring and click 'Save Detection to Database' button")

print()

# Check Alerts
print("🚨 ALERTS:")
print("-" * 80)
cursor.execute("SELECT COUNT(*) FROM alerts")
total_alerts = cursor.fetchone()[0]
print(f"Total Alerts: {total_alerts}")

cursor.execute("SELECT COUNT(*) FROM alerts WHERE acknowledged = 0")
unack_alerts = cursor.fetchone()[0]
print(f"Unacknowledged Alerts: {unack_alerts}")
print(f"Acknowledged Alerts: {total_alerts - unack_alerts}")

if total_alerts > 0:
    cursor.execute("""
        SELECT
            id,
            message,
            severity,
            acknowledged,
            created_at
        FROM alerts
        ORDER BY created_at DESC
        LIMIT 5
    """)

    print("\nLast 5 Alerts:")
    print("-" * 80)
    for row in cursor.fetchall():
        alert_id, msg, severity, ack, created = row
        ack_status = "✓ Acknowledged" if ack else "⏳ Pending"
        print(f"  [{severity.upper()}] {msg}")
        print(f"  Status: {ack_status}")
        print(f"  Created: {created}")
        print()
else:
    print("  ℹ️  No alerts found")

print()

# Check Cameras
print("📷 CAMERAS:")
print("-" * 80)
cursor.execute("SELECT id, name, location, status FROM cameras")
cameras = cursor.fetchall()
print(f"Total Cameras: {len(cameras)}")
if cameras:
    for cam_id, name, loc, status in cameras:
        print(f"  • {name} ({loc}) - Status: {status}")
else:
    print("  ⚠️  No cameras found")

print()

# Summary for Analytics
print("📈 ANALYTICS SUMMARY:")
print("-" * 80)
cursor.execute("""
    SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_compliant = 1 THEN 1 ELSE 0 END) as compliant,
        SUM(CASE WHEN is_compliant = 0 THEN 1 ELSE 0 END) as violations
    FROM detection_events
    WHERE person_detected = 1
""")
row = cursor.fetchone()
if row and row[0] > 0:
    total, compliant, violations = row
    compliance_rate = (compliant / total * 100) if total > 0 else 0
    print(f"  Total Detections (with person): {total}")
    print(f"  Compliant: {compliant}")
    print(f"  Violations: {violations}")
    print(f"  Compliance Rate: {compliance_rate:.1f}%")
else:
    print("  No detection data available for analytics")

print()
print("=" * 80)
print("TIP: Save detections from Live Monitoring to see them here!")
print("=" * 80)

conn.close()
