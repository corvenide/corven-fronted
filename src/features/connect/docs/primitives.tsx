// src/features/connect/docs/primitives.tsx
//
// Small building blocks for the Corven Connect docs pages.

import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, Copy, Info } from 'lucide-react';

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export function H2({ children }: { children: string }) {
    const id = slugify(children);
    return (
        <h2 id={id} className="group mt-12 scroll-mt-24 text-[20px] font-semibold tracking-tight text-on-surface first:mt-0">
            <a href={`#${id}`} className="hover:underline decoration-outline-variant underline-offset-4">
                {children}
            </a>
        </h2>
    );
}

export function H3({ children }: { children: string }) {
    const id = slugify(children);
    return (
        <h3 id={id} className="mt-8 scroll-mt-24 text-[15.5px] font-semibold text-on-surface">
            {children}
        </h3>
    );
}

export function P({ children }: { children: ReactNode }) {
    return <p className="mt-3 text-[14.5px] leading-[1.75] text-on-surface-variant">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
    return <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14.5px] leading-[1.7] text-on-surface-variant marker:text-outline">{children}</ul>;
}

export function OL({ children }: { children: ReactNode }) {
    return <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[14.5px] leading-[1.7] text-on-surface-variant marker:text-outline">{children}</ol>;
}

/** Inline code. */
export function C({ children }: { children: ReactNode }) {
    return (
        <code className="rounded border border-outline-variant/30 bg-surface-container-high px-1 py-px font-mono text-[12.5px] text-on-surface">
            {children}
        </code>
    );
}

export function B({ children }: { children: ReactNode }) {
    return <strong className="font-semibold text-on-surface">{children}</strong>;
}

export function DocLink({ to, children }: { to: string; children: ReactNode }) {
    if (/^https?:/.test(to)) {
        return (
            <a href={to} target="_blank" rel="noreferrer noopener" className="text-primary underline-offset-2 hover:underline">
                {children}
            </a>
        );
    }
    return (
        <Link to={to} className="text-primary underline-offset-2 hover:underline">
            {children}
        </Link>
    );
}

export function CodeBlock({ code, lang, title }: { code: string; lang?: string; title?: string }) {
    const [copied, setCopied] = useState(false);
    const text = code.replace(/^\n+|\s+$/g, '');

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
        } catch {
            /* clipboard blocked */
        }
    };

    return (
        <div className="mt-4 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
            <div className="flex items-center justify-between border-b border-outline-variant/20 px-3.5 py-1.5">
                <span className="font-mono text-[11px] text-on-surface-variant">{title ?? lang ?? ''}</span>
                <button
                    type="button"
                    onClick={() => void copy()}
                    aria-label="Copy code"
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11.5px] text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                >
                    {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-[1.7] text-on-surface">
                <code>{text}</code>
            </pre>
        </div>
    );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
    return (
        <div className="mt-4 overflow-x-auto rounded-xl border border-outline-variant/30">
            <table className="w-full min-w-[520px] border-collapse text-left text-[13.5px]">
                <thead>
                    <tr className="bg-surface-container-low text-[11.5px] uppercase tracking-wider text-on-surface-variant">
                        {head.map((h) => (
                            <th key={h} className="px-3.5 py-2.5 font-medium">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                    {rows.map((row, i) => (
                        <tr key={i} className="align-top">
                            {row.map((cell, j) => (
                                <td key={j} className={`px-3.5 py-2.5 leading-[1.6] ${j === 0 ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function Callout({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
    const warn = tone === 'warn';
    return (
        <div
            className={`mt-5 flex gap-3 rounded-xl border px-4 py-3 text-[13.5px] leading-[1.65] ${
                warn ? 'border-amber-400/30 bg-amber-400/[0.06] text-amber-100/90' : 'border-primary/25 bg-primary/[0.05] text-on-surface-variant'
            }`}
        >
            {warn ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
            <div>{children}</div>
        </div>
    );
}

export function Steps({ steps }: { steps: { title: string; body: ReactNode }[] }) {
    return (
        <ol className="mt-5 space-y-5">
            {steps.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-[12px] text-primary">
                        {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="pt-0.5 text-[14.5px] font-semibold text-on-surface">{step.title}</div>
                        <div className="text-[14.5px] leading-[1.7] text-on-surface-variant">{step.body}</div>
                    </div>
                </li>
            ))}
        </ol>
    );
}
