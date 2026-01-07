from django.contrib import admin

from .models import Project, ProjectFile, ProjectHistory


class ProjectFileInline(admin.TabularInline):
    model = ProjectFile
    extra = 0
    readonly_fields = ['file_size', 'created_at', 'created_by']


class ProjectHistoryInline(admin.TabularInline):
    model = ProjectHistory
    extra = 0
    readonly_fields = ['action', 'description', 'old_value', 'new_value', 'user', 'created_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = [
        'number', 'name', 'client_name', 'status', 'manager',
        'planned_budget', 'start_date', 'created_at'
    ]
    list_filter = ['status', 'work_type', 'manager', 'created_at']
    search_fields = ['number', 'name', 'client_name', 'client_ico']
    readonly_fields = ['number', 'created_at', 'updated_at', 'created_by', 'updated_by']
    ordering = ['-created_at']
    inlines = [ProjectFileInline, ProjectHistoryInline]

    fieldsets = (
        ('Základní informace', {
            'fields': ('number', 'name', 'description')
        }),
        ('Klient', {
            'fields': (
                'client_name', 'client_ico', 'client_dic', 'client_address',
                'client_contact_person', 'client_phone', 'client_email'
            )
        }),
        ('Projekt', {
            'fields': ('site_address', 'work_type', 'manager', 'status')
        }),
        ('Finance a termíny', {
            'fields': ('planned_budget', 'start_date', 'planned_end_date', 'actual_end_date')
        }),
        ('Poznámky', {
            'fields': ('notes',)
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


@admin.register(ProjectFile)
class ProjectFileAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'file_type', 'file_size', 'created_at']
    list_filter = ['file_type', 'created_at']
    search_fields = ['name', 'project__number', 'project__name']
    readonly_fields = ['file_size', 'created_at', 'created_by']


@admin.register(ProjectHistory)
class ProjectHistoryAdmin(admin.ModelAdmin):
    list_display = ['project', 'action', 'description', 'user', 'created_at']
    list_filter = ['action', 'created_at']
    search_fields = ['project__number', 'project__name', 'description']
    readonly_fields = ['project', 'action', 'description', 'old_value', 'new_value', 'user', 'created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
