// src/features/workspace/components/TestsPanel.tsx
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
    Ban,
    CheckCircle2,
    Circle,
    Clock3,
    FlaskConical,
    LoaderCircle,
    Play,
    RotateCcw,
    Trash2,
    XCircle,
    ChevronDown,
    FolderOpen,
    Folder,
    Check,
    RefreshCw,
} from 'lucide-react';

import { AskClaudeButton } from '../../ai/components/AskClaudeButton';
import { useWorkspaceTests } from '../hooks/useWorkspaceTests';
import { useWorkspaceFiles } from '../hooks/useWorkspaceFiles';

interface TestsPanelProps {
    workspaceId: string;
}

function formatDuration(durationMs?: number): string {
    if (durationMs === undefined) return '—';
    if (durationMs < 1000) return `${Math.round(durationMs)} ms`;
    return `${(durationMs / 1000).toFixed(2)} s`;
}

export function TestsPanel({ workspaceId }: TestsPanelProps) {
    const tests = useWorkspaceTests(workspaceId);
    const files = useWorkspaceFiles(workspaceId);
    const hasResults = tests.run.tests.length > 0 || tests.run.output.length > 0;
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProjectDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        tests.setProjectPath(project);
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
                    <FlaskConical className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold uppercase tracking-wider text-on-surface">
                        Tests
                    </span>
                    {tests.isRunning && (
                        <span className="flex items-center gap-1 text-[10px] text-secondary">
                            <span className="text-on-surface-variant/40">·</span>
                            <LoaderCircle className="h-2.5 w-2.5 animate-spin" />
                            <span>Running</span>
                        </span>
                    )}
                    {tests.projects.length > 1 && !tests.loadingProjects && (
                        <span className="text-[10px] text-on-surface-variant">
                            <span className="text-on-surface-variant/40">·</span> {tests.projects.length - 1} subproject{tests.projects.length - 1 !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    {tests.isRunning ? (
                        <button
                            type="button"
                            onClick={tests.cancelTests}
                            className="flex items-center gap-1 rounded border border-error/30 bg-error/10 px-2 py-0.5 text-[10.5px] font-mono text-error transition hover:bg-error/20"
                        >
                            <Ban className="h-3 w-3" />
                            Stop
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={tests.runTests}
                            className="flex items-center gap-1 rounded bg-primary px-2.5 py-0.5 text-[10.5px] font-mono font-medium text-on-primary transition hover:bg-primary-fixed"
                        >
                            {hasResults ? (
                                <RotateCcw className="h-3 w-3" />
                            ) : (
                                <Play className="h-3 w-3 fill-current" />
                            )}
                            {hasResults ? 'Run Again' : 'Run Tests'}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={tests.clearResults}
                        disabled={tests.isRunning || !hasResults}
                        title="Clear test results"
                        className="rounded p-1 text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            </header>

            {/* Project Selector Bar */}
            <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/20 bg-surface-container/60 px-3 py-1 font-mono text-[10.5px]">
                <div className="flex items-center gap-1.5" ref={dropdownRef}>
                    <span className="text-[9.5px] uppercase tracking-wider text-on-surface-variant/70">
                        Project:
                    </span>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                            className="flex items-center gap-1.5 rounded border border-outline-variant/30 bg-surface px-2 py-0.5 text-on-surface transition hover:border-secondary focus:outline-none"
                            disabled={tests.loadingProjects}
                        >
                            {getProjectIcon(tests.projectPath)}
                            <span className="max-w-[160px] truncate">
                                {getProjectDisplayName(tests.projectPath)}
                            </span>
                            {tests.loadingProjects && (
                                <LoaderCircle className="h-2.5 w-2.5 animate-spin text-on-surface-variant" />
                            )}
                            <ChevronDown className={`h-3 w-3 text-on-surface-variant transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isProjectDropdownOpen && (
                            <div className="absolute left-0 top-full z-20 mt-1 max-h-56 min-w-[200px] overflow-y-auto rounded border border-outline-variant/40 bg-surface-container-high py-1 shadow-2xl">
                                {tests.loadingProjects ? (
                                    <div className="flex items-center justify-center gap-1.5 px-3 py-3 text-[10.5px] text-on-surface-variant">
                                        <LoaderCircle className="h-3 w-3 animate-spin" />
                                        Loading projects...
                                    </div>
                                ) : tests.projects.length === 0 ? (
                                    <div className="px-3 py-3 text-center text-[10.5px] text-on-surface-variant">
                                        No projects found
                                    </div>
                                ) : (
                                    directories.map((d: any) => {
                                        const isSelected = tests.projectPath === d.name;
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

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={tests.refreshProjects}
                        disabled={tests.loadingProjects}
                        className="rounded p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-40"
                        title="Refresh projects"
                    >
                        <RefreshCw className={`h-3 w-3 ${tests.loadingProjects ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Main content */}
            {!hasResults && !tests.isRunning ? (
                <EmptyTestsState onRun={tests.runTests} />
            ) : (
                <div className="grid min-h-0 flex-1 grid-cols-[minmax(220px,32%)_1fr]">
                    <div className="min-h-0 overflow-y-auto border-r border-outline-variant/30">
                        <TestSummary
                            status={tests.status}
                            passed={tests.run.summary.passed}
                            failed={tests.run.summary.failed}
                            ignored={tests.run.summary.ignored}
                            durationMs={tests.run.summary.durationMs}
                        />

                        <div className="border-t border-outline-variant/20">
                            {tests.run.tests.length === 0 ? (
                                <div className="px-3 py-5 text-center font-mono text-[10.5px] text-on-surface-variant/60">
                                    Waiting for test results...
                                </div>
                            ) : (
                                tests.run.tests.map((test) => (
                                    <div
                                        key={test.id}
                                        className="flex items-start gap-2 border-b border-outline-variant/15 px-3 py-2 font-mono"
                                    >
                                        {test.status === 'passed' ? (
                                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                                        ) : test.status === 'failed' ? (
                                            <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-error" />
                                        ) : (
                                            <Circle className="mt-0.5 h-3 w-3 shrink-0 text-on-surface-variant" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="break-all text-[10.5px] text-on-surface">
                                                {test.name}
                                            </p>
                                            {test.error && (
                                                <p className="mt-0.5 text-[9.5px] text-error">
                                                    {test.error}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-col bg-surface-container-lowest">
                        <div className="flex h-7 shrink-0 items-center justify-between border-b border-outline-variant/20 bg-surface-container/40 px-3">
                            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-on-surface-variant">
                                Test Output
                            </span>
                            <div className="flex items-center gap-2 font-mono text-[9.5px] text-on-surface-variant">
                                {tests.projectPath !== '.' && (
                                    <span className="flex items-center gap-1 text-secondary">
                                        <FolderOpen className="h-2.5 w-2.5" />
                                        {tests.projectPath}
                                    </span>
                                )}
                                {(tests.run.status === 'failed' || tests.run.status === 'error') && (
                                    <AskClaudeButton
                                        kind="test"
                                        prompt={
                                            tests.run.summary.failed
                                                ? `${tests.run.summary.failed} test(s) failed. Why, and how do I fix them?`
                                                : 'The test run failed. What went wrong and how do I fix it?'
                                        }
                                        output={tests.run.output}
                                    />
                                )}
                                <span>make test</span>
                            </div>
                        </div>
                        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-2.5 font-mono text-[10.5px] leading-relaxed text-on-surface">
                            {tests.run.output || 'Preparing test runner...'}
                        </pre>
                    </div>
                </div>
            )}
        </section>
    );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

interface TestSummaryProps {
    status: string;
    passed: number;
    failed: number;
    ignored: number;
    durationMs?: number;
}

function TestSummary({ status, passed, failed, ignored, durationMs }: TestSummaryProps) {
    return (
        <div className="p-2 space-y-1.5 font-mono text-[10.5px]">
            <div className="grid grid-cols-3 gap-1.5">
                <div className="rounded border border-outline-variant/20 bg-surface-container p-1.5 text-center">
                    <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/70">Passed</span>
                    <p className="mt-0.5 font-semibold text-primary">{passed}</p>
                </div>
                <div className="rounded border border-outline-variant/20 bg-surface-container p-1.5 text-center">
                    <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/70">Failed</span>
                    <p className={`mt-0.5 font-semibold ${failed > 0 ? 'text-error' : 'text-on-surface'}`}>{failed}</p>
                </div>
                <div className="rounded border border-outline-variant/20 bg-surface-container p-1.5 text-center">
                    <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/70">Duration</span>
                    <p className="mt-0.5 text-on-surface">{formatDuration(durationMs)}</p>
                </div>
            </div>

            <div className="flex items-center justify-between rounded border border-outline-variant/20 bg-surface-container px-2.5 py-1.5">
                <span className="text-[9.5px] uppercase tracking-wider text-on-surface-variant/70">Status</span>
                <span className="capitalize text-secondary font-medium">{status}</span>
            </div>
        </div>
    );
}

function EmptyTestsState({ onRun }: { onRun: () => void }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center font-mono">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container">
                <FlaskConical className="h-4 w-4 text-primary" />
            </div>
            <h3 className="mt-3 text-[12px] font-semibold text-on-surface">Test CKB Contracts</h3>
            <p className="mt-1 max-w-xs text-[10.5px] leading-relaxed text-on-surface-variant">
                Run contract unit and integration tests using ckb-testtool.
            </p>
            <button
                type="button"
                onClick={onRun}
                className="mt-3 flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-[10.5px] font-medium text-on-primary transition hover:bg-primary-fixed"
            >
                <Play className="h-3 w-3 fill-current" />
                Run Tests
            </button>
        </div>
    );
}
