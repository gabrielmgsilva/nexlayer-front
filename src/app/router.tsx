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
import { CategoriesPage } from './routes/settings/categories'
import { AccessoryCategoriesPage } from './routes/settings/accessory-categories'
import { ChannelsPage } from './routes/settings/channels'
import { CustomersPage } from './routes/settings/customers'
import { ColorsPage } from './routes/settings/colors'
import { CostCenterPage } from './routes/settings/cost-center'
import { BrandsPage } from './routes/settings/brands'
import { SlicerProfilesPage } from './routes/settings/slicer-profiles'
import { NotificationsPage } from './routes/notifications'
import { ProductionPage } from './routes/production'
import { PrintFailuresPage } from './routes/production/failures'
import { MaintenancePage } from './routes/production/maintenance'
import { FarmViewPage } from './routes/production/farmview'
import { CapacityPage } from './routes/production/capacity'
import { ReportsPage } from './routes/reports'
import { PricingTemplatesPage } from './routes/products/templates'
import { ProfitabilityPage } from './routes/reports/profitability'
import { TraceabilityPage } from './routes/resources/traceability'
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
      { path: 'production',                  element: <ProductionPage /> },
      { path: 'production/failures',         element: <PrintFailuresPage /> },
      { path: 'production/maintenance',      element: <MaintenancePage /> },
      { path: 'production/farmview',         element: <FarmViewPage /> },
      { path: 'production/capacity',         element: <CapacityPage /> },
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
      { path: 'calculator',              element: <CalculatorPage /> },
      { path: 'reports',                 element: <ReportsPage /> },
      { path: 'products/templates',      element: <PricingTemplatesPage /> },
      { path: 'reports/profitability',   element: <ProfitabilityPage /> },
      { path: 'resources/traceability',  element: <TraceabilityPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      {
        path: 'settings',
        element: <SettingsPage />,
        children: [
          { index: true,              element: <Navigate to="channels" replace /> },
          { path: 'categories',             element: <CategoriesPage /> },
          { path: 'accessory-categories',   element: <AccessoryCategoriesPage /> },
          { path: 'channels',               element: <ChannelsPage /> },
          { path: 'customers',        element: <CustomersPage /> },
          { path: 'colors',           element: <ColorsPage /> },
          { path: 'cost-center',      element: <CostCenterPage /> },
          { path: 'brands',           element: <BrandsPage /> },
          { path: 'slicer-profiles',  element: <SlicerProfilesPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
