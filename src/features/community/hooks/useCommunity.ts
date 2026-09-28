// src/features/community/hooks/useCommunity.ts
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { useAuth } from '../../auth/hooks/useAuth';
import {
    communityApi,
    communityKeys,
    type CommunityPage,
    type CommunityPostDetail,
    type ListPostsQuery,
    type PostKind,
    type PostStatus,
} from '../api/community.api';

/** Whether the signed-in user may publish news and moderate. */
export function useCommunityPermissions() {
    const { user } = useAuth();

    const query = useQuery({
        queryKey: [...communityKeys.permissions(), user?.id ?? 'anonymous'],
        queryFn: () => communityApi.permissions(),
        enabled: Boolean(user),
        staleTime: 5 * 60_000,
    });

    return { isAdmin: Boolean(user && query.data?.isAdmin) };
}

export function useCommunityPosts(query: ListPostsQuery) {
    const { user } = useAuth();

    return useQuery({
        // The viewer changes `hasVoted`, so it is part of the key.
        queryKey: [...communityKeys.list(query), user?.id ?? 'anonymous'],
        queryFn: () => communityApi.list(query),
        placeholderData: (previous) => previous,
    });
}

export function useCommunityPost(postId: string | null) {
    const { user } = useAuth();

    return useQuery({
        queryKey: [...communityKeys.post(postId ?? ''), user?.id ?? 'anonymous'],
        queryFn: () => communityApi.get(postId!),
        enabled: Boolean(postId),
    });
}

export function useCommunityActions() {
    const queryClient = useQueryClient();
    const refreshAll = () => queryClient.invalidateQueries({ queryKey: communityKeys.all });

    const create = useMutation({
        mutationFn: (input: { kind: PostKind; title: string; body: string }) => communityApi.create(input),
        onSuccess: refreshAll,
    });

    const update = useMutation({
        mutationFn: ({ postId, ...changes }: { postId: string; title?: string; body?: string; status?: PostStatus; pinned?: boolean }) =>
            communityApi.update(postId, changes),
        onSuccess: refreshAll,
    });

    const remove = useMutation({
        mutationFn: (postId: string) => communityApi.remove(postId),
        onSuccess: refreshAll,
    });

    const comment = useMutation({
        mutationFn: ({ postId, body }: { postId: string; body: string }) => communityApi.comment(postId, body),
        onSuccess: refreshAll,
    });

    const removeComment = useMutation({
        mutationFn: (commentId: string) => communityApi.removeComment(commentId),
        onSuccess: refreshAll,
    });

    /** Upvotes (or un-votes) at once on screen; rolls back if the server refuses. */
    const vote = useMutation({
        mutationFn: (postId: string) => communityApi.vote(postId),
        onMutate: async (postId: string) => {
            await queryClient.cancelQueries({ queryKey: communityKeys.all });
            const snapshot = queryClient.getQueriesData({ queryKey: communityKeys.all });

            const flip = <T extends { id: string; hasVoted: boolean; voteCount: number }>(post: T): T =>
                post.id === postId
                    ? { ...post, hasVoted: !post.hasVoted, voteCount: post.voteCount + (post.hasVoted ? -1 : 1) }
                    : post;

            queryClient.setQueriesData<CommunityPage | CommunityPostDetail>({ queryKey: communityKeys.all }, (data) => {
                if (!data || typeof data !== 'object') return data;
                if ('posts' in data) return { ...data, posts: data.posts.map(flip) };
                if ('id' in data && 'hasVoted' in data) return flip(data);
                return data;
            });

            return { snapshot };
        },
        onError: (_error, _postId, context) => {
            context?.snapshot.forEach(([key, data]: [QueryKey, unknown]) => queryClient.setQueryData(key, data));
        },
        onSettled: refreshAll,
    });

    return { create, update, remove, comment, removeComment, vote };
}

