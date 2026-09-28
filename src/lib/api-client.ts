// src/lib/api-client.ts
import { env } from '../config/env';
import { refreshSession } from './session';
import { tokenStorage } from './token-storage';

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly details?: unknown,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

interface RequestOptions extends RequestInit {
    authenticated?: boolean;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
    const { authenticated = true, headers, ...requestOptions } = options;
    const token = tokenStorage.get();

    try {
        return await fetch(`${env.apiUrl}${path}`, {
            ...requestOptions,
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                ...(requestOptions.body ? { 'Content-Type': 'application/json' } : {}),
                ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}),
                ...headers,
            },
        });
    } catch {
        throw new ApiError(
            "Can't reach Corven right now. Check your connection and try again.",
            0,
        );
    }
}

export async function apiClient<T>(
    path: string,
    options: RequestOptions = {},
): Promise<T> {
    const authenticated = options.authenticated ?? true;

    let response = await send(path, options);

    // Access token expired mid-session: refresh once and retry.
    if (response.status === 401 && authenticated) {
        const session = await refreshSession().catch(() => null);

        if (session) {
            response = await send(path, options);
        }
    }

    const contentType = response.headers.get('content-type');

    const body = contentType?.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const raw =
            typeof body === 'object' && body !== null && 'message' in body
                ? (body as { message: unknown }).message
                : null;

        const message = Array.isArray(raw)
            ? raw.join(', ')
            : typeof raw === 'string'
              ? raw
              : `Request failed with status ${response.status}`;

        throw new ApiError(message, response.status, body);
    }

    return body as T;
}
