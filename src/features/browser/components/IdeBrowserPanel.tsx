// src/features/browser/components/IdeBrowserPanel.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Maximize2 } from 'lucide-react';
import { BrowserApp } from './BrowserApp';
import { useWorkspaceFiles } from '../../workspace/hooks/useWorkspaceFiles';

interface IdeBrowserPanelProps {
    workspaceId: string;
}

export function IdeBrowserPanel({ workspaceId }: IdeBrowserPanelProps) {
    const files = useWorkspaceFiles(workspaceId);

    // Format files for the browser runner
    const formattedFiles = files.entries.map((e) => ({
        path: e.path,
        content: e.type === 'file' ? '' : undefined,
    }));

    return (
        <div className="relative flex h-full w-full flex-col min-h-0 min-w-0 bg-surface">
            {/* Top mini-bar with link to full browser page */}
            <div className="absolute top-1 right-2 z-30 flex items-center gap-1.5">
                <Link
                    to={`/browser?workspace=${workspaceId}`}
                    className="flex items-center gap-1 rounded bg-surface-container-high/90 backdrop-blur px-2 py-0.5 text-[10px] font-mono text-primary hover:bg-primary/20 border border-primary/30 shadow-sm transition-colors"
                    title="Open in full screen browser application"
                >
                    <Maximize2 className="h-2.5 w-2.5" />
                    <span>Pop out Browser</span>
                </Link>
            </div>

            <BrowserApp
                initialUrl="workspace://frontend/index.html"
                workspaceFiles={formattedFiles}
                workspaceId={workspaceId}
                compact
            />
        </div>
    );
}
