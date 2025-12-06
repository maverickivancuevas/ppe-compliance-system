from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from typing import List
from ..core.config import settings
from ..core.logger import get_logger

logger = get_logger(__name__)


class SendGridService:
    """Service for sending emails via SendGrid API"""

    def __init__(self):
        self.api_key = settings.SENDGRID_API_KEY
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME

    def is_configured(self) -> bool:
        """Check if SendGrid is properly configured"""
        return bool(self.api_key and self.api_key != "")

    def send_email(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
        """
        Send an email via SendGrid

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email body
            text_content: Plain text email body (optional)

        Returns:
            True if email sent successfully, False otherwise
        """
        if not self.is_configured():
            logger.warning("SendGrid is not configured")
            return False

        try:
            # Create message
            from_email_obj = Email(self.from_email, self.from_name)
            to_email_obj = To(to_email)

            # Use HTML content as primary, fallback to text if provided
            content = Content("text/html", html_content)

            message = Mail(
                from_email=from_email_obj,
                to_emails=to_email_obj,
                subject=subject,
                html_content=html_content
            )

            # Send email
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)

            if response.status_code == 202:
                logger.info(f"SendGrid email sent successfully to {to_email}")
                return True
            else:
                logger.warning(f"SendGrid returned status {response.status_code} for {to_email}")
                return False

        except Exception as e:
            logger.error(f"SendGrid error sending to {to_email}: {e}")
            return False

    def send_bulk_email(self, to_emails: List[str], subject: str, html_content: str, text_content: str = None) -> bool:
        """
        Send email to multiple recipients

        Args:
            to_emails: List of recipient email addresses
            subject: Email subject
            html_content: HTML email body
            text_content: Plain text email body (optional)

        Returns:
            True if all emails sent successfully, False otherwise
        """
        if not to_emails:
            logger.warning("No recipients provided for bulk email")
            return False

        success = True
        for email in to_emails:
            if not self.send_email(email, subject, html_content, text_content):
                success = False

        return success


# Global instance (singleton)
_sendgrid_service = None


def get_sendgrid_service() -> SendGridService:
    """Get or create SendGrid service instance"""
    global _sendgrid_service
    if _sendgrid_service is None:
        _sendgrid_service = SendGridService()
    return _sendgrid_service
