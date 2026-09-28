// src/features/dashboard/components/DashboardView.tsx
//
// Workspace dashboard. Everything shown is derived from the user's real
// workspaces: counts, statuses, start progress, errors and timestamps.

import { useMemo, useState, type ReactNode } from 'react';
import {
    AlertTriangle,
    ArrowUpRight,
    Box,
    Clock,
    Loader2,
    Play,
    Plus,
    RotateCw,
    Search,
    Square,
    Trash2,
} from 'lucide-react';

import type { Workspace, WorkspaceStatus } from '../../workspace/types/workspace.types';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { ConfirmDialog } from './ConfirmDialog';

interface DashboardViewProps {
    userName: string | null;

    workspaces: Workspace[];
    isLoading: boolean;
    isError: boolean;
    onRetry: () => void;

    startingWorkspaceId?: string;
    stoppingWorkspaceId?: string;
    removingWorkspaceId?: string;

    onOpenWorkspace: (workspaceId: string) => void;
    onStartWorkspace: (workspaceId: string) => void;
    onStopWorkspace: (workspaceId: string) => void;
    onRemoveWorkspace: (workspaceId: string) => void;
}

type Filter = 'all' | 'running' | 'stopped' | 'failed';

const STOPPED_STATES: WorkspaceStatus[] = ['STOPPED', 'IDLE', 'PENDING'];

const STATUS: Record<string, { label: string; dot: string; text: string }> = {
    RUNNING: { label: 'Running', dot: 'bg-emerald-400', text: 'text-emerald-300' },
    PROVISIONING: { label: 'Starting', dot: 'bg-[#58a6ff] animate-pulse', text: 'text-[#79b8ff]' },
    IDLE: { label: 'Idle', dot: 'bg-amber-400', text: 'text-amber-300' },
    STOPPED: { label: 'Stopped', dot: 'bg-gray-500', text: 'text-gray-400' },
    PENDING: { label: 'Not started', dot: 'bg-gray-600', text: 'text-gray-400' },
    FAILED: { label: 'Failed', dot: 'bg-rose-400', text: 'text-rose-300' },
};

const STAGE_LABEL: Record<string, string> = {
    preparing: 'Preparing storage',
    starting: 'Starting containers',
    project: 'Setting up project',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(input?: string | null): string {
    if (!input) return '—';
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return '—';

    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(input?: string | null): string {
    if (!input) return '—';
    const date = new Date(input);
    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function lastActive(workspace: Workspace): string | null {
    return workspace.lastActivityAt ?? workspace.lastStartedAt ?? workspace.lastStoppedAt ?? workspace.createdAt ?? null;
}

function statusDetail(workspace: Workspace): string {
    switch (workspace.status) {
        case 'PROVISIONING':
            return `${STAGE_LABEL[workspace.provisionStage ?? 'preparing'] ?? 'Starting'}…`;
        case 'FAILED':
            return workspace.provisionError?.split('\n')[0] ?? 'The last start failed';
        case 'IDLE':
            return 'Stopped after inactivity · opens instantly';
        case 'PENDING':
            return 'Starts when you open it';
        case 'STOPPED':
            return `Stopped ${timeAgo(workspace.lastStoppedAt)}`;
        case 'RUNNING':
            return `Started ${timeAgo(workspace.lastStartedAt)}`;
        default:
            return '';
    }
}

interface ActivityEvent {
    id: string;
    at: string;
    text: ReactNode;
    tone: 'neutral' | 'good' | 'bad' | 'muted';
}

/** Recent events reconstructed from each workspace's timestamps. */
function buildActivity(workspaces: Workspace[]): ActivityEvent[] {
    const events: ActivityEvent[] = [];

    for (const ws of workspaces) {
        const name = <span className="font-medium text-gray-200">{ws.name}</span>;

        events.push({ id: `${ws.id}-created`, at: ws.createdAt, text: <>Created {name}</>, tone: 'neutral' });

        if (ws.lastStartedAt) {
            events.push({ id: `${ws.id}-started`, at: ws.lastStartedAt, text: <>Started {name}</>, tone: 'good' });
        }

        if (ws.lastStoppedAt && ws.status !== 'RUNNING' && ws.status !== 'PROVISIONING') {
            events.push({
                id: `${ws.id}-stopped`,
                at: ws.lastStoppedAt,
                text: ws.status === 'IDLE' ? <>{name} stopped after inactivity</> : <>Stopped {name}</>,
                tone: 'muted',
            });
        }

        if (ws.status === 'FAILED') {
            events.push({ id: `${ws.id}-failed`, at: ws.updatedAt, text: <>{name} failed to start</>, tone: 'bad' });
        }
    }

    return events
        .filter((event) => !Number.isNaN(new Date(event.at).getTime()))
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 8);
}

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

function Stat({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'good' | 'info' | 'bad' }) {
    const color =
        tone === 'good' ? 'text-emerald-300' : tone === 'info' ? 'text-[#79b8ff]' : tone === 'bad' ? 'text-rose-300' : 'text-white';

    return (
        <div className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3.5">
            <div className="text-[12px] text-gray-400">{label}</div>
            <div className={`mt-1 font-mono text-[22px] font-semibold tabular-nums ${color}`}>{value}</div>
        </div>
    );
}

function IconButton({
    label,
    onClick,
    disabled,
    danger,
    children,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            onClick={(event) => {
                event.stopPropagation();
                onClick();
            }}
            disabled={disabled}
            className={`flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                danger ? 'hover:bg-rose-500/10 hover:text-rose-300' : 'hover:bg-[#21262d] hover:text-gray-100'
            }`}
        >
            {children}
        </button>
    );
}

/* ------------------------------------------------------------------ */
/*  View                                                               */
/* ------------------------------------------------------------------ */

export default function DashboardView({
    userName,
    workspaces,
    isLoading,
    isError,
    onRetry,
    startingWorkspaceId,
    stoppingWorkspaceId,
    removingWorkspaceId,
    onOpenWorkspace,
    onStartWorkspace,
    onStopWorkspace,
    onRemoveWorkspace,
}: DashboardViewProps) {
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [toRemove, setToRemove] = useState<Workspace | null>(null);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<Filter>('all');

    const counts = useMemo(
        () => ({
            all: workspaces.length,
            running: workspaces.filter((w) => w.status === 'RUNNING').length,
            starting: workspaces.filter((w) => w.status === 'PROVISIONING').length,
            stopped: workspaces.filter((w) => STOPPED_STATES.includes(w.status)).length,
            failed: workspaces.filter((w) => w.status === 'FAILED').length,
        }),
        [workspaces],
    );

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();

        return [...workspaces]
            .filter((w) => {
                if (filter === 'running') return w.status === 'RUNNING' || w.status === 'PROVISIONING';
                if (filter === 'stopped') return STOPPED_STATES.includes(w.status);
                if (filter === 'failed') return w.status === 'FAILED';
                return true;
            })
            .filter((w) => !q || w.name.toLowerCase().includes(q))
            .sort((a, b) => new Date(lastActive(b) ?? 0).getTime() - new Date(lastActive(a) ?? 0).getTime());
    }, [workspaces, filter, query]);

    const activity = useMemo(() => buildActivity(workspaces), [workspaces]);

    const filters: { key: Filter; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: counts.all },
        { key: 'running', label: 'Running', count: counts.running + counts.starting },
        { key: 'stopped', label: 'Stopped', count: counts.stopped },
        { key: 'failed', label: 'Failed', count: counts.failed },
    ];

    const hasWorkspaces = workspaces.length > 0;

    return (
        <div className="min-h-full bg-[#0d1117] px-5 pb-16 pt-8 text-gray-200 sm:px-8">
            <div className="mx-auto max-w-[1200px]">
                {/* ------------------------------------------------ Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-white">Workspaces</h1>
                        <p className="mt-1 text-[14px] text-gray-400">
                            Your CKB development environments
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-md bg-[#238636] px-3.5 text-[13.5px] font-medium text-white transition-colors hover:bg-[#2ea043] sm:self-auto"
                    >
                        <Plus className="h-4 w-4" />
                        New workspace
                    </button>
                </div>

                {/* ------------------------------------------------ Stats */}
                {hasWorkspaces && (
                    <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Stat label="Total workspaces" value={counts.all} />
                        <Stat label="Running" value={counts.running} tone={counts.running ? 'good' : 'default'} />
                        <Stat label="Starting" value={counts.starting} tone={counts.starting ? 'info' : 'default'} />
                        <Stat label="Needs attention" value={counts.failed} tone={counts.failed ? 'bad' : 'default'} />
                    </div>
                )}

                <div className={`mt-7 grid gap-6 ${hasWorkspaces ? 'lg:grid-cols-[1fr_300px]' : ''}`}>
                    {/* -------------------------------------------- Main list */}
                    <section aria-label="Workspaces" className="min-w-0">
                        {isError ? (
                            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-[#30363d] bg-[#161b22] px-6 py-14 text-center">
                                <AlertTriangle className="h-5 w-5 text-amber-400" />
                                <p className="text-[14px] text-gray-300">Couldn’t load your workspaces.</p>
                                <button
                                    type="button"
                                    onClick={onRetry}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-[#30363d] px-3 py-1.5 text-[13px] text-gray-200 hover:bg-[#21262d]"
                                >
                                    <RotateCw className="h-3.5 w-3.5" /> Try again
                                </button>
                            </div>
                        ) : isLoading ? (
                            <div className="overflow-hidden rounded-lg border border-[#30363d]" aria-busy="true">
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="flex items-center gap-4 border-b border-[#21262d] bg-[#161b22] px-4 py-4 last:border-b-0">
                                        <div className="h-8 w-8 animate-pulse rounded-md bg-[#21262d]" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 w-40 animate-pulse rounded bg-[#21262d]" />
                                            <div className="h-2.5 w-24 animate-pulse rounded bg-[#21262d]" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : !hasWorkspaces ? (
                            <div className="rounded-lg border border-dashed border-[#30363d] bg-[#161b22]/60 px-6 py-16 text-center">
                                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-[#30363d] bg-[#0d1117]">
                                    <Box className="h-5 w-5 text-gray-300" />
                                </div>
                                <h2 className="mt-5 text-[17px] font-semibold text-white">Create your first workspace</h2>
                                <p className="mx-auto mt-2 max-w-[460px] text-[14px] leading-[1.6] text-gray-400">
                                    Each workspace comes with a CKB Rust project, the RISC-V toolchain, a terminal, and a
                                    private devnet you can start whenever you need it.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setCreateOpen(true)}
                                    className="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-[#238636] px-4 text-[13.5px] font-medium text-white hover:bg-[#2ea043]"
                                >
                                    <Plus className="h-4 w-4" /> New workspace
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Toolbar */}
                                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div role="tablist" aria-label="Filter workspaces" className="flex rounded-md border border-[#30363d] bg-[#161b22] p-0.5">
                                        {filters.map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                role="tab"
                                                aria-selected={filter === item.key}
                                                onClick={() => setFilter(item.key)}
                                                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-[12.5px] transition-colors ${
                                                    filter === item.key ? 'bg-[#21262d] text-white' : 'text-gray-400 hover:text-gray-200'
                                                }`}
                                            >
                                                {item.label}
                                                <span className="font-mono text-[11px] text-gray-500">{item.count}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <label className="relative block sm:w-64">
                                        <span className="sr-only">Search workspaces</span>
                                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="search"
                                            value={query}
                                            onChange={(event) => setQuery(event.target.value)}
                                            placeholder="Search workspaces"
                                            className="h-8 w-full rounded-md border border-[#30363d] bg-[#0d1117] pl-8 pr-3 text-[13px] text-gray-200 outline-none placeholder:text-gray-500 focus:border-[#1f6feb]"
                                        />
                                    </label>
                                </div>

                                {/* Table */}
                                <div className="overflow-hidden rounded-lg border border-[#30363d]">
                                    <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_110px_110px_112px] gap-4 border-b border-[#30363d] bg-[#161b22] px-4 py-2.5 text-[12px] font-medium text-gray-400 md:grid">
                                        <div>Name</div>
                                        <div>Status</div>
                                        <div>Last active</div>
                                        <div>Created</div>
                                        <div className="sr-only">Actions</div>
                                    </div>

                                    {visible.length === 0 ? (
                                        <div className="bg-[#0d1117] px-4 py-10 text-center text-[13.5px] text-gray-500">
                                            No workspaces match{query ? ` “${query}”` : ' this filter'}.
                                        </div>
                                    ) : (
                                        <ul>
                                            {visible.map((ws) => {
                                                const status = STATUS[ws.status] ?? STATUS.STOPPED;
                                                const running = ws.status === 'RUNNING';
                                                const starting = ws.status === 'PROVISIONING' || startingWorkspaceId === ws.id;
                                                const stopping = stoppingWorkspaceId === ws.id;
                                                const removing = removingWorkspaceId === ws.id;

                                                return (
                                                    <li
                                                        key={ws.id}
                                                        onClick={() => onOpenWorkspace(ws.id)}
                                                        className="group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-b border-[#21262d] bg-[#0d1117] px-4 py-3.5 transition-colors last:border-b-0 hover:bg-[#161b22] md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_110px_110px_112px] md:items-center"
                                                    >
                                                        {/* Name */}
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#30363d] bg-[#161b22] font-mono text-[12px] font-semibold uppercase text-gray-300">
                                                                {ws.name.slice(0, 2)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        onOpenWorkspace(ws.id);
                                                                    }}
                                                                    className="block max-w-full truncate text-left text-[14px] font-medium text-white group-hover:text-[#58a6ff]"
                                                                >
                                                                    {ws.name}
                                                                </button>
                                                                <div className="mt-0.5 text-[12px] text-gray-500 md:hidden">
                                                                    Active {timeAgo(lastActive(ws))}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Actions (right on mobile) */}
                                                        <div className="row-span-2 flex items-center justify-end gap-0.5 md:order-last md:row-span-1">
                                                            {running ? (
                                                                <IconButton label="Stop workspace" onClick={() => onStopWorkspace(ws.id)} disabled={stopping}>
                                                                    {stopping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                                                                </IconButton>
                                                            ) : (
                                                                <IconButton
                                                                    label={ws.status === 'FAILED' ? 'Retry start' : 'Start workspace'}
                                                                    onClick={() => onStartWorkspace(ws.id)}
                                                                    disabled={starting}
                                                                >
                                                                    {starting ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : ws.status === 'FAILED' ? (
                                                                        <RotateCw className="h-3.5 w-3.5" />
                                                                    ) : (
                                                                        <Play className="h-3.5 w-3.5" />
                                                                    )}
                                                                </IconButton>
                                                            )}
                                                            <IconButton label="Delete workspace" onClick={() => setToRemove(ws)} disabled={removing} danger>
                                                                {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                            </IconButton>
                                                            <IconButton label="Open in IDE" onClick={() => onOpenWorkspace(ws.id)}>
                                                                <ArrowUpRight className="h-4 w-4" />
                                                            </IconButton>
                                                        </div>

                                                        {/* Status */}
                                                        <div className="min-w-0 pl-11 md:pl-0">
                                                            <div className={`flex items-center gap-2 text-[13px] font-medium ${status.text}`}>
                                                                <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />
                                                                {status.label}
                                                            </div>
                                                            <div
                                                                className={`mt-0.5 truncate text-[12px] ${ws.status === 'FAILED' ? 'text-rose-300/70' : 'text-gray-500'}`}
                                                                title={ws.status === 'FAILED' ? ws.provisionError ?? undefined : undefined}
                                                            >
                                                                {statusDetail(ws)}
                                                            </div>
                                                        </div>

                                                        {/* Last active / created (desktop) */}
                                                        <div className="hidden text-[13px] text-gray-400 md:block">{timeAgo(lastActive(ws))}</div>
                                                        <div className="hidden text-[13px] text-gray-400 md:block">{formatDate(ws.createdAt)}</div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </>
                        )}
                    </section>

                    {/* -------------------------------------------- Sidebar */}
                    {hasWorkspaces && !isError && (
                        <aside className="flex flex-col gap-6">
                            <section aria-labelledby="activity-heading" className="rounded-lg border border-[#30363d] bg-[#161b22]">
                                <h2 id="activity-heading" className="flex items-center gap-2 border-b border-[#30363d] px-4 py-3 text-[13px] font-semibold text-white">
                                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                                    Recent activity
                                </h2>
                                <ol className="px-4 py-2">
                                    {activity.map((event) => (
                                        <li key={event.id} className="flex gap-3 py-2.5">
                                            <span
                                                className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${
                                                    event.tone === 'good'
                                                        ? 'bg-emerald-400'
                                                        : event.tone === 'bad'
                                                          ? 'bg-rose-400'
                                                          : event.tone === 'muted'
                                                            ? 'bg-gray-600'
                                                            : 'bg-[#58a6ff]'
                                                }`}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[13px] text-gray-400">{event.text}</p>
                                                <p className="mt-0.5 text-[11.5px] text-gray-500">{timeAgo(event.at)}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </section>

                            <section aria-labelledby="how-heading" className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-4">
                                <h2 id="how-heading" className="text-[13px] font-semibold text-white">How workspaces work</h2>
                                <ul className="mt-3 space-y-2.5 text-[12.5px] leading-[1.55] text-gray-400">
                                    <li>Opening a workspace starts it. You can edit files while it boots.</li>
                                    <li>Workspaces stop on their own after a period of inactivity; your files are kept.</li>
                                    <li>The devnet starts on demand from the IDE sidebar.</li>
                                </ul>
                            </section>
                        </aside>
                    )}
                </div>
            </div>

            <CreateWorkspaceModal
                isOpen={isCreateOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={(workspace) => onOpenWorkspace(workspace.id)}
            />

            <ConfirmDialog
                isOpen={!!toRemove}
                onClose={() => setToRemove(null)}
                onConfirm={() => {
                    if (toRemove) onRemoveWorkspace(toRemove.id);
                    setToRemove(null);
                }}
                title="Delete workspace"
                description={`Delete "${toRemove?.name}"? Its containers, files and devnet data are removed permanently.`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
            />
        </div>
    );
}
