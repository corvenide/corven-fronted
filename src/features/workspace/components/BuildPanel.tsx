// src/features/workspace/components/BuildPanel.tsx
'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
    Hammer,
    Play,
    RotateCcw,
    XCircle,
    CheckCircle2,
    LoaderCircle,
    AlertCircle,
    Clock3,
    FolderOpen,
    ChevronDown,
    Check,
    Folder,
    RefreshCw,
} from 'lucide-react';

import { AskClaudeButton } from '../../ai/components/AskClaudeButton';
import { useWorkspaceBuild } from '../hooks/useWorkspaceBuild';
import { useWorkspaceFiles } from '../hooks/useWorkspaceFiles';

interface BuildPanelProps {
    workspaceId: string;
}

function formatDuration(durationMs?: number): string {
    if (durationMs === undefined) return '—';
    if (durationMs < 1000) return `${Math.round(durationMs)} ms`;
    return `${(durationMs / 1000).toFixed(2)} s`;
}

function getStatusIcon(status: 'idle' | 'running' | 'success' | 'error' | 'cancelled') {
    switch (status) {
        case 'running':
            return <LoaderCircle className="h-3.5 w-3.5 animate-spin text-blue-400" />;
        case 'success':
            return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
        case 'error':
            return <XCircle className="h-3.5 w-3.5 text-red-400" />;
        case 'cancelled':
            return <AlertCircle className="h-3.5 w-3.5 text-amber-400" />;
        default:
            return <Hammer className="h-3.5 w-3.5 text-gray-500" />;
    }
}

function getStatusText(status: 'idle' | 'running' | 'success' | 'error' | 'cancelled'): string {
    switch (status) {
        case 'running':
            return 'Building...';
        case 'success':
            return 'Build succeeded';
        case 'error':
            return 'Build failed';
        case 'cancelled':
            return 'Build cancelled';
        default:
            return 'Ready to build';
    }
}

function getStatusColor(status: 'idle' | 'running' | 'success' | 'error' | 'cancelled'): string {
    switch (status) {
        case 'running':
            return 'text-blue-400';
        case 'success':
            return 'text-emerald-400';
        case 'error':
            return 'text-red-400';
        case 'cancelled':
            return 'text-amber-400';
        default:
            return 'text-gray-500';
    }
}

export function BuildPanel({ workspaceId }: BuildPanelProps) {
    const build = useWorkspaceBuild(workspaceId);
    const files = useWorkspaceFiles(workspaceId);
    const [isBuildOptionsOpen, setIsBuildOptionsOpen] = useState(false);
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const projectDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsBuildOptionsOpen(false);
            }
            if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
                setIsProjectDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hasResults = build.history.length > 0 || build.currentOutput;

    const handleBuild = useCallback(() => {
        build.buildProject();
    }, [build]);

    const handleCancelBuild = useCallback(() => {
        build.cancelBuild();
    }, [build]);

    const handleClear = useCallback(() => {
        build.clearHistory();
    }, [build]);

    const buildTargets = ['Default Build', 'Release', 'Debug'];

    // Get directories from workspace files (first level directories)
    const directories = useMemo(() => {
        if (!files.entries || files.entries.length === 0) return [];

        // Filter only directories and get unique root directories
        const dirSet = new Set<string>();
        const result: { name: string; path: string; count: number }[] = [];

        files.entries.forEach(entry => {
            if (entry.type === 'directory') {
                // Get the first segment of the path (root directory)
                const pathParts = entry.path.split('/');
                const rootDir = pathParts[0];

                if (rootDir && !dirSet.has(rootDir)) {
                    dirSet.add(rootDir);
                    // Count items in this directory
                    const itemCount = files.entries.filter(e =>
                        e.path.startsWith(rootDir + '/') || e.path === rootDir
                    ).length;

                    result.push({
                        name: rootDir,
                        path: rootDir,
                        count: itemCount
                    });
                }
            }
        });

        return result.slice(0, 10); // Show first 10 directories
    }, [files.entries]);

    const handleProjectSelect = (project: string) => {
        build.setProjectPath(project);
        setIsProjectDropdownOpen(false);
    };

    const getProjectDisplayName = (project: string) => {
        if (project === '.') return 'Workspace Root';
        return project;
    };

    const getProjectIcon = (project: string) => {
        if (project === '.') return <Folder className="h-3.5 w-3.5 text-[#58a6ff]" />;
        return <FolderOpen className="h-3.5 w-3.5 text-[#58a6ff]" />;
    };

    return (
        <section className="flex h-full min-h-0 flex-col bg-[#0d1117]">
            {/* Header */}
            <header className="flex h-10 shrink-0 items-center justify-between border-b border-[#30363d] px-3">
                <div className="flex items-center gap-2">
                    <Hammer className="h-4 w-4 text-[#58a6ff]" />
                    <span className="text-xs font-semibold text-gray-200">
                        Build
                    </span>
                    {build.isBuilding && (
                        <span className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300">
                            <LoaderCircle className="h-3 w-3 animate-spin" />
                            Building
                        </span>
                    )}
                    {/* Show project count badge */}
                    {build.projects.length > 1 && !build.loadingProjects && (
                        <span className="rounded-full bg-[#21262d] px-2 py-0.5 text-[9px] text-gray-400">
                            {build.projects.length - 1} projects
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {build.isBuilding ? (
                        <button
                            type="button"
                            onClick={handleCancelBuild}
                            className="flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-300 transition hover:bg-red-500/20"
                        >
                            <XCircle className="h-3.5 w-3.5" />
                            Cancel
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleBuild}
                            className="flex items-center gap-1.5 rounded bg-[#238636] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#2ea043]"
                        >
                            {hasResults ? (
                                <RotateCcw className="h-3.5 w-3.5" />
                            ) : (
                                <Play className="h-3.5 w-3.5 fill-current" />
                            )}
                            {hasResults ? 'Rebuild' : 'Build Project'}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={build.isBuilding || !hasResults}
                        title="Clear build output"
                        className="rounded p-1.5 text-gray-500 transition hover:bg-[#21262d] hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                </div>
            </header>

            {/* ─── Project selector dropdown ─── */}
            <div className="flex shrink-0 items-center gap-2 border-b border-[#30363d] px-3 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                    Project:
                </span>
                <div className="relative flex-1" ref={projectDropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                        className="flex w-full items-center justify-between rounded border border-[#30363d] bg-[#0d1117] px-2 py-0.5 text-xs text-gray-200 transition hover:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff]"
                        disabled={build.loadingProjects || build.isBuilding}
                    >
                        <span className="flex items-center gap-1.5">
                            {getProjectIcon(build.projectPath)}
                            <span className="truncate">
                                {getProjectDisplayName(build.projectPath)}
                            </span>
                            {build.loadingProjects && (
                                <LoaderCircle className="ml-1 h-3 w-3 animate-spin text-gray-500" />
                            )}
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-200 ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isProjectDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded border border-[#30363d] bg-[#0d1117] py-1 shadow-xl">
                            {build.loadingProjects ? (
                                <div className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-gray-500">
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                    Loading projects...
                                </div>
                            ) : build.projects.length === 0 ? (
                                <div className="px-3 py-4 text-center text-xs text-gray-500">
                                    <Folder className="mx-auto mb-1 h-8 w-8 text-gray-600" />
                                    No projects found
                                </div>
                            ) : (
                                <>
                                    {/* Project list header */}
                                    <div className="border-b border-[#21262d] px-3 py-1.5 text-[9px] uppercase tracking-wider text-gray-600">
                                        {build.projects.length - 1} project{build.projects.length - 1 !== 1 ? 's' : ''} available
                                    </div>

                                    {build.projects.map((project) => {
                                        const isSelected = build.projectPath === project;
                                        return (
                                            <button
                                                key={project}
                                                type="button"
                                                onClick={() => handleProjectSelect(project)}
                                                className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition ${isSelected
                                                        ? 'bg-[#1c2333] text-[#58a6ff]'
                                                        : 'text-gray-300 hover:bg-[#21262d]'
                                                    }`}
                                            >
                                                {getProjectIcon(project)}
                                                <span className="flex-1 truncate text-left">
                                                    {getProjectDisplayName(project)}
                                                </span>
                                                {isSelected && (
                                                    <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#58a6ff]" />
                                                )}
                                                {project === '.' && (
                                                    <span className="rounded bg-[#21262d] px-1.5 py-0.5 text-[8px] text-gray-500">
                                                        root
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Refresh button */}
                <button
                    type="button"
                    onClick={build.refreshProjects}
                    disabled={build.loadingProjects}
                    className="rounded p-1 text-gray-500 transition hover:bg-[#21262d] hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Refresh project list"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${build.loadingProjects ? 'animate-spin' : ''}`} />
                </button>

                {/* Current project indicator */}
                {build.projectPath !== '.' && (
                    <span className="hidden rounded bg-[#1c2333] px-2 py-0.5 text-[9px] text-[#58a6ff] sm:inline-block">
                        {build.projectPath}
                    </span>
                )}
            </div>

            {/* ─── Workspace Directories ─── */}
            <div className="flex shrink-0 items-center gap-2 border-b border-[#30363d] px-3 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                    Directories:
                </span>
                {files.isLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <LoaderCircle className="h-3 w-3 animate-spin" />
                        Loading...
                    </div>
                ) : directories.length === 0 ? (
                    <span className="text-xs text-gray-500">No directories found</span>
                ) : (
                    <div className="flex flex-wrap items-center gap-1">
                        {directories.map((dir) => (
                            <button
                                key={dir.path}
                                type="button"
                                onClick={() => handleProjectSelect(dir.path)}
                                className="flex items-center gap-1 rounded bg-[#21262d] px-2 py-0.5 text-xs text-gray-300 transition hover:bg-[#30363d] hover:text-white"
                                title={`${dir.count} items in ${dir.name}`}
                            >
                                <Folder className="h-3 w-3 text-[#58a6ff]" />
                                <span>{dir.name}</span>
                                <span className="text-[9px] text-gray-500">({dir.count})</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Build Options - Target */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#30363d] px-3 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                    Target:
                </span>
                <div className="relative flex-1 min-w-[120px]" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsBuildOptionsOpen(!isBuildOptionsOpen)}
                        className="flex w-full items-center justify-between rounded border border-[#30363d] bg-[#0d1117] px-2 py-0.5 text-xs text-gray-200 transition hover:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff]"
                        disabled={build.isBuilding}
                    >
                        <span className="flex items-center gap-1.5">
                            <Hammer className="h-3.5 w-3.5 text-[#58a6ff]" />
                            <span className="truncate">
                                {build.buildTarget || 'Default Build'}
                            </span>
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-200 ${isBuildOptionsOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isBuildOptionsOpen && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded border border-[#30363d] bg-[#0d1117] py-1 shadow-xl">
                            <div className="border-b border-[#21262d] px-3 py-1.5 text-[9px] uppercase tracking-wider text-gray-600">
                                Build Targets
                            </div>

                            {buildTargets.map((target) => {
                                const isSelected = build.buildTarget === target;
                                return (
                                    <button
                                        key={target}
                                        type="button"
                                        onClick={() => {
                                            build.setBuildTarget(target);
                                            setIsBuildOptionsOpen(false);
                                        }}
                                        className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition ${isSelected
                                                ? 'bg-[#1c2333] text-[#58a6ff]'
                                                : 'text-gray-300 hover:bg-[#21262d]'
                                            }`}
                                    >
                                        <Hammer className="h-3.5 w-3.5" />
                                        <span className="flex-1 truncate text-left">
                                            {target}
                                        </span>
                                        {isSelected && (
                                            <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#58a6ff]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Current build status indicator */}
                <span className={`text-[10px] ${getStatusColor(build.status)}`}>
                    {getStatusText(build.status)}
                </span>
            </div>

            {/* Main content */}
            {!hasResults && !build.isBuilding ? (
                <EmptyBuildState onBuild={handleBuild} />
            ) : (
                <div className="grid min-h-0 flex-1 grid-cols-[minmax(240px,36%)_1fr]">
                    {/* Build History */}
                    <div className="min-h-0 overflow-y-auto border-r border-[#30363d]">
                        <BuildSummary
                            status={build.status}
                            durationMs={build.duration}
                            error={build.error}
                            outputCount={build.history.length}
                            projectPath={build.projectPath}
                        />

                        <div className="border-t border-[#30363d]">
                            {build.history.length === 0 && !build.currentOutput ? (
                                <div className="px-4 py-6 text-center text-xs text-gray-600">
                                    Waiting for build results...
                                </div>
                            ) : (
                                build.history.slice().reverse().map((entry, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-2 border-b border-[#21262d] px-3 py-2.5"
                                    >
                                        {getStatusIcon(entry.status)}
                                        <div className="min-w-0 flex-1">
                                            <p className="break-all font-mono text-[11px] text-gray-300">
                                                Build #{build.history.length - index}
                                            </p>
                                            <p className="text-[10px] text-gray-500">
                                                {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}
                                                {entry.durationMs && ` · ${formatDuration(entry.durationMs)}`}
                                                {entry.projectPath && entry.projectPath !== '.' && (
                                                    <span className="ml-1 text-[9px] text-[#58a6ff]">
                                                        in {entry.projectPath}
                                                    </span>
                                                )}
                                            </p>
                                            {entry.error && (
                                                <p className="mt-1 text-[10px] text-red-400 truncate">
                                                    {entry.error}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Build Output */}
                    <div className="flex min-h-0 flex-col">
                        <div className="flex h-8 shrink-0 items-center justify-between border-b border-[#30363d] px-3">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                Build Output
                            </span>
                            <div className="flex items-center gap-2">
                                {/* Show current project in output header */}
                                {build.projectPath !== '.' && (
                                    <span className="flex items-center gap-1 rounded bg-[#1c2333] px-2 py-0.5 text-[9px] text-[#58a6ff]">
                                        <FolderOpen className="h-3 w-3" />
                                        {build.projectPath}
                                    </span>
                                )}
                                {build.status === 'error' && (
                                    <AskClaudeButton
                                        kind="build"
                                        prompt="My build failed. What is the error and how do I fix it?"
                                        output={build.currentOutput || build.history[build.history.length - 1]?.output || build.error || ''}
                                    />
                                )}
                                <span className="font-mono text-[10px] text-gray-600">
                                    {build.buildTarget === 'Release' ? 'make build-release' :
                                        build.buildTarget === 'Debug' ? 'make build-debug' :
                                            'make build'}
                                </span>
                            </div>
                        </div>
                        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-5 text-gray-300">
                            {build.currentOutput || build.history[build.history.length - 1]?.output || 'Preparing build...'}
                        </pre>
                    </div>
                </div>
            )}
        </section>
    );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

interface BuildSummaryProps {
    status: 'idle' | 'running' | 'success' | 'error' | 'cancelled';
    durationMs?: number;
    error?: string | null;
    outputCount: number;
    projectPath: string;
}

function BuildSummary({ status, durationMs, error, outputCount, projectPath }: BuildSummaryProps) {
    return (
        <div className="grid grid-cols-2 gap-2 p-3">
            <SummaryCard
                label="Status"
                value={getStatusText(status)}
                icon={getStatusIcon(status)}
                className={getStatusColor(status)}
            />
            <SummaryCard
                label="Duration"
                value={formatDuration(durationMs)}
                icon={<Clock3 className="h-3.5 w-3.5 text-blue-400" />}
            />
            <SummaryCard
                label="Builds"
                value={outputCount}
                icon={<Hammer className="h-3.5 w-3.5 text-gray-400" />}
            />
            <SummaryCard
                label="Project"
                value={projectPath === '.' ? 'Root' : projectPath}
                icon={<FolderOpen className="h-3.5 w-3.5 text-[#58a6ff]" />}
            />
            <div className="col-span-2 rounded border border-[#30363d] bg-[#161b22] px-3 py-2">
                <span className="text-[10px] uppercase tracking-wide text-gray-600">Status</span>
                <p className={`mt-1 text-xs font-medium capitalize ${getStatusColor(status)}`}>
                    {getStatusText(status)}
                </p>
            </div>
            {error && (
                <div className="col-span-2 rounded border border-red-900/50 bg-red-950/30 px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wide text-red-400">Error</span>
                    <p className="mt-1 text-xs text-red-300">{error}</p>
                </div>
            )}
        </div>
    );
}

interface SummaryCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    className?: string;
}

function SummaryCard({ label, value, icon, className = '' }: SummaryCardProps) {
    return (
        <div className="rounded border border-[#30363d] bg-[#161b22] px-3 py-2">
            <div className="flex items-center gap-1.5">
                {icon}
                <span className="text-[10px] uppercase tracking-wide text-gray-600">{label}</span>
            </div>
            <p className={`mt-1 font-mono text-sm font-semibold ${className || 'text-gray-200'}`}>
                {value}
            </p>
        </div>
    );
}

function EmptyBuildState({ onBuild }: { onBuild: () => void }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#30363d] bg-[#161b22]">
                <Hammer className="h-5 w-5 text-[#58a6ff]" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-gray-200">Build your CKB contracts</h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-gray-500">
                Build the workspace project without entering commands in the terminal.
                Build logs and results will appear here in real time.
            </p>
            <button
                type="button"
                onClick={onBuild}
                className="mt-4 flex items-center gap-2 rounded bg-[#238636] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#2ea043]"
            >
                <Play className="h-3.5 w-3.5 fill-current" />
                Build Project
            </button>
        </div>
    );
}