import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { User, LoginCredentials, CompanyChoice } from '../types'
import { authApi } from '../api/auth'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // SuperAdmin company selection
  selectedCompanyId: number | null
  selectedCompany: CompanyChoice | null

  // Computed
  isSuperAdmin: () => boolean
  getEffectiveCompanyId: () => number | null

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  clearError: () => void
  setSelectedCompany: (company: CompanyChoice | null) => void
  clearSelectedCompany: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      selectedCompanyId: null,
      selectedCompany: null,

      // Computed helpers
      isSuperAdmin: () => {
        const user = get().user
        return user?.role === 'superadmin'
      },

      getEffectiveCompanyId: () => {
        const user = get().user
        if (!user) return null

        // SuperAdmin uses selected company
        if (user.role === 'superadmin') {
          return get().selectedCompanyId
        }

        // Other users use their own company
        return user.company ?? null
      },

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.login(credentials)

          // Store tokens in localStorage for API client
          localStorage.setItem('access_token', response.access)
          localStorage.setItem('refresh_token', response.refresh)

          set({
            user: response.user,
            accessToken: response.access,
            refreshToken: response.refresh,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : 'Přihlášení selhalo'
          set({
            error: message,
            isLoading: false,
          })
          throw error
        }
      },

      logout: async () => {
        const { refreshToken } = get()
        try {
          if (refreshToken) {
            await authApi.logout(refreshToken)
          }
        } catch {
          // Ignore errors during logout
        } finally {
          // Clear localStorage
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')

          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            selectedCompanyId: null,
            selectedCompany: null,
          })
        }
      },

      refreshUser: async () => {
        try {
          const user = await authApi.getMe()
          set({ user })
        } catch {
          // If refresh fails, logout
          get().logout()
        }
      },

      clearError: () => set({ error: null }),

      setSelectedCompany: (company: CompanyChoice | null) => {
        set({
          selectedCompanyId: company?.id ?? null,
          selectedCompany: company,
        })
      },

      clearSelectedCompany: () => {
        set({
          selectedCompanyId: null,
          selectedCompany: null,
        })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        selectedCompanyId: state.selectedCompanyId,
        selectedCompany: state.selectedCompany,
      }),
    }
  )
)
