import apiClient from './client'
import type {
  Invoice,
  InvoiceCreateData,
  InvoiceHistory,
  InvoiceListItem,
  InvoiceStats,
  PaginatedResponse,
  Payment,
  PaymentCreateData,
  ProjectForInvoice,
} from '../types'

interface InvoiceListParams {
  page?: number
  page_size?: number
  search?: string
  status?: string
  project?: number
  client?: string
  issue_date_from?: string
  issue_date_to?: string
  due_date_from?: string
  due_date_to?: string
  overdue?: boolean
  ordering?: string
}

export const invoicesApi = {
  // List invoices with filters
  list: async (params: InvoiceListParams = {}): Promise<PaginatedResponse<InvoiceListItem>> => {
    const response = await apiClient.get<PaginatedResponse<InvoiceListItem>>('/invoices/', { params })
    return response.data
  },

  // Get single invoice
  get: async (id: number): Promise<Invoice> => {
    const response = await apiClient.get<Invoice>(`/invoices/${id}/`)
    return response.data
  },

  // Create invoice
  create: async (data: InvoiceCreateData): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>('/invoices/', data)
    return response.data
  },

  // Update invoice
  update: async (id: number, data: Partial<InvoiceCreateData>): Promise<Invoice> => {
    const response = await apiClient.patch<Invoice>(`/invoices/${id}/`, data)
    return response.data
  },

  // Delete invoice
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/invoices/${id}/`)
  },

  // Issue invoice
  issue: async (id: number): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>(`/invoices/${id}/issue/`)
    return response.data
  },

  // Cancel invoice
  cancel: async (id: number): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>(`/invoices/${id}/cancel/`)
    return response.data
  },

  // Get PDF URL
  getPdfUrl: (id: number, lang: string = 'cs'): string => {
    const baseUrl = apiClient.defaults.baseURL || ''
    return `${baseUrl}/invoices/${id}/pdf/?lang=${lang}`
  },

  // Download PDF
  downloadPdf: async (id: number, lang: string = 'cs'): Promise<Blob> => {
    const response = await apiClient.get(`/invoices/${id}/pdf/`, {
      params: { lang },
      responseType: 'blob',
    })
    return response.data
  },

  // Get payments for invoice
  getPayments: async (id: number): Promise<Payment[]> => {
    const response = await apiClient.get<Payment[]>(`/invoices/${id}/payments/`)
    return response.data
  },

  // Add payment
  addPayment: async (id: number, data: PaymentCreateData): Promise<Payment> => {
    const response = await apiClient.post<Payment>(`/invoices/${id}/payments/`, data)
    return response.data
  },

  // Delete payment
  deletePayment: async (invoiceId: number, paymentId: number): Promise<void> => {
    await apiClient.delete(`/invoices/${invoiceId}/payments/${paymentId}/`)
  },

  // Get invoice history
  getHistory: async (id: number): Promise<InvoiceHistory[]> => {
    const response = await apiClient.get<InvoiceHistory[]>(`/invoices/${id}/history/`)
    return response.data
  },

  // Get projects for invoice form
  getProjects: async (): Promise<ProjectForInvoice[]> => {
    const response = await apiClient.get<ProjectForInvoice[]>('/invoices/projects/')
    return response.data
  },

  // Get invoice statistics
  getStats: async (): Promise<InvoiceStats> => {
    const response = await apiClient.get<InvoiceStats>('/invoices/stats/')
    return response.data
  },
}
