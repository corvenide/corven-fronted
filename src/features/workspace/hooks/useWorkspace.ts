// src/features/workspace/hooks/useWorkspace.ts
import { useEffect } from 'react';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';

import { workspaceApi } from '../api/workspace.api';
import { workspaceKeys } from '../queries/workspace.keys';
import type { WorkspaceRuntimeStatus } from '../types/workspace.types';

/** How often to poll the runtime status for a given state. */
export function statusPollInterval(
    status: WorkspaceRuntimeStatus | undefined,
): number | false {
    if (!status) return false;

    // Starting: poll quickly so progress feels live.
    if (status.status === 'PROVISIONING') return 1_500;

    // Running, but the CKB node is still coming up in the background.
    if (
        status.status === 'RUNNING' &&
        status.containers.some(
            (container) =>
                container.type === 'CKB_NODE' &&
                (container.status === 'CREATED' || container.status === 'STARTING'),
        )
    ) {
        return 4_000;
    }

    return false;
}

export function useWorkspace(workspaceId: string) {
    const queryClient = useQueryClient();

    const workspaceQuery = useQuery({
        queryKey: workspaceKeys.detail(workspaceId),
        queryFn: () => workspaceApi.get(workspaceId),
        enabled: Boolean(workspaceId),
    });

    const statusQuery = useQuery({
        queryKey: workspaceKeys.status(workspaceId),
        queryFn: () => workspaceApi.status(workspaceId),
        enabled: Boolean(workspaceId),
        // The status endpoint returns `status` at the top level; the old
        // check looked for `data.workspace.status`, so it never polled.
        refetchInterval: (query) => statusPollInterval(query.state.data),
    });

    const invalidate = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) }),
            queryClient.invalidateQueries({ queryKey: workspaceKeys.list() }),
        ]);
    };

    const startMutation = useMutation({
        mutationFn: () => workspaceApi.start(workspaceId),
        onSuccess: async (status) => {
            // The start call returns the fresh status; use it directly so the
            // progress screen appears without waiting for the next poll.
            queryClient.setQueryData(workspaceKeys.status(workspaceId), status);
            await invalidate();
        },
    });

    const devnetMutation = useMutation({
        mutationFn: () => workspaceApi.startDevnet(workspaceId),
        onSuccess: (status) => {
            queryClient.setQueryData(workspaceKeys.status(workspaceId), status);
        },
    });

    const isRunning = statusQuery.data?.status === 'RUNNING';

    // While the IDE is open and visible, tell the backend it's in use so the
    // workspace isn't stopped as idle. If it was stopped anyway (e.g. the
    // tab sat hidden), refresh the status so the IDE can start it again.
    useEffect(() => {
        if (!workspaceId || !isRunning) return;

        const beat = async () => {
            if (document.visibilityState !== 'visible') return;
            try {
                const { status } = await workspaceApi.heartbeat(workspaceId);
                if (status !== 'RUNNING') {
                    await queryClient.invalidateQueries({ queryKey: workspaceKeys.status(workspaceId) });
                }
            } catch {
                /* transient; next beat will retry */
            }
        };

        void beat();
        const timer = window.setInterval(beat, 60_000);
        const onVisible = () => void beat();
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [workspaceId, isRunning, queryClient]);

    const stopMutation = useMutation({
        mutationFn: () => workspaceApi.stop(workspaceId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: workspaceKeys.status(workspaceId) });
            await invalidate();
        },
    });

    return {
        workspace: workspaceQuery.data ?? null,
        runtimeStatus: statusQuery.data ?? null,

        isLoading: workspaceQuery.isLoading || statusQuery.isLoading,
        error: workspaceQuery.error ?? statusQuery.error,

        startWorkspace: startMutation.mutateAsync,
        stopWorkspace: stopMutation.mutateAsync,

        isStarting: startMutation.isPending,
        startError: startMutation.error,
        isStopping: stopMutation.isPending,

        startDevnet: devnetMutation.mutateAsync,
        isStartingDevnet: devnetMutation.isPending,
        devnetError: devnetMutation.error,
    };
}
