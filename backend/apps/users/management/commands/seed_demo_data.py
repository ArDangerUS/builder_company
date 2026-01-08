"""
Management command to seed demo data for development and testing.
Creates demo users, categories, materials, suppliers, projects, and invoices.
"""
from decimal import Decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.users.models import User
from apps.projects.models import Project, Supplier, WorkType
from apps.invoices.models import Invoice, InvoiceItem
from apps.warehouse.models import Category, Material
from apps.settings.models import CompanySettings


class Command(BaseCommand):
    help = 'Seed demo data for development and testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing demo data before seeding',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write('Starting demo data seeding...')

        if options['clear']:
            self.clear_demo_data()

        # Create users
        self.create_users()

        # Create company settings
        self.create_company_settings()

        # Create work types
        self.create_work_types()

        # Create suppliers
        suppliers = self.create_suppliers()

        # Create categories and materials
        self.create_categories_and_materials(suppliers)

        # Create projects with invoices
        self.create_projects_with_invoices(suppliers)

        self.stdout.write(self.style.SUCCESS('Demo data seeded successfully!'))

    def clear_demo_data(self):
        """Clear existing demo data."""
        self.stdout.write('Clearing existing demo data...')
        Invoice.objects.all().delete()
        Project.objects.all().delete()
        Material.objects.all().delete()
        Category.objects.all().delete()
        Supplier.objects.all().delete()
        WorkType.objects.all().delete()
        User.objects.filter(email__endswith='@demo.cz').delete()
        self.stdout.write('Demo data cleared.')

    def create_users(self):
        """Create demo users for each role."""
        self.stdout.write('Creating demo users...')

        users_data = [
            {
                'email': 'admin@demo.cz',
                'password': 'demo123',
                'first_name': 'Jan',
                'last_name': 'Novak',
                'role': 'admin',
                'position': 'Generalni reditel',
                'phone': '+420 777 111 111',
            },
            {
                'email': 'manager@demo.cz',
                'password': 'demo123',
                'first_name': 'Petr',
                'last_name': 'Svoboda',
                'role': 'manager',
                'position': 'Stavbyvedouci',
                'phone': '+420 777 222 222',
            },
            {
                'email': 'accountant@demo.cz',
                'password': 'demo123',
                'first_name': 'Marie',
                'last_name': 'Kralova',
                'role': 'accountant',
                'position': 'Hlavni ucetni',
                'phone': '+420 777 333 333',
            },
            {
                'email': 'warehouse@demo.cz',
                'password': 'demo123',
                'first_name': 'Josef',
                'last_name': 'Maly',
                'role': 'warehouse',
                'position': 'Skladnik',
                'phone': '+420 777 444 444',
            },
            {
                'email': 'worker@demo.cz',
                'password': 'demo123',
                'first_name': 'Pavel',
                'last_name': 'Vesely',
                'role': 'worker',
                'position': 'Technik',
                'phone': '+420 777 555 555',
            },
        ]

        for user_data in users_data:
            password = user_data.pop('password')
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults=user_data
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f'  Created user: {user.email}')
            else:
                self.stdout.write(f'  User exists: {user.email}')

    def create_company_settings(self):
        """Create demo company settings."""
        self.stdout.write('Creating company settings...')

        settings, created = CompanySettings.objects.get_or_create(
            id=1,
            defaults={
                'company_name': 'Builder Company s.r.o.',
                'ico': '12345678',
                'dic': 'CZ12345678',
                'address': 'Stavebni 123',
                'city': 'Praha',
                'postal_code': '11000',
                'phone': '+420 222 111 111',
                'email': 'info@builder-company.cz',
                'bank_account': '123456789/0100',
                'invoice_prefix': 'FAK',
                'invoice_due_days': 14,
            }
        )
        if created:
            self.stdout.write('  Company settings created.')
        else:
            self.stdout.write('  Company settings exist.')

    def create_work_types(self):
        """Create demo work types."""
        self.stdout.write('Creating work types...')

        work_types = [
            ('STAV', 'Stavebni prace'),
            ('ELEK', 'Elektroinstalace'),
            ('VODA', 'Vodoinstalaterstvi'),
            ('MALA', 'Malirske prace'),
            ('ZAMY', 'Zamecnicke prace'),
            ('IZOL', 'Izolace'),
            ('STRE', 'Stresni prace'),
        ]

        for code, name in work_types:
            work_type, created = WorkType.objects.get_or_create(
                code=code,
                defaults={'name': name, 'is_active': True}
            )
            if created:
                self.stdout.write(f'  Created work type: {name}')

    def create_suppliers(self):
        """Create demo suppliers."""
        self.stdout.write('Creating suppliers...')

        suppliers_data = [
            {
                'name': 'Stavebniny Praha s.r.o.',
                'ico': '11111111',
                'dic': 'CZ11111111',
                'address': 'Prumyslova 456',
                'city': 'Praha',
                'postal_code': '14000',
                'phone': '+420 222 333 444',
                'email': 'objednavky@stavebniny-praha.cz',
                'contact_person': 'Karel Stavitel',
            },
            {
                'name': 'Elektro-Velkoobchod a.s.',
                'ico': '22222222',
                'dic': 'CZ22222222',
                'address': 'Elektricka 789',
                'city': 'Brno',
                'postal_code': '60200',
                'phone': '+420 543 210 987',
                'email': 'prodej@elektro-vo.cz',
                'contact_person': 'Jana Elektrikova',
            },
            {
                'name': 'HVAC Systems s.r.o.',
                'ico': '33333333',
                'dic': 'CZ33333333',
                'address': 'Technicka 321',
                'city': 'Ostrava',
                'postal_code': '70200',
                'phone': '+420 596 111 222',
                'email': 'info@hvac-systems.cz',
                'contact_person': 'Martin Topeny',
            },
        ]

        suppliers = []
        for supplier_data in suppliers_data:
            supplier, created = Supplier.objects.get_or_create(
                ico=supplier_data['ico'],
                defaults=supplier_data
            )
            suppliers.append(supplier)
            if created:
                self.stdout.write(f'  Created supplier: {supplier.name}')
            else:
                self.stdout.write(f'  Supplier exists: {supplier.name}')

        return suppliers

    def create_categories_and_materials(self, suppliers):
        """Create demo categories and materials."""
        self.stdout.write('Creating categories and materials...')

        # Create default categories
        Category.create_default_categories()

        # Get categories
        categories = {c.name: c for c in Category.objects.all()}

        # Create materials
        materials_data = [
            # Stavebni materialy
            {
                'name': 'Cement portlandsky 25kg',
                'sku': 'CEM-25',
                'category': 'Stavebni materialy',
                'unit': 'ks',
                'purchase_price': Decimal('145.00'),
                'current_stock': Decimal('120'),
                'min_stock': Decimal('50'),
                'supplier': suppliers[0],
            },
            {
                'name': 'Pisek stavebni 50kg',
                'sku': 'PIS-50',
                'category': 'Stavebni materialy',
                'unit': 'ks',
                'purchase_price': Decimal('89.00'),
                'current_stock': Decimal('200'),
                'min_stock': Decimal('100'),
                'supplier': suppliers[0],
            },
            {
                'name': 'Cihla plna CP 29x14x6.5',
                'sku': 'CIH-PLN',
                'category': 'Stavebni materialy',
                'unit': 'ks',
                'purchase_price': Decimal('8.50'),
                'current_stock': Decimal('5000'),
                'min_stock': Decimal('1000'),
                'supplier': suppliers[0],
            },
            # Elektro
            {
                'name': 'Kabel CYKY 3x2.5 (100m)',
                'sku': 'KAB-CYKY-325',
                'category': 'Elektro',
                'unit': 'rol',
                'purchase_price': Decimal('2890.00'),
                'current_stock': Decimal('15'),
                'min_stock': Decimal('5'),
                'supplier': suppliers[1],
            },
            {
                'name': 'Zasuvka jednoducha bila',
                'sku': 'ZAS-1-B',
                'category': 'Elektro',
                'unit': 'ks',
                'purchase_price': Decimal('89.00'),
                'current_stock': Decimal('100'),
                'min_stock': Decimal('30'),
                'supplier': suppliers[1],
            },
            {
                'name': 'Jistic 16A 1-pol',
                'sku': 'JIS-16-1',
                'category': 'Elektro',
                'unit': 'ks',
                'purchase_price': Decimal('125.00'),
                'current_stock': Decimal('50'),
                'min_stock': Decimal('20'),
                'supplier': suppliers[1],
            },
            # Vodoinstalaterstvi
            {
                'name': 'Trubka PPR 20x3.4 (4m)',
                'sku': 'TRB-PPR-20',
                'category': 'Vodoinstalaterstvi',
                'unit': 'ks',
                'purchase_price': Decimal('85.00'),
                'current_stock': Decimal('80'),
                'min_stock': Decimal('30'),
                'supplier': suppliers[2],
            },
            {
                'name': 'Koleno PPR 90st 20mm',
                'sku': 'KOL-PPR-90-20',
                'category': 'Vodoinstalaterstvi',
                'unit': 'ks',
                'purchase_price': Decimal('12.00'),
                'current_stock': Decimal('150'),
                'min_stock': Decimal('50'),
                'supplier': suppliers[2],
            },
            # Izolace
            {
                'name': 'Polystyren EPS 100 - 100mm (2.5m2)',
                'sku': 'EPS-100-100',
                'category': 'Izolace',
                'unit': 'bal',
                'purchase_price': Decimal('420.00'),
                'current_stock': Decimal('30'),
                'min_stock': Decimal('10'),
                'supplier': suppliers[0],
            },
            {
                'name': 'Mineralni vata 150mm (3.6m2)',
                'sku': 'MVA-150',
                'category': 'Izolace',
                'unit': 'bal',
                'purchase_price': Decimal('580.00'),
                'current_stock': Decimal('8'),
                'min_stock': Decimal('15'),  # Low stock!
                'supplier': suppliers[0],
            },
            # Naradi
            {
                'name': 'Vrtak SDS-plus 8x160mm',
                'sku': 'VRT-SDS-8',
                'category': 'Naradi',
                'unit': 'ks',
                'purchase_price': Decimal('89.00'),
                'current_stock': Decimal('20'),
                'min_stock': Decimal('10'),
                'supplier': suppliers[0],
            },
        ]

        for mat_data in materials_data:
            category_name = mat_data.pop('category')
            category = categories.get(category_name)
            if not category:
                continue

            material, created = Material.objects.get_or_create(
                sku=mat_data['sku'],
                defaults={**mat_data, 'category': category}
            )
            if created:
                self.stdout.write(f'  Created material: {material.name}')

    def create_projects_with_invoices(self, suppliers):
        """Create demo projects with invoices."""
        self.stdout.write('Creating projects and invoices...')

        manager = User.objects.filter(role='manager').first()
        admin = User.objects.filter(role='admin').first()

        projects_data = [
            {
                'name': 'Rekonstrukce bytoveho domu Vinohrady',
                'description': 'Kompletni rekonstrukce spolecnych prostor bytoveho domu vcetne zatepleni.',
                'client_name': 'SVJ Vinohrady 123',
                'client_ico': '44444444',
                'client_address': 'Vinohradska 123, Praha 2',
                'client_contact_person': 'Ing. Alena Vinohradska',
                'client_phone': '+420 608 111 222',
                'client_email': 'svj@vinohrady123.cz',
                'site_address': 'Vinohradska 123, Praha 2',
                'work_type': 'reconstruction',
                'status': 'active',
                'planned_budget': Decimal('2500000.00'),
                'start_date': date.today() - timedelta(days=30),
                'planned_end_date': date.today() + timedelta(days=90),
            },
            {
                'name': 'Novostavba rodinneho domu Klecany',
                'description': 'Vystavba rodinneho domu na klic, 5+kk, zahrada 800m2.',
                'client_name': 'Rodina Novakova',
                'client_ico': '',
                'client_address': 'Lesni 456, Klecany',
                'client_contact_person': 'MUDr. Jana Novakova',
                'client_phone': '+420 608 333 444',
                'client_email': 'novakovi@email.cz',
                'site_address': 'Novakova parcela 789, Klecany',
                'work_type': 'construction',
                'status': 'active',
                'planned_budget': Decimal('6500000.00'),
                'start_date': date.today() - timedelta(days=60),
                'planned_end_date': date.today() + timedelta(days=180),
            },
            {
                'name': 'Oprava strechy - skola Liben',
                'description': 'Kompletni vymena stresni krytiny a zatepleni pudniho prostoru.',
                'client_name': 'ZS a MS Liben',
                'client_ico': '55555555',
                'client_address': 'Skolni 789, Praha 8',
                'client_contact_person': 'Mgr. Pavel Reditel',
                'client_phone': '+420 284 111 222',
                'client_email': 'reditel@zsliben.cz',
                'site_address': 'Skolni 789, Praha 8',
                'work_type': 'repair',
                'status': 'completed',
                'planned_budget': Decimal('890000.00'),
                'start_date': date.today() - timedelta(days=120),
                'planned_end_date': date.today() - timedelta(days=30),
                'actual_end_date': date.today() - timedelta(days=25),
            },
        ]

        for i, proj_data in enumerate(projects_data):
            proj_data['manager'] = manager
            proj_data['created_by'] = admin

            project, created = Project.objects.get_or_create(
                name=proj_data['name'],
                defaults=proj_data
            )

            if created:
                self.stdout.write(f'  Created project: {project.name}')

                # Create invoices for this project
                self.create_invoices_for_project(project, suppliers, admin)
            else:
                self.stdout.write(f'  Project exists: {project.name}')

    def create_invoices_for_project(self, project, suppliers, created_by):
        """Create demo invoices for a project."""
        today = date.today()

        invoices_data = [
            {
                'invoice_type': 'issued',
                'issue_date': today - timedelta(days=14),
                'due_date': today,
                'status': 'paid',
                'paid_date': today - timedelta(days=5),
                'items': [
                    {'description': 'Stavebni prace - 1. etapa', 'quantity': 1, 'unit_price': Decimal('150000.00')},
                    {'description': 'Material - cihly, cement', 'quantity': 1, 'unit_price': Decimal('45000.00')},
                ]
            },
            {
                'invoice_type': 'issued',
                'issue_date': today - timedelta(days=7),
                'due_date': today + timedelta(days=7),
                'status': 'sent',
                'items': [
                    {'description': 'Stavebni prace - 2. etapa', 'quantity': 1, 'unit_price': Decimal('180000.00')},
                    {'description': 'Elektroinstalace', 'quantity': 1, 'unit_price': Decimal('65000.00')},
                ]
            },
            {
                'invoice_type': 'received',
                'supplier': suppliers[0] if suppliers else None,
                'issue_date': today - timedelta(days=20),
                'due_date': today - timedelta(days=6),
                'status': 'paid',
                'paid_date': today - timedelta(days=8),
                'items': [
                    {'description': 'Dodavka stavebniho materialu', 'quantity': 1, 'unit_price': Decimal('78000.00')},
                ]
            },
        ]

        for inv_data in invoices_data:
            items = inv_data.pop('items')
            invoice = Invoice.objects.create(
                project=project,
                created_by=created_by,
                **inv_data
            )

            for item in items:
                InvoiceItem.objects.create(
                    invoice=invoice,
                    **item
                )

            self.stdout.write(f'    Created invoice: {invoice.number}')
