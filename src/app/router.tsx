// src/app/router.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';

import ProtectedRoute from '../components/auth/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';

import AuthPage from '../features/auth/pages/AuthPage';
import HomePage from '../pages/HomePage';
import DashboardPage from '../pages/DashboardPage';
import IdePage from '../pages/IdePage';
import NodesPage from '../pages/NodePage';
import SettingsPage from '../pages/SettingsPage';
// import NotFoundPage from '../pages/NotFoundPage';

export const router = createBrowserRouter([
    {
        path: '/auth',
        element: <AuthPage />,
    },

    {
        element: <ProtectedRoute />,

        children: [
            {
                element: <AppLayout />,

                children: [
                    // {
                    //     path: '/',
                    //     element: <HomePage />,
                    // },
                    {
                        path: '/dashboard',
                        element: <DashboardPage />,
                    },
                    {
                        path: '/ide/:workspaceId',
                        element: <IdePage />,
                    },
                    {
                        path: '/nodes',
                        element: <NodesPage />,
                    },
                    {
                        path: '/settings',
                        element: <SettingsPage />,
                    },
                    {
                        // Old links to the bare IDE go to the workspace list.
                        path: '/ide',
                        element: <Navigate to="/dashboard" replace />,
                    },
                ],
            },
        ],
    },

    {
        path: '/',
        element: <HomePage />,
    },
    {
        // Redirect old /donate route to dashboard (donate tab is now in dashboard)
        path: '/donate',
        element: <Navigate to="/dashboard" replace />,
    },
    {
        // Redirect old /community route to dashboard (community tab is now in dashboard)
        path: '/community',
        element: <Navigate to="/dashboard" replace />,
    },
]);
