"""
Email notification utility for Moly AI Chat.
Sends notifications to admin when new users log in.
"""

import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

logger = logging.getLogger(__name__)


def send_new_user_notification(user_email: str) -> bool:
    """
    Send email notification to admin about a new user login.
    
    Args:
        user_email: The email address of the new user
        
    Returns:
        True if email sent successfully, False otherwise
    """
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    admin_email = os.getenv("ADMIN_EMAIL", "")

    # If SMTP is not configured, just log
    if not all([smtp_host, smtp_user, smtp_password, admin_email]):
        logger.info(f"[LEAD] New user logged in: {user_email} at {datetime.now().isoformat()}")
        logger.warning("SMTP not configured — email notification skipped. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, ADMIN_EMAIL in .env")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🔔 Moly AI Chat — Nowy użytkownik: {user_email}"
        msg["From"] = smtp_user
        msg["To"] = admin_email

        html_body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 32px;">
            <div style="max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155;">
                <h2 style="color: #38bdf8; margin-top: 0;">🔔 Nowy użytkownik w Moly AI Chat</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #94a3b8;">Email:</td>
                        <td style="padding: 8px 0; color: #f1f5f9; font-weight: bold;">{user_email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #94a3b8;">Data:</td>
                        <td style="padding: 8px 0; color: #f1f5f9;">{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</td>
                    </tr>
                </table>
                <hr style="border: 1px solid #334155; margin: 16px 0;">
                <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">Moly AI Chat Assistant — Automatyczne powiadomienie</p>
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, admin_email, msg.as_string())

        logger.info(f"Email notification sent for new user: {user_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email notification: {e}")
        return False
