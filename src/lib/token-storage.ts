// src/lib/token-storage.ts
//
// The access token lives in memory only. It's short-lived (15 min) and is
// re-issued from the httpOnly refresh cookie on page load, so nothing an
// XSS payload could steal is ever written to localStorage.

type Listener = (token: string | null) => void;

let accessToken: string | null = null;
const listeners = new Set<Listener>();

// Clean up tokens written by the previous (localStorage) implementation.
try {
    localStorage.removeItem('fiberdev_access_token');
} catch {
    /* storage unavailable */
}

export const tokenStorage = {
    get(): string | null {
        return accessToken;
    },

    set(token: string): void {
        accessToken = token;
        listeners.forEach((listener) => listener(token));
    },

    remove(): void {
        accessToken = null;
        listeners.forEach((listener) => listener(null));
    },

    subscribe(listener: Listener): () => void {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
};

/** Seconds-since-epoch expiry from a JWT, or null if unreadable. */
export function tokenExpiry(token: string): number | null {
    try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const { exp } = JSON.parse(json) as { exp?: number };
        return typeof exp === 'number' ? exp : null;
    } catch {
        return null;
    }
}
