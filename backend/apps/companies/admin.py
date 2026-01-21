"""
Admin configuration for Companies app.
"""
from django.contrib import admin

from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    """Admin for Company model."""
    list_display = ['name', 'slug', 'ico', 'city', 'phone', 'email', 'is_active']
    list_filter = ['is_active', 'country']
    search_fields = ['name', 'slug', 'ico', 'email']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']

    fieldsets = (
        ('Základní údaje', {
            'fields': ('name', 'slug', 'ico', 'dic', 'registration_court', 'is_active')
        }),
        ('Adresa', {
            'fields': ('street', 'city', 'postal_code', 'country')
        }),
        ('Kontakt', {
            'fields': ('phone', 'email', 'website')
        }),
        ('Bankovní údaje', {
            'fields': ('bank_account', 'iban', 'swift')
        }),
        ('Dokumenty', {
            'fields': ('logo', 'stamp', 'signature')
        }),
        ('Další nastavení', {
            'fields': ('invoice_notes',)
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)
