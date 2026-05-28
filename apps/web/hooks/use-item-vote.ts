'use client';

import { useLoginModal } from './use-login-modal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCurrentUser } from './use-current-user';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import {
	ITEM_ACTIVITY_QUERY_KEY,
	type ItemActivityPayload
} from '@/components/item-detail/item-stats-section';

interface ItemVoteResponse {
	count: number;
	userVote: 'up' | 'down' | null;
}

/**
 * Apply a signed delta to every cached activity payload for an item (the
 * cache has one entry per `days` window). Bumps both `totals.votes` and
 * today's sparkline point so the sidebar Statistics card visibly moves on
 * the same frame as the vote button.
 */
function patchActivityForVoteDelta(
	queryClient: ReturnType<typeof useQueryClient>,
	itemId: string,
	delta: number
) {
	if (delta === 0) return;
	queryClient.setQueriesData<ItemActivityPayload>(
		{ queryKey: [ITEM_ACTIVITY_QUERY_KEY, itemId] },
		(old) => {
			if (!old) return old;
			const lastIdx = old.series.length - 1;
			const newSeries =
				lastIdx >= 0
					? [
							...old.series.slice(0, lastIdx),
							{ ...old.series[lastIdx], votes: (old.series[lastIdx]?.votes ?? 0) + delta }
						]
					: old.series;
			return {
				totals: { ...old.totals, votes: (old.totals?.votes ?? 0) + delta },
				series: newSeries
			};
		}
	);
}

export function useItemVote(itemId: string) {
	const { user } = useCurrentUser();
	const loginModal = useLoginModal();
	const queryClient = useQueryClient();

	const { data: voteData, isLoading } = useQuery<ItemVoteResponse>({
		queryKey: ['item-votes', itemId],
		queryFn: async () => {
			const response = await serverClient.get<{
				success: boolean;
				count: number;
				userVote: 'up' | 'down' | null;
			}>(`/api/items/${itemId}/votes`);

			if (!apiUtils.isSuccess(response)) {
				throw new Error(apiUtils.getErrorMessage(response) || 'Failed to fetch item votes');
			}

			// Extract count and userVote from the API response
			return {
				count: response.data.count,
				userVote: response.data.userVote
			};
		},
		enabled: !!itemId,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes
		retry: (failureCount, error) => {
			// Don't retry if it's an authentication error
			if (error.message.includes('sign in') || error.message.includes('unauthorized')) {
				return false;
			}
			// Retry up to 2 times for other errors
			return failureCount < 2;
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
	});

	const { mutate: vote, isPending: isVoting } = useMutation({
		mutationFn: async (type: 'up' | 'down') => {
			if (!itemId) {
				throw new Error('Missing itemId');
			}

			if (!user) {
				loginModal.onOpen('Please sign in to vote on this item');
				return;
			}

			const response = await serverClient.post<{
				success: boolean;
				count: number;
				userVote: 'up' | 'down' | null;
			}>(`/api/items/${itemId}/votes`, {
				type
			});

			if (!apiUtils.isSuccess(response)) {
				throw new Error(apiUtils.getErrorMessage(response) || 'Failed to vote on item');
			}

			// Extract count and userVote from the API response
			return {
				count: response.data.count,
				userVote: response.data.userVote
			};
		},
		onMutate: async (type) => {
			if (!user) {
				return;
			}

			await queryClient.cancelQueries({ queryKey: ['item-votes', itemId] });
			const previousVotes = queryClient.getQueryData<ItemVoteResponse>(['item-votes', itemId]);
			// Snapshot the activity cache so we can roll back on error without
			// triggering a refetch flicker.
			const previousActivity = queryClient.getQueriesData<ItemActivityPayload>({
				queryKey: [ITEM_ACTIVITY_QUERY_KEY, itemId]
			});

			// Mirror the same diff formula the vote count uses, then apply the
			// signed delta to the activity cache so the Statistics card updates
			// on the same frame as the vote button.
			const prevUserVote = previousVotes?.userVote ?? null;
			const countDiff = prevUserVote === type ? -1 : prevUserVote === null ? 1 : 2;
			const signedDelta = type === 'up' ? countDiff : -countDiff;

			queryClient.setQueryData<ItemVoteResponse>(['item-votes', itemId], (old) => {
				if (!old) return { count: type === 'up' ? 1 : -1, userVote: type };
				return {
					count: old.count + signedDelta,
					userVote: old.userVote === type ? null : type
				};
			});

			patchActivityForVoteDelta(queryClient, itemId, signedDelta);

			return { previousVotes, previousActivity };
		},
		onSuccess: (data) => {
			// Update cache with server data to ensure consistency
			// setQueryData will automatically trigger a re-render
			if (data) {
				queryClient.setQueryData<ItemVoteResponse>(['item-votes', itemId], data);
			}
		},
		onError: (error, _, context) => {
			if (context?.previousVotes) {
				queryClient.setQueryData(['item-votes', itemId], context.previousVotes);
			}
			if (context?.previousActivity) {
				for (const [key, value] of context.previousActivity) {
					queryClient.setQueryData(key, value);
				}
			}

			// Don't show error toast if user is not logged in (handled by login modal)
			if (!error.message.includes('sign in') && !error.message.includes('Authentication required')) {
				toast.error(error.message || 'An error occurred while voting');
			}
		}
	});

	const { mutate: unvote, isPending: isUnvoting } = useMutation({
		mutationFn: async () => {
			if (!itemId) {
				throw new Error('Missing itemId');
			}

			if (!user) {
				loginModal.onOpen('Please sign in to vote on this item');
				return;
			}

			const response = await serverClient.delete<{
				success: boolean;
				count: number;
				userVote: 'up' | 'down' | null;
			}>(`/api/items/${itemId}/votes`);

			if (!apiUtils.isSuccess(response)) {
				throw new Error(apiUtils.getErrorMessage(response) || 'Failed to remove vote');
			}

			// Extract count and userVote from the API response
			return {
				count: response.data.count,
				userVote: response.data.userVote
			};
		},
		onMutate: async () => {
			if (!user) {
				return;
			}

			await queryClient.cancelQueries({ queryKey: ['item-votes', itemId] });
			const previousVotes = queryClient.getQueryData<ItemVoteResponse>(['item-votes', itemId]);
			const previousActivity = queryClient.getQueriesData<ItemActivityPayload>({
				queryKey: [ITEM_ACTIVITY_QUERY_KEY, itemId]
			});

			const prevUserVote = previousVotes?.userVote ?? null;
			// Removing a vote inverts whichever direction it was.
			const signedDelta = prevUserVote === 'up' ? -1 : prevUserVote === 'down' ? 1 : 0;

			queryClient.setQueryData<ItemVoteResponse>(['item-votes', itemId], (old) => {
				if (!old) return { count: 0, userVote: null };
				return {
					count: old.count + signedDelta,
					userVote: null
				};
			});

			patchActivityForVoteDelta(queryClient, itemId, signedDelta);

			return { previousVotes, previousActivity };
		},
		onSuccess: (data) => {
			// Update cache with server data to ensure consistency
			// setQueryData will automatically trigger a re-render
			if (data) {
				queryClient.setQueryData<ItemVoteResponse>(['item-votes', itemId], data);
			}
		},
		onError: (error, _, context) => {
			if (context?.previousVotes) {
				queryClient.setQueryData(['item-votes', itemId], context.previousVotes);
			}
			if (context?.previousActivity) {
				for (const [key, value] of context.previousActivity) {
					queryClient.setQueryData(key, value);
				}
			}
			toast.error(error.message || 'An error occurred while removing your vote');
		}
	});

	const handleVote = (type: 'up' | 'down') => {
		if (!itemId) return;
		if (isVoting || isUnvoting) return;

		if (!user) {
			loginModal.onOpen('Please sign in to vote on this item');
			throw new Error('Authentication required');
		}

		if (voteData?.userVote === type) {
			unvote();
		} else {
			vote(type);
		}
	};

	// Utility function to manually refresh vote data
	const refreshVotes = () => {
		queryClient.invalidateQueries({ queryKey: ['item-votes', itemId] });
	};

	return {
		voteCount: voteData?.count || 0,
		userVote: voteData?.userVote || null,
		isLoading: isLoading || isVoting || isUnvoting || !itemId,
		handleVote,
		refreshVotes
	};
}

/**
 * Utility hook for managing vote cache across the application
 */
export function useVoteCache() {
	const queryClient = useQueryClient();

	const invalidateAllVotes = () => {
		queryClient.invalidateQueries({ queryKey: ['item-votes'] });
	};

	const invalidateItemVotes = (itemId: string) => {
		queryClient.invalidateQueries({ queryKey: ['item-votes', itemId] });
	};

	const clearVoteCache = () => {
		queryClient.removeQueries({ queryKey: ['item-votes'] });
	};

	const prefetchItemVotes = async (itemId: string) => {
		await queryClient.prefetchQuery({
			queryKey: ['item-votes', itemId],
			queryFn: async () => {
				const response = await serverClient.get<{
					success: boolean;
					count: number;
					userVote: 'up' | 'down' | null;
				}>(`/api/items/${itemId}/votes`);

				if (!apiUtils.isSuccess(response)) {
					throw new Error(apiUtils.getErrorMessage(response) || 'Failed to fetch item votes');
				}

				// Extract count and userVote from the API response
				return {
					count: response.data.count,
					userVote: response.data.userVote
				};
			},
			staleTime: 1000 * 60 * 5
		});
	};

	return {
		invalidateAllVotes,
		invalidateItemVotes,
		clearVoteCache,
		prefetchItemVotes
	};
}
