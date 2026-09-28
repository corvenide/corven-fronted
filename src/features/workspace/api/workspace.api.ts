// src/features/workspace/api/workspace.api.ts
import { apiClient } from '../../../lib/api-client';
import type {
    DevnetInfo,
    Workspace,
    WorkspaceRuntimeStatus,
} from '../types/workspace.types';

export interface WorkspaceTemplate {
    id: string;
    name: string;
    description: string;
    contracts: string[];
}

export interface CreateWorkspaceInput {
    name: string;
    templateId?: string;
}

export const workspaceApi = {
    /** Project templates a new workspace can start from. */
    templates(): Promise<WorkspaceTemplate[]> {
        return apiClient<WorkspaceTemplate[]>('/workspace-templates');
    },

    list(): Promise<Workspace[]> {
        return apiClient<Workspace[]>(
            '/workspaces',
        );
    },

    get(
        workspaceId: string,
    ): Promise<Workspace> {
        return apiClient<Workspace>(
            `/workspaces/${workspaceId}`,
        );
    },

    create(
        input: CreateWorkspaceInput,
    ): Promise<Workspace> {
        return apiClient<Workspace>(
            '/workspaces',
            {
                method: 'POST',
                body: JSON.stringify(input),
            },
        );
    },

    /** Returns immediately; poll status() to follow provisioning. */
    start(workspaceId: string): Promise<WorkspaceRuntimeStatus> {
        return apiClient<WorkspaceRuntimeStatus>(
            `/workspaces/${workspaceId}/start`,
            {
                method: 'POST',
            },
        );
    },

    /** Tells the backend the IDE is open, so the workspace isn't stopped as idle. */
    heartbeat(workspaceId: string): Promise<{ status: Workspace['status'] }> {
        return apiClient(`/workspaces/${workspaceId}/heartbeat`, { method: 'POST' });
    },

    /** Starts the workspace's CKB devnet; returns the updated status. */
    startDevnet(workspaceId: string): Promise<WorkspaceRuntimeStatus> {
        return apiClient<WorkspaceRuntimeStatus>(`/workspaces/${workspaceId}/devnet/start`, { method: 'POST' });
    },

    /** Stops the devnet node; its chain data is kept. */
    stopDevnet(workspaceId: string): Promise<WorkspaceRuntimeStatus> {
        return apiClient<WorkspaceRuntimeStatus>(`/workspaces/${workspaceId}/devnet/stop`, { method: 'POST' });
    },

    /** Live devnet facts: tip, recent blocks, tx pool. */
    devnet(workspaceId: string): Promise<DevnetInfo> {
        return apiClient<DevnetInfo>(`/workspaces/${workspaceId}/devnet`);
    },

    stop(workspaceId: string) {
        return apiClient(
            `/workspaces/${workspaceId}/stop`,
            {
                method: 'POST',
            },
        );
    },

    status(workspaceId: string): Promise<WorkspaceRuntimeStatus> {
        return apiClient<WorkspaceRuntimeStatus>(
            `/workspaces/${workspaceId}/status`,
        );
    },

    remove(workspaceId: string) {
        return apiClient(
            `/workspaces/${workspaceId}`,
            {
                method: 'DELETE',
            },
        );
    },
};