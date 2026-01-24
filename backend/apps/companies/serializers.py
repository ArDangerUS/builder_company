"""
Serializers for Company model.
"""
from rest_framework import serializers

from .models import Company


class CompanyListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for company lists.
    """
    users_count = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            'id',
            'name',
            'slug',
            'ico',
            'city',
            'is_active',
            'users_count',
            'created_at',
        ]

    def get_users_count(self, obj):
        return obj.users.count()


class CompanyDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for company details.
    """
    full_address = serializers.CharField(read_only=True)
    users_count = serializers.SerializerMethodField()
    projects_count = serializers.SerializerMethodField()
    invoices_count = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            'id',
            'name',
            'slug',
            'ico',
            'dic',
            'street',
            'city',
            'postal_code',
            'country',
            'full_address',
            'phone',
            'email',
            'website',
            'bank_account',
            'iban',
            'swift',
            'logo',
            'stamp',
            'signature',
            'invoice_notes',
            'registration_court',
            'is_active',
            'users_count',
            'projects_count',
            'invoices_count',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at', 'created_by', 'updated_by']

    def get_users_count(self, obj):
        return obj.users.count()

    def get_projects_count(self, obj):
        return obj.projects.count() if hasattr(obj, 'projects') else 0

    def get_invoices_count(self, obj):
        return obj.invoices.count() if hasattr(obj, 'invoices') else 0


class CompanyCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating companies.
    """
    class Meta:
        model = Company
        fields = [
            'name',
            'slug',
            'ico',
            'dic',
            'street',
            'city',
            'postal_code',
            'country',
            'phone',
            'email',
            'website',
            'bank_account',
            'iban',
            'swift',
            'logo',
            'stamp',
            'signature',
            'invoice_notes',
            'registration_court',
            'is_active',
        ]
        extra_kwargs = {
            'slug': {'required': False},
        }

    def validate_slug(self, value):
        """Ensure slug is unique."""
        instance = self.instance
        if Company.objects.filter(slug=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError('Tento slug již existuje.')
        return value


class CompanyStatsSerializer(serializers.Serializer):
    """
    Serializer for company statistics.
    """
    users_count = serializers.IntegerField()
    active_users_count = serializers.IntegerField()
    projects_count = serializers.IntegerField()
    active_projects_count = serializers.IntegerField()
    invoices_count = serializers.IntegerField()
    total_invoiced = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=14, decimal_places=2)
    materials_count = serializers.IntegerField()
    suppliers_count = serializers.IntegerField()
