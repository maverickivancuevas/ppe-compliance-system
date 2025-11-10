import asyncio
from datetime import datetime, timedelta
from sqlalchemy import and_
from ..core.database import SessionLocal
from ..core.logger import get_logger
from ..models.detection import DetectionEvent
from ..core.timezone import get_philippine_time_naive

logger = get_logger(__name__)


class ArchivingService:
    """Service for auto-archiving old detection events"""

    def __init__(self, archive_days: int = 30):
        """
        Initialize archiving service

        Args:
            archive_days: Number of days after which detections are archived
        """
        self.archive_days = archive_days
        self.running = False
        self.task = None

    async def archive_old_detections(self) -> int:
        """
        Archive detection events older than specified days

        Returns:
            Number of detections archived
        """
        db = SessionLocal()
        try:
            # Calculate cutoff date
            cutoff_date = get_philippine_time_naive() - timedelta(days=self.archive_days)

            # Find detections older than cutoff that aren't already archived
            old_detections = db.query(DetectionEvent).filter(
                and_(
                    DetectionEvent.timestamp < cutoff_date,
                    DetectionEvent.archived == False
                )
            ).all()

            # Archive detections
            archived_count = 0
            for detection in old_detections:
                detection.archived = True
                detection.archived_at = get_philippine_time_naive()
                archived_count += 1

            db.commit()

            if archived_count > 0:
                logger.info(f"Archived {archived_count} detection events older than {self.archive_days} days")
            else:
                logger.debug(f"No detections to archive (cutoff: {cutoff_date})")

            return archived_count

        except Exception as e:
            logger.error(f"Error archiving old detections: {e}")
            db.rollback()
            return 0
        finally:
            db.close()

    async def run_periodic_archiving(self, interval_hours: int = 24):
        """
        Run archiving task periodically

        Args:
            interval_hours: Hours between archiving runs
        """
        self.running = True
        logger.info(f"Started automatic archiving service (every {interval_hours} hours, archive after {self.archive_days} days)")

        while self.running:
            try:
                # Run archiving
                await self.archive_old_detections()

                # Wait for next interval
                await asyncio.sleep(interval_hours * 3600)

            except asyncio.CancelledError:
                logger.info("Archiving service cancelled")
                break
            except Exception as e:
                logger.error(f"Error in periodic archiving: {e}")
                # Wait a bit before retrying
                await asyncio.sleep(300)  # 5 minutes

    def start_background_task(self, interval_hours: int = 24):
        """Start archiving as a background task"""
        if self.task is None or self.task.done():
            self.task = asyncio.create_task(self.run_periodic_archiving(interval_hours))
            logger.info("Archiving background task started")
        else:
            logger.warning("Archiving background task is already running")

    def stop_background_task(self):
        """Stop the archiving background task"""
        self.running = False
        if self.task and not self.task.done():
            self.task.cancel()
            logger.info("Archiving background task stopped")


# Global instance (singleton)
_archiving_service = None


def get_archiving_service(archive_days: int = 30) -> ArchivingService:
    """Get or create archiving service instance"""
    global _archiving_service
    if _archiving_service is None:
        _archiving_service = ArchivingService(archive_days=archive_days)
    return _archiving_service
