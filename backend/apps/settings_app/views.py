"""
Views for Settings app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsAdmin
from .models import CompanySettings, Supplier, WorkType
from .serializers import (
    CompanySettingsSerializer,
    SupplierSerializer,
    SupplierListSerializer,
    WorkTypeSerializer,
)


class CompanySettingsView(APIView):
    """
    GET/PUT endpoint for company settings (singleton).
    Only Admin can modify settings.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get(self, request):
        """Get company settings."""
        settings = CompanySettings.get_settings()
        serializer = CompanySettingsSerializer(settings, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        """Update company settings."""
        settings = CompanySettings.get_settings()
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


class SupplierViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Suppliers.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SupplierSerializer

    def get_queryset(self):
        queryset = Supplier.objects.all()

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

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class WorkTypeViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Work Types.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = WorkTypeSerializer

    def get_queryset(self):
        queryset = WorkType.objects.all()

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=False, methods=['get'])
    def choices(self, request):
        """Get work types as choices for select fields."""
        work_types = WorkType.objects.filter(is_active=True).values('id', 'name', 'code')
        return Response(list(work_types))
