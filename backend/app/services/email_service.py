import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from typing import List, Optional
from pathlib import Path
from datetime import datetime
from ..core.config import settings
from ..core.logger import get_logger
from .sendgrid_service import get_sendgrid_service

logger = get_logger(__name__)


class EmailService:
    """Service for sending email notifications (uses SendGrid or SMTP fallback)"""

    def __init__(self):
        # Initialize SendGrid service
        self.sendgrid = get_sendgrid_service()

        # SMTP fallback settings
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
        self.enabled = settings.EMAIL_ENABLED

    def is_configured(self) -> bool:
        """Check if email service is properly configured (SendGrid or SMTP)"""
        return self.sendgrid.is_configured() or (self.enabled and bool(self.smtp_user) and bool(self.smtp_password))

    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        attachments: Optional[List[Path]] = None
    ) -> bool:
        """
        Send an email

        Args:
            to_emails: List of recipient email addresses
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body (fallback)
            attachments: List of file paths to attach

        Returns:
            True if email sent successfully, False otherwise
        """
        if not self.is_configured():
            logger.warning("Email service is not configured. Skipping email send.")
            return False

        # Try SendGrid first (preferred)
        if self.sendgrid.is_configured():
            logger.info("Using SendGrid to send email")
            success = self.sendgrid.send_bulk_email(to_emails, subject, html_body, text_body)
            if success:
                return True
            logger.warning("SendGrid failed, falling back to SMTP")

        # Fallback to SMTP
        if not (self.enabled and self.smtp_user and self.smtp_password):
            logger.error("SMTP fallback not configured")
            return False

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject
            msg['Date'] = datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S +0000")

            # Add text body (fallback)
            if text_body:
                part1 = MIMEText(text_body, 'plain')
                msg.attach(part1)

            # Add HTML body
            part2 = MIMEText(html_body, 'html')
            msg.attach(part2)

            # Add attachments if provided
            if attachments:
                for file_path in attachments:
                    if file_path.exists():
                        with open(file_path, 'rb') as f:
                            img = MIMEImage(f.read())
                            img.add_header('Content-Disposition', 'attachment', filename=file_path.name)
                            msg.attach(img)

            # Send email via SMTP
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.from_email, to_emails, msg.as_string())

            logger.info(f"SMTP email sent successfully to {', '.join(to_emails)}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False

    def send_violation_alert(
        self,
        violation_type: str,
        camera_name: str,
        location: str,
        timestamp: datetime,
        screenshot_path: Optional[Path] = None
    ) -> bool:
        """
        Send PPE violation alert email

        Args:
            violation_type: Type of violation
            camera_name: Camera name
            location: Camera location
            timestamp: Time of violation
            screenshot_path: Optional path to screenshot

        Returns:
            True if email sent successfully, False otherwise
        """
        recipients = settings.get_admin_email_recipients()

        if not recipients:
            logger.warning("No admin email recipients configured")
            return False

        subject = f"PPE Violation Alert: {violation_type}"

        # HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #dc2626;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .content {{
                    background-color: #f9f9f9;
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-radius: 0 0 5px 5px;
                }}
                .detail {{
                    margin: 10px 0;
                    padding: 10px;
                    background-color: white;
                    border-left: 4px solid #dc2626;
                }}
                .detail strong {{
                    color: #dc2626;
                }}
                .footer {{
                    margin-top: 20px;
                    padding: 10px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>⚠️ PPE Violation Detected</h2>
                </div>
                <div class="content">
                    <p>A PPE compliance violation has been detected and requires immediate attention.</p>

                    <div class="detail">
                        <strong>Violation Type:</strong> {violation_type}
                    </div>
                    <div class="detail">
                        <strong>Location:</strong> {location}
                    </div>
                    <div class="detail">
                        <strong>Camera:</strong> {camera_name}
                    </div>
                    <div class="detail">
                        <strong>Time:</strong> {timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}
                    </div>

                    <p style="margin-top: 20px;">
                        Please review the incident and take appropriate action.
                        {"A screenshot has been attached to this email for your reference." if screenshot_path else ""}
                    </p>
                </div>
                <div class="footer">
                    <p>This is an automated notification from {settings.APP_NAME}</p>
                    <p>Do not reply to this email</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Plain text body (fallback)
        text_body = f"""
        PPE VIOLATION ALERT

        A PPE compliance violation has been detected:

        Violation Type: {violation_type}
        Location: {location}
        Camera: {camera_name}
        Time: {timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}

        Please review the incident and take appropriate action.

        ---
        This is an automated notification from {settings.APP_NAME}
        Do not reply to this email
        """

        # Send email with optional screenshot attachment
        attachments = [screenshot_path] if screenshot_path and screenshot_path.exists() else None
        return self.send_email(recipients, subject, html_body, text_body, attachments)

    def send_otp_email(self, email: str, otp: str) -> bool:
        """
        Send OTP verification email

        Args:
            email: Recipient email address
            otp: OTP code

        Returns:
            True if email sent successfully, False otherwise
        """
        subject = f"{settings.APP_NAME} - Email Verification Code"

        # HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #eab308;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .content {{
                    background-color: #f9f9f9;
                    padding: 30px 20px;
                    border: 1px solid #ddd;
                    border-radius: 0 0 5px 5px;
                    text-align: center;
                }}
                .otp-code {{
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    color: #eab308;
                    background-color: #fef9c3;
                    padding: 15px 30px;
                    border-radius: 8px;
                    display: inline-block;
                    margin: 20px 0;
                    border: 2px dashed #eab308;
                }}
                .footer {{
                    margin-top: 20px;
                    padding: 10px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }}
                .warning {{
                    color: #dc2626;
                    font-size: 14px;
                    margin-top: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🔐 Email Verification</h2>
                </div>
                <div class="content">
                    <p>Thank you for registering with {settings.APP_NAME}!</p>
                    <p>Please use the following verification code to complete your registration:</p>

                    <div class="otp-code">{otp}</div>

                    <p>This code will expire in <strong>10 minutes</strong>.</p>

                    <p class="warning">
                        ⚠️ If you didn't request this code, please ignore this email.
                    </p>
                </div>
                <div class="footer">
                    <p>This is an automated email from {settings.APP_NAME}</p>
                    <p>Do not reply to this email</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Plain text body (fallback)
        text_body = f"""
        EMAIL VERIFICATION CODE

        Thank you for registering with {settings.APP_NAME}!

        Your verification code is: {otp}

        This code will expire in 10 minutes.

        If you didn't request this code, please ignore this email.

        ---
        This is an automated email from {settings.APP_NAME}
        Do not reply to this email
        """

        return self.send_email([email], subject, html_body, text_body)

    def send_password_reset_email(self, email: str, otp: str) -> bool:
        """
        Send password reset email with OTP

        Args:
            email: Recipient email address
            otp: OTP code for password reset

        Returns:
            True if email sent successfully, False otherwise
        """
        subject = f"{settings.APP_NAME} - Password Reset Request"

        # HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #dc2626;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .content {{
                    background-color: #f9f9f9;
                    padding: 30px 20px;
                    border: 1px solid #ddd;
                    border-radius: 0 0 5px 5px;
                    text-align: center;
                }}
                .otp-code {{
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    color: #dc2626;
                    background-color: #fee2e2;
                    padding: 15px 30px;
                    border-radius: 8px;
                    display: inline-block;
                    margin: 20px 0;
                    border: 2px dashed #dc2626;
                }}
                .footer {{
                    margin-top: 20px;
                    padding: 10px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }}
                .warning {{
                    color: #dc2626;
                    font-size: 14px;
                    margin-top: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🔒 Password Reset Request</h2>
                </div>
                <div class="content">
                    <p>We received a request to reset your password for {settings.APP_NAME}.</p>
                    <p>Please use the following verification code to reset your password:</p>

                    <div class="otp-code">{otp}</div>

                    <p>This code will expire in <strong>10 minutes</strong>.</p>

                    <p class="warning">
                        ⚠️ If you didn't request a password reset, please ignore this email and ensure your account is secure.
                    </p>
                </div>
                <div class="footer">
                    <p>This is an automated email from {settings.APP_NAME}</p>
                    <p>Do not reply to this email</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Plain text body (fallback)
        text_body = f"""
        PASSWORD RESET REQUEST

        We received a request to reset your password for {settings.APP_NAME}.

        Your verification code is: {otp}

        This code will expire in 10 minutes.

        If you didn't request a password reset, please ignore this email and ensure your account is secure.

        ---
        This is an automated email from {settings.APP_NAME}
        Do not reply to this email
        """

        return self.send_email([email], subject, html_body, text_body)


# Global instance (singleton)
_email_service = None


def get_email_service() -> EmailService:
    """Get or create email service instance"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
