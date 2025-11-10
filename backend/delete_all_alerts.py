"""
Script to delete all alerts from the database
"""
import sqlite3

# Connect to the database
db_path = "ppe_compliance.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 80)
print("DELETING ALL ALERTS")
print("=" * 80)

# Count alerts before deletion
cursor.execute("SELECT COUNT(*) FROM alerts")
total_before = cursor.fetchone()[0]
print(f"\nAlerts before deletion: {total_before}")

if total_before > 0:
    # Delete all alerts
    cursor.execute("DELETE FROM alerts")
    conn.commit()

    # Verify deletion
    cursor.execute("SELECT COUNT(*) FROM alerts")
    total_after = cursor.fetchone()[0]

    print(f"Alerts after deletion: {total_after}")
    print(f"\n✅ Successfully deleted {total_before} alerts!")
else:
    print("\n⚠️  No alerts to delete")

print("=" * 80)

conn.close()
