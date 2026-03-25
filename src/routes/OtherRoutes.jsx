import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import ProtectedRoute from 'components/ProtectedRoute';
import DashboardLayout from 'layout/Dashboard';
import { p, path } from 'framer-motion/client';

// render - other pages
const OtherSamplePage = Loadable(lazy(() => import('views/SamplePage')));
const RoomManagementPage = Loadable(lazy(() => import('views/RoomManagementPage')));
const TenantManagement = Loadable(lazy(() => import('views/TenantManagement')));
const RentPayment = Loadable(lazy(() => import('views/RentPayment')));
const MaintenanceReport = Loadable(lazy(() => import('views/MaintenanceReport')));
const PastTenants = Loadable(lazy(() => import('views/PastTenants')));
const PaymentHistory = Loadable(lazy(() => import('views/PaymentHistory')));
const MaintenanceHistory = Loadable(lazy(() => import('views/MaintenanceHistory')));
const SettingsPage = Loadable(lazy(() => import('views/Settings')));

// ==============================|| OTHER ROUTING ||============================== //

const OtherRoutes = {
  path: '/',
  children: [
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      ),
      children: [
        {
          path: 'other',
          children: [
            {
              path: 'room-management',
              element: <RoomManagementPage />
            },
            {
              path: 'tenant-management',
              element: <TenantManagement />
            },
            {
              path: 'rent-payment',
              element: <RentPayment />
            },
            {
              path: 'maintenance-report',
              element: <MaintenanceReport />
            },
            {
              path: 'past-tenants',
              element: <PastTenants />
            },
            {
              path: 'payment-history',
              element: <PaymentHistory />
            },
            {
              path: 'maintenance-history',
              element: <MaintenanceHistory />
            },
            {
              path: 'settings',
              element: <SettingsPage />
            },
          ]
        }
      ]
    }
  ]
};

export default OtherRoutes;
