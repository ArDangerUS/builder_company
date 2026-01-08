"""
Notification models for the construction accounting system.
"""
from django.conf import settings
from django.db import models

from core.mixins import AuditMixin


class NotificationLog(models.Model):
    """
    Log of sent notifications to track what was sent and prevent duplicates.
    """
    TYPE_OVERDUE_INVOICE = 'overdue_invoice'
    TYPE_DUE_SOON = 'due_soon'
    TYPE_PAYMENT_RECEIVED = 'payment_received'
    TYPE_PROJECT_STATUS = 'project_status'

    TYPE_CHOICES = [
        (TYPE_OVERDUE_INVOICE, 'Faktura po splatnosti'),
        (TYPE_DUE_SOON, 'Blížící se splatnost'),
        (TYPE_PAYMENT_RECEIVED, 'Platba přijata'),
        (TYPE_PROJECT_STATUS, 'Změna stavu projektu'),
    ]

    STATUS_SENT = 'sent'
    STATUS_FAILED = 'failed'
    STATUS_PENDING = 'pending'

    STATUS_CHOICES = [
        (STATUS_SENT, 'Odesláno'),
        (STATUS_FAILED, 'Selhalo'),
        (STATUS_PENDING, 'Čekající'),
    ]

    notification_type = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES,
        verbose_name='Typ notifikace'
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='notifications',
        verbose_name='Příjemce'
    )
    recipient_email = models.EmailField(
        verbose_name='E-mail příjemce'
    )
    subject = models.CharField(
        max_length=255,
        verbose_name='Předmět'
    )
    message = models.TextField(
        verbose_name='Zpráva'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        verbose_name='Stav'
    )
    error_message = models.TextField(
        blank=True,
        verbose_name='Chybová zpráva'
    )
    # Reference to the related object
    content_type = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Typ objektu'
    )
    object_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='ID objektu'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Vytvořeno'
    )
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Odesláno'
    )

    class Meta:
        verbose_name = 'Log notifikací'
        verbose_name_plural = 'Logy notifikací'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['notification_type', 'object_id']),
            models.Index(fields=['recipient_email']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f'{self.get_notification_type_display()} - {self.recipient_email}'

    @classmethod
    def was_sent_today(cls, notification_type, object_id, recipient_email):
        """Check if notification was already sent today for this object."""
        from django.utils import timezone
        today = timezone.now().date()
        return cls.objects.filter(
            notification_type=notification_type,
            object_id=object_id,
            recipient_email=recipient_email,
            created_at__date=today,
            status=cls.STATUS_SENT
        ).exists()
