"""
Serializers for the invoices API.
"""
from decimal import Decimal

from rest_framework import serializers

from apps.projects.models import Project
from .models import Invoice, InvoiceItem, InvoiceHistory, Payment


class InvoiceItemSerializer(serializers.ModelSerializer):
    """Serializer for invoice items."""
    total_price = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    unit_display = serializers.CharField(source='get_unit_display', read_only=True)

    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'name', 'description', 'quantity', 'unit', 'unit_display',
            'unit_price', 'total_price', 'order'
        ]


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for payments."""
    payment_method_display = serializers.CharField(
        source='get_payment_method_display', read_only=True
    )
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', read_only=True
    )

    class Meta:
        model = Payment
        fields = [
            'id', 'invoice', 'payment_date', 'amount', 'payment_method',
            'payment_method_display', 'document_number', 'notes',
            'created_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['invoice', 'created_at', 'created_by']


class PaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating payments."""

    class Meta:
        model = Payment
        fields = [
            'payment_date', 'amount', 'payment_method', 'document_number', 'notes'
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Částka musí být kladná.')
        return value


class InvoiceHistorySerializer(serializers.ModelSerializer):
    """Serializer for invoice history."""
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = InvoiceHistory
        fields = [
            'id', 'action', 'action_display', 'description',
            'old_value', 'new_value', 'user', 'user_name', 'created_at'
        ]


class InvoiceListSerializer(serializers.ModelSerializer):
    """Serializer for invoice list view."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    invoice_type_display = serializers.CharField(source='get_invoice_type_display', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    project_number = serializers.CharField(source='project.number', read_only=True)
    total_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    paid_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    amount_due = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    is_overdue = serializers.BooleanField(read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'number', 'invoice_type', 'invoice_type_display',
            'client_name', 'project', 'project_name', 'project_number',
            'status', 'status_display', 'issue_date', 'due_date',
            'total_amount', 'paid_amount', 'amount_due', 'is_overdue',
            'items_count', 'created_at'
        ]

    def get_items_count(self, obj):
        return obj.items.count()


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for invoice detail view."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    invoice_type_display = serializers.CharField(source='get_invoice_type_display', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    project_number = serializers.CharField(source='project.number', read_only=True)
    total_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    paid_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    amount_due = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    is_overdue = serializers.BooleanField(read_only=True)
    is_editable = serializers.BooleanField(read_only=True)
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', read_only=True
    )
    updated_by_name = serializers.CharField(
        source='updated_by.get_full_name', read_only=True
    )

    class Meta:
        model = Invoice
        fields = [
            'id', 'number', 'invoice_type', 'invoice_type_display',
            'issue_date', 'due_date', 'taxable_date',
            'project', 'project_name', 'project_number',
            'client_name', 'client_ico', 'client_dic', 'client_address',
            'status', 'status_display', 'notes', 'internal_notes',
            'bank_account', 'variable_symbol',
            'total_amount', 'paid_amount', 'amount_due',
            'is_overdue', 'is_editable',
            'items', 'payments',
            'created_at', 'updated_at', 'created_by', 'created_by_name',
            'updated_by', 'updated_by_name'
        ]
        read_only_fields = [
            'number', 'created_at', 'updated_at', 'created_by', 'updated_by'
        ]


class InvoiceItemCreateSerializer(serializers.Serializer):
    """Serializer for creating invoice items within invoice creation."""
    id = serializers.IntegerField(required=False)
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3)
    unit = serializers.ChoiceField(choices=InvoiceItem.UNIT_CHOICES, default='ks')
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    order = serializers.IntegerField(required=False, default=0)


class InvoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating invoices."""
    items = InvoiceItemCreateSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = [
            'project', 'invoice_type', 'issue_date', 'due_date', 'taxable_date',
            'client_name', 'client_ico', 'client_dic', 'client_address',
            'notes', 'internal_notes', 'bank_account', 'variable_symbol',
            'items'
        ]

    def validate(self, data):
        # For updates, check if invoice is editable
        if self.instance and not self.instance.is_editable:
            raise serializers.ValidationError(
                'Pouze koncepty mohou být upravovány.'
            )

        # Due date must be after issue date
        issue_date = data.get('issue_date', getattr(self.instance, 'issue_date', None))
        due_date = data.get('due_date')
        if issue_date and due_date and due_date < issue_date:
            raise serializers.ValidationError({
                'due_date': 'Datum splatnosti musí být po datu vystavení.'
            })

        return data

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        request = self.context.get('request')

        # Copy client data from project if not provided
        project = validated_data.get('project')
        if project:
            if not validated_data.get('client_name'):
                validated_data['client_name'] = project.client_name
            if not validated_data.get('client_ico'):
                validated_data['client_ico'] = project.client_ico
            if not validated_data.get('client_dic'):
                validated_data['client_dic'] = project.client_dic
            if not validated_data.get('client_address'):
                validated_data['client_address'] = project.client_address

        invoice = Invoice.objects.create(
            created_by=request.user if request else None,
            **validated_data
        )

        # Create items
        for idx, item_data in enumerate(items_data):
            item_data.pop('id', None)
            InvoiceItem.objects.create(
                invoice=invoice,
                order=item_data.pop('order', idx),
                **item_data
            )

        # Log creation
        InvoiceHistory.log(
            invoice=invoice,
            action=InvoiceHistory.ACTION_CREATED,
            description=f'Faktura {invoice.number} vytvořena',
            user=request.user if request else None
        )

        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        request = self.context.get('request')

        # Update invoice fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.updated_by = request.user if request else None
        instance.save()

        # Update items if provided
        if items_data is not None:
            # Get existing item IDs
            existing_ids = set(instance.items.values_list('id', flat=True))
            updated_ids = set()

            for idx, item_data in enumerate(items_data):
                item_id = item_data.pop('id', None)
                item_data['order'] = item_data.get('order', idx)

                if item_id and item_id in existing_ids:
                    # Update existing item
                    InvoiceItem.objects.filter(id=item_id).update(**item_data)
                    updated_ids.add(item_id)
                else:
                    # Create new item
                    InvoiceItem.objects.create(invoice=instance, **item_data)

            # Delete removed items
            items_to_delete = existing_ids - updated_ids
            if items_to_delete:
                InvoiceItem.objects.filter(id__in=items_to_delete).delete()

        # Log update
        InvoiceHistory.log(
            invoice=instance,
            action=InvoiceHistory.ACTION_UPDATED,
            description=f'Faktura {instance.number} aktualizována',
            user=request.user if request else None
        )

        return instance


class ProjectSelectSerializer(serializers.ModelSerializer):
    """Simple serializer for project selection in invoice form."""

    class Meta:
        model = Project
        fields = [
            'id', 'number', 'name', 'client_name', 'client_ico',
            'client_dic', 'client_address'
        ]
