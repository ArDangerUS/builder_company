import { api, handleApiError, createFormData } from './client'
import {
  CategoryListItem,
  Category,
  Material,
  MaterialListItem,
  MaterialCreateData,
  StockReceipt,
  StockReceiptListItem,
  StockReceiptCreateData,
  StockWriteOff,
  StockWriteOffListItem,
  StockWriteOffCreateData,
  StockReport,
  StockMovementsReport,
  PaginatedResponse,
} from '../types'

const BASE_URL = '/warehouse'

// Categories
export const warehouseApi = {
  // Categories
  getCategories: async (params?: { is_active?: boolean }): Promise<CategoryListItem[]> => {
    try {
      const { data } = await api.get(`${BASE_URL}/categories/`, { params })
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getCategory: async (id: number): Promise<Category> => {
    try {
      const { data } = await api.get(`${BASE_URL}/categories/${id}/`)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  createCategory: async (categoryData: Partial<Category>): Promise<Category> => {
    try {
      const { data } = await api.post(`${BASE_URL}/categories/`, categoryData)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateCategory: async (id: number, categoryData: Partial<Category>): Promise<Category> => {
    try {
      const { data } = await api.patch(`${BASE_URL}/categories/${id}/`, categoryData)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteCategory: async (id: number): Promise<void> => {
    try {
      await api.delete(`${BASE_URL}/categories/${id}/`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  createDefaultCategories: async (): Promise<{ status: string }> => {
    try {
      const { data } = await api.post(`${BASE_URL}/categories/create_defaults/`)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Materials
  getMaterials: async (params?: {
    category?: number
    supplier?: number
    is_active?: boolean
    low_stock?: boolean
    search?: string
    page?: number
  }): Promise<PaginatedResponse<MaterialListItem>> => {
    try {
      const { data } = await api.get(`${BASE_URL}/materials/`, { params })
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getMaterial: async (id: number): Promise<Material> => {
    try {
      const { data } = await api.get(`${BASE_URL}/materials/${id}/`)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  createMaterial: async (materialData: MaterialCreateData): Promise<Material> => {
    try {
      let payload: FormData | MaterialCreateData = materialData
      if (materialData.photo) {
        payload = createFormData(materialData)
      }
      const { data } = await api.post(`${BASE_URL}/materials/`, payload)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateMaterial: async (id: number, materialData: Partial<MaterialCreateData>): Promise<Material> => {
    try {
      let payload: FormData | Partial<MaterialCreateData> = materialData
      if (materialData.photo) {
        payload = createFormData(materialData)
      }
      const { data } = await api.patch(`${BASE_URL}/materials/${id}/`, payload)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteMaterial: async (id: number): Promise<void> => {
    try {
      await api.delete(`${BASE_URL}/materials/${id}/`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getMaterialChoices: async (): Promise<{ id: number; name: string; sku: string; unit: string; purchase_price: string; current_stock: string }[]> => {
    try {
      const { data } = await api.get(`${BASE_URL}/materials/choices/`)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getLowStockMaterials: async (): Promise<MaterialListItem[]> => {
    try {
      const { data } = await api.get(`${BASE_URL}/materials/low_stock/`)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Stock Receipts
  getReceipts: async (params?: {
    status?: string
    supplier?: number
    date_from?: string
    date_to?: string
    search?: string
    page?: number
  }): Promise<PaginatedResponse<StockReceiptListItem>> => {
    try {
      const { data } = await api.get(`${BASE_URL}/receipts/`, { params })
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getReceipt: async (id: number): Promise<StockReceipt> => {
    try {
      const { data } = await api.get(`${BASE_URL}/receipts/${id}/`)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  createReceipt: async (receiptData: StockReceiptCreateData): Promise<StockReceipt> => {
    try {
      let payload: FormData | StockReceiptCreateData = receiptData
      if (receiptData.invoice_file) {
        payload = createFormData(receiptData)
      }
      const { data } = await api.post(`${BASE_URL}/receipts/`, payload)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateReceipt: async (id: number, receiptData: Partial<StockReceiptCreateData>): Promise<StockReceipt> => {
    try {
      let payload: FormData | Partial<StockReceiptCreateData> = receiptData
      if (receiptData.invoice_file) {
        payload = createFormData(receiptData)
      }
      const { data } = await api.patch(`${BASE_URL}/receipts/${id}/`, payload)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteReceipt: async (id: number): Promise<void> => {
    try {
      await api.delete(`${BASE_URL}/receipts/${id}/`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  postReceipt: async (id: number): Promise<StockReceipt> => {
    try {
      const { data } = await api.post(`${BASE_URL}/receipts/${id}/post/`)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  cancelReceipt: async (id: number): Promise<StockReceipt> => {
    try {
      const { data } = await api.post(`${BASE_URL}/receipts/${id}/cancel/`)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Stock Write-offs
  getWriteOffs: async (params?: {
    status?: string
    project?: number
    date_from?: string
    date_to?: string
    search?: string
    page?: number
  }): Promise<PaginatedResponse<StockWriteOffListItem>> => {
    try {
      const { data } = await api.get(`${BASE_URL}/writeoffs/`, { params })
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getWriteOff: async (id: number): Promise<StockWriteOff> => {
    try {
      const { data } = await api.get(`${BASE_URL}/writeoffs/${id}/`)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  createWriteOff: async (writeOffData: StockWriteOffCreateData): Promise<StockWriteOff> => {
    try {
      const { data } = await api.post(`${BASE_URL}/writeoffs/`, writeOffData)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateWriteOff: async (id: number, writeOffData: Partial<StockWriteOffCreateData>): Promise<StockWriteOff> => {
    try {
      const { data } = await api.patch(`${BASE_URL}/writeoffs/${id}/`, writeOffData)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteWriteOff: async (id: number): Promise<void> => {
    try {
      await api.delete(`${BASE_URL}/writeoffs/${id}/`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  postWriteOff: async (id: number): Promise<StockWriteOff> => {
    try {
      const { data } = await api.post(`${BASE_URL}/writeoffs/${id}/post/`)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  cancelWriteOff: async (id: number): Promise<StockWriteOff> => {
    try {
      const { data } = await api.post(`${BASE_URL}/writeoffs/${id}/cancel/`)
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Reports
  getStockReport: async (params?: {
    category?: number
    low_stock?: boolean
  }): Promise<StockReport> => {
    try {
      const { data } = await api.get(`${BASE_URL}/reports/stock/`, { params })
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getMovementsReport: async (params?: {
    material?: number
    date_from?: string
    date_to?: string
  }): Promise<StockMovementsReport> => {
    try {
      const { data } = await api.get(`${BASE_URL}/reports/movements/`, { params })
      return data
    } catch (error) {
      throw handleApiError(error)
    }
  },
}
