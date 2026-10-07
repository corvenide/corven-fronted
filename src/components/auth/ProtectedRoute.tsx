// src/components/auth/ProtectedRoute.tsx
//
// The IDE doesn't require signing in: without a session, a guest session is
// started and the person lands straight on the dashboard. Guests get
// temporary workspaces; connecting a wallet (or signing in) keeps them.

import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../../features/auth/hooks/useAuth';
import LoadingScreen from '../common/LoadingScreen';

export default function ProtectedRoute() {
    const { isAuthenticated, isInitializing, startGuest } = useAuth();
    const location = useLocation();
    const [guestFailed, setGuestFailed] = useState(false);

    useEffect(() => {
        if (isInitializing || isAuthenticated || guestFailed) return;
        startGuest().catch(() => setGuestFailed(true));
    }, [isInitializing, isAuthenticated, guestFailed, startGuest]);

    if (isAuthenticated) return <Outlet />;

    // Couldn't start a guest session (offline, rate-limited): offer sign-in.
    if (guestFailed) {
        return <Navigate to="/auth" replace state={{ from: location }} />;
    }

    return isInitializing ? <LoadingScreen /> : <LoadingScreen label="Opening Corven" />;
}
