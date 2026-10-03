// src/features/browser/preview.ts
//
// Previews dev servers running inside a workspace. A `localhost:5173` URL in
// the browser means "port 5173 in this workspace", not on the user's own
// machine, so it is routed through the API's preview proxy.

import { useCallback, useEffect, useState } from 'react';

import { env } from '../../config/env';
import { apiClient } from '../../lib/api-client';

export interface WorkspacePortUrl {
    port: number;
    /** Path, query and hash to open on the dev server (always starts with "/"). */
    path: string;
}

const LOCAL_URL = /^(?:https?:\/\/)?(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):(\d{2,5})(\/[^]*)?$/i;

/** `http://localhost:5173/app?x=1` → { port: 5173, path: '/app?x=1' }. */
export function parseWorkspacePortUrl(url: string): WorkspacePortUrl | null {
    const match = LOCAL_URL.exec(url.trim());
    if (!match) return null;

    const port = Number(match[1]);
    if (port < 1 || port > 65535) return null;

    return { port, path: match[2] ?? '/' };
}

/** Absolute URL for a preview path returned by the API. */
export function previewHref(previewPath: string, path: string): string {
    const base = `${env.apiUrl.replace(/\/$/, '')}/${previewPath.replace(/^\//, '')}`;
    return base.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`);
}

export const previewApi = {
    open(workspaceId: string, port: number): Promise<{ port: number; path: string }> {
        return apiClient(`/workspaces/${workspaceId}/preview`, {
            method: 'POST',
            body: JSON.stringify({ port }),
        });
    },
};

export type PreviewState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; src: string }
    | { status: 'error'; message: string };

/**
 * Resolves the iframe URL for a workspace URL. Stays idle when there is no
 * workspace or the URL isn't a localhost port. `reload()` fetches a fresh
 * link, e.g. after the workspace restarted.
 */
export function useWorkspacePreview(workspaceId: string | undefined, url: string) {
    const target = workspaceId ? parseWorkspacePortUrl(url) : null;
    const port = target?.port ?? null;
    const path = target?.path ?? '/';

    const [state, setState] = useState<PreviewState>({ status: 'idle' });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!workspaceId || port === null) {
            setState({ status: 'idle' });
            return;
        }

        let cancelled = false;
        setState({ status: 'loading' });

        previewApi
            .open(workspaceId, port)
            .then((result) => {
                if (!cancelled) setState({ status: 'ready', src: previewHref(result.path, path) });
            })
            .catch((error: unknown) => {
                if (!cancelled) {
                    setState({
                        status: 'error',
                        message: error instanceof Error ? error.message : 'Could not open the preview.',
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [workspaceId, port, path, attempt]);

    const reload = useCallback(() => setAttempt((n) => n + 1), []);

    return { state, reload, active: target !== null };
}
