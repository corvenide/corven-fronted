// src/features/workspace/hooks/useWorkspaces.ts
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';

import {
    workspaceApi,
    type CreateWorkspaceInput,
} from '../../workspace/api/workspace.api';
import { workspaceKeys } from '../../workspace/queries/workspace.keys';

/**
 * List-level counterpart to `useWorkspace` (which is scoped to a single
 * workspace). Use this wherever you need the full list — the dashboard,
 * a workspace picker, etc.
 */
export function useWorkspaces() {
    const queryClient = useQueryClient();

    const workspacesQuery = useQuery({
        queryKey: workspaceKeys.list(),
        queryFn: () => workspaceApi.list(),
        // Keep the cards live while any workspace is starting.
        refetchInterval: (query) =>
            query.state.data?.some((workspace) => workspace.status === 'PROVISIONING')
                ? 2_000
                : false,
    });

    const invalidateList = () =>
        queryClient.invalidateQueries({
            queryKey: workspaceKeys.list(),
        });

    const createMutation = useMutation({
        mutationFn: (input: CreateWorkspaceInput) =>
            workspaceApi.create(input),
        onSuccess: async () => {
            await invalidateList();
        },
    });

    const startMutation = useMutation({
        mutationFn: (workspaceId: string) =>
            workspaceApi.start(workspaceId),
        onSuccess: async (status, workspaceId) => {
            queryClient.setQueryData(workspaceKeys.status(workspaceId), status);
            await invalidateList();
        },
    });

    const stopMutation = useMutation({
        mutationFn: (workspaceId: string) =>
            workspaceApi.stop(workspaceId),
        onSuccess: async (_data, workspaceId) => {
            await invalidateList();
            await queryClient.invalidateQueries({
                queryKey: workspaceKeys.status(workspaceId),
            });
        },
    });

    const removeMutation = useMutation({
        mutationFn: (workspaceId: string) =>
            workspaceApi.remove(workspaceId),
        onSuccess: async () => {
            await invalidateList();
        },
    });

    return {
        workspaces: workspacesQuery.data ?? [],
        isLoading: workspacesQuery.isLoading,
        isError: workspacesQuery.isError,
        error: workspacesQuery.error,
        refetch: workspacesQuery.refetch,

        createWorkspace: createMutation.mutateAsync,
        isCreating: createMutation.isPending,
        createError: createMutation.error,
        resetCreateError: createMutation.reset,

        startWorkspace: startMutation.mutateAsync,
        startingWorkspaceId: startMutation.isPending
            ? (startMutation.variables as string | undefined)
            : undefined,

        stopWorkspace: stopMutation.mutateAsync,
        stoppingWorkspaceId: stopMutation.isPending
            ? (stopMutation.variables as string | undefined)
            : undefined,

        removeWorkspace: removeMutation.mutateAsync,
        removingWorkspaceId: removeMutation.isPending
            ? (removeMutation.variables as string | undefined)
            : undefined,
    };
}