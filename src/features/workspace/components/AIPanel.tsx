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
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#30363d] px-3">
            <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[#d97757]/15 text-[#e8a283]">
                    <Sparkles className="h-3 w-3" />
                </span>
                <span className="text-[13px] font-semibold text-gray-100">Claude</span>

                {status.data?.enabled && activeModel && (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setPickerOpen((open) => !open)}
                            className="flex h-6 items-center gap-1 rounded px-1.5 text-[11.5px] text-gray-400 hover:bg-[#21262d] hover:text-gray-200"
                            aria-haspopup="listbox"
                            aria-expanded={pickerOpen}
                        >
                            {activeModel.name}
                            <ChevronDown className="h-3 w-3" />
                        </button>

                        {pickerOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                                <div role="listbox" className="absolute left-0 top-7 z-50 w-60 overflow-hidden rounded-md border border-[#30363d] bg-[#161b22] py-1 shadow-xl">
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
                                            className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[#21262d]"
                                        >
                                            <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${m.id === activeModel.id ? 'text-[#58a6ff]' : 'text-transparent'}`} />
                                            <span>
                                                <span className="block text-[12.5px] text-gray-100">{m.name}</span>
                                                {m.description && <span className="block text-[11px] text-gray-500">{m.description}</span>}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center">
                <button
                    type="button"
                    title="New chat"
                    aria-label="New chat"
                    disabled={busy || messages.length === 0}
                    onClick={() => setMessages([])}
                    className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-[#21262d] hover:text-gray-200 disabled:opacity-40"
                >
                    <SquarePen className="h-3.5 w-3.5" />
                </button>
                {onCollapse && (
                    <button
                        type="button"
                        title="Hide panel"
                        aria-label="Hide panel"
                        onClick={onCollapse}
                        className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-[#21262d] hover:text-gray-200"
                    >
                        <PanelRightClose className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        </div>
    );

    if (status.isLoading) {
        return (
            <div className="flex h-full flex-col">
                {header}
                <div className="flex-1 space-y-3 p-4">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-[#21262d]" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-[#21262d]" />
                </div>
            </div>
        );
    }

    if (status.isError || !status.data?.enabled) {
        return (
            <div className="flex h-full flex-col">
                {header}
                <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#30363d] bg-[#0d1117]">
                        {status.isError ? <AlertTriangle className="h-4.5 w-4.5 text-amber-400" /> : <KeyRound className="h-4.5 w-4.5 text-gray-300" />}
                    </div>
                    <p className="mt-4 text-[13.5px] font-medium text-gray-100">
                        {status.isError ? 'Couldn’t reach the assistant' : 'Claude isn’t set up yet'}
                    </p>
                    <p className="mt-1.5 text-[12.5px] leading-[1.6] text-gray-400">
                        {status.isError ? (
                            'Check that the API gateway is running, then try again.'
                        ) : (
                            <>
                                Add <code className="rounded bg-[#0d1117] px-1 font-mono text-[11.5px] text-gray-200">ANTHROPIC_API_KEY</code> to{' '}
                                <code className="rounded bg-[#0d1117] px-1 font-mono text-[11.5px] text-gray-200">backend/.env</code> and restart the
                                gateway.
                            </>
                        )}
                    </p>
                    {status.isError && (
                        <button
                            type="button"
                            onClick={() => void status.refetch()}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[#30363d] px-3 py-1.5 text-[12.5px] text-gray-200 hover:bg-[#21262d]"
                        >
                            <RotateCw className="h-3.5 w-3.5" /> Retry
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            {header}

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
                {messages.length === 0 ? (
                    <div className="px-1">
                        <p className="text-[13.5px] font-medium text-gray-100">Ask about your contracts</p>
                        <p className="mt-1 text-[12.5px] leading-[1.6] text-gray-400">
                            Claude sees the open file and your project’s file list. Use “Ask Claude” on a failed build or test to explain
                            the error.
                        </p>
                        <div className="mt-4 space-y-1.5">
                            {suggestions.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => void send(s)}
                                    className="block w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-left text-[12.5px] text-gray-300 transition-colors hover:border-[#484f58] hover:text-gray-100"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {messages.map((message) =>
                            message.role === 'user' ? (
                                <div key={message.id} className="flex flex-col items-end gap-1">
                                    <div className="max-w-[92%] whitespace-pre-wrap break-words rounded-lg bg-[#21262d] px-3 py-2 text-[13px] leading-[1.55] text-gray-100">
                                        {message.content}
                                    </div>
                                    {(message.context?.file || message.context?.output) && (
                                        <div className="flex max-w-[92%] flex-wrap justify-end gap-1">
                                            {message.context.output && (
                                                <span className="inline-flex items-center gap-1 rounded border border-[#30363d] px-1.5 py-0.5 text-[10.5px] text-gray-400">
                                                    <Terminal className="h-3 w-3" /> {OUTPUT_LABEL[message.context.output]}
                                                </span>
                                            )}
                                            {message.context.file && (
                                                <span className="inline-flex max-w-full items-center gap-1 truncate rounded border border-[#30363d] px-1.5 py-0.5 font-mono text-[10.5px] text-gray-400">
                                                    <FileCode className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{message.context.file.split('/').pop()}</span>
                                                    {message.context.selection && ' · sel'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div key={message.id} className="min-w-0">
                                    {message.content ? (
                                        <Markdown text={message.content} onInsertCode={onInsertCode} />
                                    ) : message.streaming ? (
                                        <div className="flex items-center gap-1.5 py-1 text-[12.5px] text-gray-500">
                                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e8a283]" />
                                            Thinking…
                                        </div>
                                    ) : null}

                                    {message.streaming && message.content && (
                                        <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-gray-400" />
                                    )}

                                    {message.error && (
                                        <div className="mt-2 flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[12.5px] text-rose-200">
                                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                {message.error}
                                                <button
                                                    type="button"
                                                    onClick={() => retry(message.id)}
                                                    className="ml-2 font-medium text-rose-100 underline-offset-2 hover:underline"
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
            <div className="shrink-0 border-t border-[#30363d] p-3">
                <div className="rounded-lg border border-[#30363d] bg-[#0d1117] focus-within:border-[#58a6ff]/60">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={onKeyDown}
                        rows={1}
                        placeholder="Ask Claude…"
                        aria-label="Message Claude"
                        className="block max-h-[180px] w-full resize-none bg-transparent px-3 pt-2.5 text-[13px] leading-[1.5] text-gray-100 placeholder:text-gray-500 focus:outline-none"
                    />
                    <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
                        {fileLabel ? (
                            <button
                                type="button"
                                onClick={() => setIncludeFile((v) => !v)}
                                title={includeFile ? 'The open file is sent with your question. Click to leave it out.' : 'Click to send the open file with your question.'}
                                className={`inline-flex min-w-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10.5px] transition-colors ${
                                    includeFile ? 'bg-[#1f6feb]/15 text-[#79b8ff]' : 'text-gray-500 line-through hover:text-gray-400'
                                }`}
                            >
                                <FileCode className="h-3 w-3 shrink-0" />
                                <span className="truncate">{fileLabel.split('/').pop()}</span>
                            </button>
                        ) : (
                            <span className="text-[10.5px] text-gray-600">No file open</span>
                        )}

                        {busy ? (
                            <button
                                type="button"
                                onClick={() => abortRef.current?.abort()}
                                title="Stop"
                                aria-label="Stop generating"
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#21262d] text-gray-200 hover:bg-[#30363d]"
                            >
                                <Square className="h-3 w-3 fill-current" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => void send(input)}
                                disabled={!input.trim()}
                                title="Send (Enter)"
                                aria-label="Send"
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#238636] text-white transition-colors hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:text-gray-500"
                            >
                                <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
                <p className="mt-1.5 px-1 text-[10.5px] text-gray-600">Claude can make mistakes. Check code before you deploy it.</p>
            </div>
        </div>
    );
}
