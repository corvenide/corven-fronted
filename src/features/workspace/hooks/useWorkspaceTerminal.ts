'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import {
    io,
    type Socket,
} from 'socket.io-client';

import type {
    TerminalConnectionStatus,
    TerminalErrorPayload,
    TerminalOutputPayload,
    TerminalReadyPayload,
} from '../types/terminal.types';

interface UseWorkspaceTerminalOptions {
    workspaceId: string;
    enabled?: boolean;
    initialCols?: number;
    initialRows?: number;
    onOutput?: (data: string) => void;
    onReady?: (sessionId: string) => void;
    onExit?: (
        exitCode?: number,
        signal?: string,
    ) => void;
}

interface UseWorkspaceTerminalResult {
    status: TerminalConnectionStatus;
    sessionId: string | null;
    error: string | null;
    isConnected: boolean;
    write: (data: string) => void;
    resize: (cols: number, rows: number) => void;
    reconnect: () => void;
    disconnect: () => void;
}

const TERMINAL_SERVICE_URL = 'https://staging-api.corvanide.space';

function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('fiberdev_access_token');
}

export function useWorkspaceTerminal({
    workspaceId,
    enabled = true,
    initialCols = 80,
    initialRows = 24,
    onOutput,
    onReady,
    onExit,
}: UseWorkspaceTerminalOptions): UseWorkspaceTerminalResult {
    // ── Stable refs ────────────────────────────────────────────────────────────
    // All mutable state that callbacks need to read without triggering re-renders
    // or causing effect deps to change.

    /** The live Socket.IO socket. */
    const socketRef = useRef<Socket | null>(null);

    /** The current terminal session / exec ID. */
    const sessionIdRef = useRef<string | null>(null);

    /** Terminal dimensions — updated on every resize call. */
    const dimensionsRef = useRef({ cols: initialCols, rows: initialRows });

    /** Latest callback refs — updated synchronously so handlers always see fresh values. */
    const onOutputRef = useRef(onOutput);
    const onReadyRef = useRef(onReady);
    const onExitRef = useRef(onExit);

    /**
     * Reconnect trigger — incrementing this number causes the socket effect to
     * tear down and rebuild the connection. Using a counter rather than a
     * boolean avoids edge cases where two rapid clicks cancel each other.
     */
    const [reconnectKey, setReconnectKey] = useState(0);

    // ── Derived UI state ────────────────────────────────────────────────────────
    const [status, setStatus] = useState<TerminalConnectionStatus>('disconnected');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Keep callback refs in sync (never listed as effect deps).
    useEffect(() => { onOutputRef.current = onOutput; }, [onOutput]);
    useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
    useEffect(() => { onExitRef.current = onExit; }, [onExit]);

    // ── Socket lifecycle ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!enabled) {
            return;
        }

        setStatus('connecting');
        setError(null);

        const token = getAccessToken();

        const socket = io(`${TERMINAL_SERVICE_URL}/terminal`, {
            transports: ['websocket'],
            auth: { token },
            query: { workspaceId },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000,
        });

        socketRef.current = socket;

        const setSession = (value: string | null) => {
            sessionIdRef.current = value;
            setSessionId(value);
        };

        socket.on('connect', () => {
            console.log('[Terminal] Socket connected');
            setStatus('connecting'); // still waiting for terminal:ready
            setError(null);
        });

        socket.on('terminal:authenticated', (data) => {
            console.log('[Terminal] Authenticated:', data);
            if (data.success) {
                socket.emit('terminal:open', {
                    workspaceId,
                    cols: dimensionsRef.current.cols,
                    rows: dimensionsRef.current.rows,
                });
            } else {
                setError('Authentication failed');
                setStatus('error');
            }
        });

        socket.on('terminal:ready', (payload: TerminalReadyPayload) => {
            console.log('[Terminal] Ready:', payload);
            const sid = payload.execId || payload.sessionId;
            setSession(sid);
            setStatus('connected');
            setError(null);
            onReadyRef.current?.(sid);
        });

        socket.on(
            'terminal:output',
            (payload: TerminalOutputPayload | string) => {
                if (typeof payload === 'string') {
                    onOutputRef.current?.(payload);
                    return;
                }
                // Drop output that belongs to a different session.
                if (
                    sessionIdRef.current &&
                    payload.sessionId !== sessionIdRef.current
                ) {
                    return;
                }
                onOutputRef.current?.(payload.data);
            },
        );

        socket.on('terminal:closed', (payload: any) => {
            console.log('[Terminal] Closed:', payload);
            setSession(null);
            setStatus('disconnected');
            onExitRef.current?.(undefined, undefined);
        });

        socket.on(
            'terminal:error',
            (payload: TerminalErrorPayload | string) => {
                const message =
                    typeof payload === 'string' ? payload : payload.message;
                console.error('[Terminal] Error:', message);
                setError(message);
                setStatus('error');
            },
        );

        socket.on('connect_error', (err: Error) => {
            console.error('[Terminal] Connection error:', err.message);
            setError(err.message);
            setStatus('error');
        });

        socket.on('disconnect', (reason) => {
            console.log('[Terminal] Disconnected:', reason);
            setSession(null);
            setStatus('disconnected');
        });

        // Cleanup: called when workspaceId/enabled changes, or component unmounts.
        return () => {
            console.log('[Terminal] Cleaning up socket');
            // Tell the server to close the terminal session gracefully.
            if (sessionIdRef.current) {
                socket.emit('terminal:close', {});
            }
            socket.removeAllListeners();
            socket.disconnect();
            socketRef.current = null;
            sessionIdRef.current = null;
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId, enabled, reconnectKey]);
    //   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //   reconnectKey is the only programmatic way to force a reconnect.
    //   We intentionally omit callback props — they're read via refs.

    // ── Stable action callbacks ─────────────────────────────────────────────────

    const write = useCallback((data: string) => {
        const socket = socketRef.current;
        if (!socket?.connected || !sessionIdRef.current) {
            console.warn('[Terminal] Cannot write: not connected or no session');
            return;
        }
        socket.emit('terminal:input', { data });
    }, []); // stable — reads refs

    const resize = useCallback((cols: number, rows: number) => {
        const safeCols = Math.max(2, Math.floor(cols));
        const safeRows = Math.max(1, Math.floor(rows));

        dimensionsRef.current = { cols: safeCols, rows: safeRows };

        const socket = socketRef.current;
        if (!socket?.connected || !sessionIdRef.current) return;

        socket.emit('terminal:resize', { cols: safeCols, rows: safeRows });
    }, []); // stable — reads refs

    /**
     * Trigger a full reconnect by bumping the reconnect key.
     * The socket effect will clean up the old socket and create a new one.
     */
    const reconnect = useCallback(() => {
        setReconnectKey((k) => k + 1);
    }, []);

    /**
     * Disconnect the socket without scheduling a reconnect.
     * Calling reconnect() afterwards will create a new connection.
     */
    const disconnect = useCallback(() => {
        const socket = socketRef.current;
        if (!socket) return;
        if (sessionIdRef.current) {
            socket.emit('terminal:close', {});
        }
        socket.removeAllListeners();
        socket.disconnect();
        socketRef.current = null;
        sessionIdRef.current = null;
        setSessionId(null);
        setStatus('disconnected');
    }, []);

    return {
        status,
        sessionId,
        error,
        isConnected: status === 'connected',
        write,
        resize,
        reconnect,
        disconnect,
    };
}