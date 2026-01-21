"""
Company model for multi-tenancy support.
"""
from django.db import models
from django.core.validators import RegexValidator
from django.utils.text import slugify

from core.mixins import AuditMixin


def company_logo_path(instance, filename):
    """Generate file path for company logo."""
    return f'companies/{instance.slug}/logo/{filename}'


def company_stamp_path(instance, filename):
    """Generate file path for company stamp."""
    return f'companies/{instance.slug}/stamp/{filename}'


def company_signature_path(instance, filename):
    """Generate file path for company signature."""
    return f'companies/{instance.slug}/signature/{filename}'


class Company(AuditMixin, models.Model):
    """
    Company model for multi-tenant architecture.
    Each company has its own data isolated from other companies.
    """
    # Basic info
    name = models.CharField(
        max_length=255,
        verbose_name='Název firmy'
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        verbose_name='URL slug',
        help_text='Unikátní identifikátor pro URL'
    )

    # Registration info
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

    # Address
    street = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Ulice a č.p.'
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Město'
    )
    postal_code = models.CharField(
        max_length=10,
        blank=True,
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

    # Status
    is_active = models.BooleanField(
        default=True,
        verbose_name='Aktivní'
    )

    class Meta:
        verbose_name = 'Firma'
        verbose_name_plural = 'Firmy'
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
            # Ensure unique slug
            original_slug = self.slug
            counter = 1
            while Company.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f'{original_slug}-{counter}'
                counter += 1
        super().save(*args, **kwargs)

    @property
    def full_address(self):
        """Get formatted full address."""
        parts = []
        if self.street:
            parts.append(self.street)
        if self.postal_code and self.city:
            parts.append(f'{self.postal_code} {self.city}')
        elif self.city:
            parts.append(self.city)
        if self.country and self.country != 'Česká republika':
            parts.append(self.country)
        return ', '.join(parts)
