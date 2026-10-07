// src/features/connect/connect.api.ts
//
// The Corven Connect dashboard API (backend apps/connect-service
// dashboard/). Authenticated with the developer's Corven IDE session.

import { env } from '../../config/env';
import { ApiError } from '../../lib/api-client';
import { refreshSession } from '../../lib/session';
import { tokenStorage } from '../../lib/token-storage';

export type AppRole = 'OWNER' | 'ADMIN' | 'VIEWER';
export type LoginMethod = 'PHONE' | 'EMAIL' | 'GOOGLE' | 'PASSKEY' | 'WALLET';
export const LOGIN_METHODS: LoginMethod[] = ['PHONE', 'EMAIL', 'GOOGLE', 'PASSKEY', 'WALLET'];

export interface ConnectApp {
    id: string;
    name: string;
    logoUrl: string | null;
    allowedOrigins: string[];
    loginMethods: LoginMethod[];
    googleClientId: string | null;
    mainnetEnabled: boolean;
    role: AppRole;
    userCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface AppInput {
    name?: string;
    allowedOrigins?: string[];
    loginMethods?: LoginMethod[];
    googleClientId?: string | null;
    logoUrl?: string | null;
    mainnetEnabled?: boolean;
}

export interface ConnectUserRow {
    id: string;
    displayName: string | null;
    embeddedWallets: boolean;
    identities: { kind: 'PHONE' | 'EMAIL' | 'GOOGLE' | 'WALLET'; value: string | null; label: string | null }[];
    wallets: { network: 'TESTNET' | 'MAINNET'; address: string }[];
    passkeyCount: number;
    txSigned: number;
    lastLoginAt: string | null;
    createdAt: string;
}

export interface ConnectUserDetail extends ConnectUserRow {
    activeSessions: number;
    passkeys: { id: string; name: string | null; rpId: string; createdAt: string; lastUsedAt: string | null }[];
    signatures: { network: string; txHash: string; outflow: string; origin: string | null; createdAt: string }[];
}

export interface StatsDay {
    day: string;
    signUps: number;
    signIns: number;
    codesSent: number;
    txSigned: number;
}

export interface AppStats {
    days: number;
    totals: { users: number; newUsers: number; activeUsers7d: number; signIns: number; codesSent: number; txSigned: number };
    series: StatsDay[];
    methods: { method: string; count: number }[];
}

export interface TeamMember {
    id: string;
    userId: string;
    role: AppRole;
    isYou: boolean;
    name: string;
    email: string | null;
    walletAddress: string | null;
    createdAt: string;
}

export interface PendingInvite {
    id: string;
    email: string | null;
    role: AppRole;
    expiresAt: string;
    createdAt: string;
}

export interface InvitePreview {
    app: { id: string; name: string; logoUrl: string | null } | null;
    role: AppRole;
    email: string | null;
    invitedBy: string;
    expiresAt: string;
    alreadyMember: boolean;
    status: 'pending' | 'accepted' | 'revoked' | 'expired';
}

async function send(path: string, init: RequestInit): Promise<Response> {
    const token = tokenStorage.get();
    try {
        return await fetch(`${env.connectApiUrl}/dashboard${path}`, {
            ...init,
            headers: {
                Accept: 'application/json',
                ...(init.body ? { 'Content-Type': 'application/json' } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
    } catch {
        throw new ApiError("Can't reach Corven Connect right now. Check your connection and try again.", 0);
    }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res = await send(path, init);
    if (res.status === 401) {
        const session = await refreshSession().catch(() => null);
        if (session) res = await send(path, init);
    }
    const body = await res.json().catch(() => null);
    if (!res.ok) {
        const raw = body && typeof body === 'object' ? (body as { message?: unknown }).message : null;
        throw new ApiError(typeof raw === 'string' ? raw : `Request failed (${res.status})`, res.status, body);
    }
    return body as T;
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const connectApi = {
    listApps: () => request<ConnectApp[]>('/apps'),
    createApp: (input: AppInput) => request<ConnectApp>('/apps', json('POST', input)),
    getApp: (appId: string) => request<ConnectApp>(`/apps/${appId}`),
    updateApp: (appId: string, input: AppInput) => request<ConnectApp>(`/apps/${appId}`, json('PATCH', input)),
    deleteApp: (appId: string, confirm: string) => request<{ ok: true }>(`/apps/${appId}/delete`, json('POST', { confirm })),

    stats: (appId: string, days: number) => request<AppStats>(`/apps/${appId}/stats?days=${days}`),

    listUsers: (appId: string, params: { q?: string; cursor?: string | null; limit?: number }) => {
        const search = new URLSearchParams();
        if (params.q) search.set('q', params.q);
        if (params.cursor) search.set('cursor', params.cursor);
        if (params.limit) search.set('limit', String(params.limit));
        return request<{ users: ConnectUserRow[]; nextCursor: string | null; total: number }>(`/apps/${appId}/users?${search}`);
    },
    getUser: (appId: string, userId: string) => request<ConnectUserDetail>(`/apps/${appId}/users/${userId}`),
    signOutUser: (appId: string, userId: string) => request<{ revoked: number }>(`/apps/${appId}/users/${userId}/sign-out`, json('POST')),
    deleteUser: (appId: string, userId: string) => request<{ ok: true }>(`/apps/${appId}/users/${userId}/delete`, json('POST', { confirm: 'DELETE' })),

    team: (appId: string) => request<{ role: AppRole; members: TeamMember[]; invites: PendingInvite[] }>(`/apps/${appId}/team`),
    invite: (appId: string, input: { email?: string; role: AppRole }) =>
        request<{ invite: PendingInvite; link: string; emailed: boolean }>(`/apps/${appId}/invites`, json('POST', input)),
    revokeInvite: (appId: string, inviteId: string) => request<{ ok: true }>(`/apps/${appId}/invites/${inviteId}`, json('DELETE')),
    changeRole: (appId: string, memberId: string, role: AppRole) => request<unknown>(`/apps/${appId}/members/${memberId}`, json('PATCH', { role })),
    removeMember: (appId: string, memberId: string) => request<{ ok: true }>(`/apps/${appId}/members/${memberId}`, json('DELETE')),

    previewInvite: (token: string) => request<InvitePreview>(`/invites/${token}`),
    acceptInvite: (token: string) => request<{ appId: string }>(`/invites/${token}/accept`, json('POST')),
};

export const connectKeys = {
    apps: ['connect', 'apps'] as const,
    app: (id: string) => ['connect', 'app', id] as const,
    stats: (id: string, days: number) => ['connect', 'stats', id, days] as const,
    users: (id: string, q: string) => ['connect', 'users', id, q] as const,
    user: (id: string, userId: string) => ['connect', 'user', id, userId] as const,
    team: (id: string) => ['connect', 'team', id] as const,
};

export const METHOD_LABEL: Record<string, string> = {
    PHONE: 'Phone',
    EMAIL: 'Email',
    GOOGLE: 'Google',
    PASSKEY: 'Passkey',
    WALLET: 'Wallet',
};

export const ROLE_LABEL: Record<AppRole, string> = { OWNER: 'Owner', ADMIN: 'Admin', VIEWER: 'Viewer' };
