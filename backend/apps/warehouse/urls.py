"""
URL configuration for Warehouse app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    MaterialViewSet,
    StockReceiptViewSet,
    StockWriteOffViewSet,
    StockReportView,
    StockMovementsReportView,
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'materials', MaterialViewSet, basename='material')
router.register(r'receipts', StockReceiptViewSet, basename='receipt')
router.register(r'writeoffs', StockWriteOffViewSet, basename='writeoff')

urlpatterns = [
    path('', include(router.urls)),
    path('reports/stock/', StockReportView.as_view(), name='stock-report'),
    path('reports/movements/', StockMovementsReportView.as_view(), name='movements-report'),
]
