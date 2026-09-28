// src/features/deploy/deploy.api.ts
import { apiClient } from '../../lib/api-client';
import type { WalletDeployResult } from './wallet-deploy';

export interface BuiltContract {
    name: string;
    sizeBytes: number;
    builtAt: string;
}

export type DeployNetwork = 'DEVNET' | 'TESTNET' | 'MAINNET';

export interface ContractDeployment {
    id: string;
    workspaceId: string;
    network: DeployNetwork;
    contractName: string;
    txHash: string;
    outputIndex: number;
    codeHash: string;
    hashType: string;
    typeId: string | null;
    typeArgs: string | null;
    dataHash: string;
    sizeBytes: number;
    capacity: string;
    deployerAddress: string | null;
    upgradeOfId: string | null;
    createdAt: string;
}

export const deployApi = {
    contracts(workspaceId: string): Promise<BuiltContract[]> {
        return apiClient(`/workspaces/${workspaceId}/contracts`);
    },

    binary(workspaceId: string, name: string): Promise<{ name: string; base64: string; sizeBytes: number }> {
        return apiClient(`/workspaces/${workspaceId}/contracts/${encodeURIComponent(name)}/binary`);
    },

    deployments(workspaceId: string): Promise<ContractDeployment[]> {
        return apiClient(`/workspaces/${workspaceId}/deployments`);
    },

    deployDevnet(workspaceId: string, contract: string, upgradable: boolean): Promise<ContractDeployment> {
        return apiClient(`/workspaces/${workspaceId}/deployments/devnet`, {
            method: 'POST',
            body: JSON.stringify({ contract, upgradable }),
        });
    },

    record(workspaceId: string, contractName: string, result: WalletDeployResult): Promise<ContractDeployment> {
        return apiClient(`/workspaces/${workspaceId}/deployments`, {
            method: 'POST',
            body: JSON.stringify({ network: 'testnet', contractName, ...result }),
        });
    },
};

export function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}
