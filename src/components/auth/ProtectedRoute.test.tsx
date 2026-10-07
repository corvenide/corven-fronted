import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProtectedRoute from './ProtectedRoute';

const auth = vi.hoisted(() => ({
    isAuthenticated: false,
    isInitializing: false,
    startGuest: vi.fn<() => Promise<void>>(),
}));

vi.mock('../../features/auth/hooks/useAuth', () => ({
    useAuth: () => auth,
}));

function AuthPage() {
    const location = useLocation();
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
    return <p>Sign in page (from {from})</p>;
}

function renderAt(path: string) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<p>Dashboard content</p>} />
                </Route>
            </Routes>
        </MemoryRouter>,
    );
}

describe('ProtectedRoute', () => {
    beforeEach(() => {
        auth.isAuthenticated = false;
        auth.isInitializing = false;
        auth.startGuest = vi.fn(() => new Promise<void>(() => undefined));
    });

    it('shows a loading screen while the session is being restored', () => {
        auth.isInitializing = true;
        renderAt('/dashboard');

        expect(screen.getByRole('status')).toHaveTextContent('Restoring your session');
        expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
    });

    it('does not start a guest session while the session is being restored', () => {
        auth.isInitializing = true;
        renderAt('/dashboard');

        expect(auth.startGuest).not.toHaveBeenCalled();
    });

    it('starts a guest session for visitors without one, instead of asking them to sign in', () => {
        renderAt('/dashboard');

        expect(auth.startGuest).toHaveBeenCalledTimes(1);
        expect(screen.queryByText(/Sign in page/)).not.toBeInTheDocument();
        expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
    });

    it('falls back to /auth when a guest session cannot be started', async () => {
        auth.startGuest = vi.fn(() => Promise.reject(new Error('offline')));
        renderAt('/dashboard');

        await waitFor(() => expect(screen.getByText('Sign in page (from /dashboard)')).toBeInTheDocument());
    });

    it('renders the page for signed-in users', () => {
        auth.isAuthenticated = true;
        renderAt('/dashboard');

        expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    });
});
