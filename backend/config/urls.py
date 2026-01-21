from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


def health_check(request):
    """Health check endpoint for monitoring."""
    return JsonResponse({
        'status': 'ok',
        'version': '1.0.0',
    })


urlpatterns = [
    path('admin/', admin.site.urls),

    # Health check
    path('api/v1/health/', health_check, name='health-check'),

    # API v1
    path('api/v1/', include([
        path('companies/', include('apps.companies.urls')),
        path('users/', include('apps.users.urls')),
        path('projects/', include('apps.projects.urls')),
        path('invoices/', include('apps.invoices.urls')),
        path('reports/', include('apps.reports.urls')),
        path('settings/', include('apps.settings_app.urls')),
        path('warehouse/', include('apps.warehouse.urls')),
        # path('notifications/', include('apps.notifications.urls')),
    ])),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

    # Debug toolbar
    if 'debug_toolbar' in settings.INSTALLED_APPS:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
