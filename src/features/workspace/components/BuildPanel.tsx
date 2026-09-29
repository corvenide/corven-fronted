// src/features/workspace/components/BuildPanel.tsx
'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
            return <LoaderCircle className="h-3 w-3 animate-spin text-secondary" />;
        case 'success':
            return <CheckCircle2 className="h-3 w-3 text-primary" />;
        case 'error':
            return <XCircle className="h-3 w-3 text-error" />;
        case 'cancelled':
            return <AlertCircle className="h-3 w-3 text-amber-400" />;
        default:
            return <Hammer className="h-3 w-3 text-on-surface-variant" />;
    }
}

function getStatusText(status: 'idle' | 'running' | 'success' | 'error' | 'cancelled'): string {
    switch (status) {
        case 'running':
            return 'Building';
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
            return 'text-secondary';
        case 'success':
            return 'text-primary';
        case 'error':
            return 'text-error';
        case 'cancelled':
            return 'text-amber-400';
        default:
            return 'text-on-surface-variant';
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

    const hasResults = build.history.length > 0 || Boolean(build.currentOutput);

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

        const dirSet = new Set<string>();
        const result: { name: string; path: string; count: number }[] = [];

        files.entries.forEach(entry => {
            if (entry.type === 'directory') {
                const pathParts = entry.path.split('/');
                const rootDir = pathParts[0];

                if (rootDir && !dirSet.has(rootDir)) {
                    dirSet.add(rootDir);
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

        return result.slice(0, 10);
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
        if (project === '.') return <Folder className="h-3 w-3 text-secondary" />;
        return <FolderOpen className="h-3 w-3 text-secondary" />;
    };

    return (
        <section className="flex h-full min-h-0 flex-col bg-surface-container-lowest">
            {/* Header */}
            <header className="flex h-8 shrink-0 items-center justify-between border-b border-outline-variant/30 bg-surface-container px-3">
                <div className="flex items-center gap-2 font-mono text-[10.5px]">
                    <Hammer className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold uppercase tracking-wider text-on-surface">
                        Build
                    </span>
                    {build.isBuilding && (
                        <span className="flex items-center gap-1 text-[10px] text-secondary">
                            <span className="text-on-surface-variant/40">·</span>
                            <LoaderCircle className="h-2.5 w-2.5 animate-spin" />
                            <span>Building</span>
                        </span>
                    )}
                    {build.projects.length > 1 && !build.loadingProjects && (
                        <span className="text-[10px] text-on-surface-variant">
                            <span className="text-on-surface-variant/40">·</span> {build.projects.length - 1} subproject{build.projects.length - 1 !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    {build.isBuilding ? (
                        <button
                            type="button"
                            onClick={handleCancelBuild}
                            className="flex items-center gap-1 rounded border border-error/30 bg-error/10 px-2 py-0.5 text-[10.5px] font-mono text-error transition hover:bg-error/20"
                        >
                            <XCircle className="h-3 w-3" />
                            Cancel
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleBuild}
                            className="flex items-center gap-1 rounded bg-primary px-2.5 py-0.5 text-[10.5px] font-mono font-medium text-on-primary transition hover:bg-primary-fixed"
                        >
                            {hasResults ? (
                                <RotateCcw className="h-3 w-3" />
                            ) : (
                                <Play className="h-3 w-3 fill-current" />
                            )}
                            {hasResults ? 'Rebuild' : 'Build'}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={build.isBuilding || !hasResults}
                        title="Clear build output"
                        className="rounded p-1 text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <RotateCcw className="h-3 w-3" />
                    </button>
                </div>
            </header>

            {/* Project & Target Controls Bar */}
            <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-outline-variant/20 bg-surface-container/60 px-3 py-1 font-mono text-[10.5px]">
                {/* Project selector */}
                <div className="flex items-center gap-1.5" ref={projectDropdownRef}>
                    <span className="text-[9.5px] uppercase tracking-wider text-on-surface-variant/70">
                        Project:
                    </span>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                            className="flex items-center gap-1.5 rounded border border-outline-variant/30 bg-surface px-2 py-0.5 text-on-surface transition hover:border-secondary focus:outline-none"
                            disabled={build.loadingProjects || build.isBuilding}
                        >
                            {getProjectIcon(build.projectPath)}
                            <span className="max-w-[140px] truncate">
                                {getProjectDisplayName(build.projectPath)}
                            </span>
                            {build.loadingProjects && (
                                <LoaderCircle className="h-2.5 w-2.5 animate-spin text-on-surface-variant" />
                            )}
                            <ChevronDown className={`h-3 w-3 text-on-surface-variant transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isProjectDropdownOpen && (
                            <div className="absolute left-0 top-full z-20 mt-1 max-h-56 min-w-[200px] overflow-y-auto rounded border border-outline-variant/40 bg-surface-container-high py-1 shadow-2xl">
                                {build.loadingProjects ? (
                                    <div className="flex items-center justify-center gap-1.5 px-3 py-3 text-[10.5px] text-on-surface-variant">
                                        <LoaderCircle className="h-3 w-3 animate-spin" />
                                        Loading projects...
                                    </div>
                                ) : build.projects.length === 0 ? (
                                    <div className="px-3 py-3 text-center text-[10.5px] text-on-surface-variant">
                                        No projects found
                                    </div>
                                ) : (
                                    // build.projects.map((project) => {
                                    //     const isSelected = build.projectPath === project;
                                    //     return (
                                    //         <button
                                    //             key={project}
                                    //             type="button"
                                    //             onClick={() => handleProjectSelect(project)}
                                    //             className={`flex w-full items-center gap-1.5 px-2.5 py-1.5 text-[10.5px] font-mono transition text-left ${isSelected
                                    //                 ? 'bg-primary/10 text-primary'
                                    //                 : 'text-on-surface hover:bg-surface-container'
                                    //                 }`}
                                    //         >
                                    //             {getProjectIcon(project)}
                                    //             <span className="flex-1 truncate">
                                    //                 {getProjectDisplayName(project)}
                                    //             </span>
                                    //             {isSelected && (
                                    //                 <Check className="h-3 w-3 text-primary shrink-0" />
                                    //             )}
                                    //         </button>
                                    //     );
                                    // })
                                    directories.map((d: any) => {
                                            const isSelected = build.projectPath === d.name;
                                            return (
                                                <button
                                                    key={d.name}
                                                    type="button"
                                                    onClick={() => handleProjectSelect(d.path)}
                                                    className={`flex w-full items-center gap-1.5 px-2.5 py-1.5 text-[10.5px] font-mono transition text-left ${isSelected
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'text-on-surface hover:bg-surface-container'
                                                        }`}
                                                >
                                                    {getProjectIcon(d.path)}
                                                    <span className="flex-1 truncate">
                                                        {getProjectDisplayName(d.name)}
                                                    </span>
                                                    {isSelected && (
                                                        <Check className="h-3 w-3 text-primary shrink-0" />
                                                    )}
                                                </button>
                                            );
                                        })
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Target selector */}
                <div className="flex items-center gap-1.5" ref={dropdownRef}>
                    <span className="text-[9.5px] uppercase tracking-wider text-on-surface-variant/70">
                        Target:
                    </span>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsBuildOptionsOpen(!isBuildOptionsOpen)}
                            className="flex items-center gap-1.5 rounded border border-outline-variant/30 bg-surface px-2 py-0.5 text-on-surface transition hover:border-secondary focus:outline-none"
                            disabled={build.isBuilding}
                        >
                            <span>{build.buildTarget || 'Default Build'}</span>
                            <ChevronDown className={`h-3 w-3 text-on-surface-variant transition-transform ${isBuildOptionsOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isBuildOptionsOpen && (
                            <div className="absolute left-0 top-full z-20 mt-1 min-w-[140px] overflow-hidden rounded border border-outline-variant/40 bg-surface-container-high py-1 shadow-2xl">
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
                                            className={`flex w-full items-center gap-1.5 px-2.5 py-1.5 text-[10.5px] font-mono transition text-left ${isSelected
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-on-surface hover:bg-surface-container'
                                                }`}
                                        >
                                            <span className="flex-1 truncate">{target}</span>
                                            {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Status text */}
                <div className="ml-auto flex items-center gap-1.5">
                    <span className={`text-[10px] font-medium ${getStatusColor(build.status)}`}>
                        {getStatusText(build.status)}
                    </span>
                </div>
            </div>

            {/* Main content */}
            {!hasResults && !build.isBuilding ? (
                <EmptyBuildState onBuild={handleBuild} />
            ) : (
                <div className="grid min-h-0 flex-1 grid-cols-[minmax(220px,32%)_1fr]">
                    {/* Build History */}
                    <div className="min-h-0 overflow-y-auto border-r border-outline-variant/30">
                        <BuildSummary
                            status={build.status}
                            durationMs={build.duration}
                            error={build.error}
                            outputCount={build.history.length}
                            projectPath={build.projectPath}
                        />

                        <div className="border-t border-outline-variant/20">
                            {build.history.length === 0 && !build.currentOutput ? (
                                <div className="px-3 py-5 text-center font-mono text-[10.5px] text-on-surface-variant/60">
                                    Waiting for build output...
                                </div>
                            ) : (
                                build.history.slice().reverse().map((entry, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-2 border-b border-outline-variant/15 px-3 py-2 font-mono"
                                    >
                                        <div className="mt-0.5">{getStatusIcon(entry.status)}</div>
                                        <div className="min-w-0 flex-1">
                                            <p className="break-all text-[10.5px] font-medium text-on-surface">
                                                Build #{build.history.length - index}
                                            </p>
                                            <p className="text-[9.5px] text-on-surface-variant/70">
                                                {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '—'}
                                                {entry.durationMs && ` · ${formatDuration(entry.durationMs)}`}
                                                {entry.projectPath && entry.projectPath !== '.' && (
                                                    <span className="ml-1 text-secondary">
                                                        · {entry.projectPath}
                                                    </span>
                                                )}
                                            </p>
                                            {entry.error && (
                                                <p className="mt-1 truncate text-[10px] text-error">
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
                    <div className="flex min-h-0 flex-col bg-surface-container-lowest">
                        <div className="flex h-7 shrink-0 items-center justify-between border-b border-outline-variant/20 bg-surface-container/40 px-3">
                            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-on-surface-variant">
                                Output
                            </span>
                            <div className="flex items-center gap-2 font-mono text-[9.5px] text-on-surface-variant">
                                {build.projectPath !== '.' && (
                                    <span className="flex items-center gap-1 text-secondary">
                                        <FolderOpen className="h-2.5 w-2.5" />
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
                                <span>
                                    {build.buildTarget === 'Release' ? 'make build-release' :
                                        build.buildTarget === 'Debug' ? 'make build-debug' :
                                            'make build'}
                                </span>
                            </div>
                        </div>
                        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-2.5 font-mono text-[10.5px] leading-relaxed text-on-surface">
                            {build.currentOutput || build.history[build.history.length - 1]?.output || 'Running build pipeline...'}
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
        <div className="p-2 space-y-1.5 font-mono text-[10.5px]">
            <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded border border-outline-variant/20 bg-surface-container p-2">
                    <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/70">Duration</span>
                    <p className="mt-0.5 font-medium text-on-surface">{formatDuration(durationMs)}</p>
                </div>
                <div className="rounded border border-outline-variant/20 bg-surface-container p-2">
                    <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/70">Total Runs</span>
                    <p className="mt-0.5 font-medium text-on-surface">{outputCount}</p>
                </div>
            </div>

            <div className="flex items-center justify-between rounded border border-outline-variant/20 bg-surface-container px-2.5 py-1.5">
                <span className="text-[9.5px] uppercase tracking-wider text-on-surface-variant/70">Project</span>
                <span className="text-secondary font-medium">{projectPath === '.' ? 'Root' : projectPath}</span>
            </div>

            {error && (
                <div className="rounded border border-error/30 bg-error/10 p-2 text-error">
                    <span className="text-[9px] uppercase tracking-wider font-semibold">Error</span>
                    <p className="mt-0.5 truncate text-[10px]">{error}</p>
                </div>
            )}
        </div>
    );
}

function EmptyBuildState({ onBuild }: { onBuild: () => void }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center font-mono">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container">
                <Hammer className="h-4 w-4 text-primary" />
            </div>
            <h3 className="mt-3 text-[12px] font-semibold text-on-surface">Build CKB Contracts</h3>
            <p className="mt-1 max-w-xs text-[10.5px] leading-relaxed text-on-surface-variant">
                Compile Rust or C smart contracts in the workspace container.
            </p>
            <button
                type="button"
                onClick={onBuild}
                className="mt-3 flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-[10.5px] font-medium text-on-primary transition hover:bg-primary-fixed"
            >
                <Play className="h-3 w-3 fill-current" />
                Build Project
            </button>
        </div>
    );
}
