import apiClient from './client'
import {
  Project,
  ProjectListItem,
  ProjectCreateData,
  ProjectFile,
  ProjectHistory,
  ProjectFinances,
  AresCompanyData,
  PaginatedResponse,
} from '../types'

export interface ProjectFilters {
  status?: string
  work_type?: string
  manager?: number
  start_date_from?: string
  start_date_to?: string
  search?: string
  page?: number
  page_size?: number
  ordering?: string
}

export const projectsApi = {
  // List projects with filters
  list: async (filters: ProjectFilters = {}): Promise<PaginatedResponse<ProjectListItem>> => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value))
      }
    })
    const response = await apiClient.get<PaginatedResponse<ProjectListItem>>(
      `/projects/?${params.toString()}`
    )
    return response.data
  },

  // Get single project
  get: async (id: number): Promise<Project> => {
    const response = await apiClient.get<Project>(`/projects/${id}/`)
    return response.data
  },

  // Create project
  create: async (data: ProjectCreateData): Promise<Project> => {
    const response = await apiClient.post<Project>('/projects/', data)
    return response.data
  },

  // Update project
  update: async (id: number, data: Partial<ProjectCreateData>): Promise<Project> => {
    const response = await apiClient.patch<Project>(`/projects/${id}/`, data)
    return response.data
  },

  // Delete project
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/projects/${id}/`)
  },

  // Get project finances
  getFinances: async (id: number): Promise<ProjectFinances> => {
    const response = await apiClient.get<ProjectFinances>(`/projects/${id}/finances/`)
    return response.data
  },

  // Get project history
  getHistory: async (id: number): Promise<ProjectHistory[]> => {
    const response = await apiClient.get<ProjectHistory[]>(`/projects/${id}/history/`)
    return response.data
  },

  // Get project files
  getFiles: async (id: number): Promise<ProjectFile[]> => {
    const response = await apiClient.get<ProjectFile[]>(`/projects/${id}/files/`)
    return response.data
  },

  // Upload file
  uploadFile: async (
    projectId: number,
    file: File,
    data: { name?: string; file_type?: string; description?: string }
  ): Promise<ProjectFile> => {
    const formData = new FormData()
    formData.append('file', file)
    if (data.name) formData.append('name', data.name)
    if (data.file_type) formData.append('file_type', data.file_type)
    if (data.description) formData.append('description', data.description)

    const response = await apiClient.post<ProjectFile>(
      `/projects/${projectId}/files/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  // Delete file
  deleteFile: async (projectId: number, fileId: number): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/files/${fileId}/`)
  },

  // Verify IČO via ARES
  verifyIco: async (ico: string): Promise<AresCompanyData> => {
    const response = await apiClient.post<AresCompanyData>('/projects/verify-ico/', { ico })
    return response.data
  },
}
