"""
QR Code Generation Service for Worker Identification

Generates QR codes for worker account numbers and saves them as images.
"""

import qrcode
import os
from pathlib import Path
import logging

logger = logging.getLogger("ppe_compliance.qr_service")


class QRCodeService:
    """Service for generating and managing QR codes for workers"""

    def __init__(self, qr_dir: str = "./uploads/qr_codes"):
        """
        Initialize QR code service

        Args:
            qr_dir: Directory to store QR code images
        """
        self.qr_dir = Path(qr_dir)
        self.qr_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"QR Code service initialized. QR codes will be saved to: {self.qr_dir}")

    def generate_qr_code(self, account_number: str) -> str:
        """
        Generate QR code for a worker's account number

        Args:
            account_number: Worker's unique account number (e.g., TUPM-22-001)

        Returns:
            str: Path to the generated QR code image
        """
        try:
            # Create QR code instance
            qr = qrcode.QRCode(
                version=1,  # Controls size (1 is smallest, 40 is largest)
                error_correction=qrcode.constants.ERROR_CORRECT_H,  # High error correction
                box_size=10,  # Size of each box in pixels
                border=4,  # Border size in boxes
            )

            # Add data to QR code
            qr.add_data(account_number)
            qr.make(fit=True)

            # Create an image from the QR code
            img = qr.make_image(fill_color="black", back_color="white")

            # Save the image
            filename = f"qr_{account_number.replace('-', '_')}.png"
            file_path = self.qr_dir / filename
            img.save(str(file_path))

            logger.info(f"✓ QR code generated for {account_number}: {file_path}")

            # Return relative path for storage in database
            return str(file_path)

        except Exception as e:
            logger.error(f"✗ Failed to generate QR code for {account_number}: {e}")
            raise

    def delete_qr_code(self, qr_code_path: str) -> bool:
        """
        Delete a QR code image file

        Args:
            qr_code_path: Path to the QR code image

        Returns:
            bool: True if deleted successfully, False otherwise
        """
        try:
            if os.path.exists(qr_code_path):
                os.remove(qr_code_path)
                logger.info(f"✓ QR code deleted: {qr_code_path}")
                return True
            else:
                logger.warning(f"QR code file not found: {qr_code_path}")
                return False
        except Exception as e:
            logger.error(f"✗ Failed to delete QR code {qr_code_path}: {e}")
            return False

    def get_qr_code_url(self, qr_code_path: str) -> str:
        """
        Convert file path to URL for frontend access

        Args:
            qr_code_path: File path to QR code

        Returns:
            str: URL path for accessing the QR code
        """
        if not qr_code_path:
            return ""

        # Convert absolute path to relative URL
        # e.g., ./uploads/qr_codes/qr_TUPM_22_001.png -> /uploads/qr_codes/qr_TUPM_22_001.png
        path = Path(qr_code_path)
        if "uploads" in str(path):
            parts = str(path).split("uploads")
            return f"/uploads{parts[-1]}".replace("\\", "/")
        return ""


# Global instance
_qr_service = None


def get_qr_service() -> QRCodeService:
    """Get the global QR code service instance"""
    global _qr_service
    if _qr_service is None:
        _qr_service = QRCodeService()
    return _qr_service
