/**
 * Format a number as currency in Czech format
 */
export const formatCurrency = (value: number, currency = 'Kc'): string => {
  return new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + ' ' + currency
}

/**
 * Format a number with Czech locale
 */
export const formatNumber = (value: number, decimals = 2): string => {
  return new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Format a date in Czech format
 */
export const formatDate = (date: string | Date, format = 'short'): string => {
  const d = typeof date === 'string' ? new Date(date) : date

  if (format === 'short') {
    return d.toLocaleDateString('cs-CZ')
  }

  return d.toLocaleDateString('cs-CZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format a datetime in Czech format
 */
export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('cs-CZ')
}
