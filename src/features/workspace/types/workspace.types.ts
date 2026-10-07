// src/features/workspace/types/workspace.types.ts

export type WorkspaceStatus =
    | 'PENDING'
    | 'PROVISIONING'
    | 'RUNNING'
    | 'IDLE'
    | 'STOPPED'
    | 'FAILED'
    | 'DELETED';

export interface Workspace {
    id: string;
    name: string;
    status: WorkspaceStatus;
    userId: string;
    templateId: string | null;
    /** Deleted 24 hours after its last use unless kept. Guests' workspaces always are. */
    temporary?: boolean;
    /** When a temporary workspace will be deleted if unused; null when kept. */
    expiresAt?: string | null;
    runtimeNetwork: string | null;
    runtimeVolume: string | null;
    lastStartedAt: string | null;
    lastStoppedAt: string | null;
    /** Last sign of use; running workspaces stop after a period without it. */
    lastActivityAt?: string | null;
    /** Current step while status is PROVISIONING. */
    provisionStage: ProvisionStage | null;
    /** Why the last start failed. */
    provisionError: string | null;
    createdAt: string;
    updatedAt: string;
}

export type ProvisionStage = 'preparing' | 'starting' | 'project';

export type RuntimeContainerStatus =
    | 'CREATED'
    | 'STARTING'
    | 'RUNNING'
    | 'STOPPED'
    | 'FAILED';

export interface WorkspaceRuntimeContainer {
    id: string;
    containerId: string;
    name: string;
    image: string;
    type: 'IDE' | 'CKB_NODE' | 'FIBER_RUNTIME' | 'PREVIEW' | 'TEST_RUNNER';
    status: RuntimeContainerStatus;
    dockerState: string;
    dockerStatus: string;
    internalPort: number | null;
    hostPort: number | null;
}

/** Response of GET /workspaces/:id/status (and POST /start). */
export interface WorkspaceRuntimeStatus {
    workspaceId: string;
    name: string;
    status: WorkspaceStatus;
    provisionStage: ProvisionStage | null;
    provisionError: string | null;
    lastStartedAt: string | null;
    lastStoppedAt: string | null;
    lastActivityAt: string | null;
    /** True once the workspace has run, so the editor works while it is off. */
    filesAvailable: boolean;
    /** Minutes of inactivity before it is stopped (0 = never). */
    idleTimeoutMinutes: number;
    /** 'lazy': the devnet starts when requested. */
    devnetMode: 'lazy' | 'eager';
    /** Server the workspace runs on (null until its first start). */
    hostId?: string | null;
    hostOnline?: boolean;
    containers: WorkspaceRuntimeContainer[];
}

export type WorkspaceEntryType =
    | 'file'
    | 'directory';

export interface WorkspaceEntry {
    name: string;
    path: string;
    type: WorkspaceEntryType;
    size?: number;
}

export interface WorkspaceFile
    extends WorkspaceEntry {
    type: 'file';
    content: string;
}

export interface CreateFileInput {
    path: string;
    content?: string;
}

export interface UpdateFileInput {
    path: string;
    content: string;
}

export interface RenameFileInput {
    oldPath: string;
    newPath: string;
}

export interface CreateDirectoryInput {
    path: string;
}

export type IdePanel =
    | 'files'
    | 'search'
    | 'git'
    | 'debug';

export type BottomPanelType =
    | 'terminal'
    | 'debug'
    | 'output'
    | 'problems';
export interface DevnetBlock {
    number: number;
    hash: string;
    /** Milliseconds since the epoch. */
    timestamp: number;
    transactions: number;
}

export interface DevnetChain {
    chain: string | null;
    nodeVersion: string | null;
    nodeId: string | null;
    tip: { number: number; hash: string; timestamp: number; epoch: string } | null;
    txPool: { pending: number; proposed: number; orphan: number } | null;
    peers: number;
    recentBlocks: DevnetBlock[];
}

export interface DevnetInfo {
    workspaceId: string;
    workspaceName: string;
    workspaceStatus: WorkspaceStatus;
    devnetMode: 'lazy' | 'eager';
    /** workspace-stopped: start the workspace first. */
    state: 'workspace-stopped' | 'off' | 'starting' | 'running' | 'failed';
    chain: DevnetChain | null;
    /** RPC URL from inside the workspace. */
    rpcUrl?: string;
}
