// src/features/community/components/PostComposer.tsx
import { useState, type FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';

import type { PostKind } from '../api/community.api';
import { useCommunityActions } from '../hooks/useCommunity';

const TITLE_MAX = 140;
const BODY_MAX = 10_000;

const PLACEHOLDERS: Record<PostKind, { title: string; body: string }> = {
    NEWS: {
        title: 'What’s new',
        body: 'Share the update. Markdown works: **bold**, `code`, lists and [links](https://…).',
    },
    FEEDBACK: {
        title: 'Summarise your feedback in one line',
        body: 'What happened, what you expected, and anything that would help us reproduce it.',
    },
    PROPOSAL: {
        title: 'Name your idea',
        body: 'What should Corven do, who is it for, and why does it matter?',
    },
};

export default function PostComposer({
    kinds,
    onClose,
    onCreated,
}: {
    /** The kinds the author may choose from; the first is selected. */
    kinds: PostKind[];
    onClose: () => void;
    onCreated: (postId: string) => void;
}) {
    const { create } = useCommunityActions();
    const [kind, setKind] = useState<PostKind>(kinds[0]);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');

    const canSubmit = title.trim().length >= 3 && body.trim().length > 0 && !create.isPending;

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;
        const post = await create.mutateAsync({ kind, title: title.trim(), body: body.trim() });
        onCreated(post.id);
    };

    return (
        <form
            onSubmit={(event) => void submit(event)}
            aria-label="New post"
            className="rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] p-5 sm:p-6"
        >
            <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">{kinds.length === 1 && kinds[0] === 'NEWS' ? 'Publish news' : 'New post'}</h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="rounded-md p-1.5 text-[var(--dim)] transition-colors hover:bg-white/[0.05] hover:text-[var(--text)]"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {kinds.length > 1 && (
                <div role="radiogroup" aria-label="Post type" className="mt-4 inline-flex rounded-lg border border-[var(--line-strong)] bg-[var(--ink)] p-1">
                    {kinds.map((option) => (
                        <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={kind === option}
                            onClick={() => setKind(option)}
                            className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                                kind === option ? 'bg-[var(--raised)] text-[var(--text)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'
                            }`}
                        >
                            {option === 'FEEDBACK' ? 'Feedback' : option === 'PROPOSAL' ? 'Proposal' : 'News'}
                        </button>
                    ))}
                </div>
            )}

            <label className="mt-4 block">
                <span className="text-[12px] font-medium text-[var(--muted)]">Title</span>
                <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value.slice(0, TITLE_MAX))}
                    placeholder={PLACEHOLDERS[kind].title}
                    autoFocus
                    className="mt-1.5 h-11 w-full rounded-lg border border-[var(--line-strong)] bg-[var(--ink)] px-3 text-[14px] outline-none placeholder:text-[var(--dim)] focus:border-[var(--accent)]"
                />
            </label>

            <label className="mt-4 block">
                <span className="flex items-center justify-between text-[12px] font-medium text-[var(--muted)]">
                    Details
                    <span className="cv-mono text-[11px] text-[var(--dim)]">
                        {body.length.toLocaleString()}/{BODY_MAX.toLocaleString()}
                    </span>
                </span>
                <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value.slice(0, BODY_MAX))}
                    placeholder={PLACEHOLDERS[kind].body}
                    rows={6}
                    className="mt-1.5 w-full resize-y rounded-lg border border-[var(--line-strong)] bg-[var(--ink)] px-3 py-2.5 text-[14px] leading-relaxed outline-none placeholder:text-[var(--dim)] focus:border-[var(--accent)]"
                />
            </label>

            {create.isError && (
                <p role="alert" className="mt-3 text-[13px] text-rose-300">
                    {create.error instanceof Error ? create.error.message : 'Couldn’t publish. Please try again.'}
                </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="h-10 rounded-lg px-4 text-[13.5px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--accent)] px-5 text-[13.5px] font-medium text-[#07120c] transition-colors hover:bg-[var(--accent-hi)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {kind === 'NEWS' ? 'Publish' : 'Post'}
                </button>
            </div>
        </form>
    );
}

