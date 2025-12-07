"""Initialize PostgreSQL database with all tables"""
from app.core.database import Base, engine
from app.core.logger import get_logger

# Import all models to register them with Base.metadata
from app.models.user import User
from app.models.camera import Camera
from app.models.detection import DetectionEvent
from app.models.alert import Alert
from app.models.worker import Worker
from app.models.settings import SystemSettings

logger = get_logger(__name__)

if __name__ == "__main__":
    print("Initializing PostgreSQL database...")
    print(f"Database URL: {str(engine.url).replace(engine.url.password or '', '***')}")

    # Create all tables
    Base.metadata.create_all(bind=engine)

    print("Database initialized successfully!")
    print("\nTables created:")
    for table in Base.metadata.sorted_tables:
        print(f"  - {table.name}")

    print("\nYou can now:")
    print("1. Start the backend: python -m uvicorn app.main:app --reload")
    print("2. Register your first user (will become super_admin)")
    print("3. Deploy to Render with DATABASE_URL environment variable")
