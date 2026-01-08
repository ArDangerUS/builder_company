"""
Serializers for Settings app.
"""
from rest_framework import serializers

from .models import CompanySettings, Supplier, WorkType


class CompanySettingsSerializer(serializers.ModelSerializer):
    """Serializer for CompanySettings model."""
    full_address = serializers.ReadOnlyField()
    logo_url = serializers.SerializerMethodField()
    stamp_url = serializers.SerializerMethodField()
    signature_url = serializers.SerializerMethodField()

    class Meta:
        model = CompanySettings
        fields = [
            'id',
            'company_name_cs',
            'company_name_en',
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
            'bank_name',
            'bank_account',
            'iban',
            'swift',
            'logo',
            'logo_url',
            'stamp',
            'stamp_url',
            'signature',
            'signature_url',
            'invoice_notes',
            'registration_court',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None

    def get_stamp_url(self, obj):
        if obj.stamp:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.stamp.url)
            return obj.stamp.url
        return None

    def get_signature_url(self, obj):
        if obj.signature:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.signature.url)
            return obj.signature.url
        return None


class SupplierSerializer(serializers.ModelSerializer):
    """Serializer for Supplier model."""

    class Meta:
        model = Supplier
        fields = [
            'id',
            'name',
            'ico',
            'dic',
            'contact_person',
            'phone',
            'email',
            'address',
            'bank_account',
            'notes',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SupplierListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for supplier list."""

    class Meta:
        model = Supplier
        fields = ['id', 'name', 'ico', 'contact_person', 'phone', 'email', 'is_active']


class WorkTypeSerializer(serializers.ModelSerializer):
    """Serializer for WorkType model."""

    class Meta:
        model = WorkType
        fields = [
            'id',
            'name',
            'code',
            'description',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
