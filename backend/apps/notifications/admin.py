"""
Admin configuration for Notifications app.
"""
from django.contrib import admin

from .models import NotificationLog


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    """Admin for NotificationLog model."""
    list_display = [
        'notification_type',
        'recipient_email',
        'subject',
        'status',
        'created_at',
        'sent_at'
    ]
    list_filter = ['notification_type', 'status', 'created_at']
    search_fields = ['recipient_email', 'subject', 'message']
    readonly_fields = [
        'notification_type',
        'recipient',
        'recipient_email',
        'subject',
        'message',
        'status',
        'error_message',
        'content_type',
        'object_id',
        'created_at',
        'sent_at'
    ]
    ordering = ['-created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
