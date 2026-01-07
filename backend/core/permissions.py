from rest_framework.permissions import BasePermission

from apps.users.models import User


class IsAdmin(BasePermission):
    """
    Permission class for admin users.
    Admin has full access to everything.
    """
    message = 'Přístup pouze pro administrátory.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.ROLE_ADMIN
        )


class IsManager(BasePermission):
    """
    Permission class for manager users.
    Managers can manage projects, invoices, write-offs.
    """
    message = 'Přístup pouze pro manažery.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [User.ROLE_ADMIN, User.ROLE_MANAGER]
        )


class IsAccountant(BasePermission):
    """
    Permission class for accountant users.
    Accountants can manage invoices, finances, reports.
    """
    message = 'Přístup pouze pro účetní.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [User.ROLE_ADMIN, User.ROLE_ACCOUNTANT]
        )


class IsWarehouse(BasePermission):
    """
    Permission class for warehouse users.
    Warehouse staff has full access to warehouse module.
    """
    message = 'Přístup pouze pro pracovníky skladu.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [User.ROLE_ADMIN, User.ROLE_WAREHOUSE]
        )


class IsWorker(BasePermission):
    """
    Permission class for worker users.
    Workers have read-only access.
    """
    message = 'Nedostatečná oprávnění.'

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class IsAdminOrManager(BasePermission):
    """
    Permission for admin or manager roles.
    """
    message = 'Přístup pouze pro administrátory nebo manažery.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [User.ROLE_ADMIN, User.ROLE_MANAGER]
        )


class IsAdminOrAccountant(BasePermission):
    """
    Permission for admin or accountant roles.
    """
    message = 'Přístup pouze pro administrátory nebo účetní.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [User.ROLE_ADMIN, User.ROLE_ACCOUNTANT]
        )


class IsAdminOrManagerOrAccountant(BasePermission):
    """
    Permission for admin, manager, or accountant roles.
    """
    message = 'Přístup pouze pro administrátory, manažery nebo účetní.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [
                User.ROLE_ADMIN,
                User.ROLE_MANAGER,
                User.ROLE_ACCOUNTANT
            ]
        )


class ReadOnlyOrAdmin(BasePermission):
    """
    Read-only access for everyone, write access only for admins.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        return request.user.role == User.ROLE_ADMIN


class CanManageWarehouse(BasePermission):
    """
    Permission to manage warehouse (admin or warehouse role).
    """
    message = 'Nemáte oprávnění ke správě skladu.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Read access for all authenticated users
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # Write access for admin and warehouse roles
        return request.user.role in [User.ROLE_ADMIN, User.ROLE_WAREHOUSE]


class CanManageProjects(BasePermission):
    """
    Permission to manage projects.
    """
    message = 'Nemáte oprávnění ke správě projektů.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Read access for all authenticated users
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # Write access for admin and manager roles
        return request.user.role in [User.ROLE_ADMIN, User.ROLE_MANAGER]


class CanManageInvoices(BasePermission):
    """
    Permission to manage invoices.
    """
    message = 'Nemáte oprávnění ke správě faktur.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Read access for all authenticated users
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # Write access for admin, manager, and accountant roles
        return request.user.role in [
            User.ROLE_ADMIN,
            User.ROLE_MANAGER,
            User.ROLE_ACCOUNTANT
        ]
