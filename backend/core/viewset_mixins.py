"""
ViewSet mixins for multi-tenancy support.
"""
from rest_framework import status
from rest_framework.response import Response


class CompanyFilterMixin:
    """
    Mixin that filters queryset by company for multi-tenancy.

    - SuperAdmin can see all records or filter by company using ?company=id
    - Other users only see records from their own company
    """

    def get_queryset(self):
        """Filter queryset by company based on user role."""
        qs = super().get_queryset()
        user = self.request.user

        if not user.is_authenticated:
            return qs.none()

        if user.is_superadmin:
            # SuperAdmin can filter by company via query param
            company_id = self.request.query_params.get('company')
            if company_id:
                return qs.filter(company_id=company_id)
            # Return all records if no company filter specified
            return qs

        # Regular users only see their company's records
        if user.company:
            return qs.filter(company=user.company)

        # User without company sees nothing
        return qs.none()


class CompanyCreateMixin:
    """
    Mixin that automatically assigns company on create.

    - SuperAdmin must explicitly provide company_id in request data
    - Other users automatically get their company assigned
    """

    def perform_create(self, serializer):
        """Assign company when creating objects."""
        user = self.request.user

        if user.is_superadmin:
            # SuperAdmin must explicitly specify company
            # The company should be in the request data
            serializer.save(created_by=user)
        else:
            # Regular users get their company assigned automatically
            serializer.save(
                company=user.company,
                created_by=user
            )

    def perform_update(self, serializer):
        """Track who updated the object."""
        serializer.save(updated_by=self.request.user)


class CompanyQuerysetMixin(CompanyFilterMixin, CompanyCreateMixin):
    """
    Combined mixin for company filtering and creation.
    Use this mixin in ViewSets that need both filtering and auto-assignment.
    """
    pass


class SuperAdminCompanyValidationMixin:
    """
    Mixin that validates SuperAdmin has specified a company for create operations.
    """

    def create(self, request, *args, **kwargs):
        """Validate that SuperAdmin specifies company for new records."""
        user = request.user

        if user.is_superadmin and 'company' not in request.data:
            return Response(
                {'detail': 'SuperAdmin musí specifikovat company pro vytvoření záznamu.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().create(request, *args, **kwargs)
