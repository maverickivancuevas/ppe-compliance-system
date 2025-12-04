import secrets
import string
from datetime import datetime, timedelta
from typing import Optional, Dict
from ..core.logger import get_logger

logger = get_logger(__name__)


class OTPService:
    """Service for generating and managing OTPs"""

    def __init__(self):
        # In-memory storage for OTPs (email -> {otp, expires_at})
        # In production, use Redis or database
        self._otps: Dict[str, Dict] = {}
        self.otp_length = 6
        self.otp_validity_minutes = 10

    def generate_otp(self, email: str) -> str:
        """
        Generate a new OTP for the given email

        Args:
            email: Email address to generate OTP for

        Returns:
            Generated OTP code
        """
        # Generate random 6-digit OTP
        otp = ''.join(secrets.choice(string.digits) for _ in range(self.otp_length))

        # Store OTP with expiration time
        expires_at = datetime.utcnow() + timedelta(minutes=self.otp_validity_minutes)
        self._otps[email.lower()] = {
            'otp': otp,
            'expires_at': expires_at,
            'attempts': 0
        }

        logger.info(f"Generated OTP for {email} (expires at {expires_at})")
        return otp

    def verify_otp(self, email: str, otp: str) -> bool:
        """
        Verify an OTP for the given email

        Args:
            email: Email address
            otp: OTP code to verify

        Returns:
            True if OTP is valid, False otherwise
        """
        email_lower = email.lower()

        if email_lower not in self._otps:
            logger.warning(f"No OTP found for {email}")
            return False

        otp_data = self._otps[email_lower]

        # Check if OTP has expired
        if datetime.utcnow() > otp_data['expires_at']:
            logger.warning(f"OTP expired for {email}")
            del self._otps[email_lower]
            return False

        # Increment attempts
        otp_data['attempts'] += 1

        # Check max attempts (prevent brute force)
        if otp_data['attempts'] > 5:
            logger.warning(f"Too many OTP attempts for {email}")
            del self._otps[email_lower]
            return False

        # Verify OTP
        if otp_data['otp'] == otp:
            logger.info(f"OTP verified successfully for {email}")
            # DON'T delete OTP here - it will be needed for final registration
            # It will be deleted after registration or expire naturally
            return True

        logger.warning(f"Invalid OTP for {email}")
        return False

    def clear_otp(self, email: str):
        """Clear OTP for the given email"""
        email_lower = email.lower()
        if email_lower in self._otps:
            del self._otps[email_lower]
            logger.info(f"Cleared OTP for {email}")

    def cleanup_expired(self):
        """Remove expired OTPs"""
        now = datetime.utcnow()
        expired = [email for email, data in self._otps.items()
                   if now > data['expires_at']]

        for email in expired:
            del self._otps[email]

        if expired:
            logger.info(f"Cleaned up {len(expired)} expired OTPs")


# Global instance (singleton)
_otp_service = None


def get_otp_service() -> OTPService:
    """Get or create OTP service instance"""
    global _otp_service
    if _otp_service is None:
        _otp_service = OTPService()
    return _otp_service
