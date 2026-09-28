import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jwtExpiringIn } from '../test/jwt';

const API = 'http://api.test/api';
const USER = { id: 'u1', name: 'Ada', walletAddress: 'ckt1q...', role: 'USER' };

function json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

// The session module keeps state (current session, in-flight refresh).
async function load() {
    vi.resetModules();
    const session = await import('./session');
    const { tokenStorage } = await import('./token-storage');
    return { ...session, tokenStorage };
}

describe('isFresh', () => {
    it('is true for a token with more than a minute left', async () => {
        const { isFresh } = await load();
        expect(isFresh(jwtExpiringIn(600))).toBe(true);
    });

    it('is false for a token about to expire, a missing token or garbage', async () => {
        const { isFresh } = await load();
        expect(isFresh(jwtExpiringIn(30))).toBe(false);
        expect(isFresh(null)).toBe(false);
        expect(isFresh('garbage')).toBe(false);
    });
});

describe('refreshSession', () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    it('restores the session from the refresh cookie', async () => {
        const { refreshSession, getSession, tokenStorage } = await load();
        const accessToken = jwtExpiringIn(900);
        fetchMock.mockResolvedValueOnce(json(200, { accessToken, user: USER }));

        await expect(refreshSession()).resolves.toEqual({ accessToken, user: USER });

        expect(fetchMock).toHaveBeenCalledWith(
            `${API}/auth/refresh`,
            expect.objectContaining({ method: 'POST', credentials: 'include' }),
        );
        expect(getSession()?.user).toEqual(USER);
        expect(tokenStorage.get()).toBe(accessToken);
    });

    it('sends a single request for concurrent refreshes', async () => {
        const { refreshSession } = await load();
        fetchMock.mockResolvedValueOnce(json(200, { accessToken: jwtExpiringIn(900), user: USER }));

        const [a, b] = await Promise.all([refreshSession(), refreshSession()]);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(a).toBe(b);
    });

    it('resolves to null without a valid session', async () => {
        const { refreshSession, getSession } = await load();
        fetchMock.mockResolvedValueOnce(json(401, { message: 'No session' }));

        await expect(refreshSession()).resolves.toBeNull();
        expect(getSession()).toBeNull();
    });

    it('tells listeners the session expired when a signed-in user loses it', async () => {
        const { refreshSession, startSession, onSessionChange } = await load();
        startSession({ accessToken: jwtExpiringIn(900), user: USER as never });

        const listener = vi.fn();
        onSessionChange(listener);
        fetchMock.mockResolvedValueOnce(json(401, { message: 'Revoked' }));

        await refreshSession();

        expect(listener).toHaveBeenCalledWith(null, 'expired');
    });

    it('rejects on server errors so a flaky connection does not log the user out', async () => {
        const { refreshSession, startSession, getSession } = await load();
        startSession({ accessToken: jwtExpiringIn(900), user: USER as never });
        fetchMock.mockResolvedValueOnce(new Response('oops', { status: 500 }));

        await expect(refreshSession()).rejects.toThrow('Session refresh failed (500)');
        expect(getSession()).not.toBeNull();
    });
});

describe('endSession', () => {
    it('clears the session even when the logout request fails', async () => {
        const { startSession, endSession, getSession, tokenStorage, onSessionChange } = await load();
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
        startSession({ accessToken: jwtExpiringIn(900), user: USER as never });

        const listener = vi.fn();
        onSessionChange(listener);
        await endSession();

        expect(getSession()).toBeNull();
        expect(tokenStorage.get()).toBeNull();
        expect(listener).toHaveBeenCalledWith(null, 'signed_out');
    });
});
