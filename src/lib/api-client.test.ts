import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jwtExpiringIn } from '../test/jwt';

const API = 'http://api.test/api';

function json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

// api-client and session keep module state, so load fresh copies per test.
async function load() {
    vi.resetModules();
    const { apiClient, ApiError } = await import('./api-client');
    const { tokenStorage } = await import('./token-storage');
    return { apiClient, ApiError, tokenStorage };
}

describe('apiClient', () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    it('calls the API with credentials and the bearer token', async () => {
        const { apiClient, tokenStorage } = await load();
        tokenStorage.set('token-1');
        fetchMock.mockResolvedValueOnce(json(200, [{ id: 'w1' }]));

        await expect(apiClient('/workspaces')).resolves.toEqual([{ id: 'w1' }]);

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`${API}/workspaces`);
        expect(init?.credentials).toBe('include');
        expect(init?.headers).toMatchObject({ Authorization: 'Bearer token-1' });
    });

    it('sends JSON bodies with a Content-Type', async () => {
        const { apiClient } = await load();
        fetchMock.mockResolvedValueOnce(json(201, { id: 'w1' }));

        await apiClient('/workspaces', { method: 'POST', body: JSON.stringify({ name: 'W' }) });

        expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ 'Content-Type': 'application/json' });
    });

    it('leaves out the token for unauthenticated calls', async () => {
        const { apiClient, tokenStorage } = await load();
        tokenStorage.set('token-1');
        fetchMock.mockResolvedValueOnce(json(200, {}));

        await apiClient('/auth/wallet/challenge', { method: 'POST', authenticated: false, body: '{}' });

        expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty('Authorization');
    });

    it('turns error responses into an ApiError with the server message', async () => {
        const { apiClient, ApiError } = await load();
        fetchMock.mockResolvedValueOnce(json(400, { message: 'Workspace runtime is not running' }));

        const error = await apiClient('/workspaces/w1/build', { method: 'POST' }).catch((e) => e);

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ status: 400, message: 'Workspace runtime is not running' });
    });

    it('joins validation messages sent as a list', async () => {
        const { apiClient } = await load();
        fetchMock.mockResolvedValueOnce(json(400, { message: ['name is required', 'name is too long'] }));

        await expect(apiClient('/workspaces', { method: 'POST' })).rejects.toThrow(
            'name is required, name is too long',
        );
    });

    it('uses a generic message when the error body has none', async () => {
        const { apiClient } = await load();
        fetchMock.mockResolvedValueOnce(new Response('Bad Gateway', { status: 502 }));

        await expect(apiClient('/workspaces')).rejects.toMatchObject({
            status: 502,
            message: 'Request failed with status 502',
        });
    });

    it('reports network failures as status 0', async () => {
        const { apiClient } = await load();
        fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

        await expect(apiClient('/workspaces')).rejects.toMatchObject({
            status: 0,
            message: expect.stringContaining("Can't reach Corven"),
        });
    });

    it('refreshes the session once on 401 and retries with the new token', async () => {
        const { apiClient, tokenStorage } = await load();
        tokenStorage.set('expired');
        const fresh = jwtExpiringIn(900);

        fetchMock
            .mockResolvedValueOnce(json(401, { message: 'Unauthorized' }))
            .mockResolvedValueOnce(json(200, { accessToken: fresh, user: { id: 'u1' } }))
            .mockResolvedValueOnce(json(200, [{ id: 'w1' }]));

        await expect(apiClient('/workspaces')).resolves.toEqual([{ id: 'w1' }]);

        expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
            `${API}/workspaces`,
            `${API}/auth/refresh`,
            `${API}/workspaces`,
        ]);
        expect(fetchMock.mock.calls[2][1]?.headers).toMatchObject({ Authorization: `Bearer ${fresh}` });
    });

    it('gives up with 401 when the session cannot be refreshed', async () => {
        const { apiClient } = await load();

        fetchMock
            .mockResolvedValueOnce(json(401, { message: 'Unauthorized' }))
            .mockResolvedValueOnce(json(401, { message: 'No session' }));

        await expect(apiClient('/workspaces')).rejects.toMatchObject({ status: 401 });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not try to refresh for unauthenticated calls', async () => {
        const { apiClient } = await load();
        fetchMock.mockResolvedValueOnce(json(401, { message: 'Invalid signature' }));

        await expect(
            apiClient('/auth/wallet/login', { method: 'POST', authenticated: false, body: '{}' }),
        ).rejects.toMatchObject({ status: 401 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
