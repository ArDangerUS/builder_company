"""
Views for the invoices API.
"""
from datetime import date

from django.http import HttpResponse
from django_filters import rest_framework as filters
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project
from core.permissions import IsAdminOrManager, IsAdminOrManagerOrAccountant
from .models import Invoice, InvoiceHistory, Payment
from .serializers import (
    InvoiceCreateSerializer,
    InvoiceHistorySerializer,
    InvoiceListSerializer,
    InvoiceSerializer,
    PaymentCreateSerializer,
    PaymentSerializer,
    ProjectSelectSerializer,
)
from .services.pdf_generator import InvoicePDFGenerator


class InvoiceFilter(filters.FilterSet):
    """Filter for invoices."""
    status = filters.ChoiceFilter(choices=Invoice.STATUS_CHOICES)
    project = filters.NumberFilter(field_name='project_id')
    client = filters.CharFilter(field_name='client_name', lookup_expr='icontains')
    issue_date_from = filters.DateFilter(field_name='issue_date', lookup_expr='gte')
    issue_date_to = filters.DateFilter(field_name='issue_date', lookup_expr='lte')
    due_date_from = filters.DateFilter(field_name='due_date', lookup_expr='gte')
    due_date_to = filters.DateFilter(field_name='due_date', lookup_expr='lte')
    overdue = filters.BooleanFilter(method='filter_overdue')

    class Meta:
        model = Invoice
        fields = ['status', 'project', 'client']

    def filter_overdue(self, queryset, name, value):
        if value:
            return queryset.filter(
                due_date__lt=date.today()
            ).exclude(
                status__in=[
                    Invoice.STATUS_PAID,
                    Invoice.STATUS_CANCELLED,
                    Invoice.STATUS_DRAFT
                ]
            )
        return queryset


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for invoices.
    Provides CRUD operations and additional actions.
    """
    queryset = Invoice.objects.select_related('project').prefetch_related('items', 'payments')
    permission_classes = [IsAuthenticated]
    filterset_class = InvoiceFilter
    search_fields = ['number', 'client_name', 'client_ico', 'project__name']
    ordering_fields = ['number', 'issue_date', 'due_date', 'client_name', 'status']
    ordering = ['-issue_date', '-number']

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return InvoiceCreateSerializer
        return InvoiceSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'issue', 'cancel']:
            return [IsAuthenticated(), IsAdminOrManagerOrAccountant()]
        return [IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.is_editable:
            return Response(
                {'detail': 'Pouze koncepty mohou být smazány.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """Create invoice and return full serializer response with id."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        # Return full InvoiceSerializer response
        response_serializer = InvoiceSerializer(instance)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Update invoice and return full serializer response."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        # Return full InvoiceSerializer response
        response_serializer = InvoiceSerializer(instance)
        return Response(response_serializer.data)

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        """Issue the invoice (change status from draft to issued)."""
        invoice = self.get_object()

        try:
            invoice.issue(user=request.user)
            InvoiceHistory.log(
                invoice=invoice,
                action=InvoiceHistory.ACTION_ISSUED,
                description=f'Faktura {invoice.number} vystavena',
                user=request.user
            )
            return Response(InvoiceSerializer(invoice).data)
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel the invoice."""
        invoice = self.get_object()

        try:
            old_status = invoice.get_status_display()
            invoice.cancel(user=request.user)
            InvoiceHistory.log(
                invoice=invoice,
                action=InvoiceHistory.ACTION_CANCELLED,
                description=f'Faktura {invoice.number} zrušena',
                user=request.user,
                old_value=old_status,
                new_value='Zrušeno'
            )
            return Response(InvoiceSerializer(invoice).data)
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate and return PDF for the invoice."""
        invoice = self.get_object()
        lang = request.query_params.get('lang', 'cs')

        generator = InvoicePDFGenerator(invoice, lang=lang)

        try:
            pdf_content = generator.generate_pdf()
        except Exception as e:
            return Response(
                {'detail': f'Chyba při generování PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{generator.get_filename()}"'
        return response

    @action(detail=True, methods=['get', 'post'])
    def payments(self, request, pk=None):
        """List or create payments for an invoice."""
        invoice = self.get_object()

        if request.method == 'GET':
            payments = invoice.payments.all()
            serializer = PaymentSerializer(payments, many=True)
            return Response(serializer.data)

        # POST - create payment
        if invoice.status == Invoice.STATUS_CANCELLED:
            return Response(
                {'detail': 'Nelze přidat platbu k zrušené faktuře.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if invoice.status == Invoice.STATUS_DRAFT:
            return Response(
                {'detail': 'Nelze přidat platbu k nevystaveného faktuře.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = PaymentCreateSerializer(data=request.data)
        if serializer.is_valid():
            payment = serializer.save(
                invoice=invoice,
                created_by=request.user
            )

            InvoiceHistory.log(
                invoice=invoice,
                action=InvoiceHistory.ACTION_PAYMENT_ADDED,
                description=f'Platba {payment.amount} Kč přidána',
                user=request.user,
                new_value=str(payment.amount)
            )

            return Response(
                PaymentSerializer(payment).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'], url_path='payments/(?P<payment_id>[^/.]+)')
    def delete_payment(self, request, pk=None, payment_id=None):
        """Delete a payment from an invoice."""
        invoice = self.get_object()

        try:
            payment = invoice.payments.get(id=payment_id)
        except Payment.DoesNotExist:
            return Response(
                {'detail': 'Platba nenalezena.'},
                status=status.HTTP_404_NOT_FOUND
            )

        amount = payment.amount
        payment.delete()

        InvoiceHistory.log(
            invoice=invoice,
            action=InvoiceHistory.ACTION_PAYMENT_REMOVED,
            description=f'Platba {amount} Kč odstraněna',
            user=request.user,
            old_value=str(amount)
        )

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get invoice history."""
        invoice = self.get_object()
        history = invoice.history.all()
        serializer = InvoiceHistorySerializer(history, many=True)
        return Response(serializer.data)


class ProjectsForInvoiceView(APIView):
    """Get list of projects for invoice form dropdown."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        projects = Project.objects.filter(
            status__in=['active', 'planning']
        ).order_by('-created_at')

        serializer = ProjectSelectSerializer(projects, many=True)
        return Response(serializer.data)


class InvoiceStatsView(APIView):
    """Get invoice statistics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum, Count

        total = Invoice.objects.exclude(status=Invoice.STATUS_CANCELLED)
        stats = {
            'total_count': total.count(),
            'draft_count': total.filter(status=Invoice.STATUS_DRAFT).count(),
            'issued_count': total.filter(status=Invoice.STATUS_ISSUED).count(),
            'partially_paid_count': total.filter(status=Invoice.STATUS_PARTIALLY_PAID).count(),
            'paid_count': total.filter(status=Invoice.STATUS_PAID).count(),
            'overdue_count': total.filter(
                due_date__lt=date.today()
            ).exclude(
                status__in=[Invoice.STATUS_PAID, Invoice.STATUS_CANCELLED, Invoice.STATUS_DRAFT]
            ).count(),
        }

        # Calculate totals
        from decimal import Decimal
        total_invoiced = Decimal('0')
        total_paid = Decimal('0')

        for invoice in total.exclude(status=Invoice.STATUS_DRAFT):
            total_invoiced += invoice.total_amount
            total_paid += invoice.paid_amount

        stats['total_invoiced'] = str(total_invoiced)
        stats['total_paid'] = str(total_paid)
        stats['total_outstanding'] = str(total_invoiced - total_paid)

        return Response(stats)
