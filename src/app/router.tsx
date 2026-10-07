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
import BrowserPage from '../pages/BrowserPage';
import NotFoundPage from '../pages/NotFoundPage';
import ConnectAppsPage from '../pages/ConnectAppsPage';
import ConnectAppPage from '../pages/ConnectAppPage';
import ConnectInvitePage from '../pages/ConnectInvitePage';
import ConnectDocsPage from '../pages/ConnectDocsPage';
import ConnectLayout from '../features/connect/layout/ConnectLayout';
import ConnectAccountGate from '../features/connect/layout/ConnectAccountGate';

export const router = createBrowserRouter([
    {
        path: '/auth',
        element: <AuthPage />,
    },

    // The IDE: no sign-in needed. Visitors without a session get a guest
    // session (temporary workspaces) and land on the dashboard.
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
                        path: '/browser',
                        element: <BrowserPage />,
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

    // Corven Connect: its own site with its own layout. Docs are public;
    // managing apps needs a Corven account (not a guest session).
    {
        path: '/connect',
        element: <ConnectLayout />,
        children: [
            { path: 'docs', element: <Navigate to="/connect/docs/introduction" replace /> },
            { path: 'docs/:slug', element: <ConnectDocsPage /> },
            {
                element: <ConnectAccountGate />,
                children: [
                    { index: true, element: <ConnectAppsPage /> },
                    { path: 'apps/:appId', element: <ConnectAppPage /> },
                    { path: 'invite/:token', element: <ConnectInvitePage /> },
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
        element: <Navigate to="/dashboard?tab=community" replace />,
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);
