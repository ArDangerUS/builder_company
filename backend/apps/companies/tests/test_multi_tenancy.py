"""
Tests for multi-tenancy functionality.

Test cases:
- SuperAdmin can see all companies
- Admin can see only their own company
- Data isolation between companies
- SuperAdmin can switch company context
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.users.models import User
from apps.companies.models import Company
from apps.projects.models import Project


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def company_a():
    return Company.objects.create(
        name='Company A',
        slug='company-a',
        ico='12345678',
        is_active=True,
    )


@pytest.fixture
def company_b():
    return Company.objects.create(
        name='Company B',
        slug='company-b',
        ico='87654321',
        is_active=True,
    )


@pytest.fixture
def superadmin_user():
    return User.objects.create_user(
        email='superadmin@example.com',
        password='testpass123',
        first_name='Super',
        last_name='Admin',
        role=User.ROLE_SUPERADMIN,
        company=None,
    )


@pytest.fixture
def admin_user_a(company_a):
    return User.objects.create_user(
        email='admin_a@example.com',
        password='testpass123',
        first_name='Admin',
        last_name='A',
        role=User.ROLE_ADMIN,
        company=company_a,
    )


@pytest.fixture
def admin_user_b(company_b):
    return User.objects.create_user(
        email='admin_b@example.com',
        password='testpass123',
        first_name='Admin',
        last_name='B',
        role=User.ROLE_ADMIN,
        company=company_b,
    )


@pytest.fixture
def project_a(company_a, admin_user_a):
    return Project.objects.create(
        company=company_a,
        name='Project A',
        client_name='Client A',
        site_address='Address A',
        created_by=admin_user_a,
    )


@pytest.fixture
def project_b(company_b, admin_user_b):
    return Project.objects.create(
        company=company_b,
        name='Project B',
        client_name='Client B',
        site_address='Address B',
        created_by=admin_user_b,
    )


@pytest.mark.django_db
class TestSuperAdminCompanyAccess:
    """Test SuperAdmin can access all companies."""

    def test_superadmin_can_see_all_companies(self, api_client, superadmin_user, company_a, company_b):
        """SuperAdmin can see all companies in the list."""
        api_client.force_authenticate(user=superadmin_user)

        response = api_client.get('/api/v1/companies/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2
        company_names = [c['name'] for c in response.data['results']]
        assert 'Company A' in company_names
        assert 'Company B' in company_names

    def test_superadmin_can_view_any_company(self, api_client, superadmin_user, company_a, company_b):
        """SuperAdmin can view details of any company."""
        api_client.force_authenticate(user=superadmin_user)

        # View company A
        response = api_client.get(f'/api/v1/companies/{company_a.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Company A'

        # View company B
        response = api_client.get(f'/api/v1/companies/{company_b.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Company B'

    def test_superadmin_can_create_company(self, api_client, superadmin_user):
        """SuperAdmin can create a new company."""
        api_client.force_authenticate(user=superadmin_user)

        data = {
            'name': 'New Company',
            'ico': '11111111',
            'city': 'Prague',
        }
        response = api_client.post('/api/v1/companies/', data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'New Company'
        assert Company.objects.filter(name='New Company').exists()


@pytest.mark.django_db
class TestAdminCompanyAccess:
    """Test Admin can only access their own company."""

    def test_admin_cannot_access_companies_endpoint(self, api_client, admin_user_a, company_a, company_b):
        """Admin cannot access the companies management endpoint."""
        api_client.force_authenticate(user=admin_user_a)

        response = api_client.get('/api/v1/companies/')

        # Should return 403 Forbidden
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_see_only_own_company_projects(
        self, api_client, admin_user_a, project_a, project_b
    ):
        """Admin can only see projects from their own company."""
        api_client.force_authenticate(user=admin_user_a)

        response = api_client.get('/api/v1/projects/')

        assert response.status_code == status.HTTP_200_OK
        # Should only see project from company A
        assert response.data['count'] == 1
        assert response.data['results'][0]['name'] == 'Project A'

    def test_admin_cannot_view_other_company_project(
        self, api_client, admin_user_a, project_b
    ):
        """Admin cannot view project from another company."""
        api_client.force_authenticate(user=admin_user_a)

        response = api_client.get(f'/api/v1/projects/{project_b.id}/')

        # Should return 404 (filtered out by queryset)
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestDataIsolation:
    """Test data isolation between companies."""

    def test_data_isolation_between_companies(
        self, api_client, admin_user_a, admin_user_b, project_a, project_b
    ):
        """Each admin only sees their company's data."""
        # Admin A sees only their projects
        api_client.force_authenticate(user=admin_user_a)
        response = api_client.get('/api/v1/projects/')
        assert response.data['count'] == 1
        assert response.data['results'][0]['id'] == project_a.id

        # Admin B sees only their projects
        api_client.force_authenticate(user=admin_user_b)
        response = api_client.get('/api/v1/projects/')
        assert response.data['count'] == 1
        assert response.data['results'][0]['id'] == project_b.id

    def test_superadmin_sees_all_projects(
        self, api_client, superadmin_user, project_a, project_b
    ):
        """SuperAdmin sees all projects from all companies."""
        api_client.force_authenticate(user=superadmin_user)

        response = api_client.get('/api/v1/projects/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_superadmin_filter_by_company(
        self, api_client, superadmin_user, project_a, project_b, company_a
    ):
        """SuperAdmin can filter projects by company."""
        api_client.force_authenticate(user=superadmin_user)

        response = api_client.get(f'/api/v1/projects/?company={company_a.id}')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['id'] == project_a.id


@pytest.mark.django_db
class TestSuperAdminCompanySwitch:
    """Test SuperAdmin company switching functionality."""

    def test_superadmin_can_switch_company(
        self, api_client, superadmin_user, company_a, company_b, project_a, project_b
    ):
        """SuperAdmin can switch company context via query param."""
        api_client.force_authenticate(user=superadmin_user)

        # Without company filter - sees all
        response = api_client.get('/api/v1/projects/')
        assert response.data['count'] == 2

        # With company A filter - sees only company A projects
        response = api_client.get(f'/api/v1/projects/?company={company_a.id}')
        assert response.data['count'] == 1
        assert response.data['results'][0]['name'] == 'Project A'

        # With company B filter - sees only company B projects
        response = api_client.get(f'/api/v1/projects/?company={company_b.id}')
        assert response.data['count'] == 1
        assert response.data['results'][0]['name'] == 'Project B'

    def test_superadmin_can_get_company_stats(
        self, api_client, superadmin_user, company_a, admin_user_a, project_a
    ):
        """SuperAdmin can view company statistics."""
        api_client.force_authenticate(user=superadmin_user)

        response = api_client.get(f'/api/v1/companies/{company_a.id}/stats/')

        assert response.status_code == status.HTTP_200_OK
        assert 'users_count' in response.data
        assert 'projects_count' in response.data
        assert response.data['users_count'] >= 1
        assert response.data['projects_count'] >= 1


@pytest.mark.django_db
class TestUserCompanyAssignment:
    """Test user company assignment."""

    def test_admin_creates_user_in_own_company(
        self, api_client, admin_user_a, company_a
    ):
        """Admin creates user automatically assigned to their company."""
        api_client.force_authenticate(user=admin_user_a)

        data = {
            'email': 'newuser@example.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'first_name': 'New',
            'last_name': 'User',
            'role': 'worker',
        }
        response = api_client.post('/api/v1/users/', data)

        assert response.status_code == status.HTTP_201_CREATED
        new_user = User.objects.get(email='newuser@example.com')
        assert new_user.company == company_a

    def test_superadmin_can_assign_user_to_any_company(
        self, api_client, superadmin_user, company_b
    ):
        """SuperAdmin can assign user to any company."""
        api_client.force_authenticate(user=superadmin_user)

        data = {
            'email': 'newadmin@example.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'first_name': 'New',
            'last_name': 'Admin',
            'role': 'admin',
            'company': company_b.id,
        }
        response = api_client.post('/api/v1/users/', data)

        assert response.status_code == status.HTTP_201_CREATED
        new_user = User.objects.get(email='newadmin@example.com')
        assert new_user.company == company_b

    def test_superadmin_has_no_company(self, superadmin_user):
        """SuperAdmin user has no company assigned."""
        assert superadmin_user.company is None
        assert superadmin_user.is_superadmin is True
