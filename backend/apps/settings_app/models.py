"""
Settings models for company configuration.
"""
from django.db import models
from django.core.validators import RegexValidator

from core.mixins import AuditMixin


def company_logo_path(instance, filename):
    """Generate file path for company logo."""
    return f'settings/logo/{filename}'


def company_stamp_path(instance, filename):
    """Generate file path for company stamp."""
    return f'settings/stamp/{filename}'


def company_signature_path(instance, filename):
    """Generate file path for company signature."""
    return f'settings/signature/{filename}'


class CompanySettings(AuditMixin, models.Model):
    """
    Singleton model for company settings.
    Contains all company information used in documents.
    """
    # Company name
    company_name_cs = models.CharField(
        max_length=255,
        verbose_name='Název firmy (CZ)',
        help_text='Název firmy v češtině'
    )
    company_name_en = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Company Name (EN)',
        help_text='Company name in English'
    )

    # Registration info
    ico = models.CharField(
        max_length=8,
        validators=[
            RegexValidator(
                regex=r'^\d{8}$',
                message='IČO musí obsahovat přesně 8 číslic'
            )
        ],
        verbose_name='IČO'
    )
    dic = models.CharField(
        max_length=12,
        blank=True,
        verbose_name='DIČ'
    )

    # Address
    street = models.CharField(
        max_length=255,
        verbose_name='Ulice a č.p.'
    )
    city = models.CharField(
        max_length=100,
        verbose_name='Město'
    )
    postal_code = models.CharField(
        max_length=10,
        verbose_name='PSČ'
    )
    country = models.CharField(
        max_length=100,
        default='Česká republika',
        verbose_name='Země'
    )

    # Contact
    phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Telefon'
    )
    email = models.EmailField(
        blank=True,
        verbose_name='E-mail'
    )
    website = models.URLField(
        blank=True,
        verbose_name='Web'
    )

    # Bank info
    bank_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Název banky'
    )
    bank_account = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Číslo účtu'
    )
    iban = models.CharField(
        max_length=34,
        blank=True,
        verbose_name='IBAN'
    )
    swift = models.CharField(
        max_length=11,
        blank=True,
        verbose_name='SWIFT/BIC'
    )

    # Images
    logo = models.ImageField(
        upload_to=company_logo_path,
        blank=True,
        null=True,
        verbose_name='Logo'
    )
    stamp = models.ImageField(
        upload_to=company_stamp_path,
        blank=True,
        null=True,
        verbose_name='Razítko'
    )
    signature = models.ImageField(
        upload_to=company_signature_path,
        blank=True,
        null=True,
        verbose_name='Podpis'
    )

    # Additional settings
    invoice_notes = models.TextField(
        blank=True,
        verbose_name='Poznámky na fakturách',
        help_text='Text, který se zobrazí na všech fakturách'
    )
    registration_court = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Zápis v OR',
        help_text='např. "Zapsán v OR vedeném MS v Praze, oddíl C, vložka 12345"'
    )

    class Meta:
        verbose_name = 'Nastavení firmy'
        verbose_name_plural = 'Nastavení firmy'

    def __str__(self):
        return self.company_name_cs or 'Nastavení firmy'

    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton pattern)
        if not self.pk and CompanySettings.objects.exists():
            # Update existing instance instead of creating new
            existing = CompanySettings.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance."""
        settings, _ = cls.objects.get_or_create(
            pk=1,
            defaults={
                'company_name_cs': 'Vaše firma s.r.o.',
                'ico': '00000000',
                'street': 'Ulice 123',
                'city': 'Praha',
                'postal_code': '10000',
            }
        )
        return settings

    @property
    def full_address(self):
        """Get formatted full address."""
        parts = [self.street, f'{self.postal_code} {self.city}']
        if self.country and self.country != 'Česká republika':
            parts.append(self.country)
        return ', '.join(parts)


class Supplier(AuditMixin, models.Model):
    """
    Supplier/vendor model for tracking external companies.
    """
    name = models.CharField(
        max_length=255,
        verbose_name='Název dodavatele'
    )
    ico = models.CharField(
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
    dic = models.CharField(
        max_length=12,
        blank=True,
        verbose_name='DIČ'
    )
    contact_person = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Kontaktní osoba'
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Telefon'
    )
    email = models.EmailField(
        blank=True,
        verbose_name='E-mail'
    )
    address = models.TextField(
        blank=True,
        verbose_name='Adresa'
    )
    bank_account = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Číslo účtu'
    )
    notes = models.TextField(
        blank=True,
        verbose_name='Poznámky'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Aktivní'
    )

    class Meta:
        verbose_name = 'Dodavatel'
        verbose_name_plural = 'Dodavatelé'
        ordering = ['name']

    def __str__(self):
        return self.name


class WorkType(AuditMixin, models.Model):
    """
    Work type categories for projects.
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='Název typu práce'
    )
    code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Kód',
        help_text='Krátký kód pro identifikaci'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Popis'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Aktivní'
    )

    class Meta:
        verbose_name = 'Typ práce'
        verbose_name_plural = 'Typy prací'
        ordering = ['name']

    def __str__(self):
        return self.name
