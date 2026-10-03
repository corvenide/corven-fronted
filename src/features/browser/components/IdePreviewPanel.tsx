// src/features/browser/components/IdePreviewPanel.tsx
//
// The browser shown beside the code, like a side-by-side preview: its width
// is set by dragging (in WorkspaceIde) and it can fill the whole IDE.

import { Link } from 'react-router-dom';
import { ExternalLink, Globe, Maximize2, Minimize2, X } from 'lucide-react';

import { BrowserApp } from './BrowserApp';

interface IdePreviewPanelProps {
    workspaceId: string;
    maximized: boolean;
    /** Disables the page inside while a panel is being dragged. */
    resizing: boolean;
    onToggleMaximize: () => void;
    onClose: () => void;
}

export function IdePreviewPanel({
    workspaceId,
    maximized,
    resizing,
    onToggleMaximize,
    onClose,
}: IdePreviewPanelProps) {
    return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-surface">
            <div className="flex h-8 shrink-0 items-center gap-2 border-b border-outline-variant/30 bg-surface-container px-3">
                <Globe className="h-3.5 w-3.5 text-primary" />
                <span className="flex-1 font-mono text-[10.5px] font-medium uppercase tracking-wider text-on-surface-variant">
                    Preview
                </span>

                <Link
                    to={`/browser?workspace=${workspaceId}`}
                    title="Open in the full browser page"
                    className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <button
                    type="button"
                    onClick={onToggleMaximize}
                    title={maximized ? 'Restore size' : 'Expand to fill the IDE'}
                    aria-label={maximized ? 'Restore preview size' : 'Expand preview'}
                    className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
                >
                    {maximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    title="Close preview"
                    aria-label="Close preview"
                    className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-error"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* An iframe swallows pointer events, which would stall a drag
                that passes over it. */}
            <div className="min-h-0 flex-1" style={resizing ? { pointerEvents: 'none' } : undefined}>
                <BrowserApp workspaceId={workspaceId} compact />
            </div>
        </div>
    );
}
