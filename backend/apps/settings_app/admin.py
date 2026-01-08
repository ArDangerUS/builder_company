"""
Admin configuration for Settings app.
"""
from django.contrib import admin

from .models import CompanySettings, Supplier, WorkType


@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    """Admin for CompanySettings model."""
    list_display = ['company_name_cs', 'ico', 'city', 'phone', 'email']
    fieldsets = (
        ('Základní údaje', {
            'fields': ('company_name_cs', 'company_name_en', 'ico', 'dic', 'registration_court')
        }),
        ('Adresa', {
            'fields': ('street', 'city', 'postal_code', 'country')
        }),
        ('Kontakt', {
            'fields': ('phone', 'email', 'website')
        }),
        ('Bankovní údaje', {
            'fields': ('bank_name', 'bank_account', 'iban', 'swift')
        }),
        ('Dokumenty', {
            'fields': ('logo', 'stamp', 'signature')
        }),
        ('Další nastavení', {
            'fields': ('invoice_notes',)
        }),
    )

    def has_add_permission(self, request):
        # Only allow one instance
        return not CompanySettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # Don't allow deleting the singleton
        return False


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    """Admin for Supplier model."""
    list_display = ['name', 'ico', 'contact_person', 'phone', 'email', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'ico', 'contact_person', 'email']
    ordering = ['name']


@admin.register(WorkType)
class WorkTypeAdmin(admin.ModelAdmin):
    """Admin for WorkType model."""
    list_display = ['name', 'code', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'code']
    ordering = ['name']
