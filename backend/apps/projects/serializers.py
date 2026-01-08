from rest_framework import serializers

from apps.users.serializers import UserListSerializer

from .models import Project, ProjectFile, ProjectHistory


class ProjectFileSerializer(serializers.ModelSerializer):
    """Serializer for project files."""
    file_url = serializers.SerializerMethodField()
    uploaded_by = UserListSerializer(source='created_by', read_only=True)

    class Meta:
        model = ProjectFile
        fields = [
            'id',
            'project',
            'file',
            'file_url',
            'name',
            'file_type',
            'description',
            'file_size',
            'file_extension',
            'uploaded_by',
            'created_at',
        ]
        read_only_fields = ['id', 'file_size', 'file_extension', 'created_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class ProjectFileUploadSerializer(serializers.ModelSerializer):
    """Serializer for uploading project files."""

    class Meta:
        model = ProjectFile
        fields = ['file', 'name', 'file_type', 'description']

    def validate_file(self, value):
        # Max 50MB
        max_size = 50 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                'Soubor je příliš velký. Maximum je 50 MB.'
            )
        return value


class ProjectHistorySerializer(serializers.ModelSerializer):
    """Serializer for project history."""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = ProjectHistory
        fields = [
            'id',
            'action',
            'action_display',
            'description',
            'old_value',
            'new_value',
            'user',
            'user_name',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ProjectListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for project lists."""
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    work_type_display = serializers.CharField(source='get_work_type_display', read_only=True)

    class Meta:
        model = Project
        fields = [
            'id',
            'number',
            'name',
            'client_name',
            'site_address',
            'status',
            'status_display',
            'work_type',
            'work_type_display',
            'manager',
            'manager_name',
            'planned_budget',
            'start_date',
            'planned_end_date',
            'created_at',
        ]


class ProjectSerializer(serializers.ModelSerializer):
    """Full serializer for project details."""
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    work_type_display = serializers.CharField(source='get_work_type_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.get_full_name', read_only=True)

    # Computed fields
    actual_costs = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    invoiced_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    paid_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    outstanding_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    # Related counts
    files_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id',
            'number',
            'name',
            'description',
            # Client info
            'client_name',
            'client_ico',
            'client_dic',
            'client_address',
            'client_contact_person',
            'client_phone',
            'client_email',
            # Location
            'site_address',
            # Details
            'work_type',
            'work_type_display',
            'manager',
            'manager_name',
            'status',
            'status_display',
            # Financial
            'planned_budget',
            'actual_costs',
            'invoiced_amount',
            'paid_amount',
            'outstanding_amount',
            # Dates
            'start_date',
            'planned_end_date',
            'actual_end_date',
            # Notes
            'notes',
            # Counts
            'files_count',
            # Audit
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
            'updated_by',
            'updated_by_name',
        ]
        read_only_fields = [
            'id', 'number', 'created_at', 'updated_at',
            'created_by', 'updated_by'
        ]

    def get_files_count(self, obj):
        return obj.files.count()


class ProjectCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating projects."""

    class Meta:
        model = Project
        fields = [
            'name',
            'description',
            'client_name',
            'client_ico',
            'client_dic',
            'client_address',
            'client_contact_person',
            'client_phone',
            'client_email',
            'site_address',
            'work_type',
            'manager',
            'status',
            'planned_budget',
            'start_date',
            'planned_end_date',
            'notes',
        ]

    def validate_client_ico(self, value):
        if value:
            from .services.ares import validate_ico
            if not validate_ico(value):
                raise serializers.ValidationError('Neplatné IČO')
        return value


class ProjectUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating projects."""

    class Meta:
        model = Project
        fields = [
            'name',
            'description',
            'client_name',
            'client_ico',
            'client_dic',
            'client_address',
            'client_contact_person',
            'client_phone',
            'client_email',
            'site_address',
            'work_type',
            'manager',
            'status',
            'planned_budget',
            'start_date',
            'planned_end_date',
            'actual_end_date',
            'notes',
        ]

    def validate_client_ico(self, value):
        if value:
            from .services.ares import validate_ico
            if not validate_ico(value):
                raise serializers.ValidationError('Neplatné IČO')
        return value


class AresVerifySerializer(serializers.Serializer):
    """Serializer for ARES IČO verification request."""
    ico = serializers.CharField(max_length=8, min_length=8)

    def validate_ico(self, value):
        if not value.isdigit():
            raise serializers.ValidationError('IČO musí obsahovat pouze číslice')
        return value


class AresResponseSerializer(serializers.Serializer):
    """Serializer for ARES verification response."""
    ico = serializers.CharField()
    name = serializers.CharField()
    dic = serializers.CharField(allow_blank=True)
    address = serializers.CharField(allow_blank=True)
    legal_form = serializers.CharField(allow_blank=True)
