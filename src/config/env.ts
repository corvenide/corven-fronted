// src/config/env.ts
function requiredEnv(
    value: string | undefined,
    name: string,
): string {
    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }

    return value;
}

export const env = {
    apiUrl: requiredEnv(
        import.meta.env.VITE_API_URL,
        'VITE_API_URL',
    ),

    terminalUrl: requiredEnv(
        import.meta.env.VITE_TERMINAL_URL,
        'VITE_TERMINAL_URL',
    ),

    /** Google OAuth client ID. Optional: without it the Google button is hidden. */
    googleClientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? '',
};

/**
 * Origin of the terminal service, for socket.io clients that append their
 * own namespace. Accepts VITE_TERMINAL_URL with or without a trailing
 * "/terminal" (e.g. http://localhost:8004 or http://localhost:8004/terminal).
 */
export const terminalServiceOrigin = env.terminalUrl
    .replace(/\/+$/, '')
    .replace(/\/terminal$/, '');