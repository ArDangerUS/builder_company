import apiClient from './client'
import type {
  DashboardData,
  DebtReportData,
  InvoiceReportData,
  ProjectReportData,
} from '../types'

interface ProjectReportParams {
  status?: string
  manager?: string
  date_from?: string
  date_to?: string
  export?: 'excel'
}

interface InvoiceReportParams {
  status?: string
  project?: number
  date_from?: string
  date_to?: string
  export?: 'excel'
}

export const reportsApi = {
  // Get dashboard data
  getDashboard: async (): Promise<DashboardData> => {
    const response = await apiClient.get<DashboardData>('/reports/dashboard/')
    return response.data
  },

  // Get projects report
  getProjectsReport: async (params: ProjectReportParams = {}): Promise<ProjectReportData> => {
    const response = await apiClient.get<ProjectReportData>('/reports/projects/', { params })
    return response.data
  },

  // Export projects report to Excel
  exportProjectsExcel: async (params: Omit<ProjectReportParams, 'export'> = {}): Promise<Blob> => {
    const response = await apiClient.get('/reports/projects/', {
      params: { ...params, export: 'excel' },
      responseType: 'blob',
    })
    return response.data
  },

  // Get invoices report
  getInvoicesReport: async (params: InvoiceReportParams = {}): Promise<InvoiceReportData> => {
    const response = await apiClient.get<InvoiceReportData>('/reports/invoices/', { params })
    return response.data
  },

  // Export invoices report to Excel
  exportInvoicesExcel: async (params: Omit<InvoiceReportParams, 'export'> = {}): Promise<Blob> => {
    const response = await apiClient.get('/reports/invoices/', {
      params: { ...params, export: 'excel' },
      responseType: 'blob',
    })
    return response.data
  },

  // Get debt report
  getDebtReport: async (): Promise<DebtReportData> => {
    const response = await apiClient.get<DebtReportData>('/reports/debt/')
    return response.data
  },

  // Export debt report to Excel
  exportDebtExcel: async (): Promise<Blob> => {
    const response = await apiClient.get('/reports/debt/', {
      params: { export: 'excel' },
      responseType: 'blob',
    })
    return response.data
  },
}
