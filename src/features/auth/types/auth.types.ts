// src/features/auth/types/auth.types.ts

export interface AuthUser {
    id: string;
    name: string;
    email: string | null;
    walletAddress: string | null;
    role: 'USER' | 'ADMIN';
    authProvider: 'EMAIL' | 'CKB_WALLET';
    createdAt: string;
}

export interface AuthResponse {
    accessToken: string;
    user: AuthUser;
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
