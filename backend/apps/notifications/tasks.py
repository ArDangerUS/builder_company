"""
Celery tasks for the notifications app.
Handles scheduled email notifications for invoices.
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def get_notification_recipients():
    """
    Get users who should receive invoice notifications.
    Returns Manager, Accountant and Admin users.
    """
    from apps.users.models import User
    return User.objects.filter(
        is_active=True,
        role__in=[User.ROLE_ADMIN, User.ROLE_MANAGER, User.ROLE_ACCOUNTANT]
    ).exclude(email='')


def send_notification_email(recipient, subject, message_html, notification_type, invoice):
    """
    Send notification email and log it.
    """
    from apps.notifications.models import NotificationLog

    # Check if already sent today
    if NotificationLog.was_sent_today(notification_type, invoice.id, recipient.email):
        logger.info(f'Notification already sent today for invoice {invoice.number} to {recipient.email}')
        return False

    # Create log entry
    log_entry = NotificationLog.objects.create(
        notification_type=notification_type,
        recipient=recipient,
        recipient_email=recipient.email,
        subject=subject,
        message=message_html,
        content_type='invoice',
        object_id=invoice.id
    )

    try:
        message_plain = strip_tags(message_html)
        send_mail(
            subject=subject,
            message=message_plain,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient.email],
            html_message=message_html,
            fail_silently=False
        )
        log_entry.status = NotificationLog.STATUS_SENT
        log_entry.sent_at = timezone.now()
        log_entry.save()
        logger.info(f'Notification sent for invoice {invoice.number} to {recipient.email}')
        return True
    except Exception as e:
        log_entry.status = NotificationLog.STATUS_FAILED
        log_entry.error_message = str(e)
        log_entry.save()
        logger.error(f'Failed to send notification for invoice {invoice.number} to {recipient.email}: {e}')
        return False


@shared_task(name='apps.notifications.tasks.check_overdue_invoices')
def check_overdue_invoices():
    """
    Check for overdue invoices and send email notifications.
    Runs daily at 9:00 AM.
    """
    from apps.invoices.models import Invoice
    from apps.notifications.models import NotificationLog

    logger.info('Checking for overdue invoices...')

    today = timezone.now().date()

    # Find overdue invoices that are issued or partially paid
    overdue_invoices = Invoice.objects.filter(
        due_date__lt=today,
        status__in=[Invoice.STATUS_ISSUED, Invoice.STATUS_PARTIALLY_PAID]
    ).select_related('project')

    if not overdue_invoices.exists():
        logger.info('No overdue invoices found')
        return {'overdue_count': 0, 'notifications_sent': 0}

    recipients = get_notification_recipients()
    notifications_sent = 0

    for invoice in overdue_invoices:
        days_overdue = (today - invoice.due_date).days

        subject = f'Faktura po splatnosti: {invoice.number}'
        message_html = f"""
        <h2>Upozornění na fakturu po splatnosti</h2>
        <p>Faktura <strong>{invoice.number}</strong> je <strong>{days_overdue} dní</strong> po splatnosti.</p>
        <table border="1" cellpadding="10" cellspacing="0">
            <tr><td><strong>Faktura:</strong></td><td>{invoice.number}</td></tr>
            <tr><td><strong>Projekt:</strong></td><td>{invoice.project.name}</td></tr>
            <tr><td><strong>Klient:</strong></td><td>{invoice.client_name}</td></tr>
            <tr><td><strong>Datum splatnosti:</strong></td><td>{invoice.due_date.strftime('%d.%m.%Y')}</td></tr>
            <tr><td><strong>Celková částka:</strong></td><td>{invoice.total_amount:,.2f} Kč</td></tr>
            <tr><td><strong>Zbývá uhradit:</strong></td><td>{invoice.amount_due:,.2f} Kč</td></tr>
        </table>
        <p>Prosím zkontrolujte stav platby a kontaktujte klienta.</p>
        """

        for recipient in recipients:
            if send_notification_email(
                recipient,
                subject,
                message_html,
                NotificationLog.TYPE_OVERDUE_INVOICE,
                invoice
            ):
                notifications_sent += 1

        # Update invoice status to overdue if not already
        if invoice.status != Invoice.STATUS_OVERDUE:
            invoice.status = Invoice.STATUS_OVERDUE
            invoice.save(update_fields=['status'])

    logger.info(f'Overdue invoices check completed. Found {overdue_invoices.count()}, sent {notifications_sent} notifications')
    return {
        'overdue_count': overdue_invoices.count(),
        'notifications_sent': notifications_sent
    }


@shared_task(name='apps.notifications.tasks.check_invoice_due_soon')
def check_invoice_due_soon():
    """
    Check for invoices due within 3 days and send reminder notifications.
    Runs daily at 9:00 AM.
    """
    from apps.invoices.models import Invoice
    from apps.notifications.models import NotificationLog

    logger.info('Checking for invoices due soon...')

    today = timezone.now().date()
    due_soon_date = today + timedelta(days=3)

    # Find invoices due within 3 days that are not paid or cancelled
    due_soon_invoices = Invoice.objects.filter(
        due_date__gt=today,
        due_date__lte=due_soon_date,
        status__in=[Invoice.STATUS_ISSUED, Invoice.STATUS_PARTIALLY_PAID]
    ).select_related('project')

    if not due_soon_invoices.exists():
        logger.info('No invoices due soon found')
        return {'due_soon_count': 0, 'notifications_sent': 0}

    recipients = get_notification_recipients()
    notifications_sent = 0

    for invoice in due_soon_invoices:
        days_until_due = (invoice.due_date - today).days

        subject = f'Připomínka splatnosti faktury: {invoice.number}'
        message_html = f"""
        <h2>Připomínka blížící se splatnosti faktury</h2>
        <p>Faktura <strong>{invoice.number}</strong> bude splatná za <strong>{days_until_due} {'den' if days_until_due == 1 else 'dny' if days_until_due < 5 else 'dní'}</strong>.</p>
        <table border="1" cellpadding="10" cellspacing="0">
            <tr><td><strong>Faktura:</strong></td><td>{invoice.number}</td></tr>
            <tr><td><strong>Projekt:</strong></td><td>{invoice.project.name}</td></tr>
            <tr><td><strong>Klient:</strong></td><td>{invoice.client_name}</td></tr>
            <tr><td><strong>Datum splatnosti:</strong></td><td>{invoice.due_date.strftime('%d.%m.%Y')}</td></tr>
            <tr><td><strong>Celková částka:</strong></td><td>{invoice.total_amount:,.2f} Kč</td></tr>
            <tr><td><strong>Zbývá uhradit:</strong></td><td>{invoice.amount_due:,.2f} Kč</td></tr>
        </table>
        <p>Prosím zkontrolujte stav platby.</p>
        """

        for recipient in recipients:
            if send_notification_email(
                recipient,
                subject,
                message_html,
                NotificationLog.TYPE_DUE_SOON,
                invoice
            ):
                notifications_sent += 1

    logger.info(f'Due soon check completed. Found {due_soon_invoices.count()}, sent {notifications_sent} notifications')
    return {
        'due_soon_count': due_soon_invoices.count(),
        'notifications_sent': notifications_sent
    }


@shared_task(name='apps.notifications.tasks.send_payment_received_notification')
def send_payment_received_notification(invoice_id: int, payment_amount: float):
    """
    Send notification when payment is received for an invoice.
    Can be called manually after payment is added.
    """
    from apps.invoices.models import Invoice
    from apps.notifications.models import NotificationLog

    try:
        invoice = Invoice.objects.select_related('project').get(id=invoice_id)
    except Invoice.DoesNotExist:
        logger.error(f'Invoice {invoice_id} not found')
        return {'success': False, 'error': 'Invoice not found'}

    recipients = get_notification_recipients()
    notifications_sent = 0

    subject = f'Platba přijata: {invoice.number}'
    message_html = f"""
    <h2>Platba přijata</h2>
    <p>Na fakturu <strong>{invoice.number}</strong> byla přijata platba.</p>
    <table border="1" cellpadding="10" cellspacing="0">
        <tr><td><strong>Faktura:</strong></td><td>{invoice.number}</td></tr>
        <tr><td><strong>Projekt:</strong></td><td>{invoice.project.name}</td></tr>
        <tr><td><strong>Klient:</strong></td><td>{invoice.client_name}</td></tr>
        <tr><td><strong>Přijatá částka:</strong></td><td>{payment_amount:,.2f} Kč</td></tr>
        <tr><td><strong>Celková částka:</strong></td><td>{invoice.total_amount:,.2f} Kč</td></tr>
        <tr><td><strong>Uhrazeno celkem:</strong></td><td>{invoice.paid_amount:,.2f} Kč</td></tr>
        <tr><td><strong>Zbývá uhradit:</strong></td><td>{invoice.amount_due:,.2f} Kč</td></tr>
        <tr><td><strong>Stav:</strong></td><td>{invoice.get_status_display()}</td></tr>
    </table>
    """

    for recipient in recipients:
        if send_notification_email(
            recipient,
            subject,
            message_html,
            NotificationLog.TYPE_PAYMENT_RECEIVED,
            invoice
        ):
            notifications_sent += 1

    return {'success': True, 'notifications_sent': notifications_sent}
