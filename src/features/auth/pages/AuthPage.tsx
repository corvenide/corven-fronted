// src/features/auth/pages/AuthPage.tsx

import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import AuthView from '../../../components/AuthView';
import LoadingScreen from '../../../components/common/LoadingScreen';
import { useAuth } from '../hooks/useAuth';

interface LocationState {
    from?: { pathname?: string; search?: string };
}

export default function AuthPage() {
    const { isAuthenticated, isInitializing, endReason } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    const from = (location.state as LocationState | null)?.from;

    // Only ever redirect back inside the app.
    const destination =
        from?.pathname && from.pathname.startsWith('/') && from.pathname !== '/auth'
            ? `${from.pathname}${from.search ?? ''}`
            : '/dashboard';

    if (isInitializing) {
        return <LoadingScreen />;
    }

    if (isAuthenticated) {
        return <Navigate to={destination} replace />;
    }

    return (
        <AuthView
            sessionExpired={endReason === 'expired'}
            onAuthenticated={() => navigate(destination, { replace: true })}
        />
    );
}
