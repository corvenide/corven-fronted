// src/features/community/components/shared.tsx
//
// Small pieces shared by the community page: badges, author line, avatar,
// upvote button and relative times.

import type { ReactNode } from 'react';
import { ChevronUp, Pin, ShieldCheck } from 'lucide-react';

import type { CommunityAuthor, PostKind, PostStatus } from './api/community.api';
import { KIND_LABELS, STATUS_LABELS } from './api/community.api';

export function timeAgo(value: string): string {
    const date = new Date(value);
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function shortAddress(address: string): string {
    return address.length > 18 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address;
}

/** Wallet-generated names ("CKB User …") read worse than the address. */
export function authorName(author: CommunityAuthor): string {
    if (author.isAdmin) return 'Corven team';
    if (author.walletAddress && (!author.name || author.name.startsWith('CKB User'))) {
        return shortAddress(author.walletAddress);
    }
    return author.name;
}

function hue(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    return Math.abs(hash) % 360;
}

export function AuthorAvatar({ author, size = 28 }: { author: CommunityAuthor; size?: number }) {
    if (author.isAdmin) {
        return (
            <span
                aria-hidden
                className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--accent)]/40 bg-[var(--raised)]"
                style={{ width: size, height: size }}
            >
                <img src="/icons/icon-192.png" alt="" className="h-full w-full object-cover" />
            </span>
        );
    }

    const seed = author.walletAddress ?? author.id;
    const h = hue(seed);
    const label = (author.walletAddress ?? author.name).slice(-2).toUpperCase();

    return (
        <span
            aria-hidden
            className="cv-mono inline-flex shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
            style={{
                width: size,
                height: size,
                background: `linear-gradient(135deg, hsl(${h} 55% 42%), hsl(${(h + 40) % 360} 60% 30%))`,
            }}
        >
            {label}
        </span>
    );
}

export function AuthorLine({ author, createdAt }: { author: CommunityAuthor; createdAt: string }) {
    return (
        <div className="flex min-w-0 items-center gap-2 text-[12.5px] text-[var(--muted)]">
            <AuthorAvatar author={author} size={20} />
            <span className="truncate font-medium text-[var(--text)]">{authorName(author)}</span>
            {author.isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-1.5 py-px text-[10.5px] font-medium text-[var(--accent)]">
                    <ShieldCheck className="h-3 w-3" />
                    Maintainer
                </span>
            )}
            <span aria-hidden className="text-[var(--dim)]">·</span>
            <time dateTime={createdAt} title={new Date(createdAt).toLocaleString()} className="shrink-0">
                {timeAgo(createdAt)}
            </time>
        </div>
    );
}

const STATUS_STYLES: Record<PostStatus, string> = {
    OPEN: 'border-white/10 bg-white/[0.04] text-[var(--muted)]',
    PLANNED: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
    IN_PROGRESS: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    DONE: 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]',
    DECLINED: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
};

export function StatusBadge({ status }: { status: PostStatus }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
        </span>
    );
}

const KIND_STYLES: Record<PostKind, string> = {
    NEWS: 'text-[var(--accent)]',
    FEEDBACK: 'text-sky-300',
    PROPOSAL: 'text-violet-300',
};

export function KindLabel({ kind }: { kind: PostKind }) {
    return (
        <span className={`cv-mono text-[10.5px] uppercase tracking-[0.14em] ${KIND_STYLES[kind]}`}>
            {KIND_LABELS[kind]}
        </span>
    );
}

export function PinnedLabel() {
    return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300">
            <Pin className="h-3 w-3" />
            Pinned
        </span>
    );
}

export function VoteButton({
    count,
    voted,
    onVote,
    disabled,
    size = 'md',
}: {
    count: number;
    voted: boolean;
    onVote: () => void;
    disabled?: boolean;
    size?: 'md' | 'lg';
}) {
    return (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                onVote();
            }}
            disabled={disabled}
            aria-pressed={voted}
            aria-label={voted ? `Remove upvote (${count})` : `Upvote (${count})`}
            className={`flex shrink-0 flex-col items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${size === 'lg' ? 'h-16 w-14' : 'h-14 w-12'
                } ${voted
                    ? 'border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--line-strong)] bg-[var(--raised)] text-[var(--muted)] hover:border-white/25 hover:text-[var(--text)]'
                }`}
        >
            <ChevronUp className="h-4 w-4" />
            <span className="cv-mono text-[13px] font-semibold">{count}</span>
        </button>
    );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--line-strong)] px-6 py-14 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--raised)] text-[var(--muted)]">
                {icon}
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-[var(--text)]">{title}</h3>
            <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-[var(--muted)]">{body}</p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

