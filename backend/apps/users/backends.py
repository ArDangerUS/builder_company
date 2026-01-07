from django.contrib.auth.backends import ModelBackend

from .models import User


class EmailBackend(ModelBackend):
    """
    Custom authentication backend that uses email instead of username.
    """

    def authenticate(self, request, email=None, password=None, **kwargs):
        if email is None:
            email = kwargs.get('username')

        if email is None or password is None:
            return None

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Run the default password hasher once to reduce timing
            # difference between an existing and a nonexistent user.
            User().set_password(password)
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
