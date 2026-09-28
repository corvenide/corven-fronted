'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
    File,
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
        tests.setProjectPath(project);
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
            <header className="flex h-10 shrink-0 items-center justify-between border-b border-[#30363d] px-3">
                <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-[#58a6ff]" />
                    <span className="text-xs font-semibold text-gray-200">
                        Workspace Tests
                    </span>
                    {tests.isRunning && (
                        <span className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300">
                            <LoaderCircle className="h-3 w-3 animate-spin" />
                            Running
                        </span>
                    )}
                    {/* Show project count badge */}
                    {tests.projects.length > 1 && !tests.loadingProjects && (
                        <span className="rounded-full bg-[#21262d] px-2 py-0.5 text-[9px] text-gray-400">
                            {tests.projects.length - 1} projects
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {tests.isRunning ? (
                        <button
                            type="button"
                            onClick={tests.cancelTests}
                            className="flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-300 transition hover:bg-red-500/20"
                        >
                            <Ban className="h-3.5 w-3.5" />
                            Stop
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={tests.runTests}
                            className="flex items-center gap-1.5 rounded bg-[#238636] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#2ea043]"
                        >
                            {hasResults ? (
                                <RotateCcw className="h-3.5 w-3.5" />
                            ) : (
                                <Play className="h-3.5 w-3.5 fill-current" />
                            )}
                            {hasResults ? 'Run Again' : 'Run Tests'}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={tests.clearResults}
                        disabled={tests.isRunning || !hasResults}
                        title="Clear test results"
                        className="rounded p-1.5 text-gray-500 transition hover:bg-[#21262d] hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </header>

            {/* ─── Project selector dropdown ─── */}
            <div className="flex shrink-0 items-center gap-2 border-b border-[#30363d] px-3 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                    Project:
                </span>
                <div className="relative flex-1" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                        className="flex w-full items-center justify-between rounded border border-[#30363d] bg-[#0d1117] px-2 py-0.5 text-xs text-gray-200 transition hover:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff]"
                        disabled={tests.loadingProjects}
                    >
                        <span className="flex items-center gap-1.5">
                            {getProjectIcon(tests.projectPath)}
                            <span className="truncate">
                                {getProjectDisplayName(tests.projectPath)}
                            </span>
                            {tests.loadingProjects && (
                                <LoaderCircle className="ml-1 h-3 w-3 animate-spin text-gray-500" />
                            )}
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-200 ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isProjectDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded border border-[#30363d] bg-[#0d1117] py-1 shadow-xl">
                            {tests.loadingProjects ? (
                                <div className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-gray-500">
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                    Loading projects...
                                </div>
                            ) : tests.projects.length === 0 ? (
                                <div className="px-3 py-4 text-center text-xs text-gray-500">
                                    <Folder className="mx-auto mb-1 h-8 w-8 text-gray-600" />
                                    No projects found
                                </div>
                            ) : (
                                <>
                                    {/* Project list header */}
                                    <div className="border-b border-[#21262d] px-3 py-1.5 text-[9px] uppercase tracking-wider text-gray-600">
                                        {tests.projects.length - 1} project{tests.projects.length - 1 !== 1 ? 's' : ''} available
                                    </div>

                                    {tests.projects.map((project) => {
                                        const isSelected = tests.projectPath === project;
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
                    onClick={tests.refreshProjects}
                    disabled={tests.loadingProjects}
                    className="rounded p-1 text-gray-500 transition hover:bg-[#21262d] hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Refresh project list"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${tests.loadingProjects ? 'animate-spin' : ''}`} />
                </button>

                {/* Current project indicator */}
                {tests.projectPath !== '.' && (
                    <span className="hidden rounded bg-[#1c2333] px-2 py-0.5 text-[9px] text-[#58a6ff] sm:inline-block">
                        {tests.projectPath}
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

            {/* ─── Main content ─── */}
            {!hasResults && !tests.isRunning ? (
                <EmptyTestsState onRun={tests.runTests} />
            ) : (
                <div className="grid min-h-0 flex-1 grid-cols-[minmax(240px,36%)_1fr]">
                    <div className="min-h-0 overflow-y-auto border-r border-[#30363d]">
                        <TestSummary
                            status={tests.status}
                            passed={tests.run.summary.passed}
                            failed={tests.run.summary.failed}
                            ignored={tests.run.summary.ignored}
                            durationMs={tests.run.summary.durationMs}
                        />

                        <div className="border-t border-[#30363d]">
                            {tests.run.tests.length === 0 ? (
                                <div className="px-4 py-6 text-center text-xs text-gray-600">
                                    Waiting for test results...
                                </div>
                            ) : (
                                tests.run.tests.map((test) => (
                                    <div
                                        key={test.id}
                                        className="flex items-start gap-2 border-b border-[#21262d] px-3 py-2.5"
                                    >
                                        {test.status === 'passed' ? (
                                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                        ) : test.status === 'failed' ? (
                                            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                                        ) : (
                                            <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="break-all font-mono text-[11px] text-gray-300">
                                                {test.name}
                                            </p>
                                            {test.error && (
                                                <p className="mt-1 text-[10px] text-red-400">
                                                    {test.error}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-col">
                        <div className="flex h-8 shrink-0 items-center justify-between border-b border-[#30363d] px-3">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                Test Output
                            </span>
                            <div className="flex items-center gap-2">
                                {/* Show current project in output header */}
                                {tests.projectPath !== '.' && (
                                    <span className="flex items-center gap-1 rounded bg-[#1c2333] px-2 py-0.5 text-[9px] text-[#58a6ff]">
                                        <FolderOpen className="h-3 w-3" />
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
                                <span className="font-mono text-[10px] text-gray-600">
                                    make test
                                </span>
                            </div>
                        </div>
                        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-5 text-gray-300">
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
        <div className="grid grid-cols-2 gap-2 p-3">
            <SummaryCard label="Passed" value={passed} icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />} />
            <SummaryCard label="Failed" value={failed} icon={<XCircle className="h-3.5 w-3.5 text-red-400" />} />
            <SummaryCard label="Ignored" value={ignored} icon={<Circle className="h-3.5 w-3.5 text-gray-500" />} />
            <SummaryCard label="Duration" value={formatDuration(durationMs)} icon={<Clock3 className="h-3.5 w-3.5 text-blue-400" />} />
            <div className="col-span-2 rounded border border-[#30363d] bg-[#161b22] px-3 py-2">
                <span className="text-[10px] uppercase tracking-wide text-gray-600">Status</span>
                <p className="mt-1 text-xs font-medium capitalize text-gray-300">{status}</p>
            </div>
        </div>
    );
}

interface SummaryCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
}

function SummaryCard({ label, value, icon }: SummaryCardProps) {
    return (
        <div className="rounded border border-[#30363d] bg-[#161b22] px-3 py-2">
            <div className="flex items-center gap-1.5">
                {icon}
                <span className="text-[10px] uppercase tracking-wide text-gray-600">{label}</span>
            </div>
            <p className="mt-1 font-mono text-sm font-semibold text-gray-200">{value}</p>
        </div>
    );
}

function EmptyTestsState({ onRun }: { onRun: () => void }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#30363d] bg-[#161b22]">
                <FlaskConical className="h-5 w-5 text-[#58a6ff]" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-gray-200">Test your CKB contracts</h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-gray-500">
                Run the workspace test suite without entering commands in the terminal.
                Results and logs will appear here in real time.
            </p>
            <button
                type="button"
                onClick={onRun}
                className="mt-4 flex items-center gap-2 rounded bg-[#238636] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#2ea043]"
            >
                <Play className="h-3.5 w-3.5 fill-current" />
                Run Tests
            </button>
        </div>
    );
}