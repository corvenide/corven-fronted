// src/features/workspace/components/EditorPanel.tsx
import { useEffect, useMemo, useState, type Ref } from 'react';
import { Link } from 'react-router-dom';
import {
    Check,
    FileCode,
    Loader2,
    Save,
    Wand2,
    Globe,
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
        backgroundColor: '#101419',
        fontSize: '11.5px',
    },
    '.cm-scroller': {
        fontFamily:
            '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
        lineHeight: '1.6',
    },
    '.cm-gutters': {
        backgroundColor: '#101419',
        borderRight: '1px solid rgba(60, 74, 66, 0.4)',
        color: '#86948a',
    },
    '.cm-activeLine': {
        backgroundColor: 'rgba(78, 222, 163, 0.04)',
    },
    '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
        color: '#4edea3',
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
            <div className="flex flex-1 items-center justify-center text-[12px] font-mono text-on-surface-variant">
                Loading file...
            </div>
        );
    }

    if (!file) {
        return (
            <div className="flex flex-1 items-center justify-center text-[12px] font-mono text-on-surface-variant">
                Select a file to start editing.
            </div>
        );
    }

    return (
        <section className="flex min-w-0 flex-1 flex-col bg-surface">
            {/* Tab header */}
            <div className="flex h-8 items-center border-b border-outline-variant/30 bg-surface-container-low px-2">
                <div className="flex h-full items-center gap-1.5 border-r border-t-2 border-r-outline-variant/20 border-t-primary bg-surface px-2.5 text-primary text-[10.5px] font-mono">
                    <FileCode className="h-3 w-3" />

                    <span>
                        {file.name}
                        {isDirty && ' •'}
                    </span>
                </div>
            </div>

            {/* Breadcrumb & Action bar */}
            <div className="flex h-7 items-center justify-between border-b border-outline-variant/20 bg-surface-container px-3">
                <span className="truncate font-mono text-[10px] text-on-surface-variant flex items-center gap-1">
                    <span className="text-primary font-medium">WORKSPACE</span>
                    <span>/</span>
                    <span>{file.path}</span>
                </span>

                <div className="flex shrink-0 items-center gap-1.5">
                {(file.path.endsWith('.html') ||
                    file.path.endsWith('.css') ||
                    file.path.endsWith('.js') ||
                    file.path.endsWith('.ts') ||
                    file.path.endsWith('.tsx') ||
                    file.path.includes('frontend/')) && (
                    <Link
                        to={`/browser?url=workspace://${file.path}`}
                        className="flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary hover:bg-primary/20 transition-colors"
                        title="Preview this frontend application in Browser App"
                    >
                        <Globe className="h-2.5 w-2.5" />
                        <span>Preview</span>
                    </Link>
                )}

                {isSchema && (['rust', 'c'] as const).map((language) => (
                    <button
                        key={language}
                        type="button"
                        disabled={bindings.state === 'running'}
                        onClick={() => void generateBindings(language)}
                        title={`Run moleculec and write ${file.name.replace(/\.mol$/i, language === 'rust' ? '.rs' : '.h')} next to this schema`}
                        className="flex items-center gap-1 rounded border border-outline-variant/30 bg-surface-container-high px-2 py-0.5 text-[10px] font-mono text-secondary hover:border-secondary/50 disabled:opacity-50 transition-colors"
                    >
                        {bindings.state === 'running' && bindings.language === language ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                            <Wand2 className="h-2.5 w-2.5" />
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
                    className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-mono transition-colors disabled:opacity-50 ${
                        isDirty
                            ? 'border-primary/50 bg-primary/10 text-primary font-medium hover:bg-primary/20'
                            : 'border-outline-variant/30 bg-surface-container-high text-on-surface-variant'
                    }`}
                >
                    {isDirty ? (
                        <Save className="h-2.5 w-2.5" />
                    ) : (
                        <Check className="h-2.5 w-2.5 text-primary" />
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
                    className={`flex items-start justify-between gap-3 border-b px-3 py-1 font-mono text-[10.5px] ${
                        bindings.state === 'done'
                            ? 'border-primary/20 bg-primary/5 text-primary'
                            : 'border-error/20 bg-error/5 text-error'
                    }`}
                >
                    <span className="min-w-0 break-words">
                        {bindings.state === 'done'
                            ? `Wrote ${bindings.result.outputPath} (${(bindings.result.bytes / 1024).toFixed(1)} KB).`
                            : bindings.message}
                    </span>
                    <button
                        type="button"
                        onClick={() => setBindings({ state: 'idle' })}
                        className="shrink-0 text-on-surface-variant hover:text-on-surface"
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