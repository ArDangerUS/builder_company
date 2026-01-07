// User types
export type UserRole = 'admin' | 'manager' | 'accountant' | 'warehouse' | 'worker'

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: UserRole
  phone: string
  position: string
  photo: string | null
  is_active: boolean
  date_joined: string
}

// Auth types
export interface LoginCredentials {
  email: string
  password: string
  remember_me?: boolean
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface LoginResponse extends AuthTokens {
  user: User
}

// API Response types
export interface PaginatedResponse<T> {
  count: number
  total_pages: number
  current_page: number
  page_size: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApiError {
  detail: string
  code?: string
}

// Common types
export interface SelectOption {
  label: string
  value: string | number
}
