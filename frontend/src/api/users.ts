import apiClient from './client'
import {
  User,
  UserListItem,
  UserCreateData,
  UserRole,
  PaginatedResponse,
} from '../types'

export interface UserFilters {
  search?: string
  role?: UserRole
  is_active?: boolean
  company?: number
  page?: number
  page_size?: number
}

export const usersApi = {
  /**
   * Get paginated list of users (Admin only)
   * SuperAdmin sees all users, Admin sees only their company's users
   */
  getUsers: async (filters?: UserFilters): Promise<PaginatedResponse<UserListItem>> => {
    const params = new URLSearchParams()

    if (filters?.search) {
      params.append('search', filters.search)
    }
    if (filters?.role) {
      params.append('role', filters.role)
    }
    if (filters?.is_active !== undefined) {
      params.append('is_active', String(filters.is_active))
    }
    if (filters?.company) {
      params.append('company', String(filters.company))
    }
    if (filters?.page) {
      params.append('page', String(filters.page))
    }
    if (filters?.page_size) {
      params.append('page_size', String(filters.page_size))
    }

    const response = await apiClient.get<PaginatedResponse<UserListItem>>(
      `/users/?${params.toString()}`
    )
    return response.data
  },

  /**
   * Get user details by ID
   */
  getUser: async (id: number): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${id}/`)
    return response.data
  },

  /**
   * Create a new user (Admin only)
   * Admin creates users in their company
   * SuperAdmin can specify company or create without company
   */
  createUser: async (data: UserCreateData): Promise<User> => {
    const response = await apiClient.post<User>('/users/', data)
    return response.data
  },

  /**
   * Update user
   */
  updateUser: async (id: number, data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch<User>(`/users/${id}/`, data)
    return response.data
  },

  /**
   * Delete user
   */
  deleteUser: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}/`)
  },

  /**
   * Get user choices for dropdowns
   */
  getUserChoices: async (filters?: { company?: number; role?: UserRole }): Promise<{ id: number; full_name: string }[]> => {
    const params = new URLSearchParams()

    if (filters?.company) {
      params.append('company', String(filters.company))
    }
    if (filters?.role) {
      params.append('role', filters.role)
    }

    const response = await apiClient.get<PaginatedResponse<UserListItem>>(
      `/users/?${params.toString()}&page_size=1000`
    )
    return response.data.results.map(user => ({
      id: user.id,
      full_name: user.full_name,
    }))
  },
}
