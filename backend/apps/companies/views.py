"""
Views for Company management.
SuperAdmin only access.
"""
from decimal import Decimal

from django.db.models import Count, Q, Sum
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsSuperAdmin
from .models import Company
from .serializers import (
    CompanyListSerializer,
    CompanyDetailSerializer,
    CompanyCreateUpdateSerializer,
    CompanyStatsSerializer,
)


class CompanyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Company management.
    Only SuperAdmin has access to manage companies.

    Endpoints:
    - GET /api/v1/companies/ - List all companies
    - POST /api/v1/companies/ - Create a new company
    - GET /api/v1/companies/{id}/ - Get company details
    - PATCH /api/v1/companies/{id}/ - Update company
    - DELETE /api/v1/companies/{id}/ - Delete company
    - GET /api/v1/companies/{id}/stats/ - Get company statistics
    """
    queryset = Company.objects.all()
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    search_fields = ['name', 'ico', 'city', 'email']
    ordering_fields = ['name', 'created_at', 'is_active']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return CompanyListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return CompanyCreateUpdateSerializer
        if self.action == 'stats':
            return CompanyStatsSerializer
        return CompanyDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(ico__icontains=search) |
                Q(city__icontains=search) |
                Q(email__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            updated_by=self.request.user
        )

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Delete company with validation."""
        company = self.get_object()

        # Check for related users
        users_count = company.users.count()
        if users_count > 0:
            return Response(
                {'detail': f'Nelze smazat firmu s uživateli ({users_count}). Nejprve přesuňte nebo smažte uživatele.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check for related projects
        projects_count = company.projects.count() if hasattr(company, 'projects') else 0
        if projects_count > 0:
            return Response(
                {'detail': f'Nelze smazat firmu s projekty ({projects_count}). Nejprve smažte projekty.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check for related invoices
        invoices_count = company.invoices.count() if hasattr(company, 'invoices') else 0
        if invoices_count > 0:
            return Response(
                {'detail': f'Nelze smazat firmu s fakturami ({invoices_count}). Nejprve smažte faktury.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """
        Get company statistics.

        Returns counts and totals for:
        - Users (total and active)
        - Projects (total and active)
        - Invoices (total, invoiced amount, paid amount)
        - Materials and suppliers
        """
        company = self.get_object()

        # Users stats
        users_count = company.users.count()
        active_users_count = company.users.filter(is_active=True).count()

        # Projects stats
        projects_count = 0
        active_projects_count = 0
        if hasattr(company, 'projects'):
            projects_count = company.projects.count()
            active_projects_count = company.projects.filter(status='active').count()

        # Invoices stats
        invoices_count = 0
        total_invoiced = Decimal('0')
        total_paid = Decimal('0')
        if hasattr(company, 'invoices'):
            from apps.invoices.models import Invoice
            invoices = company.invoices.exclude(status=Invoice.STATUS_CANCELLED)
            invoices_count = invoices.count()

            for invoice in invoices.exclude(status=Invoice.STATUS_DRAFT):
                total_invoiced += invoice.total_amount
                total_paid += invoice.paid_amount

        # Warehouse stats
        materials_count = 0
        suppliers_count = 0
        if hasattr(company, 'materials'):
            materials_count = company.materials.filter(is_active=True).count()
        if hasattr(company, 'suppliers'):
            suppliers_count = company.suppliers.filter(is_active=True).count()

        stats_data = {
            'users_count': users_count,
            'active_users_count': active_users_count,
            'projects_count': projects_count,
            'active_projects_count': active_projects_count,
            'invoices_count': invoices_count,
            'total_invoiced': total_invoiced,
            'total_paid': total_paid,
            'materials_count': materials_count,
            'suppliers_count': suppliers_count,
        }

        serializer = CompanyStatsSerializer(stats_data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def choices(self, request):
        """
        Get companies as choices for select fields.
        Returns minimal data for dropdowns.
        """
        queryset = self.get_queryset().filter(is_active=True)
        companies = queryset.values('id', 'name', 'slug', 'ico')
        return Response(list(companies))
