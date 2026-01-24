import apiClient, { createFormData } from './client'
import {
  Company,
  CompanyListItem,
  CompanyCreateData,
  CompanyStats,
  CompanyChoice,
  PaginatedResponse,
} from '../types'

export interface CompanyFilters {
  search?: string
  is_active?: boolean
  page?: number
  page_size?: number
}

export const companiesApi = {
  /**
   * Get paginated list of companies (SuperAdmin only)
   */
  getCompanies: async (filters?: CompanyFilters): Promise<PaginatedResponse<CompanyListItem>> => {
    const params = new URLSearchParams()

    if (filters?.search) {
      params.append('search', filters.search)
    }
    if (filters?.is_active !== undefined) {
      params.append('is_active', String(filters.is_active))
    }
    if (filters?.page) {
      params.append('page', String(filters.page))
    }
    if (filters?.page_size) {
      params.append('page_size', String(filters.page_size))
    }

    const response = await apiClient.get<PaginatedResponse<CompanyListItem>>(
      `/companies/?${params.toString()}`
    )
    return response.data
  },

  /**
   * Get company details by ID (SuperAdmin only)
   */
  getCompany: async (id: number): Promise<Company> => {
    const response = await apiClient.get<Company>(`/companies/${id}/`)
    return response.data
  },

  /**
   * Create a new company (SuperAdmin only)
   */
  createCompany: async (data: CompanyCreateData): Promise<Company> => {
    // Check if we have file uploads
    const hasFiles = data.logo instanceof File || data.stamp instanceof File

    if (hasFiles) {
      const formData = createFormData(data)
      const response = await apiClient.post<Company>('/companies/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    }

    const response = await apiClient.post<Company>('/companies/', data)
    return response.data
  },

  /**
   * Update company (SuperAdmin only)
   */
  updateCompany: async (id: number, data: Partial<CompanyCreateData>): Promise<Company> => {
    // Check if we have file uploads
    const hasFiles = data.logo instanceof File || data.stamp instanceof File

    if (hasFiles) {
      const formData = createFormData(data)
      const response = await apiClient.patch<Company>(`/companies/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    }

    const response = await apiClient.patch<Company>(`/companies/${id}/`, data)
    return response.data
  },

  /**
   * Delete company (SuperAdmin only)
   */
  deleteCompany: async (id: number): Promise<void> => {
    await apiClient.delete(`/companies/${id}/`)
  },

  /**
   * Get company statistics (SuperAdmin only)
   */
  getCompanyStats: async (id: number): Promise<CompanyStats> => {
    const response = await apiClient.get<CompanyStats>(`/companies/${id}/stats/`)
    return response.data
  },

  /**
   * Get company choices for dropdowns (SuperAdmin only)
   */
  getCompanyChoices: async (): Promise<CompanyChoice[]> => {
    const response = await apiClient.get<CompanyChoice[]>('/companies/choices/')
    return response.data
  },
}
