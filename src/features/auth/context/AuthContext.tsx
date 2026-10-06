// src/features/auth/context/AuthContext.tsx

import {
    createContext,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { ccc } from '@ckb-ccc/connector-react';

import { queryClient } from '../../../lib/query-client';
import {
    endSession,
    getSession,
    onSessionChange,
    refreshSession,
    type SessionEndReason,
    startSession,
} from '../../../lib/session';
import { tokenExpiry, tokenStorage } from '../../../lib/token-storage';
import { authApi } from '../api/auth.api';
import type { AuthUser, WalletLoginInput } from '../types/auth.types';

export interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isInitializing: boolean;
    /** Why the last session ended, so the sign-in page can explain it. */
    endReason: SessionEndReason | null;

    walletLogin: (input: WalletLoginInput) => Promise<void>;
    /** Signs in with the ID token from Google Identity Services. */
    googleLogin: (credential: string) => Promise<void>;
    logout: () => Promise<void>;
    logoutEverywhere: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { disconnect } = ccc.useCcc();

    const [user, setUser] = useState<AuthUser | null>(() => getSession()?.user ?? null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [endReason, setEndReason] = useState<SessionEndReason | null>(null);

    // Mirror the session module (this tab and other tabs) into React state.
    useEffect(
        () =>
            onSessionChange((session, reason) => {
                setUser(session?.user ?? null);

                if (session) {
                    setEndReason(null);
                } else {
                    if (reason) setEndReason(reason);
                    queryClient.clear();
                }
            }),
        [],
    );

    // Restore the session from the refresh cookie on first load.
    useEffect(() => {
        let cancelled = false;

        refreshSession()
            .catch(() => null)
            .finally(() => {
                if (!cancelled) setIsInitializing(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Refresh shortly before the access token expires, and again whenever
    // the tab comes back into view (timers are throttled in background tabs).
    useEffect(() => {
        let timer: number | undefined;

        const schedule = (token: string | null) => {
            window.clearTimeout(timer);
            if (!token) return;

            const exp = tokenExpiry(token);
            if (!exp) return;

            const delay = Math.max(5_000, (exp - 60) * 1000 - Date.now());
            timer = window.setTimeout(() => {
                void refreshSession().catch(() => undefined);
            }, delay);
        };

        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;

            const token = tokenStorage.get();
            const exp = token ? tokenExpiry(token) : null;

            if (token && exp && exp - Date.now() / 1000 < 90) {
                void refreshSession().catch(() => undefined);
            }
        };

        schedule(tokenStorage.get());
        const unsubscribe = tokenStorage.subscribe(schedule);
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            window.clearTimeout(timer);
            unsubscribe();
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    const walletLogin = useCallback(async (input: WalletLoginInput) => {
        const response = await authApi.walletLogin(input);
        startSession(response);
    }, []);

    const googleLogin = useCallback(async (credential: string) => {
        const response = await authApi.googleLogin(credential);
        startSession(response);
    }, []);

    const logout = useCallback(async () => {
        await endSession();

        try {
            await disconnect();
        } catch {
            /* wallet already disconnected */
        }
    }, [disconnect]);

    const logoutEverywhere = useCallback(async () => {
        try {
            await authApi.logoutEverywhere();
        } finally {
            await logout();
        }
    }, [logout]);

    const refreshUser = useCallback(async () => {
        const fresh = await authApi.getCurrentUser();
        setUser(fresh);
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            isAuthenticated: Boolean(user),
            isInitializing,
            endReason,
            walletLogin,
            googleLogin,
            logout,
            logoutEverywhere,
            refreshUser,
        }),
        [user, isInitializing, endReason, walletLogin, googleLogin, logout, logoutEverywhere, refreshUser],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
