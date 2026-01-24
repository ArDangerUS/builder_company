"""
Management command to create a SuperAdmin user.

Usage:
    python manage.py createsuperadmin --email=admin@example.com
    python manage.py createsuperadmin --email=admin@example.com --password=secret123
    python manage.py createsuperadmin --email=admin@example.com --first-name=John --last-name=Doe
"""
import getpass

from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from apps.users.models import User


class Command(BaseCommand):
    help = 'Create a SuperAdmin user with full access to all companies'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            required=True,
            help='Email address for the SuperAdmin user'
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Password for the SuperAdmin user (will prompt if not provided)'
        )
        parser.add_argument(
            '--first-name',
            type=str,
            default='Super',
            help='First name (default: Super)'
        )
        parser.add_argument(
            '--last-name',
            type=str,
            default='Admin',
            help='Last name (default: Admin)'
        )
        parser.add_argument(
            '--noinput',
            '--no-input',
            action='store_true',
            help='Do not prompt for password (use --password instead)'
        )

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        first_name = options['first_name']
        last_name = options['last_name']
        no_input = options['noinput']

        # Validate email
        try:
            validate_email(email)
        except ValidationError:
            raise CommandError(f'Invalid email address: {email}')

        # Check if user already exists
        if User.objects.filter(email=email).exists():
            existing_user = User.objects.get(email=email)
            if existing_user.role == User.ROLE_SUPERADMIN:
                self.stdout.write(
                    self.style.WARNING(f'SuperAdmin with email {email} already exists.')
                )
                return
            else:
                raise CommandError(
                    f'User with email {email} already exists with role "{existing_user.role}". '
                    f'Use Django admin to change their role to superadmin.'
                )

        # Get password
        if not password:
            if no_input:
                raise CommandError(
                    'Password is required when using --noinput. Use --password option.'
                )
            password = getpass.getpass('Password: ')
            password_confirm = getpass.getpass('Password (again): ')

            if password != password_confirm:
                raise CommandError('Passwords do not match.')

        if len(password) < 8:
            raise CommandError('Password must be at least 8 characters long.')

        # Create SuperAdmin user
        try:
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=User.ROLE_SUPERADMIN,
                is_staff=True,
                is_superuser=True,
                company=None,  # SuperAdmin has no company
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'SuperAdmin user created successfully:\n'
                    f'  Email: {email}\n'
                    f'  Name: {first_name} {last_name}\n'
                    f'  Role: superadmin\n'
                    f'\nThis user has full access to all companies.'
                )
            )

        except Exception as e:
            raise CommandError(f'Failed to create SuperAdmin user: {e}')
