"""
PDF generation service for invoices using WeasyPrint.
Supports Czech and English languages.
"""
import base64
import logging
from decimal import Decimal
from io import BytesIO
from typing import Literal, Optional

from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML, CSS

try:
    import qrcode
    from qrcode.image.pure import PyPNGImage
    HAS_QRCODE = True
except ImportError:
    HAS_QRCODE = False

logger = logging.getLogger(__name__)


# Czech number to words conversion
CZECH_ONES = ['', 'jedna', 'dvě', 'tři', 'čtyři', 'pět', 'šest', 'sedm', 'osm', 'devět']
CZECH_TENS = ['', '', 'dvacet', 'třicet', 'čtyřicet', 'padesát', 'šedesát', 'sedmdesát', 'osmdesát', 'devadesát']
CZECH_TEENS = ['deset', 'jedenáct', 'dvanáct', 'třináct', 'čtrnáct', 'patnáct', 'šestnáct', 'sedmnáct', 'osmnáct', 'devatenáct']
CZECH_HUNDREDS = ['', 'sto', 'dvě stě', 'tři sta', 'čtyři sta', 'pět set', 'šest set', 'sedm set', 'osm set', 'devět set']

ENGLISH_ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
ENGLISH_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
ENGLISH_TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']


def number_to_czech_words(number: int) -> str:
    """Convert a number to Czech words."""
    if number == 0:
        return 'nula'

    if number < 0:
        return 'mínus ' + number_to_czech_words(-number)

    result = []

    # Millions
    if number >= 1000000:
        millions = number // 1000000
        number %= 1000000
        if millions == 1:
            result.append('jeden milion')
        elif millions < 5:
            result.append(f'{number_to_czech_words(millions)} miliony')
        else:
            result.append(f'{number_to_czech_words(millions)} milionů')

    # Thousands
    if number >= 1000:
        thousands = number // 1000
        number %= 1000
        if thousands == 1:
            result.append('jeden tisíc')
        elif thousands < 5:
            result.append(f'{number_to_czech_words(thousands)} tisíce')
        else:
            result.append(f'{number_to_czech_words(thousands)} tisíc')

    # Hundreds
    if number >= 100:
        hundreds = number // 100
        number %= 100
        result.append(CZECH_HUNDREDS[hundreds])

    # Tens and ones
    if number >= 20:
        tens = number // 10
        ones = number % 10
        if ones:
            result.append(f'{CZECH_TENS[tens]} {CZECH_ONES[ones]}')
        else:
            result.append(CZECH_TENS[tens])
    elif number >= 10:
        result.append(CZECH_TEENS[number - 10])
    elif number > 0:
        result.append(CZECH_ONES[number])

    return ' '.join(result).strip()


def number_to_english_words(number: int) -> str:
    """Convert a number to English words."""
    if number == 0:
        return 'zero'

    if number < 0:
        return 'minus ' + number_to_english_words(-number)

    result = []

    # Millions
    if number >= 1000000:
        millions = number // 1000000
        number %= 1000000
        result.append(f'{number_to_english_words(millions)} million')

    # Thousands
    if number >= 1000:
        thousands = number // 1000
        number %= 1000
        result.append(f'{number_to_english_words(thousands)} thousand')

    # Hundreds
    if number >= 100:
        hundreds = number // 100
        number %= 100
        result.append(f'{ENGLISH_ONES[hundreds]} hundred')

    # Tens and ones
    if number >= 20:
        tens = number // 10
        ones = number % 10
        if ones:
            result.append(f'{ENGLISH_TENS[tens]}-{ENGLISH_ONES[ones]}')
        else:
            result.append(ENGLISH_TENS[tens])
    elif number >= 10:
        result.append(ENGLISH_TEENS[number - 10])
    elif number > 0:
        result.append(ENGLISH_ONES[number])

    return ' '.join(result).strip()


def amount_to_words(amount: Decimal, lang: str = 'cs') -> str:
    """
    Convert amount to words with currency.

    Args:
        amount: Decimal amount
        lang: Language code ('cs' for Czech, 'en' for English)

    Returns:
        Amount in words with currency
    """
    whole = int(amount)
    cents = int((amount - whole) * 100)

    if lang == 'cs':
        words = number_to_czech_words(whole)
        if whole == 1:
            currency = 'koruna'
        elif whole < 5:
            currency = 'koruny'
        else:
            currency = 'korun'

        if cents > 0:
            cents_words = number_to_czech_words(cents)
            if cents == 1:
                cents_currency = 'haléř'
            elif cents < 5:
                cents_currency = 'haléře'
            else:
                cents_currency = 'haléřů'
            return f'{words} {currency} {cents_words} {cents_currency}'
        return f'{words} {currency}'
    else:
        words = number_to_english_words(whole)
        if cents > 0:
            cents_words = number_to_english_words(cents)
            return f'{words} crowns and {cents_words} hellers'
        return f'{words} crowns'


def generate_qr_payment_code(
    iban: str,
    amount: Decimal,
    variable_symbol: str,
    message: str = '',
    currency: str = 'CZK'
) -> Optional[str]:
    """
    Generate QR code for Czech payment (SPD format).

    The SPD (Short Payment Descriptor) format is used by Czech banks
    for easy payment via QR code scanning.

    Args:
        iban: IBAN of the recipient account
        amount: Payment amount
        variable_symbol: Variable symbol for the payment
        message: Optional message
        currency: Currency code (default CZK)

    Returns:
        Base64 encoded PNG image string, or None if qrcode not available
    """
    if not HAS_QRCODE:
        logger.warning('qrcode library not available, skipping QR code generation')
        return None

    if not iban:
        logger.warning('No IBAN provided, skipping QR code generation')
        return None

    # Build SPD string
    # Format: SPD*1.0*ACC:IBAN*AM:AMOUNT*CC:CURRENCY*X-VS:VS*MSG:MESSAGE
    spd_parts = [
        'SPD*1.0',
        f'ACC:{iban.replace(" ", "")}',
        f'AM:{amount:.2f}',
        f'CC:{currency}',
    ]

    if variable_symbol:
        spd_parts.append(f'X-VS:{variable_symbol}')

    if message:
        # Clean message - only alphanumeric and spaces allowed
        clean_message = ''.join(c for c in message if c.isalnum() or c == ' ')[:60]
        if clean_message:
            spd_parts.append(f'MSG:{clean_message}')

    spd_string = '*'.join(spd_parts)

    try:
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
        )
        qr.add_data(spd_string)
        qr.make(fit=True)

        # Create image
        img = qr.make_image(fill_color='black', back_color='white')

        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        return base64.b64encode(buffer.read()).decode('utf-8')
    except Exception as e:
        logger.error(f'Failed to generate QR code: {e}')
        return None


# Translation strings
TRANSLATIONS = {
    'cs': {
        'invoice': 'FAKTURA',
        'tax_document': 'Daňový doklad',
        'evidence_number': 'Evidenční číslo',
        'invoice_number': 'Číslo faktury',
        'issue_date': 'Datum vystavení',
        'due_date': 'Datum splatnosti',
        'taxable_date': 'Datum zdanitelného plnění',
        'issued': 'Vystaveno',
        'due': 'Splatnost',
        'supplier': 'Dodavatel',
        'customer': 'Odběratel',
        'ico': 'IČO',
        'dic': 'DIČ',
        'vat_payer': 'Plátce DPH',
        'item': 'Položka',
        'description': 'Popis',
        'quantity': 'Množství',
        'quantity_short': 'MJ',
        'unit': 'Jednotka',
        'unit_price': 'Jednotková cena',
        'price_excl_vat': 'Cena bez DPH',
        'vat_rate': 'DPH',
        'total': 'Celkem',
        'total_amount': 'Celková částka',
        'total_to_pay': 'Celkem k úhradě:',
        'amount_in_words': 'Částka slovy',
        'bank_details': 'Bankovní údaje',
        'bank_account': 'Číslo účtu',
        'bank_account_number': 'Číslo účtu',
        'variable_symbol': 'Variabilní symbol',
        'payment_method': 'Způsob úhrady',
        'bank_transfer': 'Bankovním převodem',
        'payment_terms': 'Splatnost',
        'notes': 'Poznámky',
        'currency': 'Kč',
        'page': 'Strana',
        'of': 'z',
        'qr_payment_title': 'Naskenujte QR kód pro platbu',
        'reverse_charge_note': 'Daň odvede zákazník.',
        'issued_by': 'Vystavil:',
        'generated_by': 'Vygenerováno systémem',
    },
    'en': {
        'invoice': 'INVOICE',
        'tax_document': 'Tax Document',
        'evidence_number': 'Evidence Number',
        'invoice_number': 'Invoice Number',
        'issue_date': 'Issue Date',
        'due_date': 'Due Date',
        'taxable_date': 'Tax Date',
        'issued': 'Issued',
        'due': 'Due',
        'supplier': 'Supplier',
        'customer': 'Customer',
        'ico': 'Company ID',
        'dic': 'VAT ID',
        'vat_payer': 'VAT Payer',
        'item': 'Item',
        'description': 'Description',
        'quantity': 'Quantity',
        'quantity_short': 'Unit',
        'unit': 'Unit',
        'unit_price': 'Unit Price',
        'price_excl_vat': 'Price excl. VAT',
        'vat_rate': 'VAT',
        'total': 'Total',
        'total_amount': 'Total Amount',
        'total_to_pay': 'Total to Pay:',
        'amount_in_words': 'Amount in Words',
        'bank_details': 'Bank Details',
        'bank_account': 'Account Number',
        'bank_account_number': 'Account Number',
        'variable_symbol': 'Variable Symbol',
        'payment_method': 'Payment Method',
        'bank_transfer': 'Bank Transfer',
        'payment_terms': 'Payment Terms',
        'notes': 'Notes',
        'currency': 'CZK',
        'page': 'Page',
        'of': 'of',
        'qr_payment_title': 'Scan QR code for payment',
        'reverse_charge_note': 'VAT reverse charge applies.',
        'issued_by': 'Issued by:',
        'generated_by': 'Generated by',
    }
}

def get_company_info(lang: str = 'cs') -> dict:
    """
    Get company info from CompanySettings model.
    Falls back to default values if settings not found.
    """
    try:
        from apps.settings_app.models import CompanySettings
        settings_obj = CompanySettings.get_settings()

        company_name = settings_obj.company_name_cs if lang == 'cs' else (
            settings_obj.company_name_en or settings_obj.company_name_cs
        )

        return {
            'name': company_name,
            'address': settings_obj.full_address,
            'street': settings_obj.street,
            'city': settings_obj.city,
            'postal_code': settings_obj.postal_code,
            'country': settings_obj.country,
            'ico': settings_obj.ico,
            'dic': settings_obj.dic,
            'bank_name': settings_obj.bank_name,
            'bank_account': settings_obj.bank_account,
            'iban': settings_obj.iban,
            'swift': settings_obj.swift,
            'phone': settings_obj.phone,
            'email': settings_obj.email,
            'web': settings_obj.website,
            'registration_court': settings_obj.registration_court,
            'invoice_notes': settings_obj.invoice_notes,
            'logo_path': settings_obj.logo.path if settings_obj.logo else None,
            'stamp_path': settings_obj.stamp.path if settings_obj.stamp else None,
            'signature_path': settings_obj.signature.path if settings_obj.signature else None,
        }
    except Exception as e:
        logger.warning(f'Failed to load company settings: {e}')
        # Fallback to defaults
        return {
            'name': 'BuilderCompany s.r.o.',
            'address': 'Stavební 123, 110 00 Praha 1',
            'street': 'Stavební 123',
            'city': 'Praha 1',
            'postal_code': '110 00',
            'country': 'Česká republika',
            'ico': '12345678',
            'dic': 'CZ12345678',
            'bank_name': 'Česká spořitelna',
            'bank_account': '123456789/0800',
            'iban': 'CZ6508000000000123456789',
            'swift': 'GIBACZPX',
            'phone': '+420 123 456 789',
            'email': 'info@buildercompany.cz',
            'web': 'www.buildercompany.cz',
            'registration_court': '',
            'invoice_notes': '',
            'logo_path': None,
            'stamp_path': None,
            'signature_path': None,
        }


class InvoicePDFGenerator:
    """
    PDF generator for invoices using WeasyPrint.
    """

    def __init__(self, invoice, lang: Literal['cs', 'en'] = 'cs'):
        """
        Initialize the PDF generator.

        Args:
            invoice: Invoice model instance
            lang: Language code ('cs' or 'en')
        """
        self.invoice = invoice
        self.lang = lang if lang in ['cs', 'en'] else 'cs'
        self.translations = TRANSLATIONS[self.lang]

    def get_context(self) -> dict:
        """
        Prepare context data for the PDF template.
        """
        total_amount = self.invoice.total_amount
        company_info = get_company_info(self.lang)

        # Generate QR code for payment
        qr_code = None
        if company_info.get('iban'):
            variable_symbol = self.invoice.variable_symbol or self.invoice.number
            qr_code = generate_qr_payment_code(
                iban=company_info['iban'],
                amount=total_amount,
                variable_symbol=variable_symbol,
                message=f'Faktura {self.invoice.number}',
            )

        return {
            'invoice': self.invoice,
            'items': self.invoice.items.all(),
            'company': company_info,
            't': self.translations,
            'lang': self.lang,
            'total_amount': total_amount,
            'amount_in_words': amount_to_words(total_amount, self.lang),
            'qr_code': qr_code,
        }

    def generate_html(self) -> str:
        """
        Generate HTML content for the invoice.
        """
        context = self.get_context()
        return render_to_string('invoices/invoice_pdf.html', context)

    def generate_pdf(self) -> bytes:
        """
        Generate PDF bytes for the invoice.

        Returns:
            PDF file content as bytes
        """
        html_content = self.generate_html()

        # Generate PDF
        html = HTML(string=html_content, base_url=settings.BASE_DIR)

        # Create PDF in memory
        pdf_buffer = BytesIO()
        html.write_pdf(pdf_buffer)
        pdf_buffer.seek(0)

        return pdf_buffer.read()

    def get_filename(self) -> str:
        """
        Generate filename for the PDF.
        """
        return f'{self.invoice.number}.pdf'
