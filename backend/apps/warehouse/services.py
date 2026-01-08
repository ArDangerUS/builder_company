"""
Warehouse services for stock operations.
Handles posting and cancelling of receipts and write-offs.
"""
from decimal import Decimal
from typing import Optional

from django.db import transaction
from django.core.exceptions import ValidationError

from .models import Material, StockReceipt, StockWriteOff


class StockService:
    """Service for managing stock operations."""

    @staticmethod
    @transaction.atomic
    def post_receipt(receipt: StockReceipt, user=None) -> StockReceipt:
        """
        Post a stock receipt - increases stock levels.

        Args:
            receipt: StockReceipt instance to post
            user: User performing the action

        Returns:
            Updated StockReceipt instance

        Raises:
            ValidationError: If receipt cannot be posted
        """
        if receipt.status != StockReceipt.STATUS_DRAFT:
            raise ValidationError('Pouze příjemku ve stavu "Koncept" lze zaúčtovat.')

        if not receipt.items.exists():
            raise ValidationError('Příjemka musí obsahovat alespoň jednu položku.')

        # Update stock for each item
        for item in receipt.items.all():
            material = item.material
            material.current_stock += item.quantity
            # Update purchase price to latest
            material.purchase_price = item.unit_price
            material.save(update_fields=['current_stock', 'purchase_price', 'updated_at'])

        # Update receipt status
        receipt.status = StockReceipt.STATUS_POSTED
        if user:
            receipt.updated_by = user
        receipt.save(update_fields=['status', 'updated_at', 'updated_by'])

        return receipt

    @staticmethod
    @transaction.atomic
    def cancel_receipt(receipt: StockReceipt, user=None) -> StockReceipt:
        """
        Cancel a posted stock receipt - decreases stock levels.

        Args:
            receipt: StockReceipt instance to cancel
            user: User performing the action

        Returns:
            Updated StockReceipt instance

        Raises:
            ValidationError: If receipt cannot be cancelled
        """
        if receipt.status != StockReceipt.STATUS_POSTED:
            raise ValidationError('Pouze zaúčtovanou příjemku lze stornovat.')

        # Check if we have enough stock to cancel
        for item in receipt.items.all():
            material = item.material
            if material.current_stock < item.quantity:
                raise ValidationError(
                    f'Nelze stornovat příjemku. Materiál "{material.name}" '
                    f'nemá dostatek zásob (aktuálně: {material.current_stock}, '
                    f'požadováno: {item.quantity}).'
                )

        # Decrease stock for each item
        for item in receipt.items.all():
            material = item.material
            material.current_stock -= item.quantity
            material.save(update_fields=['current_stock', 'updated_at'])

        # Update receipt status
        receipt.status = StockReceipt.STATUS_CANCELLED
        if user:
            receipt.updated_by = user
        receipt.save(update_fields=['status', 'updated_at', 'updated_by'])

        return receipt

    @staticmethod
    @transaction.atomic
    def post_writeoff(writeoff: StockWriteOff, user=None) -> StockWriteOff:
        """
        Post a stock write-off - decreases stock levels.

        Args:
            writeoff: StockWriteOff instance to post
            user: User performing the action

        Returns:
            Updated StockWriteOff instance

        Raises:
            ValidationError: If write-off cannot be posted
        """
        if writeoff.status != StockWriteOff.STATUS_DRAFT:
            raise ValidationError('Pouze výdejku ve stavu "Koncept" lze zaúčtovat.')

        if not writeoff.items.exists():
            raise ValidationError('Výdejka musí obsahovat alespoň jednu položku.')

        # Validate stock availability for all items first
        insufficient_items = []
        for item in writeoff.items.all():
            material = item.material
            if material.current_stock < item.quantity:
                insufficient_items.append(
                    f'"{material.name}" (dostupné: {material.current_stock}, '
                    f'požadováno: {item.quantity})'
                )

        if insufficient_items:
            raise ValidationError(
                'Nedostatek zásob pro následující materiály:\n' +
                '\n'.join(insufficient_items)
            )

        # Decrease stock for each item
        for item in writeoff.items.all():
            material = item.material
            material.current_stock -= item.quantity
            material.save(update_fields=['current_stock', 'updated_at'])

        # Update write-off status
        writeoff.status = StockWriteOff.STATUS_POSTED
        if user:
            writeoff.updated_by = user
        writeoff.save(update_fields=['status', 'updated_at', 'updated_by'])

        return writeoff

    @staticmethod
    @transaction.atomic
    def cancel_writeoff(writeoff: StockWriteOff, user=None) -> StockWriteOff:
        """
        Cancel a posted stock write-off - increases stock levels back.

        Args:
            writeoff: StockWriteOff instance to cancel
            user: User performing the action

        Returns:
            Updated StockWriteOff instance

        Raises:
            ValidationError: If write-off cannot be cancelled
        """
        if writeoff.status != StockWriteOff.STATUS_POSTED:
            raise ValidationError('Pouze zaúčtovanou výdejku lze stornovat.')

        # Return stock for each item
        for item in writeoff.items.all():
            material = item.material
            material.current_stock += item.quantity
            material.save(update_fields=['current_stock', 'updated_at'])

        # Update write-off status
        writeoff.status = StockWriteOff.STATUS_CANCELLED
        if user:
            writeoff.updated_by = user
        writeoff.save(update_fields=['status', 'updated_at', 'updated_by'])

        return writeoff

    @staticmethod
    def get_low_stock_materials():
        """
        Get all materials with stock below minimum level.

        Returns:
            QuerySet of Material objects with low stock
        """
        from django.db.models import F
        return Material.objects.filter(
            is_active=True,
            current_stock__lt=F('min_stock')
        ).select_related('category', 'supplier')

    @staticmethod
    def get_stock_movements(
        material: Optional[Material] = None,
        date_from=None,
        date_to=None
    ):
        """
        Get stock movements for a material or all materials.

        Args:
            material: Optional Material to filter by
            date_from: Start date for the period
            date_to: End date for the period

        Returns:
            List of movement dictionaries
        """
        from django.db.models import Q

        movements = []

        # Get receipt items
        receipt_items = StockReceipt.objects.filter(
            status=StockReceipt.STATUS_POSTED
        ).prefetch_related('items__material')

        if date_from:
            receipt_items = receipt_items.filter(receipt_date__gte=date_from)
        if date_to:
            receipt_items = receipt_items.filter(receipt_date__lte=date_to)

        for receipt in receipt_items:
            items = receipt.items.all()
            if material:
                items = items.filter(material=material)
            for item in items:
                movements.append({
                    'date': receipt.receipt_date,
                    'type': 'receipt',
                    'document_number': receipt.number,
                    'material_name': item.material.name,
                    'material_sku': item.material.sku,
                    'quantity': item.quantity,
                    'unit_price': item.unit_price,
                    'total_price': item.total_price,
                    'direction': '+',
                    'supplier': receipt.supplier.name if receipt.supplier else None,
                    'project': None,
                })

        # Get write-off items
        writeoff_items = StockWriteOff.objects.filter(
            status=StockWriteOff.STATUS_POSTED
        ).prefetch_related('items__material', 'project')

        if date_from:
            writeoff_items = writeoff_items.filter(writeoff_date__gte=date_from)
        if date_to:
            writeoff_items = writeoff_items.filter(writeoff_date__lte=date_to)

        for writeoff in writeoff_items:
            items = writeoff.items.all()
            if material:
                items = items.filter(material=material)
            for item in items:
                movements.append({
                    'date': writeoff.writeoff_date,
                    'type': 'writeoff',
                    'document_number': writeoff.number,
                    'material_name': item.material.name,
                    'material_sku': item.material.sku,
                    'quantity': item.quantity,
                    'unit_price': item.unit_price,
                    'total_price': item.total_price,
                    'direction': '-',
                    'supplier': None,
                    'project': writeoff.project.name if writeoff.project else None,
                })

        # Sort by date descending
        movements.sort(key=lambda x: x['date'], reverse=True)

        return movements
