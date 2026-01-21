from django.contrib.auth import logout
from django.db.models import Q
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from core.permissions import IsAdmin

from .models import User
from .serializers import (
    ChangePasswordSerializer,
    LoginResponseSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UserCreateSerializer,
    UserListSerializer,
    UserSerializer,
)


class LoginView(APIView):
    """
    User login endpoint.
    Returns JWT access and refresh tokens.
    """
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        remember_me = serializer.validated_data.get('remember_me', False)

        refresh = RefreshToken.for_user(user)

        # If remember_me is False, set shorter token lifetime
        if not remember_me:
            from datetime import timedelta
            refresh.set_exp(lifetime=timedelta(days=1))

        response_data = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        }

        return Response(response_data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    User logout endpoint.
    Blacklists the refresh token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response(
                {'detail': 'Odhlášení proběhlo úspěšně.'},
                status=status.HTTP_200_OK
            )
        except Exception:
            return Response(
                {'detail': 'Odhlášení proběhlo úspěšně.'},
                status=status.HTTP_200_OK
            )


class CustomTokenRefreshView(TokenRefreshView):
    """
    Custom token refresh view.
    """
    pass


class MeView(generics.RetrieveUpdateAPIView):
    """
    Get or update current user profile.
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """
    Change current user's password.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response(
            {'detail': 'Heslo bylo úspěšně změněno.'},
            status=status.HTTP_200_OK
        )


class PasswordResetRequestView(APIView):
    """
    Request password reset email.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
            # TODO: Send password reset email
            # send_password_reset_email.delay(user.id)
        except User.DoesNotExist:
            pass  # Don't reveal if email exists

        return Response(
            {'detail': 'Pokud existuje účet s touto e-mailovou adresou, '
                       'bude odeslán odkaz pro obnovení hesla.'},
            status=status.HTTP_200_OK
        )


class PasswordResetConfirmView(APIView):
    """
    Confirm password reset with token.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # TODO: Implement token validation and password reset
        # token = serializer.validated_data['token']
        # new_password = serializer.validated_data['new_password']

        return Response(
            {'detail': 'Heslo bylo úspěšně obnoveno.'},
            status=status.HTTP_200_OK
        )


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user management (admin only).

    SuperAdmin can see and manage all users across all companies.
    Admin can only see and manage users in their own company.
    """
    queryset = User.objects.select_related('company')
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action == 'list':
            return UserListSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = User.objects.select_related('company')

        # Company filtering
        if user.is_superadmin:
            # SuperAdmin can filter by company
            company_id = self.request.query_params.get('company')
            if company_id:
                queryset = queryset.filter(company_id=company_id)
        elif user.company:
            # Admin can only see users in their company
            queryset = queryset.filter(company=user.company)
        else:
            # User without company sees nothing
            queryset = queryset.none()

        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # Search by name or email
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )

        return queryset.order_by('last_name', 'first_name')

    def perform_create(self, serializer):
        """Assign company when creating user."""
        user = self.request.user
        save_kwargs = {}

        if user.is_superadmin:
            # SuperAdmin can specify company in request data
            # If not specified, company will be None
            pass
        elif user.company:
            # Admin assigns their own company
            save_kwargs['company'] = user.company

        serializer.save(**save_kwargs)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a user account."""
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'detail': 'Uživatel byl aktivován.'})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a user account."""
        user = self.get_object()
        if user == request.user:
            return Response(
                {'detail': 'Nemůžete deaktivovat svůj vlastní účet.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.is_active = False
        user.save()
        return Response({'detail': 'Uživatel byl deaktivován.'})

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset user password (admin action)."""
        user = self.get_object()
        new_password = request.data.get('new_password')

        if not new_password:
            return Response(
                {'detail': 'Nové heslo je povinné.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        return Response({'detail': 'Heslo bylo úspěšně změněno.'})
