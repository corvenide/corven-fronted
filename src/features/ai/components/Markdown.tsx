// src/features/ai/components/Markdown.tsx
//
// A small, safe Markdown renderer for assistant replies: fenced code blocks
// (with Copy / Insert), headings, lists, paragraphs, inline code, bold and
// links. Everything renders as React elements; no HTML is injected.

import { useState, type ReactNode } from 'react';
import { Check, Copy, CornerDownLeft } from 'lucide-react';

interface MarkdownProps {
    text: string;
    /** Inserts code into the editor. Omitted when no file is open. */
    onInsertCode?: (code: string) => void;
}

type Block =
    | { kind: 'code'; lang: string; code: string; closed: boolean }
    | { kind: 'heading'; level: number; text: string }
    | { kind: 'list'; ordered: boolean; items: string[] }
    | { kind: 'paragraph'; text: string };

function parse(text: string): Block[] {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const blocks: Block[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        const fence = /^\s*```\s*([\w+#.-]*)\s*$/.exec(line);
        if (fence) {
            const code: string[] = [];
            i += 1;
            while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
                code.push(lines[i]);
                i += 1;
            }
            const closed = i < lines.length;
            i += 1;
            blocks.push({ kind: 'code', lang: fence[1] || '', code: code.join('\n'), closed });
            continue;
        }

        const heading = /^(#{1,4})\s+(.*)$/.exec(line);
        if (heading) {
            blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
            i += 1;
            continue;
        }

        const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
        const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
        if (bullet || numbered) {
            const ordered = Boolean(numbered);
            const items: string[] = [];
            while (i < lines.length) {
                const match = ordered ? /^\s*\d+[.)]\s+(.*)$/.exec(lines[i]) : /^\s*[-*]\s+(.*)$/.exec(lines[i]);
                if (match) {
                    items.push(match[1]);
                } else if (/^\s{2,}\S/.test(lines[i]) && items.length) {
                    items[items.length - 1] += ` ${lines[i].trim()}`;
                } else {
                    break;
                }
                i += 1;
            }
            blocks.push({ kind: 'list', ordered, items });
            continue;
        }

        if (!line.trim()) {
            i += 1;
            continue;
        }

        const paragraph: string[] = [];
        while (
            i < lines.length &&
            lines[i].trim() &&
            !/^\s*```/.test(lines[i]) &&
            !/^#{1,4}\s/.test(lines[i]) &&
            !/^\s*([-*]|\d+[.)])\s+/.test(lines[i])
        ) {
            paragraph.push(lines[i]);
            i += 1;
        }
        blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
    }

    return blocks;
}

/** Inline formatting: `code`, **bold**, [links](https://…). */
function inline(text: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\((https?:\/\/[^\s)]+)\))/g;
    let last = 0;
    let key = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text))) {
        if (match.index > last) nodes.push(text.slice(last, match.index));

        if (match[1]) {
            nodes.push(
                <code key={key++} className="rounded bg-[#0d1117] px-1 py-0.5 font-mono text-[11.5px] text-[#e6edf3] ring-1 ring-inset ring-[#30363d]">
                    {match[1].slice(1, -1)}
                </code>,
            );
        } else if (match[2]) {
            nodes.push(<strong key={key++} className="font-semibold text-white">{match[2].slice(2, -2)}</strong>);
        } else if (match[3]) {
            const label = /^\[([^\]]+)\]/.exec(match[3])?.[1] ?? match[4];
            nodes.push(
                <a key={key++} href={match[4]} target="_blank" rel="noreferrer noopener" className="text-[#58a6ff] underline-offset-2 hover:underline">
                    {label}
                </a>,
            );
        }

        last = match.index + match[0].length;
    }

    if (last < text.length) nodes.push(text.slice(last));
    return nodes;
}

function CodeBlock({ lang, code, onInsertCode }: { lang: string; code: string; onInsertCode?: (code: string) => void }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard blocked */
        }
    };

    return (
        <div className="my-2 overflow-hidden rounded-md border border-[#30363d] bg-[#0d1117]">
            <div className="flex h-7 items-center justify-between border-b border-[#21262d] bg-[#161b22] pl-3 pr-1">
                <span className="font-mono text-[10.5px] uppercase tracking-wide text-gray-500">{lang || 'code'}</span>
                <div className="flex items-center">
                    {onInsertCode && (
                        <button
                            type="button"
                            onClick={() => onInsertCode(code)}
                            title="Insert at the cursor (replaces the selection)"
                            className="flex h-6 items-center gap-1 rounded px-1.5 text-[11px] text-gray-400 hover:bg-[#21262d] hover:text-gray-100"
                        >
                            <CornerDownLeft className="h-3 w-3" /> Insert
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => void copy()}
                        className="flex h-6 items-center gap-1 rounded px-1.5 text-[11px] text-gray-400 hover:bg-[#21262d] hover:text-gray-100"
                    >
                        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>
            </div>
            <pre className="max-h-[420px] overflow-auto p-3 font-mono text-[11.5px] leading-[1.6] text-[#e6edf3]">
                <code>{code}</code>
            </pre>
        </div>
    );
}

export function Markdown({ text, onInsertCode }: MarkdownProps) {
    const blocks = parse(text);

    return (
        <div className="space-y-2 text-[13px] leading-[1.6] text-gray-200">
            {blocks.map((block, index) => {
                switch (block.kind) {
                    case 'code':
                        return <CodeBlock key={index} lang={block.lang} code={block.code} onInsertCode={block.closed ? onInsertCode : undefined} />;
                    case 'heading':
                        return (
                            <p key={index} className={`font-semibold text-white ${block.level <= 2 ? 'text-[14px]' : 'text-[13px]'}`}>
                                {inline(block.text)}
                            </p>
                        );
                    case 'list': {
                        const Tag = block.ordered ? 'ol' : 'ul';
                        return (
                            <Tag key={index} className={`space-y-1 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'} marker:text-gray-500`}>
                                {block.items.map((item, i) => (
                                    <li key={i}>{inline(item)}</li>
                                ))}
                            </Tag>
                        );
                    }
                    default:
                        return (
                            <p key={index} className="whitespace-pre-wrap break-words">
                                {inline(block.text)}
                            </p>
                        );
                }
            })}
        </div>
    );
}
