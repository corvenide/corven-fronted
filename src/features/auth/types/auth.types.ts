// src/features/auth/types/auth.types.ts

export interface AuthUser {
    id: string;
    name: string;
    email: string | null;
    walletAddress: string | null;
    role: 'USER' | 'ADMIN';
    authProvider: 'EMAIL' | 'CKB_WALLET' | 'GOOGLE' | 'GUEST';
    /** No sign-in: temporary workspaces only. */
    isGuest?: boolean;
    createdAt: string;
}

/** A workspace a guest brought along when they connected a wallet or signed in. */
export interface ClaimedWorkspace {
    id: string;
    name: string;
    temporary: boolean;
}

export interface AuthResponse {
    accessToken: string;
    user: AuthUser;
    claimedWorkspaces?: ClaimedWorkspace[];
}

export interface WalletChallengeInput {
    walletAddress: string;
}

export interface WalletChallengeResponse {
    challengeId: string;
    nonce: string;
    message: string;
    expiresAt: string;
}

export interface WalletLoginInput {
    walletAddress: string;
    challengeId: string;
    signature: unknown;
}
