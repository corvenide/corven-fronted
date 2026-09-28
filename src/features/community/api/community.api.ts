// src/features/community/api/community.api.ts
//
// News (published by Corven maintainers), feedback and proposals (anyone
// signed in), with comments and upvotes. Reading works without signing in.

import { apiClient } from '../../../lib/api-client';

export type PostKind = 'NEWS' | 'FEEDBACK' | 'PROPOSAL';
export type PostStatus = 'OPEN' | 'PLANNED' | 'IN_PROGRESS' | 'DONE' | 'DECLINED';
export type PostSort = 'top' | 'new';

export interface CommunityAuthor {
    id: string;
    name: string;
    walletAddress: string | null;
    /** Corven maintainer. */
    isAdmin: boolean;
}

export interface CommunityPost {
    id: string;
    kind: PostKind;
    title: string;
    body: string;
    status: PostStatus;
    pinned: boolean;
    voteCount: number;
    commentCount: number;
    hasVoted: boolean;
    createdAt: string;
    updatedAt: string;
    author: CommunityAuthor;
}

export interface CommunityComment {
    id: string;
    body: string;
    createdAt: string;
    author: CommunityAuthor;
}

export interface CommunityPostDetail extends CommunityPost {
    comments: CommunityComment[];
}

export interface CommunityPage {
    posts: CommunityPost[];
    total: number;
    nextOffset: number | null;
}

export interface ListPostsQuery {
    /** Omit for feedback and proposals together. */
    kind?: PostKind;
    sort?: PostSort;
    status?: PostStatus;
    offset?: number;
}

export const communityApi = {
    permissions(): Promise<{ isAdmin: boolean }> {
        return apiClient('/community/permissions');
    },

    list(query: ListPostsQuery = {}): Promise<CommunityPage> {
        const params = new URLSearchParams();
        if (query.kind) params.set('kind', query.kind);
        if (query.sort) params.set('sort', query.sort);
        if (query.status) params.set('status', query.status);
        if (query.offset) params.set('offset', String(query.offset));
        const search = params.toString();
        return apiClient(`/community/posts${search ? `?${search}` : ''}`);
    },

    get(postId: string): Promise<CommunityPostDetail> {
        return apiClient(`/community/posts/${encodeURIComponent(postId)}`);
    },

    create(input: { kind: PostKind; title: string; body: string }): Promise<CommunityPost> {
        return apiClient('/community/posts', { method: 'POST', body: JSON.stringify(input) });
    },

    update(
        postId: string,
        changes: { title?: string; body?: string; status?: PostStatus; pinned?: boolean },
    ): Promise<CommunityPost> {
        return apiClient(`/community/posts/${encodeURIComponent(postId)}`, {
            method: 'PATCH',
            body: JSON.stringify(changes),
        });
    },

    remove(postId: string): Promise<{ success: boolean }> {
        return apiClient(`/community/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
    },

    comment(postId: string, body: string): Promise<CommunityComment> {
        return apiClient(`/community/posts/${encodeURIComponent(postId)}/comments`, {
            method: 'POST',
            body: JSON.stringify({ body }),
        });
    },

    removeComment(commentId: string): Promise<{ success: boolean }> {
        return apiClient(`/community/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' });
    },

    vote(postId: string): Promise<{ voted: boolean; voteCount: number }> {
        return apiClient(`/community/posts/${encodeURIComponent(postId)}/vote`, { method: 'POST' });
    },
};

export const communityKeys = {
    all: ['community'] as const,
    permissions: () => ['community', 'permissions'] as const,
    list: (query: ListPostsQuery) => ['community', 'list', query] as const,
    post: (postId: string) => ['community', 'post', postId] as const,
};

export const STATUS_LABELS: Record<PostStatus, string> = {
    OPEN: 'Open',
    PLANNED: 'Planned',
    IN_PROGRESS: 'In progress',
    DONE: 'Done',
    DECLINED: 'Declined',
};

export const KIND_LABELS: Record<PostKind, string> = {
    NEWS: 'News',
    FEEDBACK: 'Feedback',
    PROPOSAL: 'Proposal',
};

