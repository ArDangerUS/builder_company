"""
Celery tasks for Warehouse app.
"""
import logging
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


@shared_task
def check_low_stock():
    """
    Check for materials with stock below minimum level.
    Sends email notification to warehouse staff and admins.
    """
    from apps.warehouse.services import StockService
    from apps.users.models import User

    low_stock_materials = StockService.get_low_stock_materials()

    if not low_stock_materials.exists():
        logger.info('No materials with low stock found.')
        return 'No low stock materials'

    # Get users to notify (admin and warehouse roles)
    notify_users = User.objects.filter(
        role__in=['admin', 'warehouse'],
        is_active=True
    ).exclude(email='')

    if not notify_users.exists():
        logger.warning('No users to notify about low stock.')
        return f'{low_stock_materials.count()} low stock materials, but no users to notify'

    # Prepare email content
    subject = f'Upozornění: {low_stock_materials.count()} materiálů s nízkým stavem zásob'

    materials_list = []
    for material in low_stock_materials:
        materials_list.append({
            'name': material.name,
            'sku': material.sku,
            'category': material.category.name,
            'current_stock': material.current_stock,
            'min_stock': material.min_stock,
            'unit': material.unit,
            'supplier': material.supplier.name if material.supplier else 'Není uveden',
        })

    # Build email body
    body_lines = [
        'Následující materiály mají stav zásob pod minimální úrovní:\n',
    ]

    for m in materials_list:
        body_lines.append(
            f"• {m['sku']} - {m['name']}\n"
            f"  Kategorie: {m['category']}\n"
            f"  Aktuální zásoba: {m['current_stock']} {m['unit']}\n"
            f"  Minimální zásoba: {m['min_stock']} {m['unit']}\n"
            f"  Dodavatel: {m['supplier']}\n"
        )

    body_lines.append('\n--\nStavebnický IS')
    message = '\n'.join(body_lines)

    # Send emails
    recipient_list = list(notify_users.values_list('email', flat=True))

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            fail_silently=False,
        )
        logger.info(
            f'Low stock notification sent to {len(recipient_list)} users '
            f'for {low_stock_materials.count()} materials.'
        )
        return f'Notification sent for {low_stock_materials.count()} materials'
    except Exception as e:
        logger.error(f'Failed to send low stock notification: {e}')
        raise
