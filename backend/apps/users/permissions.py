"""
Custom permissions for the application.
"""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """
    Permission that only allows admin users.
    """
    message = 'Přístup povolen pouze administrátorům.'

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin


class IsManager(BasePermission):
    """
    Permission that only allows managers or admins.
    """
    message = 'Přístup povolen pouze manažerům.'

    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and
                (request.user.is_admin or request.user.is_manager))


class IsWarehouse(BasePermission):
    """
    Permission that only allows warehouse staff or admins.
    """
    message = 'Přístup povolen pouze skladníkům.'

    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and
                request.user.role in ['admin', 'warehouse'])


class IsAccountant(BasePermission):
    """
    Permission that only allows accountants, managers, or admins.
    """
    message = 'Přístup povolen pouze účetním.'

    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and
                request.user.role in ['admin', 'manager', 'accountant'])


class CanManageProjects(BasePermission):
    """
    Permission for project management.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.can_manage_projects()


class CanManageInvoices(BasePermission):
    """
    Permission for invoice management.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.can_manage_invoices()


class CanViewReports(BasePermission):
    """
    Permission for viewing reports.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.can_view_reports()
