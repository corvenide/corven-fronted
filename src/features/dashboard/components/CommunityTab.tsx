// src/features/dashboard/components/CommunityTab.tsx
//
// Community tab embedded in the dashboard. Uses the real community API
// (no dummy data). Shows posts (news, feedback, proposals), a composer,
// and a post detail view.

import { useState } from 'react';
import {
    AlertTriangle,
    ChevronUp,
    Loader2,
    MessageSquare,
    Newspaper,
    Plus,
    RotateCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/hooks/useAuth';
import type { ListPostsQuery, PostKind, PostSort } from '../../community/api/community.api';
import { useCommunityActions, useCommunityPermissions, useCommunityPosts } from '../../community/hooks/useCommunity';
import {
    AuthorAvatar,
    AuthorLine,
    EmptyState,
    KindLabel,
    PinnedLabel,
    StatusBadge,
    VoteButton,
    timeAgo,
} from '../../community/shared';
import PostComposer from '../../community/components/PostComposer';
import PostDetail from '../../community/components/PostDetail';

type KindFilter = 'all' | PostKind;

export default function CommunityTab() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isAdmin } = useCommunityPermissions();
    const actions = useCommunityActions();

    const [kindFilter, setKindFilter] = useState<KindFilter>('all');
    const [sort, setSort] = useState<PostSort>('new');
    const [composing, setComposing] = useState(false);
    const [viewingPostId, setViewingPostId] = useState<string | null>(null);

    const query: ListPostsQuery = {
        ...(kindFilter !== 'all' ? { kind: kindFilter } : {}),
        sort,
    };
    const posts = useCommunityPosts(query);

    const onSignIn = () => navigate('/auth');

    const kindFilters: { key: KindFilter; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'NEWS', label: 'News' },
        { key: 'FEEDBACK', label: 'Feedback' },
        { key: 'PROPOSAL', label: 'Proposals' },
    ];

    const sortOptions: { key: PostSort; label: string }[] = [
        { key: 'new', label: 'Newest' },
        { key: 'top', label: 'Top' },
    ];

    // ─── Post detail view ───
    if (viewingPostId) {
        return (
            <div
                className="community-shell"
                style={{
                    '--accent': '#3cc68a',
                    '--accent-hi': '#4dd99a',
                    '--text': '#e6edf3',
                    '--muted': '#8b949e',
                    '--dim': '#484f58',
                    '--surface': '#161b22',
                    '--raised': '#21262d',
                    '--ink': '#0d1117',
                    '--line': '#21262d',
                    '--line-strong': '#30363d',
                } as React.CSSProperties}
            >
                <PostDetail
                    postId={viewingPostId}
                    onBack={() => setViewingPostId(null)}
                    onSignIn={onSignIn}
                />
            </div>
        );
    }

    // ─── Post list view ───
    return (
        <div
            className="community-shell"
            style={{
                '--accent': '#3cc68a',
                '--accent-hi': '#4dd99a',
                '--text': '#e6edf3',
                '--muted': '#8b949e',
                '--dim': '#484f58',
                '--surface': '#161b22',
                '--raised': '#21262d',
                '--ink': '#0d1117',
                '--line': '#21262d',
                '--line-strong': '#30363d',
            } as React.CSSProperties}
        >
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-[18px] font-semibold text-white">Community</h2>
                    <p className="mt-0.5 text-[13px] text-gray-400">
                        News, feedback and proposals from the Corven community
                    </p>
                </div>
                {user && (
                    <button
                        type="button"
                        onClick={() => setComposing(true)}
                        className="inline-flex h-9 items-center gap-2 self-start rounded-md bg-[#238636] px-3.5 text-[13.5px] font-medium text-white transition-colors hover:bg-[#2ea043] sm:self-auto"
                    >
                        <Plus className="h-4 w-4" />
                        New post
                    </button>
                )}
            </div>

            {/* Composer */}
            {composing && (
                <div className="mt-5">
                    <PostComposer
                        kinds={isAdmin ? ['NEWS', 'FEEDBACK', 'PROPOSAL'] : ['FEEDBACK', 'PROPOSAL']}
                        onClose={() => setComposing(false)}
                        onCreated={(postId) => {
                            setComposing(false);
                            setViewingPostId(postId);
                        }}
                    />
                </div>
            )}

            {/* Toolbar */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div role="tablist" aria-label="Filter by type" className="flex rounded-md border border-[#30363d] bg-[#161b22] p-0.5">
                    {kindFilters.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            role="tab"
                            aria-selected={kindFilter === item.key}
                            onClick={() => setKindFilter(item.key)}
                            className={`rounded px-3 py-1.5 text-[12.5px] transition-colors ${kindFilter === item.key ? 'bg-[#21262d] text-white' : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    {sortOptions.map((opt) => (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => setSort(opt.key)}
                            className={`rounded px-2.5 py-1.5 text-[12px] font-medium transition-colors ${sort === opt.key ? 'bg-[#21262d] text-white' : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Posts */}
            <div className="mt-4">
                {posts.isError ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-[#30363d] bg-[#161b22] px-6 py-14 text-center">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                        <p className="text-[14px] text-gray-300">Couldn't load community posts.</p>
                        <button
                            type="button"
                            onClick={() => void posts.refetch()}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#30363d] px-3 py-1.5 text-[13px] text-gray-200 hover:bg-[#21262d]"
                        >
                            <RotateCw className="h-3.5 w-3.5" /> Try again
                        </button>
                    </div>
                ) : posts.isLoading ? (
                    <div className="overflow-hidden rounded-lg border border-[#30363d]" aria-busy="true">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="flex items-center gap-4 border-b border-[#21262d] bg-[#161b22] px-4 py-5 last:border-b-0">
                                <div className="h-14 w-12 animate-pulse rounded-lg bg-[#21262d]" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-[#21262d]" />
                                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-[#21262d]" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : !posts.data?.posts.length ? (
                    <EmptyState
                        icon={<Newspaper className="h-5 w-5" />}
                        title="No posts yet"
                        body="Be the first to share feedback or propose an idea for Corven."
                        action={
                            user ? (
                                <button
                                    type="button"
                                    onClick={() => setComposing(true)}
                                    className="inline-flex h-9 items-center gap-2 rounded-md bg-[#238636] px-4 text-[13.5px] font-medium text-white hover:bg-[#2ea043]"
                                >
                                    <Plus className="h-4 w-4" /> New post
                                </button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="overflow-hidden rounded-lg border border-[#30363d]">
                        {posts.data.posts.map((post) => {
                            const votable = post.kind !== 'NEWS';
                            return (
                                <div
                                    key={post.id}
                                    onClick={() => setViewingPostId(post.id)}
                                    className="group flex cursor-pointer items-start gap-4 border-b border-[#21262d] bg-[#0d1117] px-4 py-4 transition-colors last:border-b-0 hover:bg-[#161b22]"
                                >
                                    {/* Vote button */}
                                    {votable && (
                                        <VoteButton
                                            count={post.voteCount}
                                            voted={post.hasVoted}
                                            onVote={() => (user ? actions.vote.mutate(post.id) : onSignIn())}
                                        />
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <KindLabel kind={post.kind} />
                                            {post.kind !== 'NEWS' && <StatusBadge status={post.status} />}
                                            {post.pinned && <PinnedLabel />}
                                        </div>
                                        <h3 className="mt-1.5 text-[15px] font-medium text-white group-hover:text-[#3cc68a] transition-colors">
                                            {post.title}
                                        </h3>
                                        <div className="mt-1.5 flex items-center gap-3 text-[12px] text-gray-500">
                                            <AuthorAvatar author={post.author} size={18} />
                                            <span className="text-gray-300">{post.author.name}</span>
                                            <span>·</span>
                                            <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
                                            <span>·</span>
                                            <span className="flex items-center gap-1">
                                                <MessageSquare className="h-3 w-3" />
                                                {post.commentCount}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {!user && (
                <div className="mt-6 rounded-lg border border-dashed border-[#30363d] bg-[#161b22]/60 px-6 py-6 text-center">
                    <p className="text-[14px] text-gray-400">
                        Sign in with your wallet to post, vote and comment.
                    </p>
                    <button
                        type="button"
                        onClick={onSignIn}
                        className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-[#238636] px-4 text-[13.5px] font-medium text-white hover:bg-[#2ea043]"
                    >
                        Sign in
                    </button>
                </div>
            )}
        </div>
    );
}
