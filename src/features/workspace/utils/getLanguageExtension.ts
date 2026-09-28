import { rust } from '@codemirror/lang-rust';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import type { Extension } from '@codemirror/state';

import { molecule } from './molecule-language';

/**
 * Maps a file name/path to the matching CodeMirror language extension.
 * Falls back to `null` (plain text, no highlighting) for unknown types.
 */
export function getLanguageExtension(
    fileName: string,
): Extension | null {
    const ext = fileName.split('.').pop()?.toLowerCase();

    switch (ext) {
        case 'rs':
            return rust();
        case 'ts':
        case 'tsx':
        case 'js':
        case 'jsx':
        case 'mjs':
        case 'cjs':
            return javascript({
                jsx: ext === 'tsx' || ext === 'jsx',
                typescript: ext === 'ts' || ext === 'tsx',
            });
        case 'py':
            return python();
        case 'json':
            return json();
        case 'css':
            return css();
        case 'html':
            return html();
        case 'md':
        case 'mdx':
            return markdown();
        case 'mol':
            return molecule();
        default:
            return null;
    }
}

/**
 * Per-language indent width, matching each ecosystem's own convention
 * (rustfmt defaults to 4, Prettier/JS land defaults to 2, etc).
 */
export function getIndentSize(fileName: string): number {
    const ext = fileName.split('.').pop()?.toLowerCase();

    switch (ext) {
        case 'rs':
        case 'py':
        case 'json':
        case 'mol':
            return 4;
        case 'ts':
        case 'tsx':
        case 'js':
        case 'jsx':
        case 'mjs':
        case 'cjs':
        case 'css':
        case 'html':
        case 'md':
        case 'mdx':
        default:
            return 2;
    }
}