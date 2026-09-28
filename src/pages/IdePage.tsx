// src/pages/IdePage.tsx
import {
    Navigate,
    useParams,
    useSearchParams,
} from 'react-router-dom';

import { WorkspaceIde } from '../features/workspace/components/WorkspaceIde';
import { WorkspaceStartup } from '../features/workspace/components/WorkspaceStartup';

import type {
    IdePanel,
} from '../features/workspace/types/workspace.types';

function isIdePanel(
    value: string | null,
): value is IdePanel {
    return (
        value === 'files' ||
        value === 'search' ||
        value === 'git' ||
        value === 'debug'
    );
}

export default function IdePage() {
    const { workspaceId } =
        useParams<{
            workspaceId: string;
        }>();

    const [searchParams] =
        useSearchParams();

    if (!workspaceId) {
        return (
            <Navigate
                to="/dashboard"
                replace
            />
        );
    }

    const panelParam =
        searchParams.get('panel');

    const activePanel: IdePanel =
        isIdePanel(panelParam)
            ? panelParam
            : 'files';

    return (
        // key: reset start-up state when switching between workspaces.
        <WorkspaceStartup key={workspaceId} workspaceId={workspaceId}>
            <WorkspaceIde
                workspaceId={workspaceId}
                activePanel={activePanel}
            />
        </WorkspaceStartup>
    );
}