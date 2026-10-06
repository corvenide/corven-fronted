// src/features/auth/api/auth.api.ts

import { apiClient } from '../../../lib/api-client';

import type {
    AuthResponse,
    AuthUser,
    WalletChallengeInput,
    WalletChallengeResponse,
    WalletLoginInput,
} from '../types/auth.types';

export const authApi = {
    createWalletChallenge(input: WalletChallengeInput): Promise<WalletChallengeResponse> {
        return apiClient<WalletChallengeResponse>('/auth/wallet/challenge', {
            method: 'POST',
            authenticated: false,
            body: JSON.stringify(input),
        });
    },

    /** Sets the httpOnly refresh cookie; returns the short-lived access token. */
    walletLogin(input: WalletLoginInput): Promise<AuthResponse> {
        return apiClient<AuthResponse>('/auth/wallet/login', {
            method: 'POST',
            authenticated: false,
            body: JSON.stringify(input),
        });
    },

    /** Exchanges a Google ID token for a Corven session (sets the refresh cookie). */
    googleLogin(credential: string): Promise<AuthResponse> {
        return apiClient<AuthResponse>('/auth/google', {
            method: 'POST',
            authenticated: false,
            body: JSON.stringify({ credential }),
        });
    },

    getCurrentUser(): Promise<AuthUser> {
        return apiClient<AuthUser>('/auth/me');
    },

    /** Revokes every session for this user, on every device. */
    logoutEverywhere(): Promise<{ success: boolean }> {
        return apiClient('/auth/logout-all', { method: 'POST' });
    },
};
