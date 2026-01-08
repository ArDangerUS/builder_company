"""
PDF generation service for invoices using WeasyPrint.
Supports Czech and English languages.
"""
import logging
from decimal import Decimal
from io import BytesIO
from typing import Literal

from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML, CSS

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


# Translation strings
TRANSLATIONS = {
    'cs': {
        'invoice': 'FAKTURA',
        'invoice_number': 'Číslo faktury',
        'issue_date': 'Datum vystavení',
        'due_date': 'Datum splatnosti',
        'taxable_date': 'Datum zdanitelného plnění',
        'supplier': 'Dodavatel',
        'customer': 'Odběratel',
        'ico': 'IČO',
        'dic': 'DIČ',
        'item': 'Položka',
        'description': 'Popis',
        'quantity': 'Množství',
        'unit': 'Jednotka',
        'unit_price': 'Jednotková cena',
        'total': 'Celkem',
        'total_amount': 'Celková částka',
        'amount_in_words': 'Částka slovy',
        'bank_details': 'Bankovní údaje',
        'bank_account': 'Číslo účtu',
        'variable_symbol': 'Variabilní symbol',
        'payment_terms': 'Splatnost',
        'notes': 'Poznámky',
        'currency': 'Kč',
        'page': 'Strana',
        'of': 'z',
    },
    'en': {
        'invoice': 'INVOICE',
        'invoice_number': 'Invoice Number',
        'issue_date': 'Issue Date',
        'due_date': 'Due Date',
        'taxable_date': 'Tax Date',
        'supplier': 'Supplier',
        'customer': 'Customer',
        'ico': 'Company ID',
        'dic': 'VAT ID',
        'item': 'Item',
        'description': 'Description',
        'quantity': 'Quantity',
        'unit': 'Unit',
        'unit_price': 'Unit Price',
        'total': 'Total',
        'total_amount': 'Total Amount',
        'amount_in_words': 'Amount in Words',
        'bank_details': 'Bank Details',
        'bank_account': 'Account Number',
        'variable_symbol': 'Variable Symbol',
        'payment_terms': 'Payment Terms',
        'notes': 'Notes',
        'currency': 'CZK',
        'page': 'Page',
        'of': 'of',
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
            'address': 'Stavební 123\n110 00 Praha 1\nČeská republika',
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

        return {
            'invoice': self.invoice,
            'items': self.invoice.items.all(),
            'company': company_info,
            't': self.translations,
            'lang': self.lang,
            'total_amount': total_amount,
            'amount_in_words': amount_to_words(total_amount, self.lang),
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
