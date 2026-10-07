// src/features/auth/pages/AuthPage.tsx

import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import AuthView from '../../../components/AuthView';
import LoadingScreen from '../../../components/common/LoadingScreen';
import { useAuth } from '../hooks/useAuth';

interface LocationState {
    from?: { pathname?: string; search?: string };
    intent?: 'ide' | 'connect';
}

export default function AuthPage() {
    const { isAuthenticated, isGuest, isInitializing, endReason } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    const from = (location.state as LocationState | null)?.from;
    const intent = (location.state as LocationState | null)?.intent === 'connect' ? 'connect' : 'ide';

    // Only ever redirect back inside the app.
    const destination =
        from?.pathname && from.pathname.startsWith('/') && from.pathname !== '/auth'
            ? `${from.pathname}${from.search ?? ''}`
            : '/dashboard';

    if (isInitializing) {
        return <LoadingScreen />;
    }

    // Guests come here to connect a wallet or sign in and keep their work.
    if (isAuthenticated && !isGuest) {
        return <Navigate to={destination} replace />;
    }

    return (
        <AuthView
            guest={isGuest}
            intent={intent}
            backHref={intent === 'connect' ? '/connect' : isGuest ? '/dashboard' : '/'}
            sessionExpired={endReason === 'expired'}
            onAuthenticated={() => navigate(destination, { replace: true })}
        />
    );
}
