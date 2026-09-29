// src/features/dashboard/components/CommunityTab.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';

import {
    useCommunityPosts,
    useCommunityPost,
    useCommunityActions,
    useCommunityPermissions,
} from '../../community/hooks/useCommunity';
import {
    STATUS_LABELS,
    type PostKind,
    type PostStatus,
    type PostSort,
    type ListPostsQuery,
} from '../../community/api/community.api';

// ---- Mapping: UI <-> API ----------------------------------------------------

const CATEGORY_TO_KIND: Record<string, PostKind | undefined> = {
    'all': undefined,
    'Proposals': 'PROPOSAL',
    'News': 'NEWS',
    'Feedback': 'FEEDBACK',
};

const STATUS_TO_API: Record<string, PostStatus | undefined> = {
    'all': undefined,
    'Open': 'OPEN',
    'Planned': 'PLANNED',
    'In Progress': 'IN_PROGRESS',
    'Done': 'DONE',
    'Declined': 'DECLINED',
};

const KIND_TO_CATEGORY: Record<PostKind, string> = {
    PROPOSAL: 'Proposals',
    NEWS: 'News',
    FEEDBACK: 'Feedback',
};

const API_TO_STATUS: Record<PostStatus, string> = {
    OPEN: 'Open',
    PLANNED: 'Planned',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done',
    DECLINED: 'Declined',
};

// NOTE: News authoring is hidden for now. The modal only exposes RFC + Feedback.
type ModalCategory = 'RFC' | 'Feedback';

const MODAL_TO_KIND: Record<ModalCategory, PostKind> = {
    RFC: 'PROPOSAL',
    Feedback: 'FEEDBACK',
};

const MODAL_LABELS: Record<ModalCategory, string> = {
    RFC: 'RFC Proposal',
    Feedback: 'Feedback',
};

// ---- Submit-modal configuration --------------------------------------------

interface CategoryConfig {
    titlePlaceholder: string;
    titleHint: string;
    summaryLabel: string;
    summaryPlaceholder: string;
    summaryHint: string;
    summaryMin: number;
    summaryMax: number;
    bodyLabel: string;
    bodyPlaceholder: string;
    bodyHint: string;
    bodyMin: number;
    bodyMax: number;
    tagsPlaceholder: string;
    tagHint: string;
    submitLabel: string;
    introLine: string;
}

const CATEGORY_CONFIG: Record<ModalCategory, CategoryConfig> = {
    RFC: {
        titlePlaceholder: 'e.g. RFC-015: Cell dep auto-linking for molecule bindings',
        titleHint: 'Start with "RFC-NNN:" if you are following the numbering convention.',
        summaryLabel: 'Summary',
        summaryPlaceholder:
            'One or two sentences explaining what you are proposing and why it matters.',
        summaryHint: 'Shown in the feed preview. Keep it tight.',
        summaryMin: 20,
        summaryMax: 280,
        bodyLabel: 'Motivation & Technical Spec',
        bodyPlaceholder:
            'Describe the problem, your proposed design, alternatives considered, backward-compatibility concerns, and any RISC-V / CKB-VM implications.',
        bodyHint: 'Use markdown. Include links to related issues or prior discussion.',
        bodyMin: 100,
        bodyMax: 6000,
        tagsPlaceholder: 'ckb-vm, riscv, toolchain (comma separated)',
        tagHint: 'Up to 5 tags. Lowercase, hyphenated.',
        submitLabel: 'Publish RFC',
        introLine:
            'Propose an architecture change, IDE feature, or protocol integration to the CKB community.',
    },
    Feedback: {
        titlePlaceholder: 'e.g. Better autocomplete for cell scripts in the editor',
        titleHint: 'Short and specific — this is the headline.',
        summaryLabel: 'What is the idea?',
        summaryPlaceholder:
            'Briefly describe the feature or improvement you would like to see.',
        summaryHint: 'Shown in the feed preview.',
        summaryMin: 15,
        summaryMax: 240,
        bodyLabel: 'Use case & context',
        bodyPlaceholder:
            'Walk us through the workflow you are trying to improve. Screenshots, snippets, or a short repro help a lot.',
        bodyHint: 'Tell us what you tried, and what you expected instead.',
        bodyMin: 60,
        bodyMax: 4000,
        tagsPlaceholder: 'editor, ux, workflow (comma separated)',
        tagHint: 'Up to 5 tags. Lowercase, hyphenated.',
        submitLabel: 'Submit Feedback',
        introLine:
            'Share an idea, a rough edge, or a workflow you wish were smoother in Corven.',
    },
};

const DRAFT_STORAGE_KEY = 'corven:submit-draft:v1';

// ---- V1.0 Launch Announcement ----------------------------------------------

const CORVEN_V1_LAUNCH = {
    version: 'v1.0.0',
    codename: 'Genesis',
    releaseDate: '2025-01-15',
    tagline: 'The first stable release of the Corven IDE is live.',
    summary:
        'Corven V1.0 ships a production-ready CKB smart-contract workspace. See the release notes for the full feature list and changelog.',
    links: {
        releaseNotes: 'https://github.com/corvenide/corven/releases/tag/v1.0.0',
        changelog: 'https://github.com/corvenide/corven/blob/main/CHANGELOG.md',
        docs: 'https://docs.corven.dev/v1',
        discord: 'https://discord.gg/nervosnetwork',
    },
} as const;

const V1_MODAL_STORAGE_KEY = 'corven:v1-launch-modal-dismissed';

// ---- Helpers ----------------------------------------------------------------

function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

function initialsOf(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'AN';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function handleOf(author: { name: string; walletAddress: string | null }): string {
    if (author.walletAddress) {
        return `@${author.walletAddress.slice(0, 8)}…`;
    }
    return `@${author.name.toLowerCase().replace(/\s+/g, '')}`;
}

function parseTags(input: string): string[] {
    return Array.from(
        new Set(
            input
                .split(',')
                .map((t) => t.trim().toLowerCase().replace(/\s+/g, '-'))
                .filter(Boolean),
        ),
    ).slice(0, 5);
}

/** Summary is folded into `body` on create; the feed should only show the first paragraph. */
function summaryOf(body: string): string {
    return body.split('\n\n')[0] ?? body;
}

// ---- Typed access to auth user ---------------------------------------------

interface AuthUserLike {
    id?: string;
    walletAddress?: string | null;
}

function getUserId(user: unknown): string | undefined {
    return (user as AuthUserLike | null | undefined)?.id;
}

function getUserWallet(user: unknown): string | null | undefined {
    return (user as AuthUserLike | null | undefined)?.walletAddress;
}

// ---- Comment composer -------------------------------------------------------

function CommentComposer({
    onSubmit,
    disabled,
}: {
    onSubmit: (body: string) => void;
    disabled?: boolean;
}) {
    const [value, setValue] = useState('');
    const trimmed = value.trim();

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                if (!trimmed) return;
                onSubmit(trimmed);
                setValue('');
            }}
            className="p-space-md border-t border-outline-variant/20 flex flex-col gap-2 bg-surface-container"
        >
            <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Add a comment…"
                rows={2}
                className="w-full bg-surface-container-lowest text-on-surface rounded-lg px-space-md py-2 font-body-sm text-body-sm border border-outline-variant/30 focus:outline-none focus:border-primary resize-none"
            />
            <button
                type="submit"
                disabled={disabled || !trimmed}
                className="self-end px-space-md py-1.5 rounded-lg bg-primary text-on-primary font-headline-sm text-headline-sm font-medium hover:bg-primary-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {disabled ? 'Posting…' : 'Post comment'}
            </button>
        </form>
    );
}

// ----------------------------------------------------------------------------

export default function CommunityTab() {
    const { user } = useAuth();
    const { isAdmin } = useCommunityPermissions();

    const [currentCategory, setCurrentCategory] = useState<string>('all');
    const [currentStatus, setCurrentStatus] = useState<string>('all');
    const [currentSort, setCurrentSort] = useState<PostSort>('new');
    const [searchQuery, setSearchQuery] = useState('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // V1.0 launch banner + first-run modal
    const [showV1Banner, setShowV1Banner] = useState(true);
    const [showV1Modal, setShowV1Modal] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem(V1_MODAL_STORAGE_KEY) !== '1';
    });

    const dismissV1Modal = () => {
        setShowV1Modal(false);
        try {
            window.localStorage.setItem(V1_MODAL_STORAGE_KEY, '1');
        } catch {
            /* ignore */
        }
    };

    // ---- Submit modal state -------------------------------------------------
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalCategory, setModalCategory] = useState<ModalCategory>('RFC');
    const [modalTitle, setModalTitle] = useState('');
    const [modalSummary, setModalSummary] = useState('');
    const [modalBody, setModalBody] = useState('');
    const [modalTags, setModalTags] = useState('');
    const [modalShowPreview, setModalShowPreview] = useState(false);
    const [modalTouched, setModalTouched] = useState(false);

    const config = CATEGORY_CONFIG[modalCategory];
    const parsedTags = useMemo(() => parseTags(modalTags), [modalTags]);

    // News authoring is hidden for now — the modal only ever offers RFC + Feedback.
    const availableCategories = useMemo<ModalCategory[]>(
        () => ['RFC', 'Feedback'],
        [],
    );

    // If a restored draft had a category outside the allowed set, snap back to RFC.
    useEffect(() => {
        if (!availableCategories.includes(modalCategory)) {
            setModalCategory('RFC');
        }
    }, [availableCategories, modalCategory]);

    // Restore draft on mount
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
            if (!raw) return;
            const d = JSON.parse(raw) as {
                category?: ModalCategory | 'News';
                title?: string;
                summary?: string;
                body?: string;
                tags?: string;
            };
            // Ignore a stale 'News' draft category.
            if (d.category === 'RFC' || d.category === 'Feedback') {
                setModalCategory(d.category);
            }
            if (d.title) setModalTitle(d.title);
            if (d.summary) setModalSummary(d.summary);
            if (d.body) setModalBody(d.body);
            if (d.tags) setModalTags(d.tags);
        } catch {
            /* ignore */
        }
    }, []);

    // Persist draft as the user types
    useEffect(() => {
        if (!modalTitle && !modalSummary && !modalBody && !modalTags) return;
        try {
            window.localStorage.setItem(
                DRAFT_STORAGE_KEY,
                JSON.stringify({
                    category: modalCategory,
                    title: modalTitle,
                    summary: modalSummary,
                    body: modalBody,
                    tags: modalTags,
                }),
            );
        } catch {
            /* ignore */
        }
    }, [modalCategory, modalTitle, modalSummary, modalBody, modalTags]);

    const clearDraft = () => {
        try {
            window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {
            /* ignore */
        }
    };

    // Validation
    const titleLen = modalTitle.trim().length;
    const summaryLen = modalSummary.trim().length;
    const bodyLen = modalBody.trim().length;

    const titleOk = titleLen >= 8;
    const summaryOk = summaryLen >= config.summaryMin;
    const bodyOk = bodyLen >= config.bodyMin;

    const isFormValid = titleOk && summaryOk && bodyOk;

    const hasUnsavedContent =
        titleLen > 0 || summaryLen > 0 || bodyLen > 0 || parsedTags.length > 0;

    const closeModal = () => {
        if (hasUnsavedContent && !window.confirm('Discard this draft?')) return;
        setIsModalOpen(false);
        setModalTouched(false);
    };

    const openModal = () => {
        setIsModalOpen(true);
        setModalTouched(false);
    };

    // ---- API + actions ------------------------------------------------------

    const apiQuery: ListPostsQuery = useMemo(() => {
        const query: ListPostsQuery = { sort: currentSort };
        const kind = CATEGORY_TO_KIND[currentCategory];
        if (kind) query.kind = kind;
        const status = STATUS_TO_API[currentStatus];
        if (status) query.status = status;
        return query;
    }, [currentCategory, currentStatus, currentSort]);

    const { data: page, isLoading, isError } = useCommunityPosts(apiQuery);
    const { create, vote, remove, update, comment, removeComment } =
        useCommunityActions();

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // ---- Detail drawer ------------------------------------------------------
    const [openPostId, setOpenPostId] = useState<string | null>(null);
    const { data: detail, isLoading: detailLoading } = useCommunityPost(openPostId);

    // ---- View models --------------------------------------------------------

    const userId = getUserId(user);
    const userWallet = getUserWallet(user);

    const feedItems = useMemo(() => {
        const posts = page?.posts ?? [];
        const q = searchQuery.trim().toLowerCase();

        return posts
            .filter((post) => {
                if (!q) return true;
                return (
                    post.title.toLowerCase().includes(q) ||
                    post.body.toLowerCase().includes(q)
                );
            })
            .map((post) => {
                const isOwnPost = Boolean(userId && userId === post.author.id);
                const isOwnPostByWallet = Boolean(
                    userWallet && post.author.walletAddress && userWallet === post.author.walletAddress,
                );

                const canDelete = isAdmin || isOwnPost || isOwnPostByWallet;

                return {
                    id: post.id,
                    title: post.title,
                    preview: summaryOf(post.body),
                    body: post.body,
                    category: KIND_TO_CATEGORY[post.kind],
                    status: API_TO_STATUS[post.status],
                    statusKey: post.status,
                    isPinned: post.pinned,
                    timeAgo: formatRelativeTime(post.createdAt),
                    voteCount: post.voteCount,
                    hasVoted: post.hasVoted,
                    commentsCount: post.commentCount,
                    author: {
                        id: post.author.id,
                        name: post.author.name,
                        handle: handleOf(post.author),
                        initials: initialsOf(post.author.name),
                        isCore: post.author.isAdmin,
                    },
                    canDelete,
                    isModeratorDelete: isAdmin && !isOwnPost && !isOwnPostByWallet,
                };
            });
    }, [page?.posts, searchQuery, userId, userWallet, isAdmin]);

    const countsByCategory = useMemo(() => {
        const posts = page?.posts ?? [];
        return {
            all: page?.total ?? posts.length,
            proposal: posts.filter((p) => p.kind === 'PROPOSAL').length,
            news: posts.filter((p) => p.kind === 'NEWS').length,
            feedback: posts.filter((p) => p.kind === 'FEEDBACK').length,
        };
    }, [page]);

    // ---- Actions ------------------------------------------------------------

    const toggleVote = (itemId: string) => {
        const item = feedItems.find((i) => i.id === itemId);
        if (item?.hasVoted) {
            showToast('Your vote has been withdrawn.');
        } else {
            showToast(
                `Your vote (${(item?.voteCount ?? 0) + 1}) has been submitted to the CKB devnet community oracle.`,
            );
        }
        vote.mutate(itemId, {
            onError: () => showToast('Failed to submit vote. Please try again.'),
        });
    };

    const submitNewProposal = (e: React.FormEvent) => {
        e.preventDefault();
        setModalTouched(true);
        if (!isFormValid) return;

        const tagsLine = parsedTags.length
            ? `\n\n**Tags:** ${parsedTags.map((t) => `\`${t}\``).join(' ')}`
            : '';
        const composedBody = `${modalSummary.trim()}\n\n${modalBody.trim()}${tagsLine}`;

        create.mutate(
            {
                kind: MODAL_TO_KIND[modalCategory],
                title: modalTitle.trim(),
                body: composedBody,
            },
            {
                onSuccess: () => {
                    setModalTitle('');
                    setModalSummary('');
                    setModalBody('');
                    setModalTags('');
                    setModalShowPreview(false);
                    setIsModalOpen(false);
                    setModalTouched(false);
                    clearDraft();
                    showToast(
                        modalCategory === 'RFC'
                            ? 'Your RFC has been registered on the Corven IDE discussion board!'
                            : 'Thanks — your feedback has been posted.',
                    );
                },
                onError: () => {
                    showToast('Failed to publish. Please try again.');
                },
            },
        );
    };

    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

    const confirmDelete = (itemId: string) => {
        remove.mutate(itemId, {
            onSuccess: () => {
                setConfirmingDeleteId(null);
                showToast('Post deleted.');
            },
            onError: () => {
                setConfirmingDeleteId(null);
                showToast('Failed to delete post. Please try again.');
            },
        });
    };

    const resetFilters = () => {
        setSearchQuery('');
        setCurrentCategory('all');
        setCurrentStatus('all');
        setCurrentSort('new');
    };

    const isPristine =
        !searchQuery &&
        currentCategory === 'all' &&
        currentStatus === 'all' &&
        currentSort === 'new';

    // ------------------------------------------------------------------------

    return (
        <div className="flex flex-col w-full min-h-screen bg-surface">
            {/* ---------------- V1.0 Launch Modal (first-run) ---------------- */}
            {showV1Modal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-space-md bg-surface-container-lowest/85 backdrop-blur-lg animate-fade-in">
                    <div className="relative w-full max-w-xl bg-surface-container rounded-2xl shadow-2xl p-space-xl flex flex-col gap-space-lg text-on-surface border border-primary/30 overflow-hidden">
                        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />

                        <button
                            onClick={dismissV1Modal}
                            className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors z-10"
                            aria-label="Dismiss launch announcement"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>

                        <div className="relative flex flex-col gap-space-sm">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary font-code-sm text-code-sm font-semibold uppercase tracking-wider self-start">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                Now Shipping
                            </span>
                            <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">
                                Corven IDE{' '}
                                <span className="text-primary">{CORVEN_V1_LAUNCH.version}</span>{' '}
                                <span className="text-on-surface-variant font-medium">
                                    — {CORVEN_V1_LAUNCH.codename}
                                </span>
                            </h2>
                            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                                {CORVEN_V1_LAUNCH.summary}
                            </p>
                        </div>

                        <div className="relative flex flex-wrap items-center justify-between gap-space-sm pt-2 border-t border-outline-variant/20">
                            <span className="font-code-sm text-code-sm text-on-surface-variant">
                                Released{' '}
                                {new Date(CORVEN_V1_LAUNCH.releaseDate).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </span>
                            <div className="flex items-center gap-space-sm">
                                <button
                                    onClick={dismissV1Modal}
                                    className="px-space-md py-2 rounded-lg bg-surface-container-high text-on-surface font-body-sm text-body-sm hover:bg-surface-container-highest transition-colors"
                                >
                                    Maybe later
                                </button>
                                <a
                                    href={CORVEN_V1_LAUNCH.links.releaseNotes}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="px-space-lg py-2 rounded-lg bg-primary text-on-primary font-headline-sm text-headline-sm font-medium hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-lg shadow-primary/20"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        rocket_launch
                                    </span>
                                    <span>Read Release Notes</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ---------------- Create / Submit Modal ---------------- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-surface-container-lowest/80 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-2xl max-h-[92vh] bg-surface-container rounded-2xl shadow-2xl flex flex-col text-on-surface border border-outline-variant/30 overflow-hidden">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-space-lg py-space-md border-b border-outline-variant/20">
                            <div className="flex items-center gap-space-xs">
                                <span className="material-symbols-outlined text-primary text-[22px]">
                                    post_add
                                </span>
                                <span className="font-headline-md text-headline-md font-semibold text-on-surface">
                                    {MODAL_LABELS[modalCategory]}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setModalShowPreview((v) => !v)}
                                    className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-code-sm text-code-sm transition-colors border ${modalShowPreview
                                        ? 'bg-primary/15 text-primary border-primary/30'
                                        : 'bg-surface-container-high text-on-surface-variant border-transparent hover:bg-surface-container-highest'
                                        }`}
                                    aria-pressed={modalShowPreview}
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        {modalShowPreview ? 'edit' : 'visibility'}
                                    </span>
                                    {modalShowPreview ? 'Edit' : 'Preview'}
                                </button>
                                <button
                                    onClick={closeModal}
                                    className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors"
                                    aria-label="Close"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        close
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Modal body (scrollable) */}
                        <form
                            onSubmit={submitNewProposal}
                            className="flex-1 overflow-y-auto flex flex-col gap-space-md p-space-lg"
                        >
                            <p className="font-body-sm text-body-sm text-on-surface-variant">
                                {config.introLine}
                            </p>

                            {/* Category picker */}
                            <div className="flex flex-col gap-1">
                                <label className="font-label-md text-label-md text-on-surface-variant">
                                    Category
                                </label>
                                <div className="grid grid-cols-2 gap-space-xs">
                                    {availableCategories.map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => {
                                                setModalCategory(cat);
                                                setModalTouched(false);
                                            }}
                                            className={`px-space-sm py-2 rounded-lg text-center font-code-sm text-code-sm transition-colors border ${modalCategory === cat
                                                ? 'bg-primary/20 text-primary border-primary/40 font-semibold'
                                                : 'bg-surface-container-low text-on-surface-variant border-transparent hover:bg-surface-container-high'
                                                }`}
                                        >
                                            {MODAL_LABELS[cat]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {!modalShowPreview ? (
                                <>
                                    {/* Title */}
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <label
                                                className="font-label-md text-label-md text-on-surface-variant"
                                                htmlFor="proposal-title"
                                            >
                                                Title
                                            </label>
                                            <span
                                                className={`font-code-sm text-code-sm ${titleLen === 0
                                                    ? 'text-on-surface-variant/60'
                                                    : titleOk
                                                        ? 'text-primary'
                                                        : 'text-error'
                                                    }`}
                                            >
                                                {titleLen}/120
                                            </span>
                                        </div>
                                        <input
                                            id="proposal-title"
                                            value={modalTitle}
                                            onChange={(e) =>
                                                setModalTitle(e.target.value.slice(0, 120))
                                            }
                                            onBlur={() => setModalTouched(true)}
                                            placeholder={config.titlePlaceholder}
                                            required
                                            maxLength={120}
                                            className={`w-full bg-surface-container-lowest text-on-surface rounded-lg px-space-md py-2 font-body-sm text-body-sm border transition-colors focus:outline-none ${modalTouched && !titleOk
                                                ? 'border-error/60 focus:border-error'
                                                : 'border-outline-variant/30 focus:border-primary'
                                                }`}
                                        />
                                        <span className="font-code-sm text-code-sm text-on-surface-variant/80">
                                            {config.titleHint} Minimum 8 characters.
                                        </span>
                                    </div>

                                    {/* Summary */}
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <label
                                                className="font-label-md text-label-md text-on-surface-variant"
                                                htmlFor="proposal-summary"
                                            >
                                                {config.summaryLabel}
                                            </label>
                                            <span
                                                className={`font-code-sm text-code-sm ${summaryLen === 0
                                                    ? 'text-on-surface-variant/60'
                                                    : summaryOk &&
                                                        summaryLen <= config.summaryMax
                                                        ? 'text-primary'
                                                        : 'text-error'
                                                    }`}
                                            >
                                                {summaryLen}/{config.summaryMax}
                                            </span>
                                        </div>
                                        <textarea
                                            id="proposal-summary"
                                            value={modalSummary}
                                            onChange={(e) =>
                                                setModalSummary(
                                                    e.target.value.slice(0, config.summaryMax),
                                                )
                                            }
                                            onBlur={() => setModalTouched(true)}
                                            placeholder={config.summaryPlaceholder}
                                            rows={2}
                                            maxLength={config.summaryMax}
                                            className={`w-full bg-surface-container-lowest text-on-surface rounded-lg px-space-md py-2 font-body-sm text-body-sm border transition-colors focus:outline-none resize-none ${modalTouched && !summaryOk
                                                ? 'border-error/60 focus:border-error'
                                                : 'border-outline-variant/30 focus:border-primary'
                                                }`}
                                        />
                                        <span className="font-code-sm text-code-sm text-on-surface-variant/80">
                                            {config.summaryHint} Minimum {config.summaryMin}{' '}
                                            characters.
                                        </span>
                                    </div>

                                    {/* Body */}
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <label
                                                className="font-label-md text-label-md text-on-surface-variant"
                                                htmlFor="proposal-body"
                                            >
                                                {config.bodyLabel}
                                            </label>
                                            <span
                                                className={`font-code-sm text-code-sm ${bodyLen === 0
                                                    ? 'text-on-surface-variant/60'
                                                    : bodyOk && bodyLen <= config.bodyMax
                                                        ? 'text-primary'
                                                        : 'text-error'
                                                    }`}
                                            >
                                                {bodyLen}/{config.bodyMax}
                                            </span>
                                        </div>
                                        <textarea
                                            id="proposal-body"
                                            value={modalBody}
                                            onChange={(e) =>
                                                setModalBody(e.target.value.slice(0, config.bodyMax))
                                            }
                                            onBlur={() => setModalTouched(true)}
                                            onKeyDown={(e) => {
                                                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                                    e.preventDefault();
                                                    submitNewProposal(e as any);
                                                }
                                            }}
                                            placeholder={config.bodyPlaceholder}
                                            rows={8}
                                            maxLength={config.bodyMax}
                                            className={`w-full bg-surface-container-lowest text-on-surface rounded-lg px-space-md py-2 font-body-sm text-body-sm border transition-colors focus:outline-none resize-none ${modalTouched && !bodyOk
                                                ? 'border-error/60 focus:border-error'
                                                : 'border-outline-variant/30 focus:border-primary'
                                                }`}
                                        />
                                        <span className="font-code-sm text-code-sm text-on-surface-variant/80">
                                            {config.bodyHint} Markdown supported. Minimum{' '}
                                            {config.bodyMin} characters.
                                        </span>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-col gap-1">
                                        <label
                                            className="font-label-md text-label-md text-on-surface-variant"
                                            htmlFor="proposal-tags"
                                        >
                                            Tags <span className="opacity-60">(optional)</span>
                                        </label>
                                        <input
                                            id="proposal-tags"
                                            value={modalTags}
                                            onChange={(e) => setModalTags(e.target.value)}
                                            placeholder={config.tagsPlaceholder}
                                            className="w-full bg-surface-container-lowest text-on-surface rounded-lg px-space-md py-2 font-body-sm text-body-sm border border-outline-variant/30 focus:outline-none focus:border-primary transition-colors"
                                        />
                                        {parsedTags.length > 0 ? (
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                {parsedTags.map((t) => (
                                                    <span
                                                        key={t}
                                                        className="px-2 py-0.5 rounded font-code-sm text-code-sm bg-surface-container-high text-on-surface-variant"
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="font-code-sm text-code-sm text-on-surface-variant/80">
                                                {config.tagHint}
                                            </span>
                                        )}
                                    </div>
                                </>
                            ) : (
                                /* Preview mode */
                                <div className="flex flex-col gap-space-md">
                                    <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-label-sm text-label-sm">
                                                {API_TO_STATUS['OPEN']}
                                            </span>
                                            <span className="font-code-sm text-code-sm text-on-surface-variant">
                                                preview
                                            </span>
                                        </div>
                                        <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">
                                            {modalTitle || 'Untitled proposal'}
                                        </h3>
                                        <p className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-wrap">
                                            {modalSummary || 'No summary yet.'}
                                        </p>
                                    </div>
                                    <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/20">
                                        <pre className="font-code-sm text-code-sm text-on-surface-variant whitespace-pre-wrap break-words">
                                            {modalBody || 'No body yet.'}
                                        </pre>
                                    </div>
                                    {parsedTags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {parsedTags.map((t) => (
                                                <span
                                                    key={t}
                                                    className="px-2 py-0.5 rounded font-code-sm text-code-sm bg-surface-container-high text-on-surface-variant"
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>

                        {/* Modal footer */}
                        <div className="flex items-center justify-between gap-space-sm px-space-lg py-space-md border-t border-outline-variant/20 bg-surface-container">
                            <span className="hidden sm:inline font-code-sm text-code-sm text-on-surface-variant">
                                Press{' '}
                                <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest font-code-sm">
                                    ⌘/Ctrl
                                </kbd>{' '}
                                +{' '}
                                <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest font-code-sm">
                                    Enter
                                </kbd>{' '}
                                to publish
                            </span>
                            <div className="flex items-center gap-space-sm ml-auto">
                                <button
                                    onClick={closeModal}
                                    type="button"
                                    className="px-space-md py-1.5 rounded-lg bg-surface-container-high text-on-surface font-body-sm text-body-sm hover:bg-surface-container-highest transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    onClick={submitNewProposal}
                                    disabled={create.isPending || !isFormValid}
                                    className="px-space-lg py-1.5 rounded-lg bg-primary text-on-primary font-headline-sm text-headline-sm font-medium hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {create.isPending ? (
                                        <span className="material-symbols-outlined text-[16px] animate-spin">
                                            progress_activity
                                        </span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[16px]">
                                            send
                                        </span>
                                    )}
                                    <span>
                                        {create.isPending ? 'Publishing...' : config.submitLabel}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ---------------- Detail Drawer ---------------- */}
            {openPostId && (
                <div
                    className="fixed inset-0 z-40 flex justify-end bg-surface-container-lowest/60 backdrop-blur-sm animate-fade-in"
                    onClick={() => setOpenPostId(null)}
                >
                    <div
                        className="w-full max-w-2xl h-full bg-surface-container border-l border-outline-variant/30 flex flex-col shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="flex items-center justify-between px-space-lg py-space-md border-b border-outline-variant/20 bg-surface-container">
                            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface truncate pr-4">
                                {detail?.title ?? 'Loading…'}
                            </h2>
                            <button
                                onClick={() => setOpenPostId(null)}
                                className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors shrink-0"
                                aria-label="Close detail"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    close
                                </span>
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-space-lg flex flex-col gap-space-md">
                            {detailLoading && (
                                <div className="flex flex-col items-center gap-2 py-space-xl">
                                    <span className="material-symbols-outlined text-[32px] text-primary animate-spin">
                                        progress_activity
                                    </span>
                                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                                        Loading discussion…
                                    </span>
                                </div>
                            )}

                            {detail && (
                                <>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-label-sm text-label-sm">
                                            {API_TO_STATUS[detail.status]}
                                        </span>
                                        <span className="font-code-sm text-code-sm text-on-surface-variant">
                                            by{' '}
                                            <span className="text-primary">
                                                {handleOf(detail.author)}
                                            </span>{' '}
                                            · {formatRelativeTime(detail.createdAt)}
                                        </span>
                                    </div>

                                    <p className="whitespace-pre-wrap font-body-md text-body-md text-on-surface">
                                        {detail.body}
                                    </p>

                                    <h3 className="font-label-lg text-label-lg text-on-surface-variant pt-2 border-t border-outline-variant/20">
                                        {detail.commentCount}{' '}
                                        {detail.commentCount === 1 ? 'comment' : 'comments'}
                                    </h3>

                                    {detail.comments.length === 0 ? (
                                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                                            No comments yet. Start the discussion.
                                        </p>
                                    ) : (
                                        <div className="flex flex-col gap-space-sm">
                                            {detail.comments.map((c) => (
                                                <div
                                                    key={c.id}
                                                    className="p-space-sm rounded-lg bg-surface-container-low border border-outline-variant/20"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-code-sm text-[10px] font-bold">
                                                                {initialsOf(c.author.name)}
                                                            </div>
                                                            <span className="font-code-sm text-code-sm text-primary font-medium">
                                                                {handleOf(c.author)}
                                                            </span>
                                                            {c.author.isAdmin && (
                                                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-primary/15 text-primary font-semibold">
                                                                    CORE
                                                                </span>
                                                            )}
                                                            <span className="font-code-sm text-code-sm text-on-surface-variant">
                                                                {formatRelativeTime(c.createdAt)}
                                                            </span>
                                                        </div>
                                                        {(isAdmin ||
                                                            userId === c.author.id ||
                                                            (userWallet &&
                                                                c.author.walletAddress &&
                                                                userWallet ===
                                                                c.author.walletAddress)) && (
                                                                <button
                                                                    onClick={() =>
                                                                        removeComment.mutate(c.id, {
                                                                            onSuccess: () =>
                                                                                showToast(
                                                                                    'Comment deleted.',
                                                                                ),
                                                                            onError: () =>
                                                                                showToast(
                                                                                    'Failed to delete comment.',
                                                                                ),
                                                                        })
                                                                    }
                                                                    className="text-on-surface-variant hover:text-error transition-colors"
                                                                    aria-label="Delete comment"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">
                                                                        delete
                                                                    </span>
                                                                </button>
                                                            )}
                                                    </div>
                                                    <p className="font-body-sm text-body-sm text-on-surface mt-2 whitespace-pre-wrap">
                                                        {c.body}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <CommentComposer
                            disabled={comment.isPending}
                            onSubmit={(body) =>
                                comment.mutate(
                                    { postId: openPostId, body },
                                    {
                                        onError: () =>
                                            showToast('Failed to post comment. Please try again.'),
                                    },
                                )
                            }
                        />
                    </div>
                </div>
            )}

            {/* ---------------- Hero ---------------- */}
            <div className="relative overflow-hidden bg-surface-container-lowest px-space-md py-space-xl sm:px-space-xl lg:px-margin border-b border-outline-variant/30">
                <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
                <div className="absolute top-1/2 right-10 w-80 h-80 rounded-full bg-secondary/10 blur-3xl pointer-events-none"></div>

                <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
                    <div className="flex flex-col gap-space-xs max-w-2xl">
                        <div className="flex items-center gap-space-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-code-sm text-code-sm bg-primary/10 text-primary uppercase tracking-wider font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                Nervos Ecosystem Hub
                            </span>
                            <span className="font-code-sm text-code-sm text-on-surface-variant font-normal">
                                CKB-VM RFC Portal · {CORVEN_V1_LAUNCH.version} live
                            </span>
                        </div>
                        <h1 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">
                            Developer Community & Proposals
                        </h1>
                        <p className="font-body-lg text-body-lg text-on-surface-variant">
                            Welcome to the {CORVEN_V1_LAUNCH.version} launch. Propose features,
                            discuss CKB contract templates, vote on RFCs, and stay updated with
                            Nervos ecosystem releases.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-space-sm self-start md:self-auto">
                        <button
                            onClick={openModal}
                            className="px-space-lg py-2.5 rounded-xl bg-primary text-on-primary font-headline-sm text-headline-sm font-medium hover:bg-primary-container shadow-lg shadow-primary/15 transition-all flex items-center gap-space-xs active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[20px]">
                                add_circle
                            </span>
                            <span>+ Submit Proposal / Feedback</span>
                        </button>
                        <a
                            className="px-space-md py-2.5 rounded-xl bg-surface-container-high text-on-surface hover:text-secondary hover:bg-surface-container-highest transition-all flex items-center gap-space-xs"
                            href={CORVEN_V1_LAUNCH.links.discord}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            <span className="material-symbols-outlined text-[18px] text-secondary">
                                forum
                            </span>
                            <span className="font-body-md text-body-md font-medium">
                                Join Discord & Telegram
                            </span>
                        </a>
                    </div>
                </div>
            </div>

            {/* ---------------- Filters ---------------- */}
            <div className="bg-surface-container-low px-space-md sm:px-space-xl lg:px-margin py-space-md sticky top-14 z-30 shadow-md border-b border-outline-variant/30">
                <div className="max-w-7xl mx-auto flex flex-col gap-space-md">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm">
                        <div className="relative flex-1 max-w-2xl">
                            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
                                search
                            </span>
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/70 font-body-sm text-body-sm pl-10 pr-10 py-2 rounded-lg border border-outline-variant/30 focus:outline-none focus:bg-surface-container transition-all"
                                placeholder="Search this page of proposals, news, feedback..."
                                type="text"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-2.5 text-on-surface-variant hover:text-on-surface"
                                    aria-label="Clear search"
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        cancel
                                    </span>
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 self-start lg:self-auto">
                            {/* Sort toggle */}
                            <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded-lg border border-outline-variant/20">
                                {(['top', 'new'] as const).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setCurrentSort(s)}
                                        className={`px-space-md py-1 rounded font-label-md text-label-md transition-colors whitespace-nowrap font-medium ${currentSort === s
                                            ? 'text-primary bg-surface-container shadow-sm'
                                            : 'text-on-surface-variant hover:text-on-surface'
                                            }`}
                                    >
                                        {s === 'top' ? 'Top' : 'New'}
                                    </button>
                                ))}
                            </div>

                            {/* Status pills */}
                            <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded-lg overflow-x-auto max-w-full border border-outline-variant/20">
                                {[
                                    { key: 'all', label: 'All Status' },
                                    { key: 'Open', label: 'Open' },
                                    { key: 'Planned', label: 'Planned' },
                                    { key: 'In Progress', label: 'In Progress' },
                                    { key: 'Done', label: 'Done' },
                                    { key: 'Declined', label: 'Declined' },
                                ].map((st) => (
                                    <button
                                        key={st.key}
                                        onClick={() => setCurrentStatus(st.key)}
                                        className={`px-space-md py-1 rounded font-label-md text-label-md transition-colors whitespace-nowrap font-medium ${currentStatus === st.key
                                            ? 'text-primary bg-surface-container shadow-sm'
                                            : 'text-on-surface-variant hover:text-on-surface'
                                            }`}
                                    >
                                        {st.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {[
                            { key: 'all', label: 'All', count: countsByCategory.all },
                            { key: 'Proposals', label: 'Proposals', count: countsByCategory.proposal },
                            { key: 'News', label: 'News', count: countsByCategory.news },
                            { key: 'Feedback', label: 'Feedback', count: countsByCategory.feedback },
                        ].map((cat) => (
                            <button
                                key={cat.key}
                                onClick={() => setCurrentCategory(cat.key)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-code-sm text-code-sm font-medium transition-all shadow-sm ${currentCategory === cat.key
                                    ? 'bg-primary text-on-primary'
                                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                                    }`}
                            >
                                <span>{cat.label}</span>
                                <span
                                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${currentCategory === cat.key
                                        ? 'bg-on-primary/20 text-on-primary'
                                        : 'bg-surface-container-high text-on-surface-variant'
                                        }`}
                                >
                                    {cat.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ---------------- Feed + Sidebar ---------------- */}
            <div className="max-w-7xl mx-auto w-full px-space-md sm:px-space-xl lg:px-margin py-space-xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
                    <section className="lg:col-span-8 flex flex-col gap-space-md">
                        {/* V1.0 Launch Banner */}
                        {showV1Banner && (
                            <div className="relative overflow-hidden rounded-xl p-space-lg bg-gradient-to-br from-primary/15 via-surface-container to-secondary/10 border border-primary/30 shadow-md animate-fade-in">
                                <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

                                <button
                                    onClick={() => setShowV1Banner(false)}
                                    className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-surface-container-high/70 hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors"
                                    aria-label="Dismiss V1.0 banner"
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        close
                                    </span>
                                </button>

                                <div className="relative flex flex-col gap-space-sm">
                                    <div className="flex items-center gap-space-xs flex-wrap">
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary text-on-primary font-code-sm text-code-sm font-bold uppercase tracking-wider">
                                            <span className="material-symbols-outlined text-[14px]">
                                                rocket_launch
                                            </span>
                                            V1.0 Shipping
                                        </span>
                                        <span className="font-code-sm text-code-sm text-on-surface-variant">
                                            {CORVEN_V1_LAUNCH.version} · {CORVEN_V1_LAUNCH.codename}
                                        </span>
                                    </div>

                                    <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface leading-tight">
                                        {CORVEN_V1_LAUNCH.tagline}
                                    </h2>

                                    <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
                                        {CORVEN_V1_LAUNCH.summary}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-space-sm pt-2">
                                        <a
                                            href={CORVEN_V1_LAUNCH.links.releaseNotes}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            className="px-space-md py-2 rounded-lg bg-primary text-on-primary font-headline-sm text-headline-sm font-medium hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                description
                                            </span>
                                            <span>Release Notes</span>
                                        </a>
                                        <a
                                            href={CORVEN_V1_LAUNCH.links.changelog}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            className="px-space-md py-2 rounded-lg bg-surface-container-high text-on-surface font-body-sm text-body-sm font-medium hover:bg-surface-container-highest transition-colors flex items-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                history_edu
                                            </span>
                                            <span>Changelog</span>
                                        </a>
                                        <a
                                            href={CORVEN_V1_LAUNCH.links.discord}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            className="px-space-md py-2 rounded-lg bg-surface-container-high text-on-surface font-body-sm text-body-sm font-medium hover:bg-surface-container-highest transition-colors flex items-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-[18px] text-secondary">
                                                forum
                                            </span>
                                            <span>Discuss on Discord</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}

                        {toastMessage && (
                            <div className="flex items-center justify-between p-space-md rounded-xl bg-primary/10 border border-primary/30 text-on-surface font-body-sm text-body-sm shadow-sm animate-fade-in">
                                <div className="flex items-center gap-space-sm">
                                    <span className="material-symbols-outlined text-primary text-[20px]">
                                        check_circle
                                    </span>
                                    <span>{toastMessage}</span>
                                </div>
                                <button
                                    onClick={() => setToastMessage(null)}
                                    className="text-on-surface-variant hover:text-on-surface"
                                    aria-label="Dismiss"
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        close
                                    </span>
                                </button>
                            </div>
                        )}

                        {isLoading && (
                            <div className="p-space-xl rounded-xl bg-surface-container text-center flex flex-col items-center justify-center gap-space-sm border border-outline-variant/30">
                                <span className="material-symbols-outlined text-[40px] text-primary animate-spin">
                                    progress_activity
                                </span>
                                <h3 className="font-headline-md text-headline-md text-on-surface">
                                    Loading community feed...
                                </h3>
                            </div>
                        )}

                        {isError && (
                            <div className="p-space-xl rounded-xl bg-error/10 border border-error/30 text-center flex flex-col items-center justify-center gap-space-sm">
                                <span className="material-symbols-outlined text-[40px] text-error">
                                    error
                                </span>
                                <h3 className="font-headline-md text-headline-md text-on-surface">
                                    Failed to load community feed
                                </h3>
                                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                                    There was a problem connecting to the community API. Please
                                    try again later.
                                </p>
                            </div>
                        )}

                        {!isLoading &&
                            !isError &&
                            feedItems.map((item) => {
                                const isLikedItem = item.category === 'News';
                                const isConfirming = confirmingDeleteId === item.id;
                                const isDeleting =
                                    remove.isPending && remove.variables === item.id;

                                return (
                                    <article
                                        key={item.id}
                                        className="p-space-lg rounded-xl bg-surface-container flex flex-col gap-space-md transition-all hover:bg-surface-container-high shadow-sm relative overflow-hidden border border-outline-variant/30"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {item.isPinned && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-primary font-code-sm text-code-sm bg-primary/15 font-semibold">
                                                        <span className="material-symbols-outlined text-[14px]">
                                                            push_pin
                                                        </span>{' '}
                                                        PINNED
                                                    </span>
                                                )}
                                                {item.category === 'News' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-secondary font-code-sm text-code-sm bg-secondary/10 font-semibold">
                                                        <span className="material-symbols-outlined text-[14px]">
                                                            campaign
                                                        </span>{' '}
                                                        ANNOUNCEMENT
                                                    </span>
                                                )}
                                                {item.category === 'Proposals' && !item.isPinned && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-tertiary font-code-sm text-code-sm bg-tertiary-container/20 font-semibold">
                                                        <span className="material-symbols-outlined text-[14px]">
                                                            how_to_vote
                                                        </span>{' '}
                                                        PROPOSAL
                                                    </span>
                                                )}
                                                {item.category === 'Feedback' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-on-surface-variant font-code-sm text-code-sm bg-surface-container-highest font-semibold">
                                                        <span className="material-symbols-outlined text-[14px]">
                                                            tune
                                                        </span>{' '}
                                                        FEEDBACK
                                                    </span>
                                                )}

                                                {/* Admin: inline status select */}
                                                {isAdmin ? (
                                                    <select
                                                        value={item.statusKey}
                                                        onChange={(e) =>
                                                            update.mutate({
                                                                postId: item.id,
                                                                status: e.target
                                                                    .value as PostStatus,
                                                            })
                                                        }
                                                        className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-label-sm text-label-sm border border-outline-variant/20 focus:outline-none focus:border-primary"
                                                        aria-label="Change status"
                                                    >
                                                        {Object.entries(STATUS_LABELS).map(
                                                            ([k, v]) => (
                                                                <option key={k} value={k}>
                                                                    {v}
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                ) : (
                                                    item.status && (
                                                        <span className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-label-sm text-label-sm">
                                                            {item.status}
                                                        </span>
                                                    )
                                                )}

                                                {/* Admin: pin toggle */}
                                                {isAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            update.mutate({
                                                                postId: item.id,
                                                                pinned: !item.isPinned,
                                                            })
                                                        }
                                                        title={
                                                            item.isPinned ? 'Unpin' : 'Pin'
                                                        }
                                                        aria-label={
                                                            item.isPinned ? 'Unpin post' : 'Pin post'
                                                        }
                                                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${item.isPinned
                                                            ? 'text-primary bg-primary/10'
                                                            : 'text-on-surface-variant hover:text-primary hover:bg-primary/10'
                                                            }`}
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">
                                                            push_pin
                                                        </span>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="font-code-sm text-code-sm text-on-surface-variant flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">
                                                        history
                                                    </span>
                                                    {item.timeAgo}
                                                </span>

                                                {item.canDelete && (
                                                    <>
                                                        {isConfirming ? (
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => confirmDelete(item.id)}
                                                                    disabled={isDeleting}
                                                                    className="px-2 py-1 rounded text-[11px] bg-error text-on-error font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
                                                                >
                                                                    {isDeleting ? (
                                                                        <span className="material-symbols-outlined text-[12px] animate-spin">
                                                                            progress_activity
                                                                        </span>
                                                                    ) : (
                                                                        <span className="material-symbols-outlined text-[12px]">
                                                                            delete
                                                                        </span>
                                                                    )}
                                                                    Confirm
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setConfirmingDeleteId(null)
                                                                    }
                                                                    disabled={isDeleting}
                                                                    className="px-2 py-1 rounded text-[11px] bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-50"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setConfirmingDeleteId(item.id)
                                                                }
                                                                title={
                                                                    item.isModeratorDelete
                                                                        ? 'Delete post (moderator)'
                                                                        : 'Delete your post'
                                                                }
                                                                aria-label={
                                                                    item.isModeratorDelete
                                                                        ? 'Delete post as moderator'
                                                                        : 'Delete your post'
                                                                }
                                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">
                                                                    delete
                                                                </span>
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-space-md items-start">
                                            <button
                                                onClick={() => toggleVote(item.id)}
                                                disabled={vote.isPending}
                                                className={`flex flex-col items-center justify-center min-w-[52px] px-2 py-2 rounded-lg transition-colors group border disabled:opacity-50 ${item.hasVoted
                                                    ? 'bg-primary/10 border-primary/30 text-primary'
                                                    : 'bg-surface-container-lowest hover:bg-surface-container-highest border-transparent text-on-surface'
                                                    }`}
                                                aria-label={
                                                    item.hasVoted ? 'Remove vote' : 'Vote'
                                                }
                                            >
                                                <span
                                                    className={`material-symbols-outlined text-[20px] transition-colors ${item.hasVoted
                                                        ? 'text-primary'
                                                        : 'text-on-surface-variant group-hover:text-primary'
                                                        }`}
                                                >
                                                    {isLikedItem
                                                        ? 'favorite'
                                                        : 'arrow_drop_up'}
                                                </span>
                                                <span
                                                    className={`font-code-md text-code-md font-bold ${item.hasVoted
                                                        ? 'text-primary'
                                                        : 'text-on-surface'
                                                        }`}
                                                >
                                                    {item.voteCount}
                                                </span>
                                            </button>

                                            <div className="flex flex-col gap-space-xs flex-1 min-w-0">
                                                <h2
                                                    onClick={() => setOpenPostId(item.id)}
                                                    className="font-headline-md text-headline-md font-semibold text-on-surface leading-snug hover:text-primary cursor-pointer transition-colors"
                                                >
                                                    {item.title}
                                                </h2>
                                                <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">
                                                    {item.preview}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-y-2 gap-x-space-md pt-2 mt-auto">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-code-sm text-[10px] font-bold">
                                                            {item.author.initials}
                                                        </div>
                                                        <span className="font-code-sm text-code-sm text-on-surface-variant">
                                                            by
                                                        </span>
                                                        <span className="font-code-sm text-code-sm text-primary font-medium hover:underline cursor-pointer">
                                                            {item.author.handle}
                                                        </span>
                                                        {item.author.isCore && (
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-primary/15 text-primary font-semibold">
                                                                CORE
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-space-md ml-auto text-on-surface-variant font-code-sm text-code-sm">
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpenPostId(item.id)}
                                                            className="flex items-center gap-1 hover:text-on-surface cursor-pointer"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">
                                                                chat_bubble_outline
                                                            </span>
                                                            {item.commentsCount} comments
                                                        </button>
                                                        <span
                                                            onClick={() =>
                                                                showToast(
                                                                    'Share link copied to clipboard!',
                                                                )
                                                            }
                                                            className="flex items-center gap-1 hover:text-on-surface cursor-pointer"
                                                            title="Share"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">
                                                                share
                                                            </span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}

                        {!isLoading && !isError && feedItems.length === 0 && (
                            <div className="p-space-xl rounded-xl bg-surface-container text-center flex flex-col items-center justify-center gap-space-sm border border-outline-variant/30">
                                <span className="material-symbols-outlined text-[40px] text-on-surface-variant">
                                    forum
                                </span>
                                <h3 className="font-headline-md text-headline-md text-on-surface">
                                    {isPristine
                                        ? 'No discussions yet'
                                        : 'No discussions match your filter'}
                                </h3>
                                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                                    {isPristine
                                        ? 'Be the first to submit an RFC, share feedback, or report a bug to the Corven community.'
                                        : 'Try adjusting your search keywords or switching to another category tab.'}
                                </p>
                                {isPristine ? (
                                    <button
                                        onClick={openModal}
                                        className="mt-2 px-space-md py-1.5 rounded-lg bg-primary text-on-primary font-code-sm text-code-sm hover:bg-primary-container transition-colors flex items-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">
                                            add_circle
                                        </span>
                                        Submit the first proposal
                                    </button>
                                ) : (
                                    <button
                                        onClick={resetFilters}
                                        className="mt-2 px-space-md py-1.5 rounded-lg bg-surface-container-high text-primary font-code-sm text-code-sm hover:bg-surface-container-highest transition-colors"
                                    >
                                        Reset Filters
                                    </button>
                                )}
                            </div>
                        )}
                    </section>

                    {/* ---------------- Sidebar ---------------- */}
                    <aside className="lg:col-span-4 flex flex-col gap-space-md">
                        <div className="p-space-lg rounded-xl bg-surface-container flex flex-col gap-space-md shadow-sm border border-primary/30 relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/15 blur-2xl pointer-events-none" />

                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[20px]">
                                        rocket_launch
                                    </span>
                                    <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                        Corven {CORVEN_V1_LAUNCH.version}
                                    </h3>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-primary text-on-primary font-code-sm text-code-sm font-bold">
                                    LIVE
                                </span>
                            </div>

                            <p className="relative font-body-sm text-body-sm text-on-surface-variant">
                                {CORVEN_V1_LAUNCH.summary}
                            </p>

                            <a
                                href={CORVEN_V1_LAUNCH.links.releaseNotes}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="relative px-space-md py-2 rounded-lg bg-primary text-on-primary text-center font-headline-sm text-headline-sm font-medium hover:bg-primary-container transition-colors flex items-center justify-center gap-1 shadow-sm"
                            >
                                <span>Read Release Notes</span>
                                <span className="material-symbols-outlined text-[16px]">
                                    open_in_new
                                </span>
                            </a>
                        </div>

                        <div className="p-space-lg rounded-xl bg-surface-container flex flex-col gap-space-md shadow-sm relative overflow-hidden border border-outline-variant/30">
                            <div className="flex items-center justify-between">
                                <span className="font-label-sm text-label-sm uppercase font-semibold tracking-wider text-secondary flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">
                                        flare
                                    </span>{' '}
                                    Ecosystem Spotlight
                                </span>
                                <span className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-code-sm text-code-sm font-semibold">
                                    Coming Soon
                                </span>
                            </div>

                            <div className="relative w-full h-36 rounded-lg bg-surface-container-lowest overflow-hidden flex flex-col items-center justify-center p-space-md border border-outline-variant/20">
                                <span className="material-symbols-outlined text-[28px] text-on-surface-variant mb-1">
                                    insights
                                </span>
                                <span className="font-code-sm text-code-sm text-on-surface-variant">
                                    Telemetry offline
                                </span>
                            </div>

                            <div className="flex flex-col gap-1">
                                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                    Ecosystem Updates
                                </h3>
                                <p className="font-body-sm text-body-sm text-on-surface-variant">
                                    Live network stats, hard fork readiness, and protocol
                                    announcements will appear here once the indexer is
                                    connected.
                                </p>
                            </div>

                            <a
                                href="https://docs.nervos.org"
                                target="_blank"
                                rel="noreferrer noopener"
                                className="px-space-md py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-headline-sm text-headline-sm text-center font-medium transition-colors flex items-center justify-center gap-1 shadow-sm"
                            >
                                <span>Read Nervos Docs</span>
                                <span className="material-symbols-outlined text-[16px]">
                                    open_in_new
                                </span>
                            </a>
                        </div>

                        <div className="p-space-lg rounded-xl bg-surface-container flex flex-col gap-space-md shadow-sm border border-outline-variant/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[20px]">
                                        military_tech
                                    </span>
                                    <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                        Top Contributors
                                    </h3>
                                </div>
                                <span className="font-code-sm text-code-sm text-on-surface-variant">
                                    This Month
                                </span>
                            </div>

                            <div className="flex flex-col items-center justify-center gap-2 py-space-md text-center">
                                <span className="material-symbols-outlined text-[32px] text-on-surface-variant">
                                    emoji_events
                                </span>
                                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-[220px]">
                                    No contributions recorded yet. Submit an RFC or PR to be
                                    featured here.
                                </p>
                            </div>

                            <div className="pt-2 text-center border-t border-outline-variant/20">
                                <a
                                    className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors inline-flex items-center gap-1"
                                    href="#leaderboard"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        showToast(
                                            'Leaderboard is empty — contributions will appear here.',
                                        );
                                    }}
                                >
                                    <span>View full leaderboard & perks</span>
                                    <span className="material-symbols-outlined text-[14px]">
                                        arrow_forward
                                    </span>
                                </a>
                            </div>
                        </div>

                        <div className="p-space-lg rounded-xl bg-surface-container flex flex-col gap-space-md shadow-sm border border-outline-variant/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-secondary text-[20px]">
                                        alt_route
                                    </span>
                                    <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                        IDE Roadmap
                                    </h3>
                                </div>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-code-sm bg-surface-container-highest text-on-surface-variant">
                                    TBD
                                </span>
                            </div>

                            <div className="flex flex-col items-center justify-center gap-2 py-space-md text-center">
                                <span className="material-symbols-outlined text-[32px] text-on-surface-variant">
                                    route
                                </span>
                                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-[220px]">
                                    Roadmap milestones will be published after the next
                                    planning cycle.
                                </p>
                            </div>

                            <button
                                onClick={() =>
                                    showToast('Corven IDE public project board coming soon.')
                                }
                                className="px-space-md py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-center font-headline-sm text-headline-sm font-medium transition-colors"
                            >
                                Explore Detailed Public Board
                            </button>
                        </div>

                        <div className="p-space-lg rounded-xl bg-surface-container-low flex flex-col gap-space-sm text-on-surface-variant border border-outline-variant/30">
                            <div className="flex items-center gap-2 text-on-surface">
                                <span className="material-symbols-outlined text-[18px]">
                                    verified_user
                                </span>
                                <h4 className="font-headline-sm text-headline-sm font-semibold">
                                    Community Guidelines
                                </h4>
                            </div>
                            <p className="font-body-sm text-body-sm">
                                Be respectful, provide reproducible CKB-VM test scripts when
                                reporting issues, and adhere to RFC specification standards.
                            </p>
                            <div className="flex items-center gap-space-md pt-1 font-code-sm text-code-sm">
                                <a
                                    className="text-primary hover:underline"
                                    href="#conduct"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        showToast(
                                            'Corven IDE Code of Conduct: Be open, welcoming and constructive.',
                                        );
                                    }}
                                >
                                    Code of Conduct
                                </a>
                                <span>•</span>
                                <a
                                    className="text-primary hover:underline"
                                    href="#lifecycle"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        showToast(
                                            'RFC Lifecycle: Idea -> Proposal -> Review -> Implementation -> Shipped.',
                                        );
                                    }}
                                >
                                    RFC Lifecycle Guide
                                </a>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}