// src/features/workspace/components/EditorPanel.tsx
import { useEffect, useMemo, useState, type Ref } from 'react';
import {
    Check,
    FileCode,
    Loader2,
    Save,
    Wand2,
} from 'lucide-react';
import CodeMirror, {
    type ReactCodeMirrorRef,
} from '@uiw/react-codemirror';
import { githubDark } from '@uiw/codemirror-theme-github';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { indentUnit } from '@codemirror/language';
import { indentWithTab } from '@codemirror/commands';
import { lintGutter } from '@codemirror/lint';

import type {
    WorkspaceFile,
} from '../types/workspace.types';
import {
    getLanguageExtension,
    getIndentSize,
} from '../utils/getLanguageExtension';
import { syntaxErrorLinter } from '../utils/syntaxErrorLinter';
import type { MoleculeLanguage, MoleculeResult } from '../api/molecule.api';

interface EditorPanelProps {
    file: WorkspaceFile | null;
    content: string;
    isDirty: boolean;
    isSaving: boolean;
    isLoading: boolean;

    onChange: (content: string) => void;
    onSave: () => Promise<void>;

    /** Access to the CodeMirror view (selection, inserting code). */
    editorRef?: Ref<ReactCodeMirrorRef>;

    /** Molecule schemas: generate bindings next to the open .mol file. */
    onGenerateBindings?: (language: MoleculeLanguage) => Promise<MoleculeResult>;
}

type BindingsStatus =
    | { state: 'idle' }
    | { state: 'running'; language: MoleculeLanguage }
    | { state: 'done'; result: MoleculeResult }
    | { state: 'error'; message: string };

// Tweaks the bundled github-dark theme so it matches this app's palette
// (#0d1117 background, #30363d borders) instead of GitHub's own tones.
const editorTheme = EditorView.theme({
    '&': {
        height: '100%',
        backgroundColor: '#0d1117',
        fontSize: '12px',
    },
    '.cm-scroller': {
        fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, monospace',
        lineHeight: '1.6',
    },
    '.cm-gutters': {
        backgroundColor: '#0d1117',
        borderRight: '1px solid rgb(31 41 55 / 0.5)',
        color: '#6b7280',
    },
    '.cm-activeLine': {
        backgroundColor: 'rgba(110, 118, 129, 0.08)',
    },
    '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
        color: '#9ca3af',
    },
    '&.cm-focused': {
        outline: 'none',
    },
});

export function EditorPanel({
    file,
    content,
    isDirty,
    isSaving,
    isLoading,
    onChange,
    onSave,
    editorRef,
    onGenerateBindings,
}: EditorPanelProps) {
    const [bindings, setBindings] = useState<BindingsStatus>({ state: 'idle' });
    useEffect(() => setBindings({ state: 'idle' }), [file?.path]);

    const isSchema = Boolean(file?.name.toLowerCase().endsWith('.mol') && onGenerateBindings);

    const generateBindings = async (language: MoleculeLanguage) => {
        if (!onGenerateBindings) return;
        setBindings({ state: 'running', language });
        try {
            setBindings({ state: 'done', result: await onGenerateBindings(language) });
        } catch (error) {
            setBindings({ state: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    };

    // Recompute the language extension only when the open file changes,
    // not on every keystroke.
    const languageExtension = useMemo(
        () => getLanguageExtension(file?.name ?? ''),
        [file?.name],
    );

    const indentSize = useMemo(
        () => getIndentSize(file?.name ?? ''),
        [file?.name],
    );

    const extensions = useMemo(() => {
        const base = [
            editorTheme,
            indentUnit.of(' '.repeat(indentSize)),
            // Tab/Shift-Tab indent or dedent the current line/selection
            // instead of moving focus off the editor.
            Prec.highest(keymap.of([indentWithTab])),
            // High precedence so Mod-s is caught before the browser's
            // "Save Page" shortcut.
            Prec.highest(
                keymap.of([
                    {
                        key: 'Mod-s',
                        run: () => {
                            void onSave();
                            return true;
                        },
                    },
                ]),
            ),
            lintGutter(),
            syntaxErrorLinter,
        ];

        return languageExtension
            ? [...base, languageExtension]
            : base;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [languageExtension, indentSize]);

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                Loading file...
            </div>
        );
    }

    if (!file) {
        return (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                Select a file to start editing.
            </div>
        );
    }

    return (
        <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-11 items-center border-b border-[#30363d] bg-[#161b22]">
                <div className="flex h-full items-center gap-2 border-r border-t-2 border-r-[#30363d] border-t-[#1f6feb] bg-[#0d1117] px-4 text-[#58a6ff]">
                    <FileCode className="h-3.5 w-3.5" />

                    <span className="font-mono text-xs">
                        {file.name}
                        {isDirty && ' •'}
                    </span>
                </div>
            </div>

            <div className="flex h-9 items-center justify-between border-b border-[#30363d]/60 px-4">
                <span className="truncate font-mono text-[11px] text-gray-500">
                    WORKSPACE &gt; {file.path}
                </span>

                <div className="flex shrink-0 items-center gap-1.5">
                {isSchema && (['rust', 'c'] as const).map((language) => (
                    <button
                        key={language}
                        type="button"
                        disabled={bindings.state === 'running'}
                        onClick={() => void generateBindings(language)}
                        title={`Run moleculec and write ${file.name.replace(/\.mol$/i, language === 'rust' ? '.rs' : '.h')} next to this schema`}
                        className="flex items-center gap-1 rounded border border-[#30363d] bg-[#21262d] px-2.5 py-1 text-[11px] text-gray-300 hover:border-[#484f58] disabled:opacity-50"
                    >
                        {bindings.state === 'running' && bindings.language === language ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Wand2 className="h-3.5 w-3.5" />
                        )}
                        {language === 'rust' ? 'Rust bindings' : 'C header'}
                    </button>
                ))}

                <button
                    type="button"
                    disabled={
                        !isDirty || isSaving
                    }
                    onClick={() =>
                        void onSave()
                    }
                    className="flex items-center gap-1 rounded border border-[#30363d] bg-[#21262d] px-2.5 py-1 text-[11px] text-gray-300 disabled:opacity-50"
                >
                    {isDirty ? (
                        <Save className="h-3.5 w-3.5" />
                    ) : (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                    )}

                    {isSaving
                        ? 'Saving...'
                        : isDirty
                            ? 'Save'
                            : 'Saved'}
                </button>
                </div>
            </div>

            {isSchema && (bindings.state === 'done' || bindings.state === 'error') && (
                <div
                    role="status"
                    className={`flex items-start justify-between gap-3 border-b px-4 py-1.5 text-[11.5px] ${
                        bindings.state === 'done'
                            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
                            : 'border-rose-500/20 bg-rose-500/5 text-rose-300'
                    }`}
                >
                    <span className="min-w-0 break-words font-mono">
                        {bindings.state === 'done'
                            ? `Wrote ${bindings.result.outputPath} (${(bindings.result.bytes / 1024).toFixed(1)} KB). ${
                                bindings.result.language === 'rust'
                                    ? 'Add molecule = { version = "0.9", default-features = false } to the contract to use it.'
                                    : 'Include it with molecule_reader.h / molecule_builder.h.'
                            }`
                            : bindings.message}
                    </span>
                    <button
                        type="button"
                        onClick={() => setBindings({ state: 'idle' })}
                        className="shrink-0 text-gray-500 hover:text-gray-300"
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="min-h-0 flex-1 overflow-hidden">
                <CodeMirror
                    ref={editorRef}
                    value={content}
                    onChange={onChange}
                    extensions={extensions}
                    theme={githubDark}
                    height="100%"
                    basicSetup={{
                        lineNumbers: true,
                        foldGutter: true,
                        highlightActiveLine: true,
                        highlightActiveLineGutter: true,
                        autocompletion: true,
                        bracketMatching: true,
                        closeBrackets: true,
                        indentOnInput: true,
                    }}
                />
            </div>
        </section>
    );
}