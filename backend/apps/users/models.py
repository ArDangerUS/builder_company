from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model with email as the unique identifier.
    """
    ROLE_ADMIN = 'admin'
    ROLE_MANAGER = 'manager'
    ROLE_ACCOUNTANT = 'accountant'
    ROLE_WAREHOUSE = 'warehouse'
    ROLE_WORKER = 'worker'

    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Administrátor'),
        (ROLE_MANAGER, 'Manažer'),
        (ROLE_ACCOUNTANT, 'Účetní'),
        (ROLE_WAREHOUSE, 'Skladník'),
        (ROLE_WORKER, 'Pracovník'),
    ]

    email = models.EmailField(
        unique=True,
        verbose_name='E-mail'
    )
    first_name = models.CharField(
        max_length=150,
        verbose_name='Jméno'
    )
    last_name = models.CharField(
        max_length=150,
        verbose_name='Příjmení'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_WORKER,
        verbose_name='Role'
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Telefon'
    )
    position = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Pozice'
    )
    photo = models.ImageField(
        upload_to='users/photos/',
        blank=True,
        null=True,
        verbose_name='Fotografie'
    )

    is_staff = models.BooleanField(
        default=False,
        verbose_name='Přístup do administrace'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Aktivní'
    )
    date_joined = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Datum registrace'
    )

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = 'Uživatel'
        verbose_name_plural = 'Uživatelé'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return self.get_full_name()

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    def get_short_name(self):
        return self.first_name

    @property
    def is_admin(self):
        return self.role == self.ROLE_ADMIN

    @property
    def is_manager(self):
        return self.role == self.ROLE_MANAGER

    @property
    def is_accountant(self):
        return self.role == self.ROLE_ACCOUNTANT

    @property
    def is_warehouse_staff(self):
        return self.role == self.ROLE_WAREHOUSE

    @property
    def is_worker(self):
        return self.role == self.ROLE_WORKER

    def can_manage_warehouse(self):
        return self.role in [self.ROLE_ADMIN, self.ROLE_WAREHOUSE]

    def can_manage_projects(self):
        return self.role in [self.ROLE_ADMIN, self.ROLE_MANAGER]

    def can_manage_invoices(self):
        return self.role in [self.ROLE_ADMIN, self.ROLE_MANAGER, self.ROLE_ACCOUNTANT]

    def can_view_reports(self):
        return self.role in [self.ROLE_ADMIN, self.ROLE_MANAGER, self.ROLE_ACCOUNTANT]
