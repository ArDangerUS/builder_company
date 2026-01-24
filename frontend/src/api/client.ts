import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token and company parameter for SuperAdmin
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add company parameter for SuperAdmin if selected
    // Get auth state from localStorage (persisted by zustand)
    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      try {
        const authState = JSON.parse(authStorage)
        const user = authState?.state?.user
        const selectedCompanyId = authState?.state?.selectedCompanyId

        // If SuperAdmin has selected a company, add it to requests
        if (user?.role === 'superadmin' && selectedCompanyId) {
          // Don't add company param to company management endpoints
          const isCompanyEndpoint = config.url?.startsWith('/companies')

          if (!isCompanyEndpoint) {
            // Add company to query params
            const url = new URL(config.url || '', 'http://localhost')

            // Only add if not already present
            if (!url.searchParams.has('company')) {
              url.searchParams.append('company', String(selectedCompanyId))
              config.url = url.pathname + url.search
            }
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/users/auth/refresh/`, {
            refresh: refreshToken,
          })

          const { access } = response.data
          localStorage.setItem('access_token', access)

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access}`
          }
          return apiClient(originalRequest)
        } catch (refreshError) {
          // Refresh failed, clear all auth data and redirect to login
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('auth-storage')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, clear auth storage and redirect to login
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// Named export for convenience
export const api = apiClient

// Helper function to handle API errors
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: string; message?: string }>
    if (axiosError.response?.data?.detail) {
      return axiosError.response.data.detail
    }
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }
    if (axiosError.message) {
      return axiosError.message
    }
  }
  return 'Nastala neočekávaná chyba'
}

// Helper function to create FormData from object
export const createFormData = <T extends object>(data: T): FormData => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (value instanceof File) {
        formData.append(key, value)
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value))
      } else {
        formData.append(key, String(value))
      }
    }
  })
  return formData
}

export default apiClient
