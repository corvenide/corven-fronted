// src/lib/session.ts
//
// Owns the browser side of the session:
//  - restores it on load from the httpOnly refresh cookie,
//  - refreshes the access token (single-flight in a tab, serialised across
//    tabs with the Web Locks API so two tabs never present the same refresh
//    token — the server treats that as theft and revokes the session),
//  - keeps every open tab in sync through a BroadcastChannel.

import { env } from '../config/env';
import type { AuthUser } from '../features/auth/types/auth.types';
import { tokenExpiry, tokenStorage } from './token-storage';

export interface Session {
    accessToken: string;
    user: AuthUser;
}

export type SessionEndReason = 'signed_out' | 'expired';

type SessionListener = (session: Session | null, reason?: SessionEndReason) => void;

type ChannelMessage =
    | { type: 'session'; session: Session }
    | { type: 'ended'; reason: SessionEndReason };

let current: Session | null = null;
let inflight: Promise<Session | null> | null = null;

const listeners = new Set<SessionListener>();

const channel =
    typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel('corven-auth')
        : null;

channel?.addEventListener('message', (event: MessageEvent<ChannelMessage>) => {
    const message = event.data;

    if (message?.type === 'session') {
        apply(message.session);
    } else if (message?.type === 'ended') {
        apply(null, message.reason);
    }
});

function apply(session: Session | null, reason?: SessionEndReason) {
    current = session;

    if (session) {
        tokenStorage.set(session.accessToken);
    } else {
        tokenStorage.remove();
    }

    listeners.forEach((listener) => listener(session, reason));
}

function publish(message: ChannelMessage) {
    try {
        channel?.postMessage(message);
    } catch {
        /* channel closed */
    }
}

/** True when the token has more than `marginSeconds` of life left. */
export function isFresh(token: string | null, marginSeconds = 60): boolean {
    if (!token) return false;
    const exp = tokenExpiry(token);
    return exp !== null && exp - Date.now() / 1000 > marginSeconds;
}

export function getSession(): Session | null {
    return current;
}

export function onSessionChange(listener: SessionListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Called after a successful sign-in. */
export function startSession(session: Session) {
    apply(session);
    publish({ type: 'session', session });
}

async function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
        return navigator.locks.request('corven-auth-refresh', task);
    }

    return task();
}

/**
 * Gets a fresh access token from the refresh cookie.
 *
 * Resolves to null when there is no valid session (the user must sign in).
 * Rejects on network errors, so a flaky connection doesn't log anyone out.
 */
export function refreshSession(): Promise<Session | null> {
    if (inflight) return inflight;

    const tokenBefore = tokenStorage.get();

    inflight = withCrossTabLock(async () => {
        // Another tab may have refreshed while we were waiting for the lock;
        // its new token reached us over the BroadcastChannel.
        const now = tokenStorage.get();

        if (current && now && now !== tokenBefore && isFresh(now)) {
            return current;
        }

        const response = await fetch(`${env.apiUrl}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });

        if (response.status === 401 || response.status === 403) {
            const hadSession = current !== null;
            apply(null, hadSession ? 'expired' : undefined);
            if (hadSession) publish({ type: 'ended', reason: 'expired' });
            return null;
        }

        if (!response.ok) {
            throw new Error(`Session refresh failed (${response.status})`);
        }

        const session = (await response.json()) as Session;

        apply(session);
        publish({ type: 'session', session });

        return session;
    }).finally(() => {
        inflight = null;
    });

    return inflight;
}

export async function endSession(): Promise<void> {
    try {
        await fetch(`${env.apiUrl}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
    } catch {
        /* the local session is cleared regardless */
    }

    apply(null, 'signed_out');
    publish({ type: 'ended', reason: 'signed_out' });
}
