import { lazy } from 'react';

// project-imports
import DashboardLayout from 'layout/Dashboard';
import Loadable from 'components/Loadable';
import ProtectedRoute from 'components/ProtectedRoute';

// render - bootstrap table pages
const BootstrapTableBasic = Loadable(lazy(() => import('views/table/bootstrap-table/BasicTable')));

// ==============================|| TABLES ROUTING ||============================== //

const TablesRoutes = {
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
          path: 'tables/bootstrap-table',
          children: [
            {
              path: 'basic-table',
              element: <BootstrapTableBasic />
            }
          ]
        }
      ]
    }
  ]
};

export default TablesRoutes;
