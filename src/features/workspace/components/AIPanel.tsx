// src/features/workspace/components/AIPanel.tsx
//
// Claude, in the IDE. Replies stream from /api/ai/chat. Each question can
// carry the open file (and selection) as context; the Build and Tests panels
// can send their output here with "Ask Claude".

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    AlertTriangle,
    ArrowUp,
    Check,
    ChevronDown,
    FileCode,
    KeyRound,
    PanelRightClose,
    RotateCw,
    Sparkles,
    SquarePen,
    Square,
    Terminal,
} from 'lucide-react';

import { aiApi, type AiChatMessage } from '../../ai/api/ai.api';
import type { AssistantRequest } from '../../ai/assistant-bridge';
import { Markdown } from '../../ai/components/Markdown';

export interface EditorContext {
    path: string;
    content: string;
    selection: string;
}

interface AIPanelProps {
    workspaceId: string;
    onCollapse?: () => void;
    /** Reads the open file and selection at send time. */
    getEditorContext: () => EditorContext | null;
    /** Inserts code at the cursor; undefined when no file is open. */
    onInsertCode?: (code: string) => void;
    /** A question sent from another panel (e.g. "Ask Claude" on a failed build). */
    request: AssistantRequest | null;
    onRequestHandled: () => void;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    /** User messages: what was attached. */
    context?: { file?: string; selection?: boolean; output?: 'build' | 'test' | 'terminal' };
    /** Assistant messages. */
    error?: string;
    streaming?: boolean;
}

const HISTORY_LIMIT = 40;

const OUTPUT_LABEL = { build: 'Build output', test: 'Test output', terminal: 'Terminal output' } as const;

function storageKey(workspaceId: string) {
    return `corven.ai.chat.${workspaceId}`;
}

function loadHistory(workspaceId: string): Message[] {
    try {
        const raw = localStorage.getItem(storageKey(workspaceId));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((m) => m && typeof m.content === 'string') : [];
    } catch {
        return [];
    }
}

function saveHistory(workspaceId: string, messages: Message[]) {
    try {
        const settled = messages.filter((m) => !m.streaming).slice(-HISTORY_LIMIT);
        localStorage.setItem(storageKey(workspaceId), JSON.stringify(settled));
    } catch {
        /* storage unavailable */
    }
}

function modelKey() {
    return 'corven.ai.model';
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function AIPanel({ workspaceId, onCollapse, getEditorContext, onInsertCode, request, onRequestHandled }: AIPanelProps) {
    const status = useQuery({ queryKey: ['ai', 'status'], queryFn: aiApi.status, staleTime: 5 * 60_000, retry: 1 });

    const [messages, setMessages] = useState<Message[]>(() => loadHistory(workspaceId));
    const [input, setInput] = useState('');
    const [includeFile, setIncludeFile] = useState(true);
    const [model, setModel] = useState<string>(() => {
        try {
            return localStorage.getItem(modelKey()) ?? '';
        } catch {
            return '';
        }
    });
    const [pickerOpen, setPickerOpen] = useState(false);
    const [fileLabel, setFileLabel] = useState<string | null>(null);

    const abortRef = useRef<AbortController | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const busy = messages.some((m) => m.streaming);
    const models = status.data?.models ?? [];
    const activeModel = models.find((m) => m.id === model) ?? models.find((m) => m.id === status.data?.defaultModel) ?? models[0];

    useEffect(() => saveHistory(workspaceId, messages), [workspaceId, messages]);

    // Stop a running reply when leaving the workspace.
    useEffect(() => () => abortRef.current?.abort(), []);

    // Keep the newest message in view while streaming.
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

    // Show which file will be sent (refreshes when the panel is used).
    const refreshFileLabel = useCallback(() => {
        const ctx = getEditorContext();
        setFileLabel(ctx ? `${ctx.path}${ctx.selection ? ' · selection' : ''}` : null);
    }, [getEditorContext]);

    useEffect(() => {
        refreshFileLabel();
        const timer = window.setInterval(refreshFileLabel, 1500);
        return () => window.clearInterval(timer);
    }, [refreshFileLabel]);

    const send = useCallback(
        async (prompt: string, output?: AssistantRequest['output']) => {
            const text = prompt.trim();
            if (!text || busy) return;

            const editor = includeFile ? getEditorContext() : null;

            const userMessage: Message = {
                id: newId(),
                role: 'user',
                content: text,
                context: {
                    file: editor?.path,
                    selection: Boolean(editor?.selection),
                    output: output?.kind,
                },
            };
            const replyId = newId();

            const history: AiChatMessage[] = [...messages.filter((m) => !m.error && m.content), userMessage].map((m) => ({
                role: m.role,
                content: m.content,
            }));

            setMessages((current) => [...current, userMessage, { id: replyId, role: 'assistant', content: '', streaming: true }]);
            setInput('');

            const controller = new AbortController();
            abortRef.current = controller;

            const patch = (update: Partial<Message> | ((m: Message) => Partial<Message>)) =>
                setMessages((current) =>
                    current.map((m) => (m.id === replyId ? { ...m, ...(typeof update === 'function' ? update(m) : update) } : m)),
                );

            try {
                await aiApi.chat(
                    {
                        workspaceId,
                        model: activeModel?.id,
                        messages: history,
                        activeFile: editor
                            ? { path: editor.path, content: editor.content, selection: editor.selection || undefined }
                            : undefined,
                        output,
                    },
                    {
                        signal: controller.signal,
                        onText: (chunk) => patch((m) => ({ content: m.content + chunk })),
                    },
                );
                patch({ streaming: false });
            } catch (error) {
                if (controller.signal.aborted) {
                    patch((m) => ({ streaming: false, content: m.content || '_Stopped._' }));
                } else {
                    patch({ streaming: false, error: error instanceof Error ? error.message : 'Something went wrong.' });
                }
            } finally {
                if (abortRef.current === controller) abortRef.current = null;
            }
        },
        [busy, includeFile, getEditorContext, messages, workspaceId, activeModel?.id],
    );

    // Questions from the Build / Tests panels.
    useEffect(() => {
        if (!request || busy || !status.data?.enabled) return;
        onRequestHandled();
        void send(request.prompt, request.output);
    }, [request, busy, status.data?.enabled, send, onRequestHandled]);

    const retry = (assistantId: string) => {
        const index = messages.findIndex((m) => m.id === assistantId);
        const question = messages.slice(0, index).reverse().find((m) => m.role === 'user');
        if (!question) return;
        setMessages((current) => current.filter((m) => m.id !== assistantId && m.id !== question.id));
        void send(question.content);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void send(input);
        }
    };

    // Grow the input with its content, up to a limit.
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    }, [input]);

    const suggestions = useMemo(
        () =>
            fileLabel
                ? [
                      'Explain what this file does',
                      'Review this contract for bugs and cycle costs',
                      'Write a ckb-testtool test for this contract',
                      'How do I deploy this to the devnet?',
                  ]
                : [
                      'How is this project structured?',
                      'How do I write a type script that validates cell data?',
                      'How do I deploy a contract to the devnet?',
                  ],
        [fileLabel],
    );

    // ------------------------------------------------------------------ render

    const header = (
        <div className="flex h-8 shrink-0 items-center justify-between border-b border-outline-variant/30 bg-surface-container px-3">
            <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-primary/15 text-primary">
                    <Sparkles className="h-2.5 w-2.5" />
                </span>
                <span className="font-mono text-[10.5px] font-semibold text-on-surface uppercase tracking-wider">Assistant</span>

                {status.data?.enabled && activeModel && (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setPickerOpen((open) => !open)}
                            className="flex h-5 items-center gap-1 rounded px-1.5 font-mono text-[10px] text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                            aria-haspopup="listbox"
                            aria-expanded={pickerOpen}
                        >
                            {activeModel.name}
                            <ChevronDown className="h-2.5 w-2.5" />
                        </button>

                        {pickerOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                                <div role="listbox" className="absolute left-0 top-6 z-50 w-56 overflow-hidden rounded border border-outline-variant/40 bg-surface-container-high py-1 shadow-2xl">
                                    {models.map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            role="option"
                                            aria-selected={m.id === activeModel.id}
                                            onClick={() => {
                                                setModel(m.id);
                                                try {
                                                    localStorage.setItem(modelKey(), m.id);
                                                } catch {
                                                    /* ignore */
                                                }
                                                setPickerOpen(false);
                                            }}
                                            className="flex w-full items-start gap-2 px-2.5 py-1.5 text-left font-mono hover:bg-surface-container"
                                        >
                                            <Check className={`mt-0.5 h-3 w-3 shrink-0 ${m.id === activeModel.id ? 'text-primary' : 'text-transparent'}`} />
                                            <span>
                                                <span className="block text-[11px] text-on-surface">{m.name}</span>
                                                {m.description && <span className="block text-[9.5px] text-on-surface-variant/70">{m.description}</span>}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-0.5">
                <button
                    type="button"
                    title="New chat"
                    aria-label="New chat"
                    disabled={busy || messages.length === 0}
                    onClick={() => setMessages([])}
                    className="flex h-6 w-6 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
                >
                    <SquarePen className="h-3 w-3" />
                </button>
                {onCollapse && (
                    <button
                        type="button"
                        title="Hide panel"
                        aria-label="Hide panel"
                        onClick={onCollapse}
                        className="flex h-6 w-6 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                    >
                        <PanelRightClose className="h-3 w-3" />
                    </button>
                )}
            </div>
        </div>
    );

    if (status.isLoading) {
        return (
            <div className="flex h-full flex-col bg-surface-container-low font-mono">
                {header}
                <div className="flex-1 space-y-2.5 p-3">
                    <div className="h-2.5 w-2/3 animate-pulse rounded bg-surface-container" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-container" />
                </div>
            </div>
        );
    }

    if (status.isError || !status.data?.enabled) {
        return (
            <div className="flex h-full flex-col bg-surface-container-low font-mono">
                {header}
                <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container">
                        {status.isError ? <AlertTriangle className="h-4 w-4 text-amber-400" /> : <KeyRound className="h-4 w-4 text-on-surface-variant" />}
                    </div>
                    <p className="mt-3 text-[11.5px] font-medium text-on-surface">
                        {status.isError ? 'Unable to reach assistant' : 'Assistant requires API key'}
                    </p>
                    <p className="mt-1 text-[10.5px] leading-relaxed text-on-surface-variant">
                        {status.isError ? (
                            'Verify the backend server is running and try again.'
                        ) : (
                            <>
                                Set <code className="rounded bg-surface px-1 font-mono text-[10px] text-primary">ANTHROPIC_API_KEY</code> or Gemini in environment.
                            </>
                        )}
                    </p>
                    {status.isError && (
                        <button
                            type="button"
                            onClick={() => void status.refetch()}
                            className="mt-3 inline-flex items-center gap-1 rounded border border-outline-variant/30 px-2.5 py-1 text-[10.5px] text-on-surface hover:bg-surface-container"
                        >
                            <RotateCw className="h-3 w-3" /> Retry
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-surface-container-low font-mono">
            {header}

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {messages.length === 0 ? (
                    <div className="px-1 text-[10.5px]">
                        <p className="font-medium text-on-surface">Contract Assistant</p>
                        <p className="mt-1 leading-relaxed text-on-surface-variant">
                            Ask questions regarding smart contract architecture, cycle optimizations, or test harnesses.
                        </p>
                        <div className="mt-3 space-y-1">
                            {suggestions.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => void send(s)}
                                    className="block w-full rounded border border-outline-variant/30 bg-surface px-2.5 py-1.5 text-left text-[10.5px] text-on-surface-variant transition-colors hover:border-secondary hover:text-on-surface"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {messages.map((message) =>
                            message.role === 'user' ? (
                                <div key={message.id} className="flex flex-col items-end gap-1">
                                    <div className="max-w-[94%] whitespace-pre-wrap break-words rounded bg-surface-container-high px-2.5 py-1.5 text-[11px] leading-relaxed text-on-surface">
                                        {message.content}
                                    </div>
                                    {(message.context?.file || message.context?.output) && (
                                        <div className="flex max-w-[94%] flex-wrap justify-end gap-1 text-[9.5px]">
                                            {message.context.output && (
                                                <span className="inline-flex items-center gap-1 rounded border border-outline-variant/30 px-1.5 py-0.5 text-on-surface-variant">
                                                    <Terminal className="h-2.5 w-2.5" /> {OUTPUT_LABEL[message.context.output]}
                                                </span>
                                            )}
                                            {message.context.file && (
                                                <span className="inline-flex max-w-full items-center gap-1 truncate rounded border border-outline-variant/30 px-1.5 py-0.5 text-on-surface-variant">
                                                    <FileCode className="h-2.5 w-2.5 shrink-0" />
                                                    <span className="truncate">{message.context.file.split('/').pop()}</span>
                                                    {message.context.selection && ' · sel'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div key={message.id} className="min-w-0 text-[11px]">
                                    {message.content ? (
                                        <Markdown text={message.content} onInsertCode={onInsertCode} />
                                    ) : message.streaming ? (
                                        <div className="flex items-center gap-1.5 py-1 text-[10.5px] text-on-surface-variant">
                                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                                            Thinking…
                                        </div>
                                    ) : null}

                                    {message.streaming && message.content && (
                                        <span className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 animate-pulse bg-primary" />
                                    )}

                                    {message.error && (
                                        <div className="mt-1.5 flex items-start gap-1.5 rounded border border-error/30 bg-error/10 p-2 text-[10.5px] text-error">
                                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                {message.error}
                                                <button
                                                    type="button"
                                                    onClick={() => retry(message.id)}
                                                    className="ml-2 font-medium underline underline-offset-2 hover:opacity-80"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ),
                        )}
                    </div>
                )}
            </div>

            {/* ------------------------------------------------ Composer */}
            <div className="shrink-0 border-t border-outline-variant/30 p-2 bg-surface-container">
                <div className="rounded border border-outline-variant/30 bg-surface-container-lowest focus-within:border-primary">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={onKeyDown}
                        rows={1}
                        placeholder="Ask assistant…"
                        aria-label="Message Assistant"
                        className="block max-h-[140px] w-full resize-none bg-transparent px-2.5 pt-2 text-[11px] leading-relaxed text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none"
                    />
                    <div className="flex items-center justify-between gap-1.5 px-2 pb-1.5 pt-1">
                        {fileLabel ? (
                            <button
                                type="button"
                                onClick={() => setIncludeFile((v) => !v)}
                                title={includeFile ? 'Open file included' : 'Open file excluded'}
                                className={`inline-flex min-w-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9.5px] transition-colors ${
                                    includeFile ? 'bg-primary/10 text-primary' : 'text-on-surface-variant/50 line-through'
                                }`}
                            >
                                <FileCode className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">{fileLabel.split('/').pop()}</span>
                            </button>
                        ) : (
                            <span className="text-[9.5px] text-on-surface-variant/40">No file</span>
                        )}

                        {busy ? (
                            <button
                                type="button"
                                onClick={() => abortRef.current?.abort()}
                                title="Stop"
                                aria-label="Stop generating"
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                            >
                                <Square className="h-2.5 w-2.5 fill-current" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => void send(input)}
                                disabled={!input.trim()}
                                title="Send (Enter)"
                                aria-label="Send"
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-on-primary transition-colors hover:bg-primary-fixed disabled:bg-surface-container-high disabled:text-on-surface-variant/40"
                            >
                                <ArrowUp className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
