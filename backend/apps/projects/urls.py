from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AresVerifyView, ProjectViewSet

router = DefaultRouter()
router.register('', ProjectViewSet, basename='projects')

urlpatterns = [
    # ARES verification endpoint
    path('verify-ico/', AresVerifyView.as_view(), name='verify_ico'),

    # Project CRUD
    path('', include(router.urls)),
]
