import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProtectedRoute from './ProtectedRoute';

const auth = vi.hoisted(() => ({
    isAuthenticated: false,
    isInitializing: false,
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
    });

    it('shows a loading screen while the session is being restored', () => {
        auth.isInitializing = true;
        renderAt('/dashboard');

        expect(screen.getByRole('status')).toHaveTextContent('Restoring your session');
        expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
    });

    it('sends signed-out visitors to /auth and remembers where they were going', () => {
        renderAt('/dashboard');

        expect(screen.getByText('Sign in page (from /dashboard)')).toBeInTheDocument();
        expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
    });

    it('renders the page for signed-in users', () => {
        auth.isAuthenticated = true;
        renderAt('/dashboard');

        expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    });
});
