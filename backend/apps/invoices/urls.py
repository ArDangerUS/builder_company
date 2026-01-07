from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InvoiceStatsView, InvoiceViewSet, ProjectsForInvoiceView

router = DefaultRouter()
router.register('', InvoiceViewSet, basename='invoices')

urlpatterns = [
    path('projects/', ProjectsForInvoiceView.as_view(), name='invoice-projects'),
    path('stats/', InvoiceStatsView.as_view(), name='invoice-stats'),
    path('', include(router.urls)),
]
