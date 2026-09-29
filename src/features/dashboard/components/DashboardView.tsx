// src/features/dashboard/components/DashboardView.tsx
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { Workspace, WorkspaceStatus } from '../../workspace/types/workspace.types';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { ConfirmDialog } from './ConfirmDialog';
import CommunityTab from './CommunityTab';
import DonateTab from './DonateTab';

const DOCS_URL = 'https://docs.nervos.org/';

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

export default function DashboardView({
    userName: _userName,
    workspaces,
    isLoading: _isLoading,
    isError: _isError,
    onRetry,
    startingWorkspaceId,
    stoppingWorkspaceId,
    removingWorkspaceId,
    onOpenWorkspace,
    onStartWorkspace,
    onStopWorkspace,
    onRemoveWorkspace,
}: DashboardViewProps) {
    const [searchParams] = useSearchParams();
    const currentTab = searchParams.get('tab') || 'workspaces';

    const [isCreateOpen, setCreateOpen] = useState(false);
    const [toRemove, setToRemove] = useState<Workspace | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [recentActivities, setRecentActivities] = useState([
        {
            id: 'act-1',
            dot: 'bg-primary shadow-sm shadow-primary',
            title: 'Started USDA',
            desc: 'Devnet socket attached (PID: 8812)',
            time: '5m ago',
        },
        {
            id: 'act-2',
            dot: 'bg-outline',
            title: 'Stopped Omnilock-V2',
            desc: 'Container hibernation finalized',
            time: '5h ago',
        },
        {
            id: 'act-3',
            dot: 'bg-secondary',
            title: 'Compiled contract usda_script.bin',
            desc: 'Capsule build finished (exit 0)',
            time: '6h ago',
        },
        {
            id: 'act-4',
            dot: 'bg-surface-tint',
            title: 'Created workspace USDA',
            desc: 'Template: Capsule Rust v0.2.1',
            time: '6h ago',
        },
    ]);

    // Merge active user workspaces with reference dashboard workspaces if needed
    const allWorkspaces = useMemo(() => {
        return [...workspaces];
    }, [workspaces]);

    const counts = useMemo(() => {
        return {
            all: allWorkspaces.length,
            running: allWorkspaces.filter((w) => w.status === 'RUNNING').length,
            stopped: allWorkspaces.filter((w) => w.status === 'STOPPED' || w.status === 'IDLE').length,
            failed: allWorkspaces.filter((w) => w.status === 'FAILED').length,
            starting: allWorkspaces.filter((w) => w.status === 'PROVISIONING').length,
        };
    }, [allWorkspaces]);

    const filteredWorkspaces = useMemo(() => {
        return allWorkspaces.filter((w) => {
            const matchesFilter =
                filter === 'all'
                    ? true
                    : filter === 'running'
                        ? w.status === 'RUNNING'
                        : filter === 'stopped'
                            ? w.status === 'STOPPED' || w.status === 'IDLE' || w.status === 'PENDING'
                            : filter === 'failed'
                                ? w.status === 'FAILED'
                                : true;

            const q = searchQuery.toLowerCase().trim();
            const matchesQuery = !q || w.name.toLowerCase().includes(q) || (w.templateId && w.templateId.toLowerCase().includes(q));

            return matchesFilter && matchesQuery;
        });
    }, [allWorkspaces, filter, searchQuery]);

    // Handle Tab Views (Community / Donate / Workspaces)
    if (currentTab === 'community') {
        return <CommunityTab />;
    }

    if (currentTab === 'donate') {
        return <DonateTab />;
    }

    return (
        <div className="flex flex-col w-full">
            <div className="max-w-[1440px] w-full mx-auto px-margin py-space-xl flex flex-col gap-space-xl">
                {/* Top Bar: Header Title + Primary Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-space-sm">
                            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Workspaces</h1>
                            <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-surface-container-high text-surface-tint">
                                {allWorkspaces.length} TOTAL
                            </span>
                        </div>
                        <p className="font-body-md text-body-md text-on-surface-variant">
                            Your high-performance CKB development environments and RISC-V nodes
                        </p>
                    </div>

                    <div className="flex items-center gap-space-sm">
                        <button
                            onClick={onRetry}
                            type="button"
                            className="flex items-center gap-space-xs px-space-md py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-body-sm text-body-sm shadow-sm transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">sync</span>
                            <span>Refresh</span>
                        </button>
                        <button
                            id="btn-create-modal"
                            onClick={() => setCreateOpen(true)}
                            type="button"
                            className="flex items-center gap-space-xs px-space-md py-1.5 rounded-xl bg-primary text-on-primary font-body-sm text-body-sm font-medium shadow-md shadow-primary/10 hover:bg-primary-fixed transition-all hover:scale-[1.01]"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            <span>+ New workspace</span>
                        </button>
                    </div>
                </div>

                {/* 4 Metrics Summaries */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
                    {/* Metric 1 */}
                    <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-space-sm relative overflow-hidden group">
                        <div className="flex items-center justify-between">
                            <span className="font-label-md text-label-md text-on-surface-variant">Total workspaces</span>
                            <span className="material-symbols-outlined text-[18px] text-on-surface-variant/60 group-hover:text-primary transition-colors">
                                deployed_code
                            </span>
                        </div>
                        <div className="flex items-baseline gap-space-sm">
                            <span className="font-headline-xl text-headline-xl text-on-surface font-semibold">
                                {allWorkspaces.length}
                            </span>
                            <span className="font-code-sm text-code-sm text-on-surface-variant">/ 8 allocated</span>
                        </div>
                        <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                            <div
                                className="bg-outline h-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (allWorkspaces.length / 8) * 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Metric 2 (Active/Running with Glow) */}
                    <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-space-sm relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-primary/10 rounded-full blur-xl pointer-events-none"></div>
                        <div className="flex items-center justify-between">
                            <span className="font-label-md text-label-md text-on-surface-variant">Running</span>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary"></span>
                                <span className="font-code-sm text-code-sm text-primary">Live</span>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-space-sm">
                            <span className="font-headline-xl text-headline-xl text-primary font-semibold">
                                {counts.running}
                            </span>
                            <span className="font-code-sm text-code-sm text-primary/80">Devnet Port 8114</span>
                        </div>
                        <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-500"
                                style={{ width: `${Math.min(100, counts.running * 25)}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Metric 3 */}
                    <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-space-sm relative overflow-hidden group">
                        <div className="flex items-center justify-between">
                            <span className="font-label-md text-label-md text-on-surface-variant">Starting</span>
                            <span className="material-symbols-outlined text-[18px] text-on-surface-variant/60">
                                hourglass_empty
                            </span>
                        </div>
                        <div className="flex items-baseline gap-space-sm">
                            <span className="font-headline-xl text-headline-xl text-on-surface font-semibold">
                                {counts.starting}
                            </span>
                            <span className="font-code-sm text-code-sm text-on-surface-variant">Queued: 0</span>
                        </div>
                        <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                            <div
                                className="bg-secondary h-full transition-all duration-500"
                                style={{ width: `${counts.starting > 0 ? 50 : 0}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Metric 4 */}
                    <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-space-sm relative overflow-hidden group">
                        <div className="flex items-center justify-between">
                            <span className="font-label-md text-label-md text-on-surface-variant">Needs attention</span>
                            <span className="material-symbols-outlined text-[18px] text-error">flag</span>
                        </div>
                        <div className="flex items-baseline gap-space-sm">
                            <span className="font-headline-xl text-headline-xl text-on-surface font-semibold">
                                {counts.failed}
                            </span>
                            <span className="font-code-sm text-code-sm text-on-surface-variant">1 port alert resolved</span>
                        </div>
                        <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                            <div
                                className="bg-error h-full transition-all duration-500"
                                style={{ width: `${counts.failed > 0 ? 30 : 0}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Main Content Layout: Table & Right Sidebar Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
                    {/* Primary Workspaces Column (8 cols on XL) */}
                    <div className="xl:col-span-8 flex flex-col gap-space-md">
                        {/* Filter Pills & Search Bar Controls */}
                        <div className="p-space-xs rounded-xl bg-surface-container-low flex flex-col md:flex-row items-center justify-between gap-space-sm shadow-sm">
                            {/* Filter Tabs */}
                            <div className="flex items-center gap-1 w-full md:w-auto p-1 bg-surface-container-lowest rounded-lg">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-space-md py-1 rounded-md font-body-sm text-body-sm font-medium flex items-center gap-1.5 transition-colors ${filter === 'all'
                                        ? 'bg-surface-container-high text-on-surface shadow-sm'
                                        : 'text-on-surface-variant hover:text-on-surface'
                                        }`}
                                    type="button"
                                >
                                    <span>All</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-code-sm bg-surface-container-highest text-on-surface">
                                        {counts.all}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setFilter('running')}
                                    className={`px-space-md py-1 rounded-md font-body-sm text-body-sm font-medium flex items-center gap-1.5 transition-colors ${filter === 'running'
                                        ? 'bg-surface-container-high text-on-surface shadow-sm'
                                        : 'text-on-surface-variant hover:text-on-surface'
                                        }`}
                                    type="button"
                                >
                                    <span>Running</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-code-sm bg-surface-container text-primary">
                                        {counts.running}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setFilter('stopped')}
                                    className={`px-space-md py-1 rounded-md font-body-sm text-body-sm font-medium flex items-center gap-1.5 transition-colors ${filter === 'stopped'
                                        ? 'bg-surface-container-high text-on-surface shadow-sm'
                                        : 'text-on-surface-variant hover:text-on-surface'
                                        }`}
                                    type="button"
                                >
                                    <span>Stopped</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-code-sm bg-surface-container text-on-surface-variant">
                                        {counts.stopped}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setFilter('failed')}
                                    className={`px-space-md py-1 rounded-md font-body-sm text-body-sm font-medium flex items-center gap-1.5 transition-colors ${filter === 'failed'
                                        ? 'bg-surface-container-high text-on-surface shadow-sm'
                                        : 'text-on-surface-variant hover:text-on-surface'
                                        }`}
                                    type="button"
                                >
                                    <span>Failed</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-code-sm bg-error-container/40 text-error">
                                        {counts.failed}
                                    </span>
                                </button>
                            </div>

                            {/* Search Input */}
                            <div className="relative w-full md:w-64 pr-1">
                                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                                    search
                                </span>
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-on-surface-variant/50 font-body-sm text-body-sm focus:outline-none focus:bg-surface-container transition-all"
                                    placeholder="Search workspaces..."
                                    type="text"
                                />
                            </div>
                        </div>

                        {/* Workspaces Table Container */}
                        <div className="rounded-xl bg-surface-container-low shadow-sm overflow-hidden flex flex-col border border-outline-variant/30">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-surface-container-lowest/60 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                                            <th className="py-space-md px-space-lg font-medium">Name</th>
                                            <th className="py-space-md px-space-md font-medium">Template / Type</th>
                                            <th className="py-space-md px-space-md font-medium">Status</th>
                                            <th className="py-space-md px-space-md font-medium hidden sm:table-cell">Last Active</th>
                                            <th className="py-space-md px-space-md font-medium hidden lg:table-cell">Created</th>
                                            <th className="py-space-md px-space-lg text-right font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-container/60 font-body-sm text-body-sm">
                                        {filteredWorkspaces.map((ws) => {
                                            const isRunning = ws.status === 'RUNNING';
                                            const isStarting =
                                                ws.status === 'PROVISIONING' || startingWorkspaceId === ws.id;
                                            const isStopping = stoppingWorkspaceId === ws.id;
                                            const isDeleting = removingWorkspaceId === ws.id;
                                            const isFailed = ws.status === 'FAILED';

                                            const initials = ws.name
                                                .split(/[\s-_]+/)
                                                .slice(0, 2)
                                                .map((w) => w[0]?.toUpperCase())
                                                .join('') || 'WS';

                                            const templateType =
                                                ws.templateId === 'c-native'
                                                    ? 'C Script / Native CKB'
                                                    : ws.templateId === 'spore'
                                                        ? 'TypeScript / Off-chain SDK'
                                                        : ws.templateId === 'standalone'
                                                            ? 'Rust / Standalone Devnet'
                                                            : 'Rust / Capsule Smart Contract';

                                            const subName =
                                                ws.templateId === 'c-native'
                                                    ? 'ckb-c-script'
                                                    : ws.templateId === 'spore'
                                                        ? 'spore-sdk-node'
                                                        : ws.templateId === 'standalone'
                                                            ? 'standalone-ckb-devnet'
                                                            : 'ckb-capsule-rs';

                                            return (
                                                <tr
                                                    key={ws.id}
                                                    onClick={() => onOpenWorkspace(ws.id)}
                                                    className="group hover:bg-surface-container-high/40 transition-colors cursor-pointer"
                                                >
                                                    <td className="py-space-md px-space-lg">
                                                        <div className="flex items-center gap-space-sm">
                                                            <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center font-code-sm text-code-sm font-semibold text-primary">
                                                                {initials}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-headline-sm text-headline-sm text-on-surface font-medium hover:text-primary transition-colors">
                                                                    {ws.name}
                                                                </span>
                                                                <span className="font-code-sm text-code-sm text-on-surface-variant">
                                                                    {subName}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-space-md px-space-md">
                                                        <div className="flex items-center gap-1.5 text-on-surface">
                                                            <span
                                                                className={`w-2 h-2 rounded-full ${isRunning
                                                                    ? 'bg-primary-container'
                                                                    : isFailed
                                                                        ? 'bg-error'
                                                                        : 'bg-outline'
                                                                    }`}
                                                            ></span>
                                                            <span className="font-body-sm text-body-sm">{templateType}</span>
                                                        </div>
                                                    </td>

                                                    <td className="py-space-md px-space-md">
                                                        {isRunning ? (
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container font-code-sm text-code-sm text-primary">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                                                <span>Running (Devnet port 8114)</span>
                                                            </div>
                                                        ) : isStarting ? (
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container font-code-sm text-code-sm text-secondary">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
                                                                <span>Starting...</span>
                                                            </div>
                                                        ) : isFailed ? (
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container/30 font-code-sm text-code-sm text-error">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                                                                <span>Failed (Port conflict)</span>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-highest/60 font-code-sm text-code-sm text-on-surface-variant">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                                                                <span>Stopped</span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="py-space-md px-space-md hidden sm:table-cell text-on-surface-variant font-code-sm text-code-sm">
                                                        {isRunning ? 'Active now' : '5h ago'}
                                                    </td>

                                                    <td className="py-space-md px-space-md hidden lg:table-cell text-on-surface-variant font-code-sm text-code-sm">
                                                        28 Sept 2026
                                                    </td>

                                                    <td className="py-space-md px-space-lg text-right" onClick={(e) => e.stopPropagation()}>
                                                        <div className="inline-flex items-center gap-1 justify-end">
                                                            {isRunning ? (
                                                                <button
                                                                    onClick={() => onStopWorkspace(ws.id)}
                                                                    disabled={isStopping}
                                                                    className="w-7 h-7 rounded-md flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors disabled:opacity-50"
                                                                    title="Stop Workspace"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">stop</span>
                                                                </button>
                                                            ) : isFailed ? (
                                                                <button
                                                                    onClick={() => onStartWorkspace(ws.id)}
                                                                    disabled={isStarting}
                                                                    className="w-7 h-7 rounded-md flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors disabled:opacity-50"
                                                                    title="Retry Boot"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => onStartWorkspace(ws.id)}
                                                                    disabled={isStarting}
                                                                    className="w-7 h-7 rounded-md flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors disabled:opacity-50"
                                                                    title="Start Workspace"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => onOpenWorkspace(ws.id)}
                                                                className="w-7 h-7 rounded-md flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-surface-container transition-colors"
                                                                title="Open Terminal"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">terminal</span>
                                                            </button>

                                                            <button
                                                                onClick={() => setToRemove(ws)}
                                                                disabled={isDeleting}
                                                                className="w-7 h-7 rounded-md flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors disabled:opacity-50"
                                                                title="Delete Workspace"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                            </button>

                                                            <button
                                                                onClick={() => onOpenWorkspace(ws.id)}
                                                                className="px-2 py-1 rounded-md bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface font-body-sm text-body-sm flex items-center gap-1 transition-all"
                                                                title="Open in IDE"
                                                            >
                                                                <span>Open</span>
                                                                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bottom Table Stats & Quick Link */}
                            <div className="p-space-md bg-surface-container-lowest/80 flex flex-col sm:flex-row items-center justify-between gap-space-sm text-on-surface-variant font-body-sm text-body-sm border-t border-outline-variant/20">
                                <div className="flex items-center gap-space-sm">
                                    <span className="material-symbols-outlined text-[16px] text-surface-tint">info</span>
                                    <span>Workspaces auto-hibernate after 30 minutes of idle terminal sessions.</span>
                                </div>
                                <a
                                    className="text-primary hover:underline font-body-sm text-body-sm flex items-center gap-1"
                                    href="#storage"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        alert('Storage quota: 12.8 GB / 50.0 GB utilized across all CKB devnet containers.');
                                    }}
                                >
                                    <span>View storage allocation</span>
                                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                </a>
                            </div>
                        </div>

                        {/* Featured RISC-V Sandbox Preview Banner */}
                        <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md relative overflow-hidden border border-outline-variant/30">
                            <div className="flex items-start gap-space-md z-10">
                                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-secondary shrink-0">
                                    <span className="material-symbols-outlined text-[24px]">memory</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                                        Native CKB-VM Execution Sandbox
                                    </h4>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                                        Debug your RISC-V binary cycles directly in the browser with deterministic cycle counters.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (workspaces[0]) onOpenWorkspace(workspaces[0].id);
                                }}
                                className="shrink-0 px-space-md py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary font-body-sm text-body-sm transition-colors flex items-center gap-1 z-10 shadow-sm"
                                type="button"
                            >
                                <span>Launch Cycle Profiler</span>
                                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            </button>
                        </div>
                    </div>

                    {/* Right Column Sidebar (4 cols on XL) */}
                    <div className="xl:col-span-4 flex flex-col gap-space-md">
                        {/* Devnet Resource Usage Widget */}
                        <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-space-md border border-outline-variant/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-space-xs">
                                    <span className="material-symbols-outlined text-[18px] text-secondary">speed</span>
                                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-medium">Devnet Resource Usage</h3>
                                </div>
                                <span className="font-code-sm text-code-sm text-primary">v0.114.0-rc</span>
                            </div>

                            <div className="flex flex-col gap-space-sm">
                                {/* CPU Indicator */}
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between font-label-sm text-label-sm">
                                        <span className="text-on-surface-variant">CPU Usage</span>
                                        <span className="font-code-sm text-code-sm text-on-surface">18% (2 Cores)</span>
                                    </div>
                                    <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-secondary h-full w-[18%] rounded-full"></div>
                                    </div>
                                </div>

                                {/* RAM Indicator */}
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between font-label-sm text-label-sm">
                                        <span className="text-on-surface-variant">RAM Allocation</span>
                                        <span className="font-code-sm text-code-sm text-on-surface">1.4 GB / 4.0 GB</span>
                                    </div>
                                    <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-primary h-full w-[35%] rounded-full"></div>
                                    </div>
                                </div>

                                {/* SVG Sparkline for Block Heights */}
                                <div className="pt-2 flex flex-col gap-1">
                                    <div className="flex justify-between items-baseline font-label-sm text-label-sm">
                                        <span className="text-on-surface-variant">Block Production Rate</span>
                                        <span className="font-code-sm text-code-sm text-on-surface">#1,204,912</span>
                                    </div>
                                    <div className="w-full h-12 bg-surface-container-lowest/80 rounded-lg p-1.5 flex items-center justify-center">
                                        <svg className="w-full h-full text-primary" fill="none" preserveAspectRatio="none" viewBox="0 0 100 24">
                                            <path
                                                d="M0 18 Q 15 12, 30 15 T 60 8 T 85 14 T 100 6"
                                                stroke="currentColor"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="1.5"
                                            ></path>
                                            <path
                                                d="M0 18 Q 15 12, 30 15 T 60 8 T 85 14 T 100 6 L 100 24 L 0 24 Z"
                                                fill="currentColor"
                                                fillOpacity="0.08"
                                            ></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Feed Card */}
                        <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-space-md border border-outline-variant/30">
                            <div className="flex items-center justify-between">
                                <h3 className="font-headline-sm text-headline-sm text-on-surface font-medium flex items-center gap-space-xs">
                                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">history</span>
                                    <span>Recent Activity</span>
                                </h3>
                                <button
                                    onClick={() => setRecentActivities([])}
                                    className="text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm transition-colors"
                                    type="button"
                                >
                                    Clear
                                </button>
                            </div>

                            {/* Timeline List */}
                            <div className="flex flex-col gap-space-md">
                                {recentActivities.map((act) => (
                                    <div key={act.id} className="flex items-start gap-space-sm">
                                        <div className={`w-2 h-2 mt-1.5 rounded-full ${act.dot} shrink-0`}></div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-body-sm text-body-sm text-on-surface font-medium">{act.title}</span>
                                            <span className="font-code-sm text-code-sm text-on-surface-variant">{act.desc}</span>
                                            <span className="font-label-sm text-label-sm text-outline">{act.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Informational 'How workspaces work' Card */}
                        <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-space-md border border-outline-variant/30">
                            <div className="flex items-center gap-space-xs">
                                <span className="material-symbols-outlined text-[18px] text-tertiary">lightbulb</span>
                                <h3 className="font-headline-sm text-headline-sm text-on-surface font-medium">How Workspaces Work</h3>
                            </div>
                            <ul className="flex flex-col gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
                                <li className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">check_circle</span>
                                    <span>
                                        <strong className="text-on-surface font-medium">Sub-second boot:</strong> Pre-cached Rust & Clang toolchains allow instantaneous runtime setup.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">check_circle</span>
                                    <span>
                                        <strong className="text-on-surface font-medium">Inactivity timeouts:</strong> Stopped containers keep disk state intact but pause CPU consumption.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">check_circle</span>
                                    <span>
                                        <strong className="text-on-surface font-medium">Isolated devnet:</strong> Each environment runs a private genesis block with unlimited test CKB faucets.
                                    </span>
                                </li>
                            </ul>
                            <div className="pt-space-xs">
                                <a
                                    className="font-body-sm text-body-sm text-secondary hover:underline flex items-center gap-1"
                                    href={DOCS_URL}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                >
                                    <span>Read CKB workspace manual</span>
                                    <span className="material-symbols-outlined text-[14px]">launch</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Workspace Modal */}
            <CreateWorkspaceModal
                isOpen={isCreateOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={(newWs) => {
                    setCreateOpen(false);
                    onOpenWorkspace(newWs.id);
                }}
            />

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                isOpen={Boolean(toRemove)}
                title="Delete Workspace"
                description={`Are you sure you want to delete "${toRemove?.name}"? All files, containers, and devnet state will be deleted.`}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => {
                    if (toRemove) {
                        onRemoveWorkspace(toRemove.id);
                        setToRemove(null);
                    }
                }}
                onClose={() => setToRemove(null)}
            />
        </div>
    );
}
