import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { useAuthStore } from './store/authStore'
import MainLayout from './components/layout/MainLayout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import { ProjectsListPage, ProjectFormPage, ProjectDetailPage } from './pages/projects'
import { InvoicesListPage, InvoiceFormPage, InvoiceDetailPage } from './pages/invoices'
import { MaterialsPage, MaterialFormPage, StockReportPage } from './pages/warehouse'
import { ReportsPage } from './pages/reports'
import { SettingsPage } from './pages/settings'
import { CompanyList, CompanyForm, CompanyDetail } from './pages/companies'

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// SuperAdmin Route component - only for superadmin users
const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore()

  if (user?.role !== 'superadmin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// Public Route (redirect to dashboard if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />

          {/* SuperAdmin only - Company management */}
          <Route path="companies" element={<SuperAdminRoute><CompanyList /></SuperAdminRoute>} />
          <Route path="companies/new" element={<SuperAdminRoute><CompanyForm /></SuperAdminRoute>} />
          <Route path="companies/:id" element={<SuperAdminRoute><CompanyDetail /></SuperAdminRoute>} />
          <Route path="companies/:id/edit" element={<SuperAdminRoute><CompanyForm /></SuperAdminRoute>} />

          <Route path="projects" element={<ProjectsListPage />} />
          <Route path="projects/new" element={<ProjectFormPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="projects/:id/edit" element={<ProjectFormPage />} />
          <Route path="warehouse/materials" element={<MaterialsPage />} />
          <Route path="warehouse/materials/new" element={<MaterialFormPage />} />
          <Route path="warehouse/materials/:id/edit" element={<MaterialFormPage />} />
          <Route path="warehouse/reports" element={<StockReportPage />} />
          <Route path="invoices" element={<InvoicesListPage />} />
          <Route path="invoices/new" element={<InvoiceFormPage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="invoices/:id/edit" element={<InvoiceFormPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="users" element={<div>Uživatelé</div>} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
