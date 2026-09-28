// src/features/community/components/PostDetail.tsx
import { useState, type FormEvent } from 'react';
import { ArrowLeft, Loader2, MessageSquare, Pin, PinOff, Trash2 } from 'lucide-react';

import { useAuth } from '../../auth/hooks/useAuth';
import { Markdown } from '../../ai/components/Markdown';
import { STATUS_LABELS, type PostStatus } from '../api/community.api';
import { useCommunityActions, useCommunityPermissions, useCommunityPost } from '../hooks/useCommunity';
import { AuthorAvatar, AuthorLine, KindLabel, PinnedLabel, StatusBadge, VoteButton, authorName, timeAgo } from './shared';

const STATUSES = Object.keys(STATUS_LABELS) as PostStatus[];

export default function PostDetail({
    postId,
    onBack,
    onSignIn,
}: {
    postId: string;
    onBack: () => void;
    onSignIn: () => void;
}) {
    const { user } = useAuth();
    const { isAdmin } = useCommunityPermissions();
    const post = useCommunityPost(postId);
    const actions = useCommunityActions();
    const [comment, setComment] = useState('');

    const submitComment = async (event: FormEvent) => {
        event.preventDefault();
        const body = comment.trim();
        if (!body) return;
        await actions.comment.mutateAsync({ postId, body });
        setComment('');
    };

    const back = (
        <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
        >
            <ArrowLeft className="h-4 w-4" />
            Back
        </button>
    );

    if (post.isLoading) {
        return (
            <div>
                {back}
                <div className="mt-6 space-y-3">
                    <div className="h-7 w-2/3 animate-pulse rounded bg-white/[0.06]" />
                    <div className="h-4 w-1/3 animate-pulse rounded bg-white/[0.04]" />
                    <div className="h-32 animate-pulse rounded-xl bg-white/[0.03]" />
                </div>
            </div>
        );
    }

    if (post.isError || !post.data) {
        return (
            <div>
                {back}
                <p className="mt-6 text-[14px] text-[var(--muted)]">This post doesn’t exist or was removed.</p>
            </div>
        );
    }

    const data = post.data;
    const canDelete = isAdmin || data.author.id === user?.id;
    const votable = data.kind !== 'NEWS';

    return (
        <article aria-labelledby="post-title">
            {back}

            <div className="mt-5 rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] p-5 sm:p-7">
                <div className="flex gap-4">
                    {votable && (
                        <VoteButton
                            size="lg"
                            count={data.voteCount}
                            voted={data.hasVoted}
                            onVote={() => (user ? actions.vote.mutate(data.id) : onSignIn())}
                        />
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <KindLabel kind={data.kind} />
                            {data.kind !== 'NEWS' && <StatusBadge status={data.status} />}
                            {data.pinned && <PinnedLabel />}
                        </div>
                        <h1 id="post-title" className="mt-2 text-[22px] font-semibold leading-snug tracking-[-0.01em] sm:text-[26px]">
                            {data.title}
                        </h1>
                        <div className="mt-3">
                            <AuthorLine author={data.author} createdAt={data.createdAt} />
                        </div>
                    </div>
                </div>

                <div className="community-markdown mt-6 text-[14.5px] leading-[1.7] text-[var(--text)]">
                    <Markdown text={data.body} />
                </div>

                {(isAdmin || canDelete) && (
                    <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-5">
                        {isAdmin && data.kind !== 'NEWS' && (
                            <label className="inline-flex items-center gap-2 text-[12.5px] text-[var(--muted)]">
                                Status
                                <select
                                    value={data.status}
                                    onChange={(event) => actions.update.mutate({ postId: data.id, status: event.target.value as PostStatus })}
                                    className="h-8 rounded-md border border-[var(--line-strong)] bg-[var(--ink)] px-2 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
                                >
                                    {STATUSES.map((status) => (
                                        <option key={status} value={status}>
                                            {STATUS_LABELS[status]}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => actions.update.mutate({ postId: data.id, pinned: !data.pinned })}
                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--line-strong)] px-2.5 text-[12.5px] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                            >
                                {data.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                                {data.pinned ? 'Unpin' : 'Pin'}
                            </button>
                        )}
                        {canDelete && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm('Delete this post and its comments?')) {
                                        void actions.remove.mutateAsync(data.id).then(onBack);
                                    }
                                }}
                                className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] text-rose-300 transition-colors hover:bg-rose-400/10"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ------------------------------------------ Comments */}
            <section aria-labelledby="comments-heading" className="mt-8">
                <h2 id="comments-heading" className="flex items-center gap-2 text-[15px] font-semibold">
                    <MessageSquare className="h-4 w-4 text-[var(--muted)]" />
                    {data.comments.length === 1 ? '1 comment' : `${data.comments.length} comments`}
                </h2>

                <ol className="mt-4 space-y-3">
                    {data.comments.map((item) => (
                        <li key={item.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                            <div className="flex items-start gap-3">
                                <AuthorAvatar author={item.author} size={28} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 text-[12.5px]">
                                        <span className="font-medium text-[var(--text)]">{authorName(item.author)}</span>
                                        {item.author.isAdmin && <span className="text-[11px] text-[var(--accent)]">Maintainer</span>}
                                        <span className="text-[var(--dim)]">·</span>
                                        <time dateTime={item.createdAt} className="text-[var(--muted)]">{timeAgo(item.createdAt)}</time>
                                        {(isAdmin || item.author.id === user?.id) && (
                                            <button
                                                type="button"
                                                aria-label="Delete comment"
                                                onClick={() => actions.removeComment.mutate(item.id)}
                                                className="ml-auto rounded p-1 text-[var(--dim)] transition-colors hover:text-rose-300"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="mt-1.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[var(--text)]">{item.body}</p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>

                {user ? (
                    <form onSubmit={(event) => void submitComment(event)} className="mt-4">
                        <label className="sr-only" htmlFor="comment">Add a comment</label>
                        <textarea
                            id="comment"
                            value={comment}
                            onChange={(event) => setComment(event.target.value.slice(0, 3000))}
                            placeholder="Add a comment…"
                            rows={3}
                            className="w-full resize-y rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-3 text-[14px] leading-relaxed outline-none placeholder:text-[var(--dim)] focus:border-[var(--accent)]"
                        />
                        {actions.comment.isError && (
                            <p role="alert" className="mt-2 text-[13px] text-rose-300">
                                {actions.comment.error instanceof Error ? actions.comment.error.message : 'Couldn’t post your comment.'}
                            </p>
                        )}
                        <div className="mt-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={!comment.trim() || actions.comment.isPending}
                                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-medium text-[#07120c] transition-colors hover:bg-[var(--accent-hi)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {actions.comment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                Comment
                            </button>
                        </div>
                    </form>
                ) : (
                    <button
                        type="button"
                        onClick={onSignIn}
                        className="mt-4 w-full rounded-xl border border-dashed border-[var(--line-strong)] px-4 py-4 text-[13.5px] text-[var(--muted)] transition-colors hover:border-white/25 hover:text-[var(--text)]"
                    >
                        Sign in with your wallet to comment
                    </button>
                )}
            </section>
        </article>
    );
}

