// src/features/workspace/api/molecule.api.ts
import { apiClient } from '../../../lib/api-client';

export type MoleculeLanguage = 'rust' | 'c';

export interface MoleculeResult {
    schemaPath: string;
    outputPath: string;
    language: MoleculeLanguage;
    bytes: number;
}

export const moleculeApi = {
    /** Runs moleculec on a .mol schema; writes <name>.rs or <name>.h next to it. */
    generate(workspaceId: string, path: string, language: MoleculeLanguage): Promise<MoleculeResult> {
        return apiClient<MoleculeResult>(`/workspaces/${workspaceId}/molecule/generate`, {
            method: 'POST',
            body: JSON.stringify({ path, language }),
        });
    },
};
