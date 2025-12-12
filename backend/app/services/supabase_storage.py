"""Supabase Storage Service for persistent file storage"""
import os
from pathlib import Path
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)


class SupabaseStorageService:
    """Service for uploading and managing files in Supabase Storage"""

    def __init__(self):
        # Get Supabase credentials from environment
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")

        if not supabase_url or not supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_KEY must be set in environment variables"
            )

        self.client: Client = create_client(supabase_url, supabase_key)
        logger.info("Supabase Storage Service initialized")

    def upload_file(
        self,
        bucket_name: str,
        file_path: str,
        file_data: bytes,
        content_type: str = "image/jpeg",
    ) -> str:
        """
        Upload a file to Supabase Storage

        Args:
            bucket_name: Name of the storage bucket (e.g., 'violations', 'logos')
            file_path: Path within the bucket (e.g., 'camera123/violation_123.jpg')
            file_data: Binary file data
            content_type: MIME type of the file

        Returns:
            Public URL of the uploaded file

        Raises:
            Exception: If upload fails
        """
        try:
            # Upload file to Supabase Storage
            response = self.client.storage.from_(bucket_name).upload(
                path=file_path,
                file=file_data,
                file_options={"content-type": content_type, "upsert": "true"},
            )

            # Get public URL
            public_url = self.client.storage.from_(bucket_name).get_public_url(
                file_path
            )

            logger.info(f"File uploaded successfully to {bucket_name}/{file_path}")
            return public_url

        except Exception as e:
            logger.error(f"Failed to upload file to Supabase Storage: {e}")
            raise

    def delete_file(self, bucket_name: str, file_path: str) -> bool:
        """
        Delete a file from Supabase Storage

        Args:
            bucket_name: Name of the storage bucket
            file_path: Path within the bucket

        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            self.client.storage.from_(bucket_name).remove([file_path])
            logger.info(f"File deleted successfully from {bucket_name}/{file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file from Supabase Storage: {e}")
            return False

    def get_public_url(self, bucket_name: str, file_path: str) -> str:
        """
        Get the public URL for a file in Supabase Storage

        Args:
            bucket_name: Name of the storage bucket
            file_path: Path within the bucket

        Returns:
            Public URL of the file
        """
        return self.client.storage.from_(bucket_name).get_public_url(file_path)

    def list_files(self, bucket_name: str, folder_path: str = "") -> list:
        """
        List files in a bucket/folder

        Args:
            bucket_name: Name of the storage bucket
            folder_path: Optional folder path within the bucket

        Returns:
            List of files in the bucket/folder
        """
        try:
            response = self.client.storage.from_(bucket_name).list(folder_path)
            return response
        except Exception as e:
            logger.error(f"Failed to list files from Supabase Storage: {e}")
            return []


# Singleton instance
_storage_service: Optional[SupabaseStorageService] = None


def get_storage_service() -> SupabaseStorageService:
    """Get or create Supabase Storage Service singleton"""
    global _storage_service
    if _storage_service is None:
        _storage_service = SupabaseStorageService()
    return _storage_service
