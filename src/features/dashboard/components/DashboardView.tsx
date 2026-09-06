// src/features/dashboard/components/DashboardView.tsx
import { useState } from 'react';
import {
    PlusSquare,
    DownloadCloud,
    LayoutTemplate,
    Terminal,
    Box,
    AlertTriangle,
    History,
    Cpu,
    HardDrive,
    Activity,
    Loader2,
    Play,
    Square,
    Trash2,
    ExternalLink,
} from 'lucide-react';

import type { ActivityItem, NodeMetrics } from '../../../types';
import type { Workspace } from '../../workspace/types/workspace.types';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { ComingSoonModal } from './ComingSoonModal';
import { ConfirmDialog } from './ConfirmDialog';
import { formatRelativeTime } from '../utils/formatRelativeTime';

interface DashboardViewProps {
    metrics: NodeMetrics;
    nodeStatus: string;

    workspaces: Workspace[];
    isLoadingWorkspaces: boolean;
    startingWorkspaceId?: string;
    stoppingWorkspaceId?: string;
    removingWorkspaceId?: string;
    onStartWorkspace: (workspaceId: string) => void;
    onStopWorkspace: (workspaceId: string) => void;
    onRemoveWorkspace: (workspaceId: string) => void;

    onNavigateToIde: (workspaceId?: string) => void;
    onNavigateToNodes: () => void;
}

// NOTE: this assumes `Workspace.status` is one of these four — matches
// the 'PROVISIONING' check already in useWorkspace.ts. Adjust the map
// below if your backend uses different status strings.
const STATUS_DISPLAY: Record<
    string,
    { label: string; className: string; pulse: boolean }
> = {
    RUNNING: {
        label: 'Active',
        className:
            'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        pulse: true,
    },
    PROVISIONING: {
        label: 'Provisioning',
        className:
            'border-[#1f6feb]/30 bg-[#1f6feb]/10 text-[#58a6ff]',
        pulse: true,
    },
    STOPPED: {
        label: 'Stopped',
        className:
            'border-gray-500/30 bg-gray-500/10 text-gray-400',
        pulse: false,
    },
    ERROR: {
        label: 'Error',
        className:
            'border-rose-500/30 bg-rose-500/10 text-rose-400',
        pulse: false,
    },
};

// Placeholder until there's a real activity/audit-log endpoint.
const activities: ActivityItem[] = [
    {
        id: 'act-1',
        title: 'Deployment successful',
        subtitle: 'fiber-blog-api · production',
        type: 'success',
        timestamp: '14 minutes ago',
    },
    {
        id: 'act-2',
        title: 'New build triggered',
        subtitle: 'ecommerce-v3-core · push',
        type: 'info',
        timestamp: '1 hour ago',
    },
    {
        id: 'act-3',
        title: 'Build failed',
        subtitle: 'auth-server · CI/CD',
        type: 'error',
        timestamp: '3 hours ago',
    },
];

export default function DashboardView({
    metrics,
    nodeStatus,
    workspaces,
    isLoadingWorkspaces,
    startingWorkspaceId,
    stoppingWorkspaceId,
    removingWorkspaceId,
    onStartWorkspace,
    onStopWorkspace,
    onRemoveWorkspace,
    onNavigateToIde,
    onNavigateToNodes,
}: DashboardViewProps) {
    const [isCreateModalOpen, setCreateModalOpen] =
        useState(false);
    const [createModalTemplate, setCreateModalTemplate] =
        useState<string | undefined>(undefined);
    const [isImportModalOpen, setImportModalOpen] =
        useState(false);
    const [workspaceToRemove, setWorkspaceToRemove] =
        useState<Workspace | null>(null);

    const openCreateModal = (templateId?: string) => {
        setCreateModalTemplate(templateId);
        setCreateModalOpen(true);
    };

    const handleRemoveClick = (workspace: Workspace) => {
        setWorkspaceToRemove(workspace);
    };

    const handleConfirmRemove = () => {
        if (workspaceToRemove) {
            onRemoveWorkspace(workspaceToRemove.id);
            setWorkspaceToRemove(null);
        }
    };

    const handleCancelRemove = () => {
        setWorkspaceToRemove(null);
    };

    const handleWorkspaceClick = (workspace: Workspace) => {
        if (workspace.status === 'RUNNING') {
            onNavigateToIde(workspace.id);
            return;
        }

        if (workspace.status === 'PROVISIONING') {
            alert('Workspace is still starting. Please wait until it is running.');
            return;
        }

        if (workspace.status === 'STOPPED') {
            onStartWorkspace(workspace.id);
            return;
        }
    };

    return (
        <div className="text-gray-100 min-h-screen bg-[#0d1117] p-8 pb-20 select-none">
            <div className="max-w-7xl mx-auto space-y-10 pt-6">
                {/* Welcome Dashboard Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="font-headline-md text-3xl font-extrabold text-white tracking-tight">
                            Dashboard
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">
                            Welcome back, dev. Your workspace
                            infrastructure is currently
                            stable.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] px-4 py-2 rounded-lg">
                            <span
                                className={`w-2 h-2 rounded-full ${nodeStatus ===
                                    'Operational'
                                    ? 'bg-emerald-500 animate-pulse'
                                    : 'bg-amber-500 animate-pulse'
                                    }`}
                            />
                            <span className="text-xs font-mono uppercase text-gray-300">
                                {nodeStatus ===
                                    'Operational'
                                    ? 'Systems Operational'
                                    : `Status: ${nodeStatus}`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-12 gap-6">
                    {/* Column Left */}
                    <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
                        {/* Quick Actions Card */}
                        <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-6 relative">
                            <h2 className="font-headline-sm text-sm font-bold text-[#58a6ff] uppercase tracking-wider mb-4">
                                Quick Actions
                            </h2>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() =>
                                        openCreateModal()
                                    }
                                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-[#1f6feb] text-white font-semibold text-xs transition-all hover:bg-[#388bfd] active:scale-95 cursor-pointer shadow-lg shadow-[#1f6feb]/20"
                                >
                                    <PlusSquare className="h-4 w-4" />
                                    <span>
                                        Create Workspace
                                    </span>
                                </button>
                                <button
                                    onClick={() =>
                                        setImportModalOpen(
                                            true,
                                        )
                                    }
                                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-[#21262d] border border-[#30363d] hover:border-gray-500 text-gray-200 font-semibold text-xs transition-all hover:bg-[#30363d] active:scale-95 cursor-pointer"
                                >
                                    <DownloadCloud className="h-4 w-4 text-[#58a6ff]" />
                                    <span>
                                        Import Repository
                                    </span>
                                </button>
                                <button
                                    onClick={() =>
                                        openCreateModal(
                                            'rust-empty',
                                        )
                                    }
                                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-[#21262d] border border-[#30363d] hover:border-gray-500 text-gray-200 font-semibold text-xs transition-all hover:bg-[#30363d] active:scale-95 cursor-pointer"
                                >
                                    <LayoutTemplate className="h-4 w-4 text-[#ff7b72]" />
                                    <span>Use Template</span>
                                </button>
                            </div>
                        </div>

                        {/* Resources Widget Card */}
                        <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-6">
                            <h2 className="font-headline-sm text-sm font-bold text-white uppercase tracking-wider mb-5">
                                Resource Usage
                            </h2>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-gray-400 font-mono">
                                        <span className="flex items-center gap-1">
                                            <Cpu className="h-3 w-3 text-[#58a6ff]" />{' '}
                                            CPU Nodes
                                        </span>
                                        <span className="font-bold text-white">
                                            {metrics.cpu}%
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-[#0d1117] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#1f6feb] rounded-full shadow-[0_0_8px_rgba(31,111,235,0.6)] transition-all duration-1000"
                                            style={{
                                                width: `${metrics.cpu}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-gray-400 font-mono">
                                        <span className="flex items-center gap-1">
                                            <HardDrive className="h-3 w-3 text-[#a5d6ff]" />{' '}
                                            RAM Allocation
                                        </span>
                                        <span className="font-bold text-white">
                                            {metrics.memory}{' '}
                                            / 4.0 GB
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-[#0d1117] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#58a6ff] rounded-full transition-all duration-1000"
                                            style={{
                                                width: '35%',
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-gray-400 font-mono">
                                        <span className="flex items-center gap-1">
                                            <Activity className="h-3 w-3 text-[#ff7b72]" />{' '}
                                            Bandwidth
                                        </span>
                                        <span className="font-bold text-white">
                                            {metrics.network}
                                            %
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-[#0d1117] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#ff7b72] rounded-full transition-all duration-1000"
                                            style={{
                                                width: `${metrics.network}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column Middle */}
                    <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h2 className="font-headline-md text-lg font-extrabold text-white">
                                Recent Projects
                            </h2>
                            <button
                                onClick={() =>
                                    onNavigateToIde()
                                }
                                className="text-[#58a6ff] text-xs font-mono tracking-wider uppercase hover:underline"
                            >
                                View All Projects
                            </button>
                        </div>

                        {isLoadingWorkspaces ? (
                            <div className="flex h-40 items-center justify-center gap-2 rounded-2xl border border-[#30363d] bg-[#161b22]/70 text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-xs">
                                    Loading workspaces...
                                </span>
                            </div>
                        ) : workspaces.length === 0 ? (
                            <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#30363d] bg-[#161b22]/40 text-center">
                                <p className="text-xs text-gray-500">
                                    No workspaces yet.
                                </p>
                                <button
                                    onClick={() =>
                                        openCreateModal()
                                    }
                                    className="rounded-lg bg-[#1f6feb] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#388bfd]"
                                >
                                    Create your first
                                    workspace
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {workspaces.map((ws) => {
                                    const status =
                                        STATUS_DISPLAY[
                                        ws.status
                                        ] ??
                                        STATUS_DISPLAY.STOPPED;

                                    const isStarting =
                                        startingWorkspaceId ===
                                        ws.id;
                                    const isStopping =
                                        stoppingWorkspaceId ===
                                        ws.id;
                                    const isRemoving =
                                        removingWorkspaceId ===
                                        ws.id;
                                    const isRunning =
                                        ws.status ===
                                        'RUNNING';

                                    return (
                                        <div
                                            key={ws.id}
                                            className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-5 hover:border-[#58a6ff]/40 hover:shadow-lg hover:shadow-[#58a6ff]/5 transition-all group flex flex-col h-44"
                                        >
                                            <div className="flex justify-between items-start">
                                                <button
                                                    onClick={() =>
                                                        handleWorkspaceClick(
                                                            ws,
                                                        )
                                                    }
                                                    className="p-2.5 rounded-lg border bg-[#1f6feb]/10 border-[#1f6feb]/30 text-[#58a6ff] hover:bg-[#1f6feb]/20 transition-colors cursor-pointer"
                                                    title="Open in IDE"
                                                >
                                                    <ExternalLink className="h-4.5 w-4.5" />
                                                </button>

                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`px-2 py-0.5 rounded border text-[10px] font-mono tracking-wider uppercase ${status.className} ${status.pulse ? 'animate-pulse' : ''}`}
                                                    >
                                                        {
                                                            status.label
                                                        }
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            handleRemoveClick(
                                                                ws,
                                                            )
                                                        }
                                                        disabled={
                                                            isRemoving
                                                        }
                                                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Remove workspace"
                                                    >
                                                        {isRemoving ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() =>
                                                    handleWorkspaceClick(
                                                        ws,
                                                    )
                                                }
                                                className="text-left flex-1 cursor-pointer"
                                            >
                                                <h3 className="font-headline-sm text-sm font-bold text-white group-hover:text-[#58a6ff] transition-colors truncate">
                                                    {
                                                        ws.name
                                                    }
                                                </h3>
                                                <p className="text-xs text-gray-500 font-mono mt-0.5">
                                                    {formatRelativeTime(
                                                        ws.updatedAt,
                                                    )}
                                                </p>
                                            </button>

                                            <div className="flex justify-end mt-2">
                                                {isRunning ? (
                                                    <button
                                                        onClick={() =>
                                                            onStopWorkspace(
                                                                ws.id,
                                                            )
                                                        }
                                                        disabled={
                                                            isStopping
                                                        }
                                                        className="flex items-center gap-1 rounded-md border border-[#30363d] px-2 py-1 text-[10px] text-gray-400 hover:border-rose-500/40 hover:text-rose-400 disabled:opacity-50 transition-colors"
                                                    >
                                                        {isStopping ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <Square className="h-3 w-3" />
                                                        )}
                                                        Stop
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() =>
                                                            onStartWorkspace(
                                                                ws.id,
                                                            )
                                                        }
                                                        disabled={
                                                            isStarting ||
                                                            ws.status ===
                                                            'PROVISIONING'
                                                        }
                                                        className="flex items-center gap-1 rounded-md border border-[#30363d] px-2 py-1 text-[10px] text-gray-400 hover:border-emerald-500/40 hover:text-emerald-400 disabled:opacity-50 transition-colors"
                                                    >
                                                        {isStarting ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <Play className="h-3 w-3" />
                                                        )}
                                                        Start
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Cinematic Network Banner */}
                        <div
                            onClick={onNavigateToNodes}
                            className="relative h-44 rounded-2xl overflow-hidden border border-[#30363d] group cursor-pointer"
                        >
                            <img
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5kNPGDtVw5SkgdfCHrw1tzhIWG2NLdhNtGPUAvAJPMPu2fGP7w5O_P3nhfOglPaMEBl3s-OuB0o-mX7Wt72xEBNz300l_CE32uPZY2gaDrDosDr2kauajrpwoz-iq7PQmWCKY3styWLzX5KYKif_bPDUN8NhtfPIVn8cWg3hUaZw7PbfCOeFMA7RC5MboTy3vhp6dkFCqAouDosSSNEtd9ezVD9McAXEt-tAj_gZFVA027OACvfy1ngkgT2Snl3CxAcFobmbuy0A"
                                alt="Global Fiber Network"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/35 to-transparent" />
                            <div className="absolute bottom-5 left-6">
                                <h4 className="text-base font-black text-white flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                    Global Edge Network
                                    Active
                                </h4>
                                <p className="text-xs text-gray-300 mt-1">
                                    Simulated local peer
                                    synchronization across 24
                                    testnet regions
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Column Right */}
                    <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
                        <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-6 h-full flex flex-col justify-between">
                            <div>
                                <h2 className="font-headline-sm text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center justify-between">
                                    <span>Activity Feed</span>
                                    <History className="h-4 w-4 text-gray-500" />
                                </h2>

                                <div className="space-y-6 max-h-[360px] overflow-y-auto pr-1">
                                    {activities.map(
                                        (act) => (
                                            <div
                                                key={act.id}
                                                className="relative pl-6 border-l border-gray-800"
                                            >
                                                <div
                                                    className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-[#0d1117] ${act.type ===
                                                        'success'
                                                        ? 'bg-emerald-500'
                                                        : act.type ===
                                                            'info'
                                                            ? 'bg-[#1f6feb]'
                                                            : act.type ===
                                                                'error'
                                                                ? 'bg-rose-500'
                                                                : 'bg-amber-400'
                                                        }`}
                                                />

                                                <div className="flex flex-col gap-1">
                                                    <p className="text-xs font-bold text-gray-200 leading-tight">
                                                        {
                                                            act.title
                                                        }
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 font-mono">
                                                        {
                                                            act.subtitle
                                                        }
                                                    </p>
                                                    <p className="text-[9px] text-gray-600 font-mono mt-0.5">
                                                        {
                                                            act.timestamp
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={onNavigateToNodes}
                                className="w-full pt-4 mt-4 border-t border-[#30363d] text-center text-xs font-mono tracking-widest text-gray-500 hover:text-[#58a6ff] transition-colors uppercase"
                            >
                                View Full Live Logs
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <CreateWorkspaceModal
                isOpen={isCreateModalOpen}
                initialTemplateId={createModalTemplate}
                onClose={() => setCreateModalOpen(false)}
                onCreated={(workspace) =>
                    onStartWorkspace(workspace.id)
                }
            />

            <ComingSoonModal
                isOpen={isImportModalOpen}
                onClose={() => setImportModalOpen(false)}
                title="Import Repository"
                description="Repo import isn't wired up on the backend yet — there's no endpoint for it on workspaceApi. This is a placeholder until that exists."
            />

            <ConfirmDialog
                isOpen={!!workspaceToRemove}
                onClose={handleCancelRemove}
                onConfirm={handleConfirmRemove}
                title="Remove Workspace"
                description={`Are you sure you want to remove "${workspaceToRemove?.name}"? This action cannot be undone and all data will be permanently deleted.`}
                confirmLabel="Remove"
                cancelLabel="Cancel"
                variant="danger"
            />
        </div>
    );
}