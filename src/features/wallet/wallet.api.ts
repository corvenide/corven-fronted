// src/features/wallet/wallet.api.ts
//
// Corven-held wallets for Google accounts (see backend apps/auth-service
// wallets/wallet.service.ts).

import { apiClient } from '../../lib/api-client';

export type WalletNetwork = 'TESTNET' | 'MAINNET';

export interface CorvenWallet {
    network: WalletNetwork;
    address: string;
    publicKey: string;
    /** Shannons as a decimal string; null when the network couldn't be reached. */
    balance: string | null;
    exportedAt: string | null;
    createdAt: string;
}

export interface WalletTransfer {
    network: WalletNetwork;
    toAddress: string;
    amount: string;
    txHash: string;
    createdAt: string;
}

export interface WalletOverview {
    enabled: boolean;
    wallets: CorvenWallet[];
    transfers?: WalletTransfer[];
    mainnetDailyLimit: string;
    mainnetSentToday: string;
}

export const walletApi = {
    list(): Promise<WalletOverview> {
        return apiClient<WalletOverview>('/wallet');
    },

    /** Mainnet sends need `confirmation`: a fresh Google ID token. */
    transfer(input: { network: WalletNetwork; to: string; amountCkb: string; confirmation?: string }) {
        return apiClient<{ txHash: string; network: WalletNetwork; amount: string; to: string }>('/wallet/transfer', {
            method: 'POST',
            body: JSON.stringify(input),
        });
    },

    /** Signs a testnet transaction built in the browser (JSON from ccc.stringify). */
    signTestnet(transaction: unknown): Promise<unknown> {
        return apiClient<unknown>('/wallet/sign-testnet', {
            method: 'POST',
            body: JSON.stringify({ transaction }),
        });
    },

    exportKey(input: { network: WalletNetwork; confirmation: string }) {
        return apiClient<{ network: WalletNetwork; address: string; privateKey: string }>('/wallet/export', {
            method: 'POST',
            body: JSON.stringify(input),
        });
    },
};

export const walletKeys = { all: ['corven-wallets'] as const };

export const EXPLORER: Record<WalletNetwork, string> = {
    TESTNET: 'https://testnet.explorer.nervos.org',
    MAINNET: 'https://explorer.nervos.org',
};
