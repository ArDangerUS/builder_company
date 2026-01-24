"""
Views for Settings app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin
from core.viewset_mixins import CompanyFilterMixin, CompanyCreateMixin
from .models import CompanySettings, Supplier, WorkType
from .serializers import (
    CompanySettingsSerializer,
    SupplierSerializer,
    SupplierListSerializer,
    WorkTypeSerializer,
)


class CompanySettingsView(APIView):
    """
    GET/PUT endpoint for company settings.
    Each company has its own settings.
    Only Admin can modify settings.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_company(self, request):
        """Get company for the current user."""
        user = request.user
        if user.is_superadmin:
            company_id = request.query_params.get('company')
            if company_id:
                from apps.companies.models import Company
                return Company.objects.filter(id=company_id).first()
            return None
        return user.company

    def get(self, request):
        """Get company settings."""
        company = self.get_company(request)
        if not company:
            return Response(
                {'detail': 'Firma nebyla nalezena nebo není specifikována.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        settings = CompanySettings.get_settings_for_company(company)
        serializer = CompanySettingsSerializer(settings, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        """Update company settings."""
        company = self.get_company(request)
        if not company:
            return Response(
                {'detail': 'Firma nebyla nalezena nebo není specifikována.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        settings = CompanySettings.get_settings_for_company(company)
        serializer = CompanySettingsSerializer(
            settings,
            data=request.data,
            context={'request': request},
            partial=True
        )
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        """Partial update of company settings."""
        return self.put(request)


class SupplierViewSet(CompanyFilterMixin, CompanyCreateMixin, viewsets.ModelViewSet):
    """
    CRUD ViewSet for Suppliers.
    """
    queryset = Supplier.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = SupplierSerializer
    pagination_class = None  # Disable pagination for simple list

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return SupplierListSerializer
        return SupplierSerializer


class WorkTypeViewSet(CompanyFilterMixin, CompanyCreateMixin, viewsets.ModelViewSet):
    """
    CRUD ViewSet for Work Types.
    """
    queryset = WorkType.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = WorkTypeSerializer
    pagination_class = None  # Disable pagination for simple list

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset

    @action(detail=False, methods=['get'])
    def choices(self, request):
        """Get work types as choices for select fields."""
        queryset = self.get_queryset().filter(is_active=True)
        work_types = queryset.values('id', 'name', 'code')
        return Response(list(work_types))
