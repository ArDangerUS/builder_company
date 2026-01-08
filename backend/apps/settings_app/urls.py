"""
URL configuration for Settings app.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CompanySettingsView, SupplierViewSet, WorkTypeViewSet

router = DefaultRouter()
router.register('suppliers', SupplierViewSet, basename='suppliers')
router.register('work-types', WorkTypeViewSet, basename='work-types')

urlpatterns = [
    path('company/', CompanySettingsView.as_view(), name='company-settings'),
    path('', include(router.urls)),
]
