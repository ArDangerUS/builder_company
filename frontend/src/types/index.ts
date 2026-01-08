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

// Dashboard types
export interface DashboardStats {
  active_projects: number
  invoiced_this_month: number
  paid_this_month: number
  total_outstanding: number
  overdue_count: number
}

export interface InvoicesByMonth {
  month: string
  month_name: string
  issued: number
  paid: number
}

export interface ProjectsByStatus {
  status: string
  status_display: string
  count: number
}

export interface TopProject {
  id: number
  name: string
  number: string
  planned_budget: number
  actual_costs: number
}

export interface RecentProject {
  id: number
  number: string
  name: string
  client_name: string
  status: string
  status_display: string
  created_at: string
}

export interface RecentInvoice {
  id: number
  number: string
  client_name: string
  status: string
  status_display: string
  issue_date: string
  due_date: string
  total_amount: number
}

export interface OverdueInvoice {
  id: number
  number: string
  client_name: string
  total_amount: number
  amount_due: number
  due_date: string
  days_overdue: number
}

export interface DashboardData {
  stats: DashboardStats
  charts: {
    invoices_by_month: InvoicesByMonth[]
    projects_by_status: ProjectsByStatus[]
    top_projects: TopProject[]
  }
  recent: {
    projects: RecentProject[]
    invoices: RecentInvoice[]
    overdue_invoices: OverdueInvoice[]
  }
}

// Report types
export interface ProjectReportItem {
  id: number
  number: string
  name: string
  client_name: string
  manager_name: string
  status: string
  status_display: string
  planned_budget: number
  actual_costs: number
  invoiced_amount: number
  paid_amount: number
  outstanding: number
}

export interface ProjectReportTotals {
  planned_budget: number
  actual_costs: number
  invoiced_amount: number
  paid_amount: number
  outstanding: number
}

export interface ProjectReportData {
  data: ProjectReportItem[]
  totals: ProjectReportTotals
  count: number
}

export interface InvoiceReportItem {
  id: number
  number: string
  issue_date: string
  project_number: string
  project_name: string
  client_name: string
  total_amount: number
  paid_amount: number
  amount_due: number
  due_date: string
  status: string
  status_display: string
  days_overdue: number
  is_overdue: boolean
}

export interface InvoiceReportTotals {
  total_amount: number
  paid_amount: number
  amount_due: number
}

export interface InvoiceReportData {
  data: InvoiceReportItem[]
  totals: InvoiceReportTotals
  count: number
}

export interface DebtReportItem {
  client_name: string
  client_ico: string
  unpaid_count: number
  total_debt: number
  oldest_invoice_date: string | null
  oldest_invoice_number: string | null
  max_days_overdue: number
  invoices: {
    id: number
    number: string
    amount_due: number
    due_date: string
  }[]
}

export interface DebtReportData {
  data: DebtReportItem[]
  totals: {
    unpaid_count: number
    total_debt: number
  }
  count: number
}

// Settings types
export interface CompanySettings {
  id: number
  company_name_cs: string
  company_name_en: string
  ico: string
  dic: string
  street: string
  city: string
  postal_code: string
  country: string
  full_address: string
  phone: string
  email: string
  website: string
  bank_name: string
  bank_account: string
  iban: string
  swift: string
  logo: string | null
  logo_url: string | null
  stamp: string | null
  stamp_url: string | null
  signature: string | null
  signature_url: string | null
  invoice_notes: string
  registration_court: string
  created_at: string
  updated_at: string
}

export interface CompanySettingsUpdate {
  company_name_cs?: string
  company_name_en?: string
  ico?: string
  dic?: string
  street?: string
  city?: string
  postal_code?: string
  country?: string
  phone?: string
  email?: string
  website?: string
  bank_name?: string
  bank_account?: string
  iban?: string
  swift?: string
  invoice_notes?: string
  registration_court?: string
  logo?: File | null
  stamp?: File | null
  signature?: File | null
}

export interface Supplier {
  id: number
  name: string
  ico: string
  dic: string
  contact_person: string
  phone: string
  email: string
  address: string
  bank_account: string
  notes: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SupplierListItem {
  id: number
  name: string
  ico: string
  contact_person: string
  phone: string
  email: string
  is_active: boolean
}

export interface SupplierCreateData {
  name: string
  ico?: string
  dic?: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  bank_account?: string
  notes?: string
  is_active?: boolean
}

export interface WorkType {
  id: number
  name: string
  code: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkTypeCreateData {
  name: string
  code?: string
  description?: string
  is_active?: boolean
}

// Warehouse types
export type MaterialUnit = 'ks' | 'm' | 'm2' | 'm3' | 'kg' | 't' | 'l' | 'bal' | 'rol' | 'sada'
export type DocumentStatus = 'draft' | 'posted' | 'cancelled'

export interface Category {
  id: number
  name: string
  description: string
  is_active: boolean
  order: number
  materials_count?: number
  created_at: string
  updated_at: string
}

export interface CategoryListItem {
  id: number
  name: string
  is_active: boolean
  order: number
}

export interface Material {
  id: number
  name: string
  sku: string
  category: number
  category_name: string
  unit: MaterialUnit
  purchase_price: string
  current_stock: string
  min_stock: string
  supplier: number | null
  supplier_name: string
  photo: string | null
  photo_url: string | null
  notes: string
  is_active: boolean
  is_low_stock: boolean
  stock_value: string
  created_at: string
  updated_at: string
}

export interface MaterialListItem {
  id: number
  name: string
  sku: string
  category: number
  category_name: string
  unit: MaterialUnit
  purchase_price: string
  current_stock: string
  min_stock: string
  supplier_name: string
  is_active: boolean
  is_low_stock: boolean
  stock_value: string
}

export interface MaterialCreateData {
  name: string
  sku: string
  category: number
  unit?: MaterialUnit
  purchase_price?: string
  min_stock?: string
  supplier?: number | null
  notes?: string
  is_active?: boolean
  photo?: File | null
}

export interface StockReceiptItem {
  id?: number
  material: number
  material_name?: string
  material_sku?: string
  material_unit?: string
  quantity: string
  unit_price: string
  total_price?: string
}

export interface StockReceipt {
  id: number
  number: string
  receipt_date: string
  supplier: number
  supplier_name: string
  responsible: number
  responsible_name: string
  status: DocumentStatus
  status_display: string
  invoice_number: string
  invoice_file: string | null
  invoice_file_url: string | null
  notes: string
  items: StockReceiptItem[]
  total_amount: string
  is_editable: boolean
  created_at: string
  updated_at: string
}

export interface StockReceiptListItem {
  id: number
  number: string
  receipt_date: string
  supplier_name: string
  responsible_name: string
  status: DocumentStatus
  status_display: string
  total_amount: string
  items_count: number
}

export interface StockReceiptCreateData {
  receipt_date: string
  supplier: number
  invoice_number?: string
  invoice_file?: File | null
  notes?: string
  items: StockReceiptItem[]
}

export interface StockWriteOffItem {
  id?: number
  material: number
  material_name?: string
  material_sku?: string
  material_unit?: string
  quantity: string
  unit_price?: string
  total_price?: string
  available_stock?: string
}

export interface StockWriteOff {
  id: number
  number: string
  writeoff_date: string
  project: number
  project_name: string
  responsible: number
  responsible_name: string
  status: DocumentStatus
  status_display: string
  notes: string
  items: StockWriteOffItem[]
  total_amount: string
  is_editable: boolean
  created_at: string
  updated_at: string
}

export interface StockWriteOffListItem {
  id: number
  number: string
  writeoff_date: string
  project_name: string
  responsible_name: string
  status: DocumentStatus
  status_display: string
  total_amount: string
  items_count: number
}

export interface StockWriteOffCreateData {
  writeoff_date: string
  project: number
  notes?: string
  items: StockWriteOffItem[]
}

export interface StockReport {
  materials: MaterialListItem[]
  summary: {
    total_materials: number
    total_value: number
    low_stock_count: number
  }
}

export interface StockMovement {
  date: string
  type: 'receipt' | 'writeoff'
  document_number: string
  material_name: string
  material_sku: string
  quantity: string
  unit_price: string
  total_price: string
  direction: '+' | '-'
  supplier: string | null
  project: string | null
}

export interface StockMovementsReport {
  movements: StockMovement[]
  summary: {
    total_movements: number
    total_receipts: number
    total_writeoffs: number
    total_value_in: number
    total_value_out: number
  }
}
