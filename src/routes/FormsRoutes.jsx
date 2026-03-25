import { lazy } from 'react';

// project-imports
import DashboardLayout from 'layout/Dashboard';
import Loadable from 'components/Loadable';
import ProtectedRoute from 'components/ProtectedRoute';

// render - forms element pages
const FormBasic = Loadable(lazy(() => import('views/forms/form-element/FormBasic')));

// ==============================|| FORMS ROUTING ||============================== //

const FormsRoutes = {
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
          path: 'forms',
          children: [
            {
              path: 'form-elements',
              children: [{ path: 'basic', element: <FormBasic /> }]
            }
          ]
        }
      ]
    }
  ]
};

export default FormsRoutes;
