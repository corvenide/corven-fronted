// src/features/workspace/utils/molecule-language.ts
//
// Syntax highlighting for Molecule schemas (.mol), CKB's serialization
// format: https://github.com/nervosnetwork/molecule
//
//   import blockchain;
//   array Byte32 [byte; 32];
//   vector Bytes <byte>;
//   option BytesOpt (Bytes);
//   union Action { Mint, Transfer }
//   struct Point { x: Uint32, y: Uint32 }
//   table Token { name: Bytes, amount: Uint128 }

import { StreamLanguage, type StreamParser } from '@codemirror/language';

const KEYWORDS = new Set(['array', 'vector', 'option', 'union', 'struct', 'table', 'import']);

interface MoleculeState {
    inBlockComment: boolean;
    /** The previous word was a declaration keyword, so this one is a definition. */
    expectDefinition: boolean;
}

export const moleculeParser: StreamParser<MoleculeState> = {
    name: 'molecule',

    startState: () => ({ inBlockComment: false, expectDefinition: false }),

    token(stream, state) {
        if (state.inBlockComment) {
            if (stream.skipTo('*/')) {
                stream.match('*/');
                state.inBlockComment = false;
            } else {
                stream.skipToEnd();
            }
            return 'blockComment';
        }

        if (stream.eatSpace()) return null;

        if (stream.match('//')) {
            stream.skipToEnd();
            return 'lineComment';
        }
        if (stream.match('/*')) {
            state.inBlockComment = true;
            return 'blockComment';
        }

        if (stream.match(/^\d+/)) return 'number';

        const word = stream.match(/^[A-Za-z_][A-Za-z0-9_]*/) as RegExpMatchArray | null;
        if (word) {
            const text = word[0];
            if (KEYWORDS.has(text)) {
                state.expectDefinition = text !== 'import';
                return 'keyword';
            }
            if (state.expectDefinition) {
                state.expectDefinition = false;
                return 'typeName definition';
            }
            if (text === 'byte') return 'standard typeName';
            // "name:" is a field; anything else in type position is a type.
            if (stream.match(/^\s*:/, false)) return 'propertyName';
            return 'typeName';
        }

        const ch = stream.next();
        if (ch && '{}[]()<>'.includes(ch)) return 'bracket';
        if (ch && ';,:'.includes(ch)) return 'punctuation';
        return null;
    },

    languageData: {
        commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
        closeBrackets: { brackets: ['(', '[', '{', '<'] },
    },
};

export function molecule() {
    return StreamLanguage.define(moleculeParser);
}
