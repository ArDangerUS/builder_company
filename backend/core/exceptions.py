from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler


class InsufficientStockError(APIException):
    """
    Exception raised when there's not enough stock for an operation.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Nedostatečný počet na skladě.'
    default_code = 'insufficient_stock'


class DocumentAlreadyPostedError(APIException):
    """
    Exception raised when trying to modify a posted document.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Dokument je již proveden a nelze upravovat.'
    default_code = 'document_already_posted'


class DocumentNotDraftError(APIException):
    """
    Exception raised when operation requires draft status.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Operaci lze provést pouze s konceptem.'
    default_code = 'document_not_draft'


class InvalidIcoError(APIException):
    """
    Exception raised when IČO validation fails.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Neplatné IČO.'
    default_code = 'invalid_ico'


class AresApiError(APIException):
    """
    Exception raised when ARES API call fails.
    """
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Chyba při komunikaci s ARES API.'
    default_code = 'ares_api_error'


class PaymentExceedsInvoiceError(APIException):
    """
    Exception raised when payment amount exceeds invoice balance.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Částka platby přesahuje zůstatek faktury.'
    default_code = 'payment_exceeds_invoice'


class CannotDeleteError(APIException):
    """
    Exception raised when an item cannot be deleted due to dependencies.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Položku nelze smazat, protože je používána.'
    default_code = 'cannot_delete'


def custom_exception_handler(exc, context):
    """
    Custom exception handler that adds additional context.
    """
    response = exception_handler(exc, context)

    if response is not None:
        # Add custom error code to response
        if hasattr(exc, 'default_code'):
            response.data['code'] = exc.default_code
        else:
            response.data['code'] = 'error'

        # Ensure detail is always a string
        if 'detail' in response.data:
            if isinstance(response.data['detail'], list):
                response.data['detail'] = ' '.join(str(d) for d in response.data['detail'])
            elif isinstance(response.data['detail'], dict):
                errors = []
                for field, messages in response.data['detail'].items():
                    if isinstance(messages, list):
                        errors.extend(f"{field}: {msg}" for msg in messages)
                    else:
                        errors.append(f"{field}: {messages}")
                response.data['detail'] = ' '.join(errors)

    return response
