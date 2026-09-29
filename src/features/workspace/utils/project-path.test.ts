import { describe, expect, it } from 'vitest';

import {
    cwdForCommand,
    getRootDirectories,
    mergeProjectOptions,
    normalizeWorkspaceProjectPath,
    parseProjectsList,
} from './project-path';

describe('normalizeWorkspaceProjectPath', () => {
    it('treats empty and root values as workspace root', () => {
        expect(normalizeWorkspaceProjectPath('')).toBe('.');
        expect(normalizeWorkspaceProjectPath('.')).toBe('.');
        expect(normalizeWorkspaceProjectPath('./')).toBe('.');
        expect(normalizeWorkspaceProjectPath('/workspace')).toBe('.');
    });

    it('strips workspace prefixes and trailing slashes', () => {
        expect(normalizeWorkspaceProjectPath('/workspace/ckb-rust-script/')).toBe(
            'ckb-rust-script',
        );
        expect(normalizeWorkspaceProjectPath('./contracts/hello-world')).toBe(
            'contracts/hello-world',
        );
    });

    it('reads path from project objects', () => {
        expect(normalizeWorkspaceProjectPath({ path: 'contracts/hello-world' })).toBe(
            'contracts/hello-world',
        );
    });
});

describe('parseProjectsList', () => {
    it('normalizes and deduplicates mixed payloads', () => {
        expect(
            parseProjectsList([
                'ckb-rust-script',
                './ckb-rust-script/',
                { path: '/workspace/contracts' },
                '.',
            ]),
        ).toEqual(['ckb-rust-script', 'contracts']);
    });
});

describe('cwdForCommand', () => {
    it('omits cwd for the workspace root', () => {
        expect(cwdForCommand('.')).toBeUndefined();
        expect(cwdForCommand('contracts')).toBe('contracts');
    });
});

describe('getRootDirectories', () => {
    it('returns unique first-level directories', () => {
        expect(
            getRootDirectories([
                { path: 'contracts', type: 'directory' },
                { path: 'contracts/hello-world', type: 'directory' },
                { path: 'src', type: 'directory' },
                { path: 'README.md', type: 'file' },
            ]),
        ).toEqual([
            { name: 'contracts', path: 'contracts', count: 2 },
            { name: 'src', path: 'src', count: 1 },
        ]);
    });
});

describe('mergeProjectOptions', () => {
    it('puts workspace root first, then directories, then extra detected projects', () => {
        expect(
            mergeProjectOptions(['contracts/hello-world', 'contracts'], [
                { path: 'contracts' },
                { path: 'src' },
            ]),
        ).toEqual(['.', 'contracts', 'src', 'contracts/hello-world']);
    });
});
