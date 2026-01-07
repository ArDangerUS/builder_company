import os
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models

from core.mixins import AuditMixin


def project_file_path(instance, filename):
    """Generate file path for project files."""
    return f'projects/{instance.project.id}/{filename}'


class Project(AuditMixin, models.Model):
    """
    Project model representing a construction project.
    """
    STATUS_PLANNING = 'planning'
    STATUS_ACTIVE = 'active'
    STATUS_SUSPENDED = 'suspended'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_PLANNING, 'Plánování'),
        (STATUS_ACTIVE, 'Aktivní'),
        (STATUS_SUSPENDED, 'Pozastaveno'),
        (STATUS_COMPLETED, 'Dokončeno'),
        (STATUS_CANCELLED, 'Zrušeno'),
    ]

    WORK_TYPE_CHOICES = [
        ('construction', 'Stavba'),
        ('reconstruction', 'Rekonstrukce'),
        ('repair', 'Oprava'),
        ('installation', 'Instalace'),
        ('demolition', 'Demolice'),
        ('design', 'Projektování'),
        ('other', 'Jiné'),
    ]

    # Project info
    number = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Číslo projektu',
        help_text='Automaticky generované: PRJ-YYYY-NNN'
    )
    name = models.CharField(
        max_length=255,
        verbose_name='Název projektu'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Popis'
    )

    # Client info
    client_name = models.CharField(
        max_length=255,
        verbose_name='Název klienta'
    )
    client_ico = models.CharField(
        max_length=8,
        blank=True,
        validators=[
            RegexValidator(
                regex=r'^\d{8}$',
                message='IČO musí obsahovat přesně 8 číslic'
            )
        ],
        verbose_name='IČO'
    )
    client_dic = models.CharField(
        max_length=12,
        blank=True,
        verbose_name='DIČ'
    )
    client_address = models.TextField(
        blank=True,
        verbose_name='Adresa klienta'
    )
    client_contact_person = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Kontaktní osoba'
    )
    client_phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Telefon'
    )
    client_email = models.EmailField(
        blank=True,
        verbose_name='E-mail'
    )

    # Project location
    site_address = models.TextField(
        verbose_name='Adresa stavby'
    )

    # Project details
    work_type = models.CharField(
        max_length=20,
        choices=WORK_TYPE_CHOICES,
        default='construction',
        verbose_name='Typ prací'
    )
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_projects',
        verbose_name='Manažer projektu'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PLANNING,
        verbose_name='Stav'
    )

    # Financial info
    planned_budget = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Plánovaný rozpočet'
    )

    # Dates
    start_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Datum zahájení'
    )
    planned_end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Plánované dokončení'
    )
    actual_end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Skutečné dokončení'
    )

    # Notes
    notes = models.TextField(
        blank=True,
        verbose_name='Poznámky'
    )

    class Meta:
        verbose_name = 'Projekt'
        verbose_name_plural = 'Projekty'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.number} - {self.name}'

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self.generate_number()
        super().save(*args, **kwargs)

    @classmethod
    def generate_number(cls):
        """Generate unique project number in format PRJ-YYYY-NNN."""
        year = date.today().year
        prefix = f'PRJ-{year}-'

        last_project = cls.objects.filter(
            number__startswith=prefix
        ).order_by('-number').first()

        if last_project:
            try:
                last_num = int(last_project.number.split('-')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1
        else:
            new_num = 1

        return f'{prefix}{new_num:03d}'

    @property
    def actual_costs(self):
        """Calculate actual costs from stock write-offs."""
        # Will be implemented when warehouse module is ready
        return Decimal('0.00')

    @property
    def invoiced_amount(self):
        """Calculate total invoiced amount."""
        # Will be implemented when invoices module is ready
        return Decimal('0.00')

    @property
    def paid_amount(self):
        """Calculate total paid amount."""
        # Will be implemented when invoices module is ready
        return Decimal('0.00')

    @property
    def outstanding_amount(self):
        """Calculate outstanding (unpaid) amount."""
        return self.invoiced_amount - self.paid_amount


class ProjectFile(AuditMixin, models.Model):
    """
    File attachments for projects.
    """
    FILE_TYPE_CHOICES = [
        ('document', 'Dokument'),
        ('drawing', 'Výkres'),
        ('photo', 'Fotografie'),
        ('contract', 'Smlouva'),
        ('invoice', 'Faktura'),
        ('other', 'Jiné'),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='files',
        verbose_name='Projekt'
    )
    file = models.FileField(
        upload_to=project_file_path,
        verbose_name='Soubor'
    )
    name = models.CharField(
        max_length=255,
        verbose_name='Název souboru'
    )
    file_type = models.CharField(
        max_length=20,
        choices=FILE_TYPE_CHOICES,
        default='document',
        verbose_name='Typ souboru'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Popis'
    )
    file_size = models.PositiveIntegerField(
        default=0,
        verbose_name='Velikost (bytes)'
    )

    class Meta:
        verbose_name = 'Soubor projektu'
        verbose_name_plural = 'Soubory projektu'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.project.number} - {self.name}'

    def save(self, *args, **kwargs):
        if self.file:
            self.file_size = self.file.size
            if not self.name:
                self.name = os.path.basename(self.file.name)
        super().save(*args, **kwargs)

    @property
    def file_extension(self):
        if self.file:
            return os.path.splitext(self.file.name)[1].lower()
        return ''


class ProjectHistory(models.Model):
    """
    History log for project changes.
    """
    ACTION_CREATED = 'created'
    ACTION_UPDATED = 'updated'
    ACTION_STATUS_CHANGED = 'status_changed'
    ACTION_FILE_ADDED = 'file_added'
    ACTION_FILE_REMOVED = 'file_removed'

    ACTION_CHOICES = [
        (ACTION_CREATED, 'Vytvořeno'),
        (ACTION_UPDATED, 'Aktualizováno'),
        (ACTION_STATUS_CHANGED, 'Změna stavu'),
        (ACTION_FILE_ADDED, 'Soubor přidán'),
        (ACTION_FILE_REMOVED, 'Soubor odstraněn'),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='history',
        verbose_name='Projekt'
    )
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        verbose_name='Akce'
    )
    description = models.TextField(
        verbose_name='Popis změny'
    )
    old_value = models.TextField(
        blank=True,
        verbose_name='Stará hodnota'
    )
    new_value = models.TextField(
        blank=True,
        verbose_name='Nová hodnota'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='Uživatel'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Datum a čas'
    )

    class Meta:
        verbose_name = 'Historie projektu'
        verbose_name_plural = 'Historie projektu'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.project.number} - {self.get_action_display()}'

    @classmethod
    def log_change(cls, project, action, description, user=None, old_value='', new_value=''):
        """Helper method to create history entry."""
        return cls.objects.create(
            project=project,
            action=action,
            description=description,
            old_value=str(old_value) if old_value else '',
            new_value=str(new_value) if new_value else '',
            user=user
        )
