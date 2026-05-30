import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './layout'
import { useAuthStore } from '@/stores/auth.store'

import { LoginPage } from './routes/auth/login'
import { DashboardPage } from './routes/dashboard'
import { SalesPage, SaleDetailPage } from './routes/sales'
import { ProductsPage } from './routes/products'
import { ResourcesPage } from './routes/resources'
import { EquipmentPage } from './routes/resources/equipment'
import { MaterialsPage } from './routes/resources/materials'
import { AccessoriesPage } from './routes/resources/accessories'
import { SuppliersPage } from './routes/suppliers'
import { CalculatorPage } from './routes/calculator'
import { SettingsPage } from './routes/settings'
import { ChannelsPage } from './routes/settings/channels'
import { CustomersPage } from './routes/settings/customers'
import { ColorsPage } from './routes/settings/colors'
import { CostCenterPage } from './routes/settings/cost-center'
import { NotificationsPage } from './routes/notifications'
import { ProductionPage } from './routes/production'
import { ReportsPage } from './routes/reports'
import { OnboardingPage } from './routes/onboarding'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function SalesWithDrawer() {
  return (
    <>
      <SalesPage />
      <SaleDetailPage />
    </>
  )
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/onboarding', element: <RequireAuth><OnboardingPage /></RequireAuth> },
  {
    path: '/',
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      { index: true,           element: <DashboardPage /> },
      { path: 'sales',         element: <SalesPage /> },
      { path: 'sales/:id',     element: <SalesWithDrawer /> },
      { path: 'production',    element: <ProductionPage /> },
      { path: 'products',      element: <ProductsPage /> },
      {
        path: 'resources',
        element: <ResourcesPage />,
        children: [
          { index: true,              element: <Navigate to="equipment" replace /> },
          { path: 'equipment',        element: <EquipmentPage /> },
          { path: 'materials',        element: <MaterialsPage /> },
          { path: 'accessories',      element: <AccessoriesPage /> },
        ],
      },
      { path: 'suppliers',      element: <SuppliersPage /> },
      { path: 'calculator',    element: <CalculatorPage /> },
      { path: 'reports',       element: <ReportsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      {
        path: 'settings',
        element: <SettingsPage />,
        children: [
          { index: true,              element: <Navigate to="channels" replace /> },
          { path: 'channels',         element: <ChannelsPage /> },
          { path: 'customers',        element: <CustomersPage /> },
          { path: 'colors',           element: <ColorsPage /> },
          { path: 'cost-center',      element: <CostCenterPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
