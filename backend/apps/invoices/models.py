"""
Invoice models for the construction accounting system.
Includes Invoice, InvoiceItem, and Payment models with auto-calculations.
"""
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Sum
from django.utils import timezone

from core.mixins import AuditMixin


class Invoice(AuditMixin, models.Model):
    """
    Invoice model representing a customer invoice.

    Auto-generates invoice numbers in format INV-YYYY-NNN.
    Tracks status changes and calculates totals automatically.
    """
    # Status choices
    STATUS_DRAFT = 'draft'
    STATUS_ISSUED = 'issued'
    STATUS_PARTIALLY_PAID = 'partially_paid'
    STATUS_PAID = 'paid'
    STATUS_OVERDUE = 'overdue'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Koncept'),
        (STATUS_ISSUED, 'Vystaveno'),
        (STATUS_PARTIALLY_PAID, 'Částečně uhrazeno'),
        (STATUS_PAID, 'Uhrazeno'),
        (STATUS_OVERDUE, 'Po splatnosti'),
        (STATUS_CANCELLED, 'Zrušeno'),
    ]

    # Invoice type choices
    TYPE_VYDANA = 'vydana'
    TYPE_PRIJATA = 'prijata'
    TYPE_ZALOHOVA = 'zalohova'
    TYPE_DOBROPIS = 'dobropis'

    TYPE_CHOICES = [
        (TYPE_VYDANA, 'Faktura vydaná'),
        (TYPE_PRIJATA, 'Faktura přijatá'),
        (TYPE_ZALOHOVA, 'Zálohová faktura'),
        (TYPE_DOBROPIS, 'Dobropis'),
    ]

    # Invoice number
    number = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Číslo faktury'
    )

    # Dates
    issue_date = models.DateField(
        default=date.today,
        verbose_name='Datum vystavení'
    )
    due_date = models.DateField(
        verbose_name='Datum splatnosti'
    )
    taxable_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Datum zdanitelného plnění'
    )

    # Project relation
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.PROTECT,
        related_name='invoices',
        verbose_name='Projekt'
    )

    # Client info (copied from project for invoice record)
    client_name = models.CharField(
        max_length=255,
        verbose_name='Název klienta'
    )
    client_ico = models.CharField(
        max_length=8,
        blank=True,
        verbose_name='IČO'
    )
    client_dic = models.CharField(
        max_length=15,
        blank=True,
        verbose_name='DIČ'
    )
    client_address = models.TextField(
        blank=True,
        verbose_name='Adresa klienta'
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        verbose_name='Stav'
    )

    # Invoice type
    invoice_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default=TYPE_VYDANA,
        verbose_name='Typ faktury'
    )

    # Notes
    notes = models.TextField(
        blank=True,
        verbose_name='Poznámky'
    )
    internal_notes = models.TextField(
        blank=True,
        verbose_name='Interní poznámky'
    )

    # Bank details for payment
    bank_account = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Číslo účtu'
    )
    variable_symbol = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Variabilní symbol'
    )

    class Meta:
        verbose_name = 'Faktura'
        verbose_name_plural = 'Faktury'
        ordering = ['-issue_date', '-number']
        indexes = [
            models.Index(fields=['number']),
            models.Index(fields=['status']),
            models.Index(fields=['project']),
            models.Index(fields=['due_date']),
            models.Index(fields=['issue_date']),
        ]

    def __str__(self):
        return f'{self.number} - {self.client_name}'

    @classmethod
    def generate_number(cls):
        """
        Generate next invoice number in format INV-YYYY-NNN.
        """
        year = date.today().year
        prefix = f'INV-{year}-'

        last_invoice = cls.objects.filter(
            number__startswith=prefix
        ).order_by('-number').first()

        if last_invoice:
            try:
                last_num = int(last_invoice.number.split('-')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1
        else:
            new_num = 1

        return f'{prefix}{new_num:03d}'

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self.generate_number()

        # Auto-fill variable symbol from number
        if not self.variable_symbol:
            self.variable_symbol = self.number.replace('-', '').replace('INV', '')

        # Auto-fill taxable date
        if not self.taxable_date:
            self.taxable_date = self.issue_date

        super().save(*args, **kwargs)

    @property
    def total_amount(self) -> Decimal:
        """Calculate total invoice amount from items."""
        result = self.items.aggregate(total=Sum('total_price'))
        return result['total'] or Decimal('0.00')

    @property
    def paid_amount(self) -> Decimal:
        """Calculate total paid amount from payments."""
        result = self.payments.aggregate(total=Sum('amount'))
        return result['total'] or Decimal('0.00')

    @property
    def amount_due(self) -> Decimal:
        """Calculate remaining amount to be paid."""
        return self.total_amount - self.paid_amount

    @property
    def is_overdue(self) -> bool:
        """Check if invoice is past due date."""
        if self.status in [self.STATUS_PAID, self.STATUS_CANCELLED, self.STATUS_DRAFT]:
            return False
        return date.today() > self.due_date

    @property
    def is_editable(self) -> bool:
        """Check if invoice can be edited."""
        return self.status == self.STATUS_DRAFT

    def update_status(self):
        """
        Update invoice status based on payments and due date.
        Should be called after payment changes.
        """
        if self.status == self.STATUS_CANCELLED:
            return

        total = self.total_amount
        paid = self.paid_amount

        if paid >= total and total > 0:
            self.status = self.STATUS_PAID
        elif paid > 0:
            self.status = self.STATUS_PARTIALLY_PAID
        elif self.status != self.STATUS_DRAFT:
            if self.is_overdue:
                self.status = self.STATUS_OVERDUE
            else:
                self.status = self.STATUS_ISSUED

        self.save(update_fields=['status'])

    def issue(self, user=None):
        """Issue the invoice (change from draft to issued)."""
        if self.status != self.STATUS_DRAFT:
            raise ValueError('Pouze koncepty mohou být vystaveny.')

        if self.items.count() == 0:
            raise ValueError('Faktura musí mít alespoň jednu položku.')

        self.status = self.STATUS_ISSUED
        self.issue_date = date.today()
        if not self.taxable_date:
            self.taxable_date = self.issue_date
        self.updated_by = user
        self.save()

    def cancel(self, user=None):
        """Cancel the invoice."""
        if self.status == self.STATUS_PAID:
            raise ValueError('Uhrazená faktura nemůže být zrušena.')

        if self.paid_amount > 0:
            raise ValueError('Faktura s platbami nemůže být zrušena.')

        self.status = self.STATUS_CANCELLED
        self.updated_by = user
        self.save()

    def copy_client_from_project(self):
        """Copy client information from the related project."""
        if self.project:
            self.client_name = self.project.client_name
            self.client_ico = self.project.client_ico
            self.client_dic = self.project.client_dic
            self.client_address = self.project.client_address


class InvoiceItem(models.Model):
    """
    Invoice line item representing a single product/service on the invoice.
    """
    UNIT_CHOICES = [
        ('ks', 'ks'),
        ('hod', 'hod'),
        ('m', 'm'),
        ('m2', 'm²'),
        ('m3', 'm³'),
        ('kg', 'kg'),
        ('t', 't'),
        ('km', 'km'),
        ('den', 'den'),
        ('komplet', 'komplet'),
    ]

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Faktura'
    )
    name = models.CharField(
        max_length=255,
        verbose_name='Název'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Popis'
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))],
        verbose_name='Množství'
    )
    unit = models.CharField(
        max_length=20,
        choices=UNIT_CHOICES,
        default='ks',
        verbose_name='Jednotka'
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name='Jednotková cena'
    )
    total_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        editable=False,
        verbose_name='Celková cena'
    )
    order = models.PositiveIntegerField(
        default=0,
        verbose_name='Pořadí'
    )

    class Meta:
        verbose_name = 'Položka faktury'
        verbose_name_plural = 'Položky faktury'
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.name} ({self.quantity} {self.unit})'

    def save(self, *args, **kwargs):
        # Auto-calculate total price
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class Payment(AuditMixin, models.Model):
    """
    Payment record for an invoice.
    """
    PAYMENT_METHOD_CASH = 'cash'
    PAYMENT_METHOD_BANK = 'bank'
    PAYMENT_METHOD_CARD = 'card'

    PAYMENT_METHOD_CHOICES = [
        (PAYMENT_METHOD_CASH, 'Hotovost'),
        (PAYMENT_METHOD_BANK, 'Bankovní převod'),
        (PAYMENT_METHOD_CARD, 'Kartou'),
    ]

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name='Faktura'
    )
    payment_date = models.DateField(
        default=date.today,
        verbose_name='Datum platby'
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Částka'
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default=PAYMENT_METHOD_BANK,
        verbose_name='Způsob platby'
    )
    document_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Číslo dokladu'
    )
    notes = models.TextField(
        blank=True,
        verbose_name='Poznámky'
    )

    class Meta:
        verbose_name = 'Platba'
        verbose_name_plural = 'Platby'
        ordering = ['-payment_date', '-id']

    def __str__(self):
        return f'{self.invoice.number} - {self.amount} Kč ({self.payment_date})'

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update invoice status after payment
        self.invoice.update_status()

    def delete(self, *args, **kwargs):
        invoice = self.invoice
        super().delete(*args, **kwargs)
        # Update invoice status after payment deletion
        invoice.update_status()


class InvoiceHistory(models.Model):
    """
    History log for invoice changes.
    """
    ACTION_CREATED = 'created'
    ACTION_UPDATED = 'updated'
    ACTION_ISSUED = 'issued'
    ACTION_CANCELLED = 'cancelled'
    ACTION_PAYMENT_ADDED = 'payment_added'
    ACTION_PAYMENT_REMOVED = 'payment_removed'
    ACTION_STATUS_CHANGED = 'status_changed'

    ACTION_CHOICES = [
        (ACTION_CREATED, 'Vytvořeno'),
        (ACTION_UPDATED, 'Aktualizováno'),
        (ACTION_ISSUED, 'Vystaveno'),
        (ACTION_CANCELLED, 'Zrušeno'),
        (ACTION_PAYMENT_ADDED, 'Platba přidána'),
        (ACTION_PAYMENT_REMOVED, 'Platba odstraněna'),
        (ACTION_STATUS_CHANGED, 'Změna stavu'),
    ]

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='history',
        verbose_name='Faktura'
    )
    action = models.CharField(
        max_length=30,
        choices=ACTION_CHOICES,
        verbose_name='Akce'
    )
    description = models.TextField(
        verbose_name='Popis'
    )
    old_value = models.TextField(
        blank=True,
        verbose_name='Předchozí hodnota'
    )
    new_value = models.TextField(
        blank=True,
        verbose_name='Nová hodnota'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Uživatel'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Datum'
    )

    class Meta:
        verbose_name = 'Historie faktury'
        verbose_name_plural = 'Historie faktur'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.invoice.number} - {self.get_action_display()}'

    @classmethod
    def log(cls, invoice, action, description, user=None, old_value='', new_value=''):
        """Create a history log entry."""
        return cls.objects.create(
            invoice=invoice,
            action=action,
            description=description,
            old_value=old_value,
            new_value=new_value,
            user=user
        )
