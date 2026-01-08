"""
Warehouse models for the construction accounting system.
Includes Category, Material, StockReceipt, and StockWriteOff models.
"""
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from core.mixins import AuditMixin


def material_photo_path(instance, filename):
    """Generate file path for material photos."""
    return f'warehouse/materials/{instance.id}/{filename}'


def receipt_file_path(instance, filename):
    """Generate file path for receipt documents."""
    return f'warehouse/receipts/{instance.number}/{filename}'


class Category(AuditMixin, models.Model):
    """
    Category for materials.
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='Název kategorie'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Popis'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Aktivní'
    )
    order = models.PositiveIntegerField(
        default=0,
        verbose_name='Pořadí'
    )

    class Meta:
        verbose_name = 'Kategorie'
        verbose_name_plural = 'Kategorie'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

    @classmethod
    def create_default_categories(cls):
        """Create default categories for warehouse."""
        default_categories = [
            ('Cement a pojiva', 'Cement, vápno, sádra a další pojiva'),
            ('Armatura a kov', 'Ocelové výztuže, profily, plechy'),
            ('Dřevo', 'Řezivo, dřevěné desky, latě'),
            ('Barvy a laky', 'Nátěrové hmoty, laky, ředidla'),
            ('Elektro', 'Elektroinstalační materiál, kabely'),
            ('Voda a topení', 'Instalatérský materiál, trubky, armatury'),
            ('Nářadí', 'Ruční a elektrické nářadí'),
            ('Ostatní', 'Ostatní stavební materiál'),
        ]
        for order, (name, description) in enumerate(default_categories, 1):
            cls.objects.get_or_create(
                name=name,
                defaults={'description': description, 'order': order}
            )


class Material(AuditMixin, models.Model):
    """
    Material in warehouse inventory.
    """
    UNIT_CHOICES = [
        ('ks', 'ks'),
        ('m', 'm'),
        ('m2', 'm²'),
        ('m3', 'm³'),
        ('kg', 'kg'),
        ('t', 't'),
        ('l', 'l'),
        ('bal', 'bal'),
        ('rol', 'rol'),
        ('sada', 'sada'),
    ]

    name = models.CharField(
        max_length=255,
        verbose_name='Název'
    )
    sku = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Kód/SKU',
        help_text='Unikátní identifikátor materiálu'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='materials',
        verbose_name='Kategorie'
    )
    unit = models.CharField(
        max_length=10,
        choices=UNIT_CHOICES,
        default='ks',
        verbose_name='Jednotka'
    )
    purchase_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Nákupní cena'
    )
    current_stock = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal('0.000'),
        verbose_name='Aktuální zásoba'
    )
    min_stock = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal('0.000'),
        validators=[MinValueValidator(Decimal('0.000'))],
        verbose_name='Minimální zásoba'
    )
    supplier = models.ForeignKey(
        'settings_app.Supplier',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='materials',
        verbose_name='Dodavatel'
    )
    photo = models.ImageField(
        upload_to=material_photo_path,
        blank=True,
        null=True,
        verbose_name='Fotografie'
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
        verbose_name = 'Materiál'
        verbose_name_plural = 'Materiály'
        ordering = ['name']
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['name']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return f'{self.sku} - {self.name}'

    @property
    def is_low_stock(self) -> bool:
        """Check if material is below minimum stock level."""
        return self.current_stock < self.min_stock

    @property
    def stock_value(self) -> Decimal:
        """Calculate total value of current stock."""
        return self.current_stock * self.purchase_price


class StockReceipt(AuditMixin, models.Model):
    """
    Stock receipt document for incoming materials.
    """
    STATUS_DRAFT = 'draft'
    STATUS_POSTED = 'posted'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Koncept'),
        (STATUS_POSTED, 'Zaúčtováno'),
        (STATUS_CANCELLED, 'Zrušeno'),
    ]

    number = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Číslo příjemky'
    )
    receipt_date = models.DateField(
        default=date.today,
        verbose_name='Datum příjmu'
    )
    supplier = models.ForeignKey(
        'settings_app.Supplier',
        on_delete=models.PROTECT,
        related_name='stock_receipts',
        verbose_name='Dodavatel'
    )
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='stock_receipts',
        verbose_name='Odpovědná osoba'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        verbose_name='Stav'
    )
    invoice_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Číslo faktury'
    )
    invoice_file = models.FileField(
        upload_to=receipt_file_path,
        blank=True,
        null=True,
        verbose_name='Faktura/Dodací list'
    )
    notes = models.TextField(
        blank=True,
        verbose_name='Poznámky'
    )

    class Meta:
        verbose_name = 'Příjemka'
        verbose_name_plural = 'Příjemky'
        ordering = ['-receipt_date', '-number']
        indexes = [
            models.Index(fields=['number']),
            models.Index(fields=['status']),
            models.Index(fields=['receipt_date']),
        ]

    def __str__(self):
        return f'{self.number} - {self.supplier.name}'

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self.generate_number()
        super().save(*args, **kwargs)

    @classmethod
    def generate_number(cls):
        """Generate unique receipt number in format SR-YYYY-NNN."""
        year = date.today().year
        prefix = f'SR-{year}-'

        last_receipt = cls.objects.filter(
            number__startswith=prefix
        ).order_by('-number').first()

        if last_receipt:
            try:
                last_num = int(last_receipt.number.split('-')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1
        else:
            new_num = 1

        return f'{prefix}{new_num:03d}'

    @property
    def total_amount(self) -> Decimal:
        """Calculate total amount of receipt."""
        return sum(item.total_price for item in self.items.all())

    @property
    def is_editable(self) -> bool:
        """Check if receipt can be edited."""
        return self.status == self.STATUS_DRAFT


class StockReceiptItem(models.Model):
    """
    Line item for stock receipt.
    """
    receipt = models.ForeignKey(
        StockReceipt,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Příjemka'
    )
    material = models.ForeignKey(
        Material,
        on_delete=models.PROTECT,
        related_name='receipt_items',
        verbose_name='Materiál'
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))],
        verbose_name='Množství'
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Jednotková cena'
    )
    total_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        editable=False,
        verbose_name='Celková cena'
    )

    class Meta:
        verbose_name = 'Položka příjemky'
        verbose_name_plural = 'Položky příjemky'

    def __str__(self):
        return f'{self.receipt.number} - {self.material.name}'

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class StockWriteOff(AuditMixin, models.Model):
    """
    Stock write-off document for outgoing materials to projects.
    """
    STATUS_DRAFT = 'draft'
    STATUS_POSTED = 'posted'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Koncept'),
        (STATUS_POSTED, 'Zaúčtováno'),
        (STATUS_CANCELLED, 'Zrušeno'),
    ]

    number = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Číslo výdejky'
    )
    writeoff_date = models.DateField(
        default=date.today,
        verbose_name='Datum výdeje'
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.PROTECT,
        related_name='stock_writeoffs',
        verbose_name='Projekt'
    )
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='stock_writeoffs',
        verbose_name='Odpovědná osoba'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        verbose_name='Stav'
    )
    notes = models.TextField(
        blank=True,
        verbose_name='Poznámky'
    )

    class Meta:
        verbose_name = 'Výdejka'
        verbose_name_plural = 'Výdejky'
        ordering = ['-writeoff_date', '-number']
        indexes = [
            models.Index(fields=['number']),
            models.Index(fields=['status']),
            models.Index(fields=['writeoff_date']),
            models.Index(fields=['project']),
        ]

    def __str__(self):
        return f'{self.number} - {self.project.name}'

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self.generate_number()
        super().save(*args, **kwargs)

    @classmethod
    def generate_number(cls):
        """Generate unique write-off number in format SW-YYYY-NNN."""
        year = date.today().year
        prefix = f'SW-{year}-'

        last_writeoff = cls.objects.filter(
            number__startswith=prefix
        ).order_by('-number').first()

        if last_writeoff:
            try:
                last_num = int(last_writeoff.number.split('-')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1
        else:
            new_num = 1

        return f'{prefix}{new_num:03d}'

    @property
    def total_amount(self) -> Decimal:
        """Calculate total amount of write-off."""
        return sum(item.total_price for item in self.items.all())

    @property
    def is_editable(self) -> bool:
        """Check if write-off can be edited."""
        return self.status == self.STATUS_DRAFT


class StockWriteOffItem(models.Model):
    """
    Line item for stock write-off.
    """
    writeoff = models.ForeignKey(
        StockWriteOff,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Výdejka'
    )
    material = models.ForeignKey(
        Material,
        on_delete=models.PROTECT,
        related_name='writeoff_items',
        verbose_name='Materiál'
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))],
        verbose_name='Množství'
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        editable=False,
        verbose_name='Jednotková cena'
    )
    total_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        editable=False,
        verbose_name='Celková cena'
    )

    class Meta:
        verbose_name = 'Položka výdejky'
        verbose_name_plural = 'Položky výdejky'

    def __str__(self):
        return f'{self.writeoff.number} - {self.material.name}'

    def save(self, *args, **kwargs):
        # Use material's current purchase price
        self.unit_price = self.material.purchase_price
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)
