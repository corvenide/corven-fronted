// src/features/debugger/debugger.api.ts
import { apiClient } from '../../lib/api-client';

export interface ScriptRunResult {
    exitCode: number | null;
    vmError: string | null;
    cycles: number | null;
    logs: string[];
    meaning: string | null;
}

export interface ContractRun extends ScriptRunResult {
    contract: string;
    raw: string;
    note: string;
}

export interface ScriptGroupResult extends ScriptRunResult {
    label: string;
    groupType: 'lock' | 'type';
    cellType: 'input' | 'output';
    cellIndex: number;
    codeHash: string;
    hashType: string;
    args: string;
    name: string | null;
    contract: string | null;
    replaced: boolean;
    skipped: string | null;
}

export type TxStatus = 'committed' | 'proposed' | 'pending' | 'rejected' | 'not-on-chain' | string;

export interface TransactionDebug {
    txHash: string;
    status: TxStatus;
    inputs: number;
    outputs: number;
    totalCycles: number;
    failed: number;
    groups: ScriptGroupResult[];
    truncated: boolean;
}

export interface RecentTransaction {
    txHash: string;
    recordedAt: string;
    status: TxStatus;
}

export const debuggerApi = {
    run(workspaceId: string, contract: string): Promise<ContractRun> {
        return apiClient(`/workspaces/${workspaceId}/debug/run`, { method: 'POST', body: JSON.stringify({ contract }) });
    },

    transactions(workspaceId: string): Promise<RecentTransaction[]> {
        return apiClient(`/workspaces/${workspaceId}/debug/transactions`);
    },

    debugTransaction(workspaceId: string, txHash: string, replace: string[]): Promise<TransactionDebug> {
        return apiClient(`/workspaces/${workspaceId}/debug/tx`, { method: 'POST', body: JSON.stringify({ txHash, replace }) });
    },
};
