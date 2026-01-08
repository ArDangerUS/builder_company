from django.contrib import admin

from .models import Invoice, InvoiceItem, InvoiceHistory, Payment


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1
    readonly_fields = ['total_price']


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ['created_at', 'created_by']


class InvoiceHistoryInline(admin.TabularInline):
    model = InvoiceHistory
    extra = 0
    readonly_fields = ['action', 'description', 'old_value', 'new_value', 'user', 'created_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        'number', 'client_name', 'project', 'status', 'issue_date',
        'due_date', 'total_amount', 'paid_amount', 'amount_due'
    ]
    list_filter = ['status', 'issue_date', 'due_date', 'project']
    search_fields = ['number', 'client_name', 'client_ico', 'project__name']
    readonly_fields = ['number', 'total_amount', 'paid_amount', 'amount_due',
                       'created_at', 'updated_at', 'created_by', 'updated_by']
    ordering = ['-issue_date', '-number']
    inlines = [InvoiceItemInline, PaymentInline, InvoiceHistoryInline]
    date_hierarchy = 'issue_date'

    fieldsets = (
        ('Základní informace', {
            'fields': ('number', 'project', 'status')
        }),
        ('Klient', {
            'fields': ('client_name', 'client_ico', 'client_dic', 'client_address')
        }),
        ('Data', {
            'fields': ('issue_date', 'due_date', 'taxable_date')
        }),
        ('Platba', {
            'fields': ('bank_account', 'variable_symbol')
        }),
        ('Částky', {
            'fields': ('total_amount', 'paid_amount', 'amount_due'),
            'classes': ('collapse',)
        }),
        ('Poznámky', {
            'fields': ('notes', 'internal_notes'),
            'classes': ('collapse',)
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


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'payment_date', 'amount', 'payment_method', 'document_number']
    list_filter = ['payment_method', 'payment_date']
    search_fields = ['invoice__number', 'document_number']
    readonly_fields = ['created_at', 'created_by']


@admin.register(InvoiceHistory)
class InvoiceHistoryAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'action', 'description', 'user', 'created_at']
    list_filter = ['action', 'created_at']
    search_fields = ['invoice__number', 'description']
    readonly_fields = ['invoice', 'action', 'description', 'old_value', 'new_value', 'user', 'created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
