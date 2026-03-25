import { lazy } from 'react';

// project-imports
import DashboardLayout from 'layout/Dashboard';
import Loadable from 'components/Loadable';
import ProtectedRoute from 'components/ProtectedRoute';

// render - chart pages
const ApexChart = Loadable(lazy(() => import('views/charts/ApexChart')));

// render - map pages
const GoogleMaps = Loadable(lazy(() => import('views/maps/GoogleMap')));

// ==============================|| CHART & MAP ROUTING ||============================== //

const ChartMapRoutes = {
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
          path: 'charts',
          children: [
            {
              path: 'apex-chart',
              element: <ApexChart />
            }
          ]
        },
        {
          path: 'map',
          children: [
            {
              path: 'google-map',
              element: <GoogleMaps />
            }
          ]
        }
      ]
    }
  ]
};

export default ChartMapRoutes;
