import dayjs from 'dayjs'

// Format currency
export const formatCurrency = (amount: number, currency = 'CZK'): string => {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format date
export const formatDate = (date: string | Date, format = 'DD.MM.YYYY'): string => {
  return dayjs(date).format(format)
}

// Format datetime
export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('DD.MM.YYYY HH:mm')
}

// Debounce function
export const debounce = <T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => func(...args), wait)
  }
}

// Validate Czech IČO
export const validateICO = (ico: string): boolean => {
  if (!/^\d{8}$/.test(ico)) {
    return false
  }

  const weights = [8, 7, 6, 5, 4, 3, 2]
  let sum = 0

  for (let i = 0; i < 7; i++) {
    sum += parseInt(ico[i]) * weights[i]
  }

  const checkDigit = (11 - (sum % 11)) % 10
  return checkDigit === parseInt(ico[7])
}

// Get role display name
export const getRoleDisplayName = (role: string): string => {
  const roles: Record<string, string> = {
    admin: 'Administrátor',
    manager: 'Manažer',
    accountant: 'Účetní',
    warehouse: 'Skladník',
    worker: 'Pracovník',
  }
  return roles[role] || role
}

// Get status color for Ant Design
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: 'default',
    posted: 'success',
    cancelled: 'error',
    active: 'processing',
    planning: 'default',
    suspended: 'warning',
    completed: 'success',
    issued: 'processing',
    partially_paid: 'warning',
    paid: 'success',
    overdue: 'error',
  }
  return colors[status] || 'default'
}
