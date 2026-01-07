from django.db.models import Q
from django_filters import rest_framework as filters
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions import AresApiError, InvalidIcoError
from core.permissions import CanManageProjects

from .models import Project, ProjectFile, ProjectHistory
from .serializers import (
    AresResponseSerializer,
    AresVerifySerializer,
    ProjectCreateSerializer,
    ProjectFileSerializer,
    ProjectFileUploadSerializer,
    ProjectHistorySerializer,
    ProjectListSerializer,
    ProjectSerializer,
    ProjectUpdateSerializer,
)
from .services.ares import AresService


class ProjectFilter(filters.FilterSet):
    """Filter for projects."""
    status = filters.ChoiceFilter(choices=Project.STATUS_CHOICES)
    work_type = filters.ChoiceFilter(choices=Project.WORK_TYPE_CHOICES)
    manager = filters.NumberFilter(field_name='manager_id')
    start_date_from = filters.DateFilter(field_name='start_date', lookup_expr='gte')
    start_date_to = filters.DateFilter(field_name='start_date', lookup_expr='lte')
    planned_end_date_from = filters.DateFilter(field_name='planned_end_date', lookup_expr='gte')
    planned_end_date_to = filters.DateFilter(field_name='planned_end_date', lookup_expr='lte')
    created_from = filters.DateFilter(field_name='created_at', lookup_expr='date__gte')
    created_to = filters.DateFilter(field_name='created_at', lookup_expr='date__lte')

    class Meta:
        model = Project
        fields = ['status', 'work_type', 'manager']


class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for project management.

    Provides CRUD operations for projects with filtering,
    searching, and history tracking.
    """
    queryset = Project.objects.select_related('manager', 'created_by', 'updated_by')
    permission_classes = [IsAuthenticated, CanManageProjects]
    filterset_class = ProjectFilter
    search_fields = ['number', 'name', 'client_name', 'client_ico', 'site_address']
    ordering_fields = ['number', 'name', 'created_at', 'start_date', 'status']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        if self.action == 'create':
            return ProjectCreateSerializer
        if self.action in ['update', 'partial_update']:
            return ProjectUpdateSerializer
        return ProjectSerializer

    def perform_create(self, serializer):
        project = serializer.save(
            created_by=self.request.user,
            updated_by=self.request.user
        )
        # Log creation
        ProjectHistory.log_change(
            project=project,
            action=ProjectHistory.ACTION_CREATED,
            description=f'Projekt {project.number} vytvořen',
            user=self.request.user
        )

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_status = old_instance.status

        project = serializer.save(updated_by=self.request.user)

        # Log status change if changed
        if old_status != project.status:
            ProjectHistory.log_change(
                project=project,
                action=ProjectHistory.ACTION_STATUS_CHANGED,
                description=f'Stav změněn z "{old_instance.get_status_display()}" na "{project.get_status_display()}"',
                user=self.request.user,
                old_value=old_status,
                new_value=project.status
            )
        else:
            ProjectHistory.log_change(
                project=project,
                action=ProjectHistory.ACTION_UPDATED,
                description='Projekt aktualizován',
                user=self.request.user
            )

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get project history."""
        project = self.get_object()
        history = project.history.select_related('user').all()
        serializer = ProjectHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'], parser_classes=[MultiPartParser, FormParser])
    def files(self, request, pk=None):
        """List or upload project files."""
        project = self.get_object()

        if request.method == 'GET':
            files = project.files.select_related('created_by').all()
            serializer = ProjectFileSerializer(
                files, many=True, context={'request': request}
            )
            return Response(serializer.data)

        # POST - upload file
        serializer = ProjectFileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project_file = ProjectFile.objects.create(
            project=project,
            file=serializer.validated_data['file'],
            name=serializer.validated_data.get('name', ''),
            file_type=serializer.validated_data.get('file_type', 'document'),
            description=serializer.validated_data.get('description', ''),
            created_by=request.user,
            updated_by=request.user
        )

        # Log file addition
        ProjectHistory.log_change(
            project=project,
            action=ProjectHistory.ACTION_FILE_ADDED,
            description=f'Soubor "{project_file.name}" přidán',
            user=request.user
        )

        return Response(
            ProjectFileSerializer(project_file, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['delete'], url_path='files/(?P<file_id>[^/.]+)')
    def delete_file(self, request, pk=None, file_id=None):
        """Delete a project file."""
        project = self.get_object()

        try:
            project_file = project.files.get(id=file_id)
        except ProjectFile.DoesNotExist:
            return Response(
                {'detail': 'Soubor nenalezen'},
                status=status.HTTP_404_NOT_FOUND
            )

        file_name = project_file.name

        # Delete the actual file and record
        project_file.file.delete(save=False)
        project_file.delete()

        # Log file removal
        ProjectHistory.log_change(
            project=project,
            action=ProjectHistory.ACTION_FILE_REMOVED,
            description=f'Soubor "{file_name}" odstraněn',
            user=request.user
        )

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def finances(self, request, pk=None):
        """Get project financial summary."""
        project = self.get_object()

        return Response({
            'planned_budget': project.planned_budget,
            'actual_costs': project.actual_costs,
            'invoiced_amount': project.invoiced_amount,
            'paid_amount': project.paid_amount,
            'outstanding_amount': project.outstanding_amount,
            'budget_remaining': project.planned_budget - project.actual_costs,
            'budget_usage_percent': (
                float(project.actual_costs / project.planned_budget * 100)
                if project.planned_budget > 0 else 0
            ),
        })


class AresVerifyView(APIView):
    """
    API endpoint for verifying Czech IČO via ARES.

    POST /api/v1/projects/verify-ico/
    {
        "ico": "12345678"
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AresVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ico = serializer.validated_data['ico']

        try:
            ares_service = AresService()
            company_data = ares_service.verify_ico(ico)

            response_serializer = AresResponseSerializer(data=company_data)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data)

        except InvalidIcoError as e:
            return Response(
                {'detail': str(e), 'code': 'invalid_ico'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except AresApiError as e:
            return Response(
                {'detail': str(e), 'code': 'ares_api_error'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
