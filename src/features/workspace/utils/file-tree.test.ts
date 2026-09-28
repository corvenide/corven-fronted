import { describe, expect, it } from 'vitest';

import type { WorkspaceEntry } from '../types/workspace.types';
import { buildFileTree } from './file-tree';

function entry(path: string, type: 'file' | 'directory'): WorkspaceEntry {
    return { path, type, name: path.split('/').pop() } as WorkspaceEntry;
}

describe('buildFileTree', () => {
    it('returns an empty tree for no entries', () => {
        expect(buildFileTree([])).toEqual([]);
    });

    it('nests files under their directories', () => {
        const tree = buildFileTree([
            entry('contracts', 'directory'),
            entry('contracts/hello-world', 'directory'),
            entry('contracts/hello-world/src/main.rs', 'file'),
            entry('Cargo.toml', 'file'),
        ]);

        expect(tree.map((node) => node.name)).toEqual(['contracts', 'Cargo.toml']);

        const helloWorld = tree[0].children[0];
        expect(helloWorld).toMatchObject({ name: 'hello-world', path: 'contracts/hello-world', type: 'directory' });

        const src = helloWorld.children[0];
        expect(src).toMatchObject({ name: 'src', path: 'contracts/hello-world/src', type: 'directory' });
        expect(src.children).toEqual([
            { name: 'main.rs', path: 'contracts/hello-world/src/main.rs', type: 'file', children: [] },
        ]);
    });

    it('lists directories before files, each alphabetically', () => {
        const tree = buildFileTree([
            entry('b.rs', 'file'),
            entry('z-dir', 'directory'),
            entry('a.rs', 'file'),
            entry('a-dir', 'directory'),
        ]);

        expect(tree.map((node) => node.name)).toEqual(['a-dir', 'z-dir', 'a.rs', 'b.rs']);
    });

    it('creates missing parent directories for deep files', () => {
        const [root] = buildFileTree([entry('a/b/c.txt', 'file')]);

        expect(root).toMatchObject({ name: 'a', type: 'directory' });
        expect(root.children[0]).toMatchObject({ name: 'b', type: 'directory' });
        expect(root.children[0].children[0]).toMatchObject({ name: 'c.txt', type: 'file' });
    });

    it('does not duplicate a directory listed after its files', () => {
        const tree = buildFileTree([entry('src/lib.rs', 'file'), entry('src', 'directory')]);

        expect(tree).toHaveLength(1);
        expect(tree[0].children.map((node) => node.name)).toEqual(['lib.rs']);
    });
});
