"""
Script to reset all detections, alerts, and incidents for fresh start
"""
import sqlite3
import sys
import io

# Fix encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Connect to the database
db_path = "ppe_compliance.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 80)
print("RESETTING DATABASE - DELETING ALL DETECTIONS, ALERTS, AND INCIDENTS")
print("=" * 80)

# Count before deletion
cursor.execute("SELECT COUNT(*) FROM incidents")
total_incidents = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM alerts")
total_alerts = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM detection_events")
total_detections = cursor.fetchone()[0]

print(f"\nBefore deletion:")
print(f"  Incidents: {total_incidents}")
print(f"  Alerts: {total_alerts}")
print(f"  Detection Events: {total_detections}")

# Delete in order (respecting foreign key dependencies)
cursor.execute("DELETE FROM incidents")
print(f"\n  Deleted {total_incidents} incidents")

cursor.execute("DELETE FROM alerts")
print(f"  Deleted {total_alerts} alerts")

cursor.execute("DELETE FROM detection_events")
print(f"  Deleted {total_detections} detection events")

conn.commit()

# Verify deletion
cursor.execute("SELECT COUNT(*) FROM incidents")
incidents_after = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM alerts")
alerts_after = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM detection_events")
detections_after = cursor.fetchone()[0]

print(f"\nAfter deletion:")
print(f"  Incidents: {incidents_after}")
print(f"  Alerts: {alerts_after}")
print(f"  Detection Events: {detections_after}")

print("\n" + "=" * 80)
print(" DATABASE RESET COMPLETE!")
print(" System ready for fresh testing - no track IDs, 10-second cooldown active")
print("=" * 80)

conn.close()
