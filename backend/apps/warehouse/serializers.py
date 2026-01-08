"""
Serializers for Warehouse app.
"""
from decimal import Decimal
from rest_framework import serializers

from .models import (
    Category,
    Material,
    StockReceipt,
    StockReceiptItem,
    StockWriteOff,
    StockWriteOffItem,
)


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model."""

    materials_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'description', 'is_active', 'order',
            'materials_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_materials_count(self, obj):
        return obj.materials.filter(is_active=True).count()


class CategoryListSerializer(serializers.ModelSerializer):
    """Simplified serializer for Category list/choices."""

    class Meta:
        model = Category
        fields = ['id', 'name', 'is_active', 'order']


class MaterialSerializer(serializers.ModelSerializer):
    """Serializer for Material model."""

    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    stock_value = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Material
        fields = [
            'id', 'name', 'sku', 'category', 'category_name',
            'unit', 'purchase_price', 'current_stock', 'min_stock',
            'supplier', 'supplier_name', 'photo', 'photo_url',
            'notes', 'is_active', 'is_low_stock', 'stock_value',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['current_stock', 'created_at', 'updated_at']

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None


class MaterialListSerializer(serializers.ModelSerializer):
    """Simplified serializer for Material list."""

    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    stock_value = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )

    class Meta:
        model = Material
        fields = [
            'id', 'name', 'sku', 'category', 'category_name',
            'unit', 'purchase_price', 'current_stock', 'min_stock',
            'supplier_name', 'is_active', 'is_low_stock', 'stock_value'
        ]


class MaterialChoiceSerializer(serializers.ModelSerializer):
    """Minimal serializer for Material dropdown choices."""

    class Meta:
        model = Material
        fields = ['id', 'name', 'sku', 'unit', 'purchase_price', 'current_stock']


# Stock Receipt Serializers

class StockReceiptItemSerializer(serializers.ModelSerializer):
    """Serializer for StockReceiptItem model."""

    material_name = serializers.CharField(source='material.name', read_only=True)
    material_sku = serializers.CharField(source='material.sku', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)

    class Meta:
        model = StockReceiptItem
        fields = [
            'id', 'material', 'material_name', 'material_sku', 'material_unit',
            'quantity', 'unit_price', 'total_price'
        ]
        read_only_fields = ['total_price']


class StockReceiptSerializer(serializers.ModelSerializer):
    """Serializer for StockReceipt model."""

    items = StockReceiptItemSerializer(many=True, required=False)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    responsible_name = serializers.CharField(
        source='responsible.get_full_name', read_only=True
    )
    total_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    is_editable = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    invoice_file_url = serializers.SerializerMethodField()

    class Meta:
        model = StockReceipt
        fields = [
            'id', 'number', 'receipt_date', 'supplier', 'supplier_name',
            'responsible', 'responsible_name', 'status', 'status_display',
            'invoice_number', 'invoice_file', 'invoice_file_url',
            'notes', 'items', 'total_amount', 'is_editable',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['number', 'status', 'created_at', 'updated_at']

    def get_invoice_file_url(self, obj):
        if obj.invoice_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.invoice_file.url)
            return obj.invoice_file.url
        return None

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        receipt = StockReceipt.objects.create(**validated_data)

        for item_data in items_data:
            StockReceiptItem.objects.create(receipt=receipt, **item_data)

        return receipt

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        # Update receipt fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update items if provided
        if items_data is not None:
            # Delete existing items
            instance.items.all().delete()
            # Create new items
            for item_data in items_data:
                StockReceiptItem.objects.create(receipt=instance, **item_data)

        return instance


class StockReceiptListSerializer(serializers.ModelSerializer):
    """Simplified serializer for StockReceipt list."""

    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    responsible_name = serializers.CharField(
        source='responsible.get_full_name', read_only=True
    )
    total_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = StockReceipt
        fields = [
            'id', 'number', 'receipt_date', 'supplier_name',
            'responsible_name', 'status', 'status_display',
            'total_amount', 'items_count'
        ]

    def get_items_count(self, obj):
        return obj.items.count()


# Stock Write-off Serializers

class StockWriteOffItemSerializer(serializers.ModelSerializer):
    """Serializer for StockWriteOffItem model."""

    material_name = serializers.CharField(source='material.name', read_only=True)
    material_sku = serializers.CharField(source='material.sku', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)
    available_stock = serializers.DecimalField(
        source='material.current_stock',
        max_digits=12, decimal_places=3,
        read_only=True
    )

    class Meta:
        model = StockWriteOffItem
        fields = [
            'id', 'material', 'material_name', 'material_sku', 'material_unit',
            'quantity', 'unit_price', 'total_price', 'available_stock'
        ]
        read_only_fields = ['unit_price', 'total_price']


class StockWriteOffSerializer(serializers.ModelSerializer):
    """Serializer for StockWriteOff model."""

    items = StockWriteOffItemSerializer(many=True, required=False)
    project_name = serializers.CharField(source='project.name', read_only=True)
    responsible_name = serializers.CharField(
        source='responsible.get_full_name', read_only=True
    )
    total_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    is_editable = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = StockWriteOff
        fields = [
            'id', 'number', 'writeoff_date', 'project', 'project_name',
            'responsible', 'responsible_name', 'status', 'status_display',
            'notes', 'items', 'total_amount', 'is_editable',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['number', 'status', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        writeoff = StockWriteOff.objects.create(**validated_data)

        for item_data in items_data:
            StockWriteOffItem.objects.create(writeoff=writeoff, **item_data)

        return writeoff

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        # Update write-off fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update items if provided
        if items_data is not None:
            # Delete existing items
            instance.items.all().delete()
            # Create new items
            for item_data in items_data:
                StockWriteOffItem.objects.create(writeoff=instance, **item_data)

        return instance


class StockWriteOffListSerializer(serializers.ModelSerializer):
    """Simplified serializer for StockWriteOff list."""

    project_name = serializers.CharField(source='project.name', read_only=True)
    responsible_name = serializers.CharField(
        source='responsible.get_full_name', read_only=True
    )
    total_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = StockWriteOff
        fields = [
            'id', 'number', 'writeoff_date', 'project_name',
            'responsible_name', 'status', 'status_display',
            'total_amount', 'items_count'
        ]

    def get_items_count(self, obj):
        return obj.items.count()


# Report Serializers

class StockReportSerializer(serializers.ModelSerializer):
    """Serializer for stock report."""

    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    stock_value = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )

    class Meta:
        model = Material
        fields = [
            'id', 'name', 'sku', 'category_name', 'unit',
            'purchase_price', 'current_stock', 'min_stock',
            'supplier_name', 'is_low_stock', 'stock_value'
        ]


class StockMovementSerializer(serializers.Serializer):
    """Serializer for stock movement report."""

    date = serializers.DateField()
    type = serializers.CharField()
    document_number = serializers.CharField()
    material_name = serializers.CharField()
    material_sku = serializers.CharField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_price = serializers.DecimalField(max_digits=14, decimal_places=2)
    direction = serializers.CharField()
    supplier = serializers.CharField(allow_null=True)
    project = serializers.CharField(allow_null=True)
