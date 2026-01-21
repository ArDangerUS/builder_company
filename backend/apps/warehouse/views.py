"""
Views for Warehouse app.
"""
from datetime import datetime
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q, Sum, F

from apps.users.models import User
from core.viewset_mixins import CompanyFilterMixin, CompanyCreateMixin
from .models import (
    Category,
    Material,
    StockReceipt,
    StockWriteOff,
)
from .serializers import (
    CategorySerializer,
    CategoryListSerializer,
    MaterialSerializer,
    MaterialListSerializer,
    MaterialChoiceSerializer,
    StockReceiptSerializer,
    StockReceiptListSerializer,
    StockWriteOffSerializer,
    StockWriteOffListSerializer,
    StockReportSerializer,
    StockMovementSerializer,
)
from .services import StockService


class WarehousePermission(IsAuthenticated):
    """
    Permission class for warehouse operations.
    SuperAdmin, Admin, Warehouse - full access
    Manager - can create write-offs
    Others - read only
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        user = request.user

        # SuperAdmin, Admin and Warehouse have full access
        if user.role in [User.ROLE_SUPERADMIN, User.ROLE_ADMIN, User.ROLE_WAREHOUSE]:
            return True

        # Manager can read and create write-offs
        if user.role == User.ROLE_MANAGER:
            if request.method in ['GET', 'HEAD', 'OPTIONS']:
                return True
            if view.__class__.__name__ == 'StockWriteOffViewSet':
                return request.method in ['GET', 'HEAD', 'OPTIONS', 'POST']
            return False

        # Others (accountant, worker) - read only
        return request.method in ['GET', 'HEAD', 'OPTIONS']


class CategoryViewSet(CompanyFilterMixin, CompanyCreateMixin, viewsets.ModelViewSet):
    """
    CRUD ViewSet for Categories.
    """
    queryset = Category.objects.all()
    permission_classes = [WarehousePermission]
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return CategoryListSerializer
        return CategorySerializer

    @action(detail=False, methods=['post'])
    def create_defaults(self, request):
        """Create default categories for the user's company."""
        user = request.user
        if user.is_superadmin:
            return Response(
                {'error': 'SuperAdmin must specify company'},
                status=status.HTTP_400_BAD_REQUEST
            )
        Category.create_default_categories()
        return Response({'status': 'Default categories created'})


class MaterialViewSet(CompanyFilterMixin, CompanyCreateMixin, viewsets.ModelViewSet):
    """
    CRUD ViewSet for Materials.
    """
    queryset = Material.objects.select_related('category', 'supplier')
    permission_classes = [WarehousePermission]
    serializer_class = MaterialSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)

        # Filter by supplier
        supplier = self.request.query_params.get('supplier')
        if supplier:
            queryset = queryset.filter(supplier_id=supplier)

        # Filter low stock
        low_stock = self.request.query_params.get('low_stock')
        if low_stock and low_stock.lower() == 'true':
            queryset = queryset.filter(current_stock__lt=F('min_stock'))

        # Search by name or SKU
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(sku__icontains=search)
            )

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return MaterialListSerializer
        if self.action == 'choices':
            return MaterialChoiceSerializer
        return MaterialSerializer

    @action(detail=False, methods=['get'])
    def choices(self, request):
        """Get materials as choices for select fields."""
        queryset = self.get_queryset().filter(is_active=True)
        materials = queryset.values(
            'id', 'name', 'sku', 'unit', 'purchase_price', 'current_stock'
        )
        return Response(list(materials))

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get materials with low stock."""
        queryset = self.get_queryset().filter(
            is_active=True,
            current_stock__lt=F('min_stock')
        )
        serializer = MaterialListSerializer(queryset, many=True)
        return Response(serializer.data)


class StockReceiptViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    CRUD ViewSet for Stock Receipts.
    """
    queryset = StockReceipt.objects.select_related(
        'supplier', 'responsible'
    ).prefetch_related('items__material')
    permission_classes = [WarehousePermission]
    serializer_class = StockReceiptSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by supplier
        supplier = self.request.query_params.get('supplier')
        if supplier:
            queryset = queryset.filter(supplier_id=supplier)

        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(receipt_date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(receipt_date__lte=date_to)

        # Search by number
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(number__icontains=search)

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return StockReceiptListSerializer
        return StockReceiptSerializer

    def perform_create(self, serializer):
        user = self.request.user
        save_kwargs = {
            'responsible': user,
            'created_by': user
        }
        if not user.is_superadmin:
            save_kwargs['company'] = user.company
        serializer.save(**save_kwargs)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=['post'])
    def post(self, request, pk=None):
        """Post the receipt - increase stock levels."""
        receipt = self.get_object()
        try:
            receipt = StockService.post_receipt(receipt, user=request.user)
            serializer = self.get_serializer(receipt)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel the receipt - decrease stock levels."""
        receipt = self.get_object()
        try:
            receipt = StockService.cancel_receipt(receipt, user=request.user)
            serializer = self.get_serializer(receipt)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class StockWriteOffViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    CRUD ViewSet for Stock Write-offs.
    """
    queryset = StockWriteOff.objects.select_related(
        'project', 'responsible'
    ).prefetch_related('items__material')
    permission_classes = [WarehousePermission]
    serializer_class = StockWriteOffSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by project
        project = self.request.query_params.get('project')
        if project:
            queryset = queryset.filter(project_id=project)

        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(writeoff_date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(writeoff_date__lte=date_to)

        # Search by number
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(number__icontains=search)

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return StockWriteOffListSerializer
        return StockWriteOffSerializer

    def perform_create(self, serializer):
        user = self.request.user
        save_kwargs = {
            'responsible': user,
            'created_by': user
        }
        if not user.is_superadmin:
            save_kwargs['company'] = user.company
        serializer.save(**save_kwargs)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=['post'])
    def post(self, request, pk=None):
        """Post the write-off - decrease stock levels."""
        writeoff = self.get_object()
        try:
            writeoff = StockService.post_writeoff(writeoff, user=request.user)
            serializer = self.get_serializer(writeoff)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel the write-off - increase stock levels back."""
        writeoff = self.get_object()
        try:
            writeoff = StockService.cancel_writeoff(writeoff, user=request.user)
            serializer = self.get_serializer(writeoff)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class StockReportView(APIView):
    """
    Stock report endpoint.
    Returns current stock levels for all materials.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self, request):
        """Get queryset filtered by company."""
        user = request.user
        queryset = Material.objects.filter(
            is_active=True
        ).select_related('category', 'supplier')

        if user.is_superadmin:
            company_id = request.query_params.get('company')
            if company_id:
                queryset = queryset.filter(company_id=company_id)
        elif user.company:
            queryset = queryset.filter(company=user.company)
        else:
            queryset = queryset.none()

        return queryset

    def get(self, request):
        queryset = self.get_queryset(request)

        # Filter by category
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)

        # Filter low stock only
        low_stock = request.query_params.get('low_stock')
        if low_stock and low_stock.lower() == 'true':
            queryset = queryset.filter(current_stock__lt=F('min_stock'))

        serializer = StockReportSerializer(queryset, many=True)

        # Calculate summary
        total_value = sum(
            m.current_stock * m.purchase_price for m in queryset
        )
        low_stock_count = queryset.filter(
            current_stock__lt=F('min_stock')
        ).count()

        return Response({
            'materials': serializer.data,
            'summary': {
                'total_materials': queryset.count(),
                'total_value': total_value,
                'low_stock_count': low_stock_count,
            }
        })


class StockMovementsReportView(APIView):
    """
    Stock movements report endpoint.
    Returns all stock movements (receipts and write-offs) for a period.
    """
    permission_classes = [IsAuthenticated]

    def get_company_filter(self, request):
        """Get company filter based on user role."""
        user = request.user
        if user.is_superadmin:
            company_id = request.query_params.get('company')
            return int(company_id) if company_id else None
        return user.company_id if user.company else None

    def get(self, request):
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        material_id = request.query_params.get('material')
        company_id = self.get_company_filter(request)

        material = None
        if material_id:
            try:
                qs = Material.objects.all()
                if company_id:
                    qs = qs.filter(company_id=company_id)
                material = qs.get(id=material_id)
            except Material.DoesNotExist:
                return Response(
                    {'error': 'Material not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Parse dates
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
            except ValueError:
                date_from = None

        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
            except ValueError:
                date_to = None

        movements = StockService.get_stock_movements(
            material=material,
            date_from=date_from,
            date_to=date_to,
            company_id=company_id
        )

        serializer = StockMovementSerializer(movements, many=True)

        # Calculate summary
        total_in = sum(
            m['total_price'] for m in movements if m['direction'] == '+'
        )
        total_out = sum(
            m['total_price'] for m in movements if m['direction'] == '-'
        )

        return Response({
            'movements': serializer.data,
            'summary': {
                'total_movements': len(movements),
                'total_receipts': sum(1 for m in movements if m['type'] == 'receipt'),
                'total_writeoffs': sum(1 for m in movements if m['type'] == 'writeoff'),
                'total_value_in': total_in,
                'total_value_out': total_out,
            }
        })
