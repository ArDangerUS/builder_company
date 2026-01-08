import apiClient from './client'
import {
  CompanySettings,
  CompanySettingsUpdate,
  Supplier,
  SupplierListItem,
  SupplierCreateData,
  WorkType,
  WorkTypeCreateData,
} from '../types'

export const settingsApi = {
  // Company Settings
  getCompanySettings: async (): Promise<CompanySettings> => {
    const response = await apiClient.get<CompanySettings>('/settings/company/')
    return response.data
  },

  updateCompanySettings: async (data: CompanySettingsUpdate): Promise<CompanySettings> => {
    const formData = new FormData()

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value)
        } else {
          formData.append(key, String(value))
        }
      }
    })

    const response = await apiClient.put<CompanySettings>('/settings/company/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Suppliers
  listSuppliers: async (params?: { is_active?: boolean; search?: string }): Promise<SupplierListItem[]> => {
    const queryParams = new URLSearchParams()
    if (params?.is_active !== undefined) {
      queryParams.append('is_active', String(params.is_active))
    }
    if (params?.search) {
      queryParams.append('search', params.search)
    }
    const response = await apiClient.get<SupplierListItem[]>(
      `/settings/suppliers/?${queryParams.toString()}`
    )
    return response.data
  },

  getSupplier: async (id: number): Promise<Supplier> => {
    const response = await apiClient.get<Supplier>(`/settings/suppliers/${id}/`)
    return response.data
  },

  createSupplier: async (data: SupplierCreateData): Promise<Supplier> => {
    const response = await apiClient.post<Supplier>('/settings/suppliers/', data)
    return response.data
  },

  updateSupplier: async (id: number, data: Partial<SupplierCreateData>): Promise<Supplier> => {
    const response = await apiClient.patch<Supplier>(`/settings/suppliers/${id}/`, data)
    return response.data
  },

  deleteSupplier: async (id: number): Promise<void> => {
    await apiClient.delete(`/settings/suppliers/${id}/`)
  },

  // Work Types
  listWorkTypes: async (params?: { is_active?: boolean }): Promise<WorkType[]> => {
    const queryParams = new URLSearchParams()
    if (params?.is_active !== undefined) {
      queryParams.append('is_active', String(params.is_active))
    }
    const response = await apiClient.get<WorkType[]>(
      `/settings/work-types/?${queryParams.toString()}`
    )
    return response.data
  },

  getWorkType: async (id: number): Promise<WorkType> => {
    const response = await apiClient.get<WorkType>(`/settings/work-types/${id}/`)
    return response.data
  },

  createWorkType: async (data: WorkTypeCreateData): Promise<WorkType> => {
    const response = await apiClient.post<WorkType>('/settings/work-types/', data)
    return response.data
  },

  updateWorkType: async (id: number, data: Partial<WorkTypeCreateData>): Promise<WorkType> => {
    const response = await apiClient.patch<WorkType>(`/settings/work-types/${id}/`, data)
    return response.data
  },

  deleteWorkType: async (id: number): Promise<void> => {
    await apiClient.delete(`/settings/work-types/${id}/`)
  },

  getWorkTypeChoices: async (): Promise<{ id: number; name: string; code: string }[]> => {
    const response = await apiClient.get<{ id: number; name: string; code: string }[]>(
      '/settings/work-types/choices/'
    )
    return response.data
  },
}
