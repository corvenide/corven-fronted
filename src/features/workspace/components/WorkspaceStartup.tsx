// src/features/workspace/components/WorkspaceStartup.tsx
//
// Wraps the IDE. Shows start-up progress until the workspace is running,
// starts stopped workspaces automatically, and explains failures.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, Loader2, Play, RotateCw } from 'lucide-react';

import { ApiError } from '../../../lib/api-client';
import { useWorkspace } from '../hooks/useWorkspace';
import type { ProvisionStage, WorkspaceRuntimeStatus } from '../types/workspace.types';

const STEPS: { stage: ProvisionStage; label: string; hint: string }[] = [
    { stage: 'preparing', label: 'Preparing storage', hint: 'Creating the workspace network and volumes' },
    { stage: 'starting', label: 'Starting containers', hint: 'Runtime and devnet start in parallel' },
    { stage: 'project', label: 'Setting up your project', hint: 'Copying the CKB project template' },
];

const AUTO_START = new Set(['PENDING', 'STOPPED', 'IDLE']);

interface WorkspaceRuntimeState {
    /** The runtime container is up: terminal, build and tests can run. */
    ready: boolean;
    /** Devnet status and start button, rendered by the IDE's sidebar. */
    devnet: ReactNode;
}

const WorkspaceRuntimeContext = createContext<WorkspaceRuntimeState>({ ready: true, devnet: null });

/** Whether the workspace runtime is ready, for panels that need it. */
export function useWorkspaceRuntime(): WorkspaceRuntimeState {
    return useContext(WorkspaceRuntimeContext);
}

function useElapsed(running: boolean): number {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        if (!running) {
            setSeconds(0);
            return;
        }
        const started = Date.now();
        const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
        return () => window.clearInterval(timer);
    }, [running]);

    return seconds;
}

function Shell({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-full min-h-[calc(100vh-3.5rem)] w-full items-center justify-center bg-surface px-4 text-on-surface">
            <div className="w-full max-w-[420px] rounded-lg border border-outline-variant/30 bg-surface-container p-6 shadow-2xl">{children}</div>
        </div>
    );
}

function BackLink() {
    return (
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-[11.5px] font-mono text-on-surface-variant hover:text-primary transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
    );
}

function Progress({ status, elapsed }: { status: WorkspaceRuntimeStatus | null; elapsed: number }) {
    const current = status?.provisionStage ?? 'preparing';
    const currentIndex = STEPS.findIndex((step) => step.stage === current);

    return (
        <Shell>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">Starting workspace</p>
            <h1 className="mt-1.5 truncate text-[16px] font-semibold text-on-surface">{status?.name ?? 'Workspace'}</h1>

            <ol className="mt-5 space-y-3.5" aria-live="polite">
                {STEPS.map((step, i) => {
                    const state = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'todo';
                    return (
                        <li key={step.stage} className="flex gap-2.5">
                            <span
                                className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                                    state === 'done'
                                        ? 'border-primary/40 bg-primary/15 text-primary'
                                        : state === 'active'
                                          ? 'border-primary text-primary'
                                          : 'border-outline-variant/30 text-on-surface-variant/40'
                                }`}
                            >
                                {state === 'done' ? (
                                    <Check className="h-3 w-3" />
                                ) : state === 'active' ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <span className="h-1 w-1 rounded-full bg-current" />
                                )}
                            </span>
                            <div>
                                <div className={`text-[12px] font-medium ${state === 'todo' ? 'text-on-surface-variant/60' : 'text-on-surface'}`}>{step.label}</div>
                                {state === 'active' && <div className="mt-0.5 text-[11px] text-on-surface-variant">{step.hint}</div>}
                            </div>
                        </li>
                    );
                })}
            </ol>

            <div className="mt-6 flex items-center justify-between border-t border-outline-variant/20 pt-4 text-[11px] text-on-surface-variant">
                <BackLink />
                <span className="font-mono">{elapsed}s</span>
            </div>
        </Shell>
    );
}

function Failed({ message, onRetry, retrying }: { message: string; onRetry: () => void; retrying: boolean }) {
    return (
        <Shell>
            <div className="flex items-center gap-2 text-error font-mono">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-[13px] font-semibold">Workspace failed to start</p>
            </div>
            <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded border border-outline-variant/30 bg-surface-container-lowest p-2.5 font-mono text-[11px] leading-relaxed text-on-surface-variant">
                {message}
            </pre>
            <div className="mt-5 flex items-center justify-between font-mono">
                <BackLink />
                <button
                    type="button"
                    onClick={onRetry}
                    disabled={retrying}
                    className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-[11px] font-medium text-on-primary hover:bg-primary-fixed disabled:opacity-60"
                >
                    {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
                    Try again
                </button>
            </div>
        </Shell>
    );
}

/**
 * Devnet status and start button. Devnets start on demand, since editing,
 * building and testing don't need a chain.
 */
function DevnetControl({
    status,
    onStart,
    starting,
}: {
    status: WorkspaceRuntimeStatus;
    onStart: () => void;
    starting: boolean;
}) {
    const node = status.containers.find((container) => container.type === 'CKB_NODE');
    const state =
        starting || node?.status === 'CREATED' || node?.status === 'STARTING'
            ? 'starting'
            : node?.status === 'RUNNING'
              ? 'running'
              : node?.status === 'FAILED'
                ? 'failed'
                : 'off';

    const label = {
        off: 'Devnet off',
        starting: 'Devnet starting…',
        running: 'Devnet running',
        failed: 'Devnet failed',
    }[state];

    return (
        <div className="flex h-8 items-center gap-2 border-t border-outline-variant/30 bg-surface-container px-3 font-mono text-[10.5px] text-on-surface-variant">
            <span
                className={`h-1.5 w-1.5 rounded-full ${
                    state === 'running'
                        ? 'bg-primary'
                        : state === 'starting'
                          ? 'animate-pulse bg-secondary'
                          : state === 'failed'
                            ? 'bg-error'
                            : 'bg-outline'
                }`}
            />
            <span role="status" className="flex-1 truncate">{label}</span>
            {(state === 'off' || state === 'failed') && (
                <button
                    type="button"
                    onClick={onStart}
                    className="ml-1 inline-flex items-center gap-1 rounded bg-surface-container-high px-2 py-0.5 text-[10px] text-on-surface hover:text-primary transition-colors"
                >
                    {state === 'failed' ? <RotateCw className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
                    {state === 'failed' ? 'Retry' : 'Start'}
                </button>
            )}
            {state === 'starting' && <Loader2 className="h-3 w-3 animate-spin text-secondary" />}
        </div>
    );
}

/**
 * Slim banner over the IDE while the runtime starts (or failed), used when
 * the editor can already work from the saved copy of the files.
 */
function StartupBanner({
    status,
    failedMessage,
    retrying,
    onRetry,
    elapsed,
}: {
    status: WorkspaceRuntimeStatus;
    failedMessage: string | null;
    retrying: boolean;
    onRetry: () => void;
    elapsed: number;
}) {
    if (failedMessage) {
        return (
            <div role="alert" className="flex items-center gap-2.5 border-b border-error/30 bg-error/10 px-3 py-1.5 font-mono text-[11px] text-error">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate" title={failedMessage}>
                    Workspace failed: {failedMessage.split('\n')[0]}
                </span>
                <button
                    type="button"
                    onClick={onRetry}
                    disabled={retrying}
                    className="inline-flex shrink-0 items-center gap-1 rounded bg-error px-2 py-0.5 text-[10px] font-medium text-on-error hover:opacity-90 disabled:opacity-60"
                >
                    {retrying ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RotateCw className="h-2.5 w-2.5" />}
                    Retry
                </button>
            </div>
        );
    }

    const step = STEPS.find((item) => item.stage === (status.provisionStage ?? 'preparing'));

    return (
        <div role="status" className="flex items-center gap-2.5 border-b border-primary/20 bg-primary/5 px-3 py-1.5 font-mono text-[11px] text-on-surface">
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
            <span className="min-w-0 flex-1 truncate">
                Starting workspace{step ? ` · ${step.label}` : ''}. Terminal and devnet connecting shortly.
            </span>
            <span className="shrink-0 text-on-surface-variant/70">{elapsed}s</span>
        </div>
    );
}

export function WorkspaceStartup({ workspaceId, children }: { workspaceId: string; children: ReactNode }) {
    const {
        runtimeStatus,
        isLoading,
        error,
        startWorkspace,
        isStarting,
        startError,
        startDevnet,
        isStartingDevnet,
    } = useWorkspace(workspaceId);

    const autoStarted = useRef(false);

    const status = runtimeStatus?.status;
    const provisioning = status === 'PROVISIONING' || isStarting;
    const elapsed = useElapsed(provisioning);

    // Opening a stopped workspace starts it, like opening a project locally.
    // Reset once it is running, so a later idle stop starts it again too.
    useEffect(() => {
        if (status === 'RUNNING') {
            autoStarted.current = false;
            return;
        }

        if (status && AUTO_START.has(status) && !autoStarted.current) {
            autoStarted.current = true;
            void startWorkspace().catch(() => undefined);
        }
    }, [status, startWorkspace]);

    const retry = () => void startWorkspace().catch(() => undefined);

    if (error) {
        const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
        return (
            <Shell>
                <p className="text-[14px] font-semibold text-white">{notFound ? 'Workspace not found' : 'Couldn’t load this workspace'}</p>
                <p className="mt-2 text-[13px] text-gray-400">{error instanceof Error ? error.message : 'Please try again.'}</p>
                <div className="mt-6">
                    <BackLink />
                </div>
            </Shell>
        );
    }

    if (isLoading || !runtimeStatus) {
        return <Progress status={null} elapsed={elapsed} />;
    }

    if (status === 'DELETED') {
        return (
            <Shell>
                <p className="text-[14px] font-semibold text-white">This workspace was deleted</p>
                <div className="mt-6">
                    <BackLink />
                </div>
            </Shell>
        );
    }

    const failedMessage =
        status === 'FAILED' || (startError && !provisioning)
            ? runtimeStatus.provisionError ??
              (startError instanceof Error ? startError.message : 'Something went wrong while starting the workspace.')
            : null;

    if (status === 'RUNNING') {
        return (
            <WorkspaceRuntimeContext.Provider
                value={{
                    ready: true,
                    devnet: (
                        <DevnetControl
                            status={runtimeStatus}
                            starting={isStartingDevnet}
                            onStart={() => void startDevnet().catch(() => undefined)}
                        />
                    ),
                }}
            >
                {children}
            </WorkspaceRuntimeContext.Provider>
        );
    }

    // The editor can work from the saved copy of the files while the
    // runtime starts, so open it straight away with a banner.
    if (runtimeStatus.filesAvailable) {
        return (
            <WorkspaceRuntimeContext.Provider value={{ ready: false, devnet: null }}>
                <div className="flex h-full min-h-0 w-full flex-col">
                    <StartupBanner
                        status={runtimeStatus}
                        failedMessage={failedMessage}
                        retrying={isStarting}
                        onRetry={retry}
                        elapsed={elapsed}
                    />
                    <div className="min-h-0 flex-1">{children}</div>
                </div>
            </WorkspaceRuntimeContext.Provider>
        );
    }

    if (failedMessage) {
        return <Failed message={failedMessage} retrying={isStarting} onRetry={retry} />;
    }

    return <Progress status={runtimeStatus} elapsed={elapsed} />;
}
