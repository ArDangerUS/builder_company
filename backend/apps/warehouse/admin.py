"""
Admin configuration for Warehouse app.
"""
from django.contrib import admin
from .models import (
    Category,
    Material,
    StockReceipt,
    StockReceiptItem,
    StockWriteOff,
    StockWriteOffItem,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'order', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    ordering = ['order', 'name']


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = [
        'sku', 'name', 'category', 'unit',
        'current_stock', 'min_stock', 'purchase_price', 'is_active'
    ]
    list_filter = ['category', 'is_active', 'supplier']
    search_fields = ['name', 'sku']
    readonly_fields = ['current_stock']
    autocomplete_fields = ['category', 'supplier']
    ordering = ['name']


class StockReceiptItemInline(admin.TabularInline):
    model = StockReceiptItem
    extra = 1
    autocomplete_fields = ['material']
    readonly_fields = ['total_price']


@admin.register(StockReceipt)
class StockReceiptAdmin(admin.ModelAdmin):
    list_display = [
        'number', 'receipt_date', 'supplier',
        'responsible', 'status', 'created_at'
    ]
    list_filter = ['status', 'supplier', 'receipt_date']
    search_fields = ['number', 'invoice_number']
    date_hierarchy = 'receipt_date'
    readonly_fields = ['number']
    inlines = [StockReceiptItemInline]
    autocomplete_fields = ['supplier', 'responsible']


class StockWriteOffItemInline(admin.TabularInline):
    model = StockWriteOffItem
    extra = 1
    autocomplete_fields = ['material']
    readonly_fields = ['unit_price', 'total_price']


@admin.register(StockWriteOff)
class StockWriteOffAdmin(admin.ModelAdmin):
    list_display = [
        'number', 'writeoff_date', 'project',
        'responsible', 'status', 'created_at'
    ]
    list_filter = ['status', 'project', 'writeoff_date']
    search_fields = ['number']
    date_hierarchy = 'writeoff_date'
    readonly_fields = ['number']
    inlines = [StockWriteOffItemInline]
    autocomplete_fields = ['project', 'responsible']
