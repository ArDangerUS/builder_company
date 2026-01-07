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

// Project types
export type ProjectStatus = 'planning' | 'active' | 'suspended' | 'completed' | 'cancelled'
export type ProjectWorkType = 'construction' | 'reconstruction' | 'repair' | 'installation' | 'demolition' | 'design' | 'other'

export interface Project {
  id: number
  number: string
  name: string
  description: string
  // Client info
  client_name: string
  client_ico: string
  client_dic: string
  client_address: string
  client_contact_person: string
  client_phone: string
  client_email: string
  // Location
  site_address: string
  // Details
  work_type: ProjectWorkType
  work_type_display: string
  manager: number | null
  manager_name: string
  status: ProjectStatus
  status_display: string
  // Financial
  planned_budget: string
  actual_costs: string
  invoiced_amount: string
  paid_amount: string
  outstanding_amount: string
  // Dates
  start_date: string | null
  planned_end_date: string | null
  actual_end_date: string | null
  // Notes
  notes: string
  // Counts
  files_count: number
  // Audit
  created_at: string
  updated_at: string
  created_by: number | null
  created_by_name: string
  updated_by: number | null
  updated_by_name: string
}

export interface ProjectListItem {
  id: number
  number: string
  name: string
  client_name: string
  site_address: string
  status: ProjectStatus
  status_display: string
  work_type: ProjectWorkType
  work_type_display: string
  manager: number | null
  manager_name: string
  planned_budget: string
  start_date: string | null
  planned_end_date: string | null
  created_at: string
}

export interface ProjectFile {
  id: number
  project: number
  file: string
  file_url: string
  name: string
  file_type: string
  description: string
  file_size: number
  file_extension: string
  uploaded_by: {
    id: number
    full_name: string
  }
  created_at: string
}

export interface ProjectHistory {
  id: number
  action: string
  action_display: string
  description: string
  old_value: string
  new_value: string
  user: number | null
  user_name: string
  created_at: string
}

export interface AresCompanyData {
  ico: string
  name: string
  dic: string
  address: string
  legal_form: string
}

export interface ProjectCreateData {
  name: string
  description?: string
  client_name: string
  client_ico?: string
  client_dic?: string
  client_address?: string
  client_contact_person?: string
  client_phone?: string
  client_email?: string
  site_address: string
  work_type?: ProjectWorkType
  manager?: number | null
  status?: ProjectStatus
  planned_budget?: string
  start_date?: string | null
  planned_end_date?: string | null
  notes?: string
}

export interface ProjectFinances {
  planned_budget: string
  actual_costs: string
  invoiced_amount: string
  paid_amount: string
  outstanding_amount: string
  budget_remaining: string
  budget_usage_percent: number
}

// Invoice types
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'
export type PaymentMethod = 'cash' | 'bank' | 'card'
export type InvoiceItemUnit = 'ks' | 'hod' | 'm' | 'm2' | 'm3' | 'kg' | 't' | 'km' | 'den' | 'komplet'

export interface InvoiceItem {
  id?: number
  name: string
  description: string
  quantity: number
  unit: InvoiceItemUnit
  unit_display?: string
  unit_price: number
  total_price?: number
  order: number
}

export interface Payment {
  id: number
  invoice: number
  payment_date: string
  amount: string
  payment_method: PaymentMethod
  payment_method_display: string
  document_number: string
  notes: string
  created_at: string
  created_by: number | null
  created_by_name: string
}

export interface InvoiceHistory {
  id: number
  action: string
  action_display: string
  description: string
  old_value: string
  new_value: string
  user: number | null
  user_name: string
  created_at: string
}

export interface InvoiceListItem {
  id: number
  number: string
  client_name: string
  project: number
  project_name: string
  project_number: string
  status: InvoiceStatus
  status_display: string
  issue_date: string
  due_date: string
  total_amount: string
  paid_amount: string
  amount_due: string
  is_overdue: boolean
  items_count: number
  created_at: string
}

export interface Invoice {
  id: number
  number: string
  issue_date: string
  due_date: string
  taxable_date: string | null
  project: number
  project_name: string
  project_number: string
  client_name: string
  client_ico: string
  client_dic: string
  client_address: string
  status: InvoiceStatus
  status_display: string
  notes: string
  internal_notes: string
  bank_account: string
  variable_symbol: string
  total_amount: string
  paid_amount: string
  amount_due: string
  is_overdue: boolean
  is_editable: boolean
  items: InvoiceItem[]
  payments: Payment[]
  created_at: string
  updated_at: string
  created_by: number | null
  created_by_name: string
  updated_by: number | null
  updated_by_name: string
}

export interface InvoiceCreateData {
  project: number
  issue_date?: string
  due_date: string
  taxable_date?: string | null
  client_name?: string
  client_ico?: string
  client_dic?: string
  client_address?: string
  notes?: string
  internal_notes?: string
  bank_account?: string
  variable_symbol?: string
  items?: InvoiceItem[]
}

export interface PaymentCreateData {
  payment_date: string
  amount: number
  payment_method: PaymentMethod
  document_number?: string
  notes?: string
}

export interface ProjectForInvoice {
  id: number
  number: string
  name: string
  client_name: string
  client_ico: string
  client_dic: string
  client_address: string
}

export interface InvoiceStats {
  total_count: number
  draft_count: number
  issued_count: number
  partially_paid_count: number
  paid_count: number
  overdue_count: number
  total_invoiced: string
  total_paid: string
  total_outstanding: string
}
