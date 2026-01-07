"""
ARES (Administrative Register of Economic Subjects) integration service.
Czech business registry API for validating and fetching company data by IČO.
"""
import hashlib
import json
import logging
from dataclasses import dataclass
from typing import Optional

import requests
from django.core.cache import cache

from core.exceptions import AresApiError, InvalidIcoError

logger = logging.getLogger(__name__)

ARES_API_URL = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty'
CACHE_TIMEOUT = 60 * 60 * 24  # 24 hours


@dataclass
class AresCompanyData:
    """Data class for company information from ARES."""
    ico: str
    name: str
    dic: Optional[str] = None
    address: Optional[str] = None
    legal_form: Optional[str] = None


def validate_ico(ico: str) -> bool:
    """
    Validate Czech IČO (company identification number).

    IČO must be exactly 8 digits and pass the checksum validation.
    The checksum is calculated using weighted sum modulo 11.

    Args:
        ico: The IČO string to validate

    Returns:
        True if valid, False otherwise
    """
    # Must be exactly 8 digits
    if not ico or len(ico) != 8 or not ico.isdigit():
        return False

    # Calculate checksum
    # Weights for positions 1-7
    weights = [8, 7, 6, 5, 4, 3, 2]

    try:
        # Calculate weighted sum of first 7 digits
        weighted_sum = sum(int(ico[i]) * weights[i] for i in range(7))

        # Calculate check digit
        remainder = weighted_sum % 11
        if remainder == 0:
            check_digit = 1
        elif remainder == 1:
            check_digit = 0
        else:
            check_digit = 11 - remainder

        # Compare with actual last digit
        return check_digit == int(ico[7])
    except (ValueError, IndexError):
        return False


def _get_cache_key(ico: str) -> str:
    """Generate cache key for ARES data."""
    return f'ares:ico:{ico}'


def _parse_address(address_data: dict) -> str:
    """
    Parse address from ARES response.

    Args:
        address_data: Address dictionary from ARES API

    Returns:
        Formatted address string
    """
    if not address_data:
        return ''

    parts = []

    # Street and house number
    street = address_data.get('nazevUlice', '')
    house_number = address_data.get('cisloDomovni', '')
    orientation_number = address_data.get('cisloOrientacni', '')

    if street:
        addr = street
        if house_number:
            addr += f' {house_number}'
            if orientation_number:
                addr += f'/{orientation_number}'
        parts.append(addr)
    elif house_number:
        addr = f'č.p. {house_number}'
        if orientation_number:
            addr += f'/{orientation_number}'
        parts.append(addr)

    # City/town
    city = address_data.get('nazevObce', '')
    city_part = address_data.get('nazevCastiObce', '')

    if city_part and city_part != city:
        parts.append(city_part)
    if city:
        parts.append(city)

    # Postal code
    postal_code = address_data.get('psc', '')
    if postal_code:
        parts.append(str(postal_code))

    return ', '.join(parts)


class AresService:
    """
    Service for interacting with the Czech ARES API.

    Provides methods for validating IČO and fetching company data
    with Redis caching for performance.
    """

    def __init__(self, timeout: int = 10):
        """
        Initialize ARES service.

        Args:
            timeout: HTTP request timeout in seconds
        """
        self.timeout = timeout

    def fetch_company_data(self, ico: str) -> AresCompanyData:
        """
        Fetch company data from ARES by IČO.

        First checks cache, then makes API request if not cached.
        Results are cached for 24 hours.

        Args:
            ico: Czech company identification number (8 digits)

        Returns:
            AresCompanyData with company information

        Raises:
            InvalidIcoError: If IČO is invalid
            AresApiError: If API request fails
        """
        # Clean and validate IČO
        ico = ico.strip()

        if not validate_ico(ico):
            raise InvalidIcoError(f'Neplatné IČO: {ico}')

        # Check cache first
        cache_key = _get_cache_key(ico)
        cached_data = cache.get(cache_key)

        if cached_data:
            logger.debug(f'ARES cache hit for IČO: {ico}')
            return AresCompanyData(**cached_data)

        # Fetch from ARES API
        logger.info(f'Fetching ARES data for IČO: {ico}')

        try:
            response = requests.get(
                f'{ARES_API_URL}/{ico}',
                headers={
                    'Accept': 'application/json',
                    'User-Agent': 'BuilderCompany/1.0'
                },
                timeout=self.timeout
            )

            if response.status_code == 404:
                raise InvalidIcoError(f'Subjekt s IČO {ico} nebyl nalezen v ARES')

            if response.status_code != 200:
                logger.error(f'ARES API error: {response.status_code} - {response.text}')
                raise AresApiError(f'ARES API vrátilo chybu: {response.status_code}')

            data = response.json()

        except requests.RequestException as e:
            logger.error(f'ARES request failed: {e}')
            raise AresApiError('Nepodařilo se spojit s ARES API')
        except json.JSONDecodeError as e:
            logger.error(f'ARES response parse error: {e}')
            raise AresApiError('Neplatná odpověď z ARES API')

        # Parse response
        company_data = self._parse_response(ico, data)

        # Cache the result
        cache.set(
            cache_key,
            {
                'ico': company_data.ico,
                'name': company_data.name,
                'dic': company_data.dic,
                'address': company_data.address,
                'legal_form': company_data.legal_form,
            },
            CACHE_TIMEOUT
        )

        return company_data

    def _parse_response(self, ico: str, data: dict) -> AresCompanyData:
        """
        Parse ARES API response into AresCompanyData.

        Args:
            ico: The queried IČO
            data: Raw API response data

        Returns:
            Parsed AresCompanyData
        """
        # Company name
        name = data.get('obchodniJmeno', '')

        # DIČ (VAT ID)
        dic = None
        dic_list = data.get('dic', [])
        if dic_list and isinstance(dic_list, list):
            dic = dic_list[0] if dic_list else None
        elif isinstance(dic_list, str):
            dic = dic_list

        # If no DIČ in array, try direct field
        if not dic:
            dic = data.get('dic')

        # Address - try sidlo (registered office) first
        address = ''
        sidlo = data.get('sidlo', {})
        if sidlo:
            address = _parse_address(sidlo)

        # Legal form
        legal_form = None
        pravni_forma = data.get('pravniForma')
        if pravni_forma:
            legal_form = pravni_forma.get('nazev', '')

        return AresCompanyData(
            ico=ico,
            name=name,
            dic=dic,
            address=address,
            legal_form=legal_form
        )

    def verify_ico(self, ico: str) -> dict:
        """
        Verify IČO and return company data as dictionary.

        Convenience method for API endpoints.

        Args:
            ico: Czech company identification number

        Returns:
            Dictionary with company data
        """
        company = self.fetch_company_data(ico)
        return {
            'ico': company.ico,
            'name': company.name,
            'dic': company.dic or '',
            'address': company.address or '',
            'legal_form': company.legal_form or '',
        }
