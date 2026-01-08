from django.urls import path

from .views import (
    DashboardView,
    DebtReportView,
    InvoicesReportView,
    ProjectsReportView,
)

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('projects/', ProjectsReportView.as_view(), name='projects_report'),
    path('invoices/', InvoicesReportView.as_view(), name='invoices_report'),
    path('debt/', DebtReportView.as_view(), name='debt_report'),
]
