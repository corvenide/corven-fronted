// src/features/workspace/components/WorkspaceBottomPanel.tsx
'use client';

import {
    FlaskConical,
    TerminalSquare,
    X,
    Hammer,
    Rocket,
    Bug,
    Globe,
} from 'lucide-react';

import React, { useState } from 'react';

import { TerminalPanel } from './TerminalPanel';
import { TestsPanel } from './TestsPanel';
import { BuildPanel } from './BuildPanel';
import { DeployPanel } from '../../deploy/DeployPanel';
import { DebugPanel } from '../../debugger/DebugPanel';
import { IdeBrowserPanel } from '../../browser/components/IdeBrowserPanel';

type BottomPanelTab =
    | 'terminal'
    | 'tests'
    | 'build'
    | 'deploy'
    | 'debug'
    | 'browser';

interface WorkspaceBottomPanelProps {
    workspaceId: string;
    onClose: () => void;
}

export function WorkspaceBottomPanel({
    workspaceId,
    onClose,
}: WorkspaceBottomPanelProps) {
    const [activeTab, setActiveTab] =
        useState<BottomPanelTab>(
            'terminal',
        );

    return (
        <section className="flex h-full min-h-0 flex-col bg-surface-container-lowest">
            <header className="flex h-8 shrink-0 items-center justify-between border-b border-outline-variant/30 bg-surface-container px-3">
                <div className="flex h-full items-center gap-4">
                    <PanelTab
                        label="Terminal"
                        active={
                            activeTab ===
                            'terminal'
                        }
                        icon={
                            <TerminalSquare className="h-3.5 w-3.5" />
                        }
                        onClick={() =>
                            setActiveTab(
                                'terminal',
                            )
                        }
                    />

                    <PanelTab
                        label="Tests"
                        active={
                            activeTab ===
                            'tests'
                        }
                        icon={
                            <FlaskConical className="h-3.5 w-3.5" />
                        }
                        onClick={() =>
                            setActiveTab(
                                'tests',
                            )
                        }
                    />

                    <PanelTab
                        label="Build"
                        active={activeTab === 'build'}
                        icon={<Hammer className="h-3.5 w-3.5" />}
                        onClick={() => setActiveTab('build')}
                    />

                    <PanelTab
                        label="Deploy"
                        active={activeTab === 'deploy'}
                        icon={<Rocket className="h-3.5 w-3.5" />}
                        onClick={() => setActiveTab('deploy')}
                    />

                    <PanelTab
                        label="Debug"
                        active={activeTab === 'debug'}
                        icon={<Bug className="h-3.5 w-3.5" />}
                        onClick={() => setActiveTab('debug')}
                    />

                    <PanelTab
                        label="Browser"
                        active={activeTab === 'browser'}
                        icon={<Globe className="h-3.5 w-3.5" />}
                        onClick={() => setActiveTab('browser')}
                    />

                </div>

                <button
                    type="button"
                    onClick={onClose}
                    title="Close panel"
                    className="rounded p-1 text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </header>

            <div className="min-h-0 flex-1 overflow-hidden">
                <div className={activeTab === 'terminal' ? 'h-full' : 'hidden'}>
                    <TerminalPanel
                        workspaceId={workspaceId}
                        embedded
                    />
                </div>

                <div className={activeTab === 'tests' ? 'h-full' : 'hidden'}>
                    <TestsPanel
                        workspaceId={workspaceId}
                    />
                </div>

                <div className={activeTab === 'build' ? 'h-full' : 'hidden'}>
                    <BuildPanel workspaceId={workspaceId} />
                </div>

                <div className={activeTab === 'deploy' ? 'h-full' : 'hidden'}>
                    <DeployPanel workspaceId={workspaceId} active={activeTab === 'deploy'} />
                </div>

                <div className={activeTab === 'debug' ? 'h-full' : 'hidden'}>
                    <DebugPanel workspaceId={workspaceId} active={activeTab === 'debug'} />
                </div>

                <div className={activeTab === 'browser' ? 'h-full' : 'hidden'}>
                    <IdeBrowserPanel workspaceId={workspaceId} />
                </div>

            </div>
        </section>
    );
}

interface PanelTabProps {
    label: string;
    active: boolean;
    icon?: React.ReactNode;
    onClick: () => void;
}

function PanelTab({
    label,
    active,
    icon,
    onClick,
}: PanelTabProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'flex h-full items-center gap-1.5 border-b-2 px-1 text-[10.5px] font-mono font-medium uppercase tracking-wider transition-colors',
                active
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface',
            ].join(' ')}
        >
            {icon}
            {label}
        </button>
    );
}
