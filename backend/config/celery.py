"""
Celery configuration for the construction accounting system.
"""
import os

from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

app = Celery('builder_company')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat schedule for periodic tasks
app.conf.beat_schedule = {
    # Check overdue invoices every day at 9:00 AM
    'check-overdue-invoices': {
        'task': 'apps.notifications.tasks.check_overdue_invoices',
        'schedule': crontab(hour=9, minute=0),
    },
    # Check invoices due soon every day at 9:00 AM
    'check-invoice-due-soon': {
        'task': 'apps.notifications.tasks.check_invoice_due_soon',
        'schedule': crontab(hour=9, minute=0),
    },
    # Check low stock materials every day at 8:00 AM
    'check-low-stock': {
        'task': 'apps.warehouse.tasks.check_low_stock',
        'schedule': crontab(hour=8, minute=0),
    },
}

app.conf.timezone = 'Europe/Prague'


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
