from django.conf import settings
from django.db import models


class CompanyMixin(models.Model):
    """Mixin that adds company field for multi-tenancy."""
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.PROTECT,
        null=True,  # Temporary for migration
        blank=True,
        related_name='%(class)ss',
        verbose_name='Firma'
    )

    class Meta:
        abstract = True


class AuditMixin(models.Model):
    """
    Mixin that adds audit fields to models.
    Tracks creation and modification timestamps and the users responsible.
    """
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Vytvořeno'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Aktualizováno'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_created',
        verbose_name='Vytvořil'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_updated',
        verbose_name='Aktualizoval'
    )

    class Meta:
        abstract = True


class SoftDeleteMixin(models.Model):
    """
    Mixin that adds soft delete functionality to models.
    """
    is_deleted = models.BooleanField(
        default=False,
        verbose_name='Smazáno'
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Datum smazání'
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_deleted',
        verbose_name='Smazal'
    )

    class Meta:
        abstract = True

    def soft_delete(self, user=None):
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])


class StatusMixin(models.Model):
    """
    Mixin for models that have draft/posted statuses.
    """
    STATUS_DRAFT = 'draft'
    STATUS_POSTED = 'posted'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Koncept'),
        (STATUS_POSTED, 'Provedeno'),
        (STATUS_CANCELLED, 'Zrušeno'),
    ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        verbose_name='Stav'
    )

    class Meta:
        abstract = True

    @property
    def is_draft(self):
        return self.status == self.STATUS_DRAFT

    @property
    def is_posted(self):
        return self.status == self.STATUS_POSTED

    @property
    def is_cancelled(self):
        return self.status == self.STATUS_CANCELLED
