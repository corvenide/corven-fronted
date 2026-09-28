// src/features/workspace/components/TerminalPanel.tsx
'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

import {
    ChevronDown,
    Maximize2,
    Minus,
    Plus,
    RotateCcw,
    TerminalSquare,
    Trash2,
    X,
} from 'lucide-react';

import { useWorkspaceTerminal } from '../hooks/useWorkspaceTerminal';

interface TerminalPanelProps {
    workspaceId: string;
    className?: string;
    onClose?: () => void;

    /**
     * When true, the terminal is rendered inside another panel,
     * such as WorkspaceBottomPanel.
     *
     * The parent component will control tabs, close buttons,
     * borders, resizing, and panel height.
     */
    embedded?: boolean;
}

type TerminalConnectionStatus =
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'error';

function getStatusText(
    status: TerminalConnectionStatus,
): string {
    switch (status) {
        case 'connecting':
            return 'Connecting';

        case 'connected':
            return 'Connected';

        case 'error':
            return 'Connection error';

        case 'disconnected':
        default:
            return 'Disconnected';
    }
}

function getStatusClassName(
    status: TerminalConnectionStatus,
): string {
    switch (status) {
        case 'connected':
            return 'bg-emerald-500';

        case 'connecting':
            return 'animate-pulse bg-amber-400';

        case 'error':
            return 'bg-red-500';

        case 'disconnected':
        default:
            return 'bg-gray-500';
    }
}

export function TerminalPanel({
    workspaceId,
    className = '',
    onClose,
    embedded = false,
}: TerminalPanelProps) {
    const containerRef =
        useRef<HTMLDivElement>(null);

    const terminalRef =
        useRef<XTerm | null>(null);

    const fitAddonRef =
        useRef<FitAddon | null>(null);

    const resizeObserverRef =
        useRef<ResizeObserver | null>(
            null,
        );

    const resizeTimeoutRef =
        useRef<ReturnType<
            typeof setTimeout
        > | null>(null);

    const [isMaximized, setIsMaximized] =
        useState(false);

    const handleOutput = useCallback(
        (data: string) => {
            terminalRef.current?.write(data);
        },
        [],
    );

    const handleReady = useCallback(() => {
        const terminal =
            terminalRef.current;

        if (!terminal) {
            return;
        }

        terminal.writeln(
            '\r\n\x1b[32mTerminal session connected.\x1b[0m',
        );

        terminal.focus();
    }, []);

    const handleExit = useCallback(
        (
            exitCode?: number,
            signal?: string,
        ) => {
            const terminal =
                terminalRef.current;

            if (!terminal) {
                return;
            }

            const exitCodeText =
                exitCode !== undefined
                    ? ` with code ${exitCode}`
                    : '';

            const signalText = signal
                ? ` (${signal})`
                : '';

            terminal.writeln('');

            terminal.writeln(
                `\x1b[33mTerminal session exited${exitCodeText}${signalText}.\x1b[0m`,
            );
        },
        [],
    );

    const terminalSession =
        useWorkspaceTerminal({
            workspaceId,
            onOutput: handleOutput,
            onReady: handleReady,
            onExit: handleExit,
        });

    /*
     * Store the latest hook functions inside refs.
     *
     * This prevents the xterm initialization effect from being
     * destroyed and recreated whenever the hook returns a new
     * function reference.
     */
    const writeRef = useRef(
        terminalSession.write,
    );

    const resizeRef = useRef(
        terminalSession.resize,
    );

    useEffect(() => {
        writeRef.current =
            terminalSession.write;
    }, [terminalSession.write]);

    useEffect(() => {
        resizeRef.current =
            terminalSession.resize;
    }, [terminalSession.resize]);

    const fitTerminal =
        useCallback(() => {
            const fitAddon =
                fitAddonRef.current;

            const terminal =
                terminalRef.current;

            const container =
                containerRef.current;

            if (
                !fitAddon ||
                !terminal ||
                !container
            ) {
                return;
            }

            /*
             * FitAddon can throw when the terminal is hidden,
             * has no dimensions, or is transitioning between
             * layouts.
             */
            if (
                container.clientWidth === 0 ||
                container.clientHeight === 0
            ) {
                return;
            }

            try {
                fitAddon.fit();

                resizeRef.current(
                    terminal.cols,
                    terminal.rows,
                );
            } catch {
                // Ignore temporary layout errors.
            }
        }, []);

    useEffect(() => {
        const container =
            containerRef.current;

        if (!container) {
            return;
        }

        const terminal = new XTerm({
            cursorBlink: true,
            cursorStyle: 'block',
            convertEol: true,
            disableStdin: false,

            fontFamily:
                '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',

            fontSize: 12,
            fontWeight: '400',
            fontWeightBold: '600',
            lineHeight: 1.2,
            letterSpacing: 0,

            scrollback: 5000,
            tabStopWidth: 4,
            allowTransparency: true,

            theme: {
                background: '#0d1117',
                foreground: '#c9d1d9',

                cursor: '#c9d1d9',
                cursorAccent: '#0d1117',

                selectionBackground:
                    '#264f78',

                selectionInactiveBackground:
                    '#1f2937',

                black: '#0d1117',
                red: '#ff7b72',
                green: '#7ee787',
                yellow: '#d29922',
                blue: '#58a6ff',
                magenta: '#bc8cff',
                cyan: '#39c5cf',
                white: '#b1bac4',

                brightBlack: '#484f58',
                brightRed: '#ffa198',
                brightGreen: '#56d364',
                brightYellow: '#e3b341',
                brightBlue: '#79c0ff',
                brightMagenta: '#d2a8ff',
                brightCyan: '#56d4dd',
                brightWhite: '#f0f6fc',
            },
        });

        const fitAddon = new FitAddon();

        terminal.loadAddon(fitAddon);
        terminal.open(container);

        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;

        terminal.writeln(
            '\x1b[34mCorven terminal\x1b[0m',
        );

        terminal.writeln(
            '\x1b[90mConnecting to workspace runtime...\x1b[0m',
        );

        /*
         * Send terminal keyboard input to the terminal-service.
         */
        const inputDisposable =
            terminal.onData((data) => {
                writeRef.current(data);
            });

        /*
         * Notify terminal-service when xterm dimensions change.
         */
        const resizeDisposable =
            terminal.onResize(
                ({ cols, rows }) => {
                    resizeRef.current(
                        cols,
                        rows,
                    );
                },
            );

        /*
         * Resize xterm whenever its container dimensions change.
         * This supports:
         *
         * - draggable terminal height
         * - sidebar resizing
         * - AI panel resizing
         * - maximize/restore
         * - bottom panel tab switching
         */
        const resizeObserver =
            new ResizeObserver(() => {
                if (
                    resizeTimeoutRef.current
                ) {
                    clearTimeout(
                        resizeTimeoutRef.current,
                    );
                }

                resizeTimeoutRef.current =
                    setTimeout(() => {
                        fitTerminal();
                    }, 50);
            });

        resizeObserver.observe(container);

        resizeObserverRef.current =
            resizeObserver;

        requestAnimationFrame(() => {
            fitTerminal();
            terminal.focus();
        });

        return () => {
            if (
                resizeTimeoutRef.current
            ) {
                clearTimeout(
                    resizeTimeoutRef.current,
                );

                resizeTimeoutRef.current =
                    null;
            }

            resizeObserver.disconnect();

            resizeObserverRef.current =
                null;

            inputDisposable.dispose();
            resizeDisposable.dispose();

            terminal.dispose();

            terminalRef.current = null;
            fitAddonRef.current = null;
        };
    }, [fitTerminal]);

    /*
     * Refit after maximizing, restoring, or switching
     * between embedded and standalone layouts.
     */
    useEffect(() => {
        const timeout = setTimeout(() => {
            fitTerminal();
        }, 100);

        return () => {
            clearTimeout(timeout);
        };
    }, [
        embedded,
        fitTerminal,
        isMaximized,
    ]);

    const clearTerminal =
        useCallback(() => {
            const terminal =
                terminalRef.current;

            if (!terminal) {
                return;
            }

            terminal.clear();
            terminal.focus();
        }, []);

    const reconnectTerminal =
        useCallback(() => {
            terminalRef.current?.writeln(
                '\r\n\x1b[90mReconnecting terminal...\x1b[0m',
            );

            terminalSession.reconnect();
        }, [terminalSession.reconnect]);

    const toggleMaximized =
        useCallback(() => {
            setIsMaximized(
                (current) => !current,
            );
        }, []);

    const rootClassName = [
        'flex min-h-0 flex-col bg-[#0d1117]',

        embedded
            ? 'h-full w-full'
            : isMaximized
                ? 'absolute inset-0 z-50 h-full w-full border-t border-[#30363d]'
                : 'h-64 w-full shrink-0 border-t border-[#30363d]',

        className,
    ].join(' ');

    return (
        <section
            className={rootClassName}
        >
            {!embedded && (
                <header className="flex h-9 shrink-0 items-center justify-between border-b border-[#21262d] bg-[#0d1117] px-3">
                    <div className="flex h-full items-center gap-4">
                        <div className="flex h-full items-center gap-2 border-b border-blue-500 px-1 text-[11px] font-medium uppercase tracking-wide text-gray-200">
                            <TerminalSquare className="h-3.5 w-3.5" />

                            Terminal
                        </div>

                        <button
                            type="button"
                            className="text-[11px] uppercase tracking-wide text-gray-500 transition hover:text-gray-300"
                        >
                            Output
                        </button>

                        <button
                            type="button"
                            className="text-[11px] uppercase tracking-wide text-gray-500 transition hover:text-gray-300"
                        >
                            Problems
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <TerminalStatus
                            status={
                                terminalSession.status
                            }
                            error={
                                terminalSession.error
                            }
                        />

                        <div className="flex items-center gap-0.5 text-gray-500">
                            <button
                                type="button"
                                className="rounded p-1 transition hover:bg-[#21262d] hover:text-gray-200"
                                aria-label="Create terminal"
                                title="Create terminal"
                                onClick={
                                    reconnectTerminal
                                }
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </button>

                            <button
                                type="button"
                                className="rounded p-1 transition hover:bg-[#21262d] hover:text-gray-200"
                                aria-label="Terminal options"
                                title="Terminal options"
                            >
                                <ChevronDown className="h-3.5 w-3.5" />
                            </button>

                            <button
                                type="button"
                                onClick={
                                    reconnectTerminal
                                }
                                className="rounded p-1 transition hover:bg-[#21262d] hover:text-gray-200"
                                aria-label="Reconnect terminal"
                                title="Reconnect terminal"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                            </button>

                            <button
                                type="button"
                                onClick={
                                    clearTerminal
                                }
                                className="rounded p-1 transition hover:bg-[#21262d] hover:text-gray-200"
                                aria-label="Clear terminal"
                                title="Clear terminal"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                                type="button"
                                onClick={
                                    toggleMaximized
                                }
                                className="rounded p-1 transition hover:bg-[#21262d] hover:text-gray-200"
                                aria-label={
                                    isMaximized
                                        ? 'Restore terminal'
                                        : 'Maximize terminal'
                                }
                                title={
                                    isMaximized
                                        ? 'Restore terminal'
                                        : 'Maximize terminal'
                                }
                            >
                                {isMaximized ? (
                                    <Minus className="h-3.5 w-3.5" />
                                ) : (
                                    <Maximize2 className="h-3.5 w-3.5" />
                                )}
                            </button>

                            {onClose && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded p-1 transition hover:bg-[#21262d] hover:text-gray-200"
                                    aria-label="Close terminal"
                                    title="Close terminal"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </header>
            )}

            {embedded && (
                <div className="flex h-8 shrink-0 items-center justify-between border-b border-[#21262d] px-3">
                    <TerminalStatus
                        status={
                            terminalSession.status
                        }
                        error={
                            terminalSession.error
                        }
                    />

                    <div className="flex items-center gap-0.5 text-gray-500">
                        <button
                            type="button"
                            onClick={
                                reconnectTerminal
                            }
                            className="rounded p-1 transition hover:bg-[#21262d] hover:text-gray-200"
                            aria-label="Reconnect terminal"
                            title="Reconnect terminal"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </button>

                        <button
                            type="button"
                            onClick={
                                clearTerminal
                            }
                            className="rounded p-1 transition hover:bg-[#21262d] hover:text-gray-200"
                            aria-label="Clear terminal"
                            title="Clear terminal"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {terminalSession.error && (
                <div className="shrink-0 border-b border-red-900/50 bg-red-950/30 px-3 py-1.5 text-[11px] text-red-300">
                    {terminalSession.error}
                </div>
            )}

            <div
                ref={containerRef}
                onClick={() => {
                    terminalRef.current?.focus();
                }}
                className="min-h-0 flex-1 overflow-hidden px-2 py-1"
            />
        </section>
    );
}

interface TerminalStatusProps {
    status: TerminalConnectionStatus;
    error: string | null;
}

function TerminalStatus({
    status,
    error,
}: TerminalStatusProps) {
    return (
        <div
            className="flex items-center gap-1.5"
            title={
                error ??
                getStatusText(status)
            }
        >
            <span
                className={[
                    'h-1.5 w-1.5 rounded-full',
                    getStatusClassName(
                        status,
                    ),
                ].join(' ')}
            />

            <span className="text-[10px] text-gray-500">
                {getStatusText(status)}
            </span>
        </div>
    );
}