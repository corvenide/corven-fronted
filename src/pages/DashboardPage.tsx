// src/pages/DashboardPage.tsx
import { useNavigate } from 'react-router-dom';

import DashboardView from '../features/dashboard/components/DashboardView';
import { useWorkspaces } from '../features/dashboard/hooks/useWorkspaces';
import { useAuth } from '../features/auth/hooks/useAuth';

function displayName(user: ReturnType<typeof useAuth>['user']): string | null {
    if (!user) return null;

    // Wallet accounts get a generated name ("CKB User abc123"); the address
    // is more recognisable.
    if (user.walletAddress && user.name.startsWith('CKB User')) {
        const address = user.walletAddress;
        return `${address.slice(0, 8)}…${address.slice(-6)}`;
    }

    return user.name;
}

export default function DashboardPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const {
        workspaces,
        isLoading,
        isError,
        refetch,
        startWorkspace,
        stopWorkspace,
        removeWorkspace,
        startingWorkspaceId,
        stoppingWorkspaceId,
        removingWorkspaceId,
    } = useWorkspaces();

    return (
        <DashboardView
            userName={displayName(user)}
            workspaces={workspaces}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
            startingWorkspaceId={startingWorkspaceId}
            stoppingWorkspaceId={stoppingWorkspaceId}
            removingWorkspaceId={removingWorkspaceId}
            onOpenWorkspace={(workspaceId) => navigate(`/ide/${workspaceId}`)}
            onStartWorkspace={(workspaceId) => void startWorkspace(workspaceId).catch(() => undefined)}
            onStopWorkspace={(workspaceId) => void stopWorkspace(workspaceId).catch(() => undefined)}
            onRemoveWorkspace={(workspaceId) => void removeWorkspace(workspaceId).catch(() => undefined)}
        />
    );
}
