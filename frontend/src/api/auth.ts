import apiClient from './client'
import { LoginCredentials, LoginResponse, User } from '../types'

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/users/auth/login/', credentials)
    return response.data
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/users/auth/logout/', { refresh: refreshToken })
  },

  refreshToken: async (refreshToken: string): Promise<{ access: string }> => {
    const response = await apiClient.post<{ access: string }>('/users/auth/refresh/', {
      refresh: refreshToken,
    })
    return response.data
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/me/')
    return response.data
  },

  updateMe: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch<User>('/users/me/', data)
    return response.data
  },

  changePassword: async (data: {
    old_password: string
    new_password: string
    new_password_confirm: string
  }): Promise<void> => {
    await apiClient.post('/users/me/change-password/', data)
  },

  resetPasswordRequest: async (email: string): Promise<void> => {
    await apiClient.post('/users/password-reset/', { email })
  },
}
