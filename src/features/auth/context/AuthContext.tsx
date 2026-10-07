// src/features/auth/context/AuthContext.tsx

import {
    createContext,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
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
import type { AuthResponse, AuthUser, ClaimedWorkspace, WalletLoginInput } from '../types/auth.types';

export interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    /** Signed in as a guest (no account): temporary workspaces only. */
    isGuest: boolean;
    isInitializing: boolean;
    /** Starts a guest session when there is no session at all. */
    startGuest: () => Promise<void>;
    /**
     * Temporary workspaces a guest brought along when they connected a wallet
     * or signed in. The app asks whether to keep them; clear when answered.
     */
    claimedWorkspaces: ClaimedWorkspace[];
    clearClaimedWorkspaces: () => void;
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
    const [claimedWorkspaces, setClaimedWorkspaces] = useState<ClaimedWorkspace[]>([]);
    const guestStarting = useRef<Promise<void> | null>(null);
    const lastUserId = useRef<string | null>(getSession()?.user.id ?? null);

    // Mirror the session module (this tab and other tabs) into React state.
    useEffect(
        () =>
            onSessionChange((session, reason) => {
                // A different account (e.g. a guest signed in elsewhere and
                // was merged into an existing account): drop its cached data.
                if (session && lastUserId.current && lastUserId.current !== session.user.id) {
                    queryClient.clear();
                }
                lastUserId.current = session?.user.id ?? null;

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

    /** The guest's token, so signing in hands their workspaces to the account. */
    const guestToken = () => (getSession()?.user.isGuest ? tokenStorage.get() : null);

    const signedIn = useCallback((response: AuthResponse) => {
        const temporary = (response.claimedWorkspaces ?? []).filter((w) => w.temporary);
        // Workspace lists belong to the previous (guest) identity.
        queryClient.clear();
        startSession({ accessToken: response.accessToken, user: response.user });
        setClaimedWorkspaces(temporary);
    }, []);

    const walletLogin = useCallback(async (input: WalletLoginInput) => {
        signedIn(await authApi.walletLogin(input, guestToken()));
    }, [signedIn]);

    const googleLogin = useCallback(async (credential: string) => {
        signedIn(await authApi.googleLogin(credential, guestToken()));
    }, [signedIn]);

    const startGuest = useCallback(() => {
        guestStarting.current ??= authApi
            .guestStart()
            .then((response) => startSession({ accessToken: response.accessToken, user: response.user }))
            .finally(() => {
                guestStarting.current = null;
            });
        return guestStarting.current;
    }, []);

    const clearClaimedWorkspaces = useCallback(() => setClaimedWorkspaces([]), []);

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
            isGuest: Boolean(user?.isGuest),
            isInitializing,
            startGuest,
            claimedWorkspaces,
            clearClaimedWorkspaces,
            endReason,
            walletLogin,
            googleLogin,
            logout,
            logoutEverywhere,
            refreshUser,
        }),
        [user, isInitializing, startGuest, claimedWorkspaces, clearClaimedWorkspaces, endReason, walletLogin, googleLogin, logout, logoutEverywhere, refreshUser],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
