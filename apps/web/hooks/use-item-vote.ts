'use client';

import { useLoginModal } from './use-login-modal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCurrentUser } from './use-current-user';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

interface ItemVoteResponse {
	count: number;
	userVote: 'up' | 'down' | null;
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

			queryClient.setQueryData<ItemVoteResponse>(['item-votes', itemId], (old) => {
				if (!old) return { count: type === 'up' ? 1 : -1, userVote: type };

				const countDiff = old.userVote === type ? -1 : old.userVote === null ? 1 : 2;
				return {
					count: old.count + (type === 'up' ? countDiff : -countDiff),
					userVote: old.userVote === type ? null : type
				};
			});

			// Optimistically update the Statistics card so upvotes appear instantly
			const prevVote = previousVotes?.userVote ?? null;
			const voteChange = prevVote === type ? -1 : prevVote === null ? 1 : 2;
			const voteDelta = type === 'up' ? voteChange : -voteChange;
			queryClient.setQueriesData<{ totals: { votes: number; [k: string]: any }; series: any[] }>(
				{ queryKey: ['item-activity', itemId], exact: false },
				(old) => {
					if (!old) return old;
					return { ...old, totals: { ...old.totals, votes: old.totals.votes + voteDelta } };
				}
			);

			return { previousVotes };
		},
		onSuccess: (data) => {
			// Update cache with server data to ensure consistency
			// setQueryData will automatically trigger a re-render
			if (data) {
				queryClient.setQueryData<ItemVoteResponse>(['item-votes', itemId], data);
			}
			// Sync the Statistics card with the authoritative server count
			queryClient.invalidateQueries({ queryKey: ['item-activity', itemId] });
		},
		onError: (error, _, context) => {
			if (context?.previousVotes) {
				queryClient.setQueryData(['item-votes', itemId], context.previousVotes);
			}
			// Revert the optimistic Statistics update
			queryClient.invalidateQueries({ queryKey: ['item-activity', itemId] });

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

			queryClient.setQueryData<ItemVoteResponse>(['item-votes', itemId], (old) => {
				if (!old) return { count: 0, userVote: null };
				return {
					count: old.count + (old.userVote === 'up' ? -1 : old.userVote === 'down' ? 1 : 0),
					userVote: null
				};
			});

			// Optimistically update the Statistics card
			const prevVote = previousVotes?.userVote ?? null;
			const voteDelta = prevVote === 'up' ? -1 : prevVote === 'down' ? 1 : 0;
			queryClient.setQueriesData<{ totals: { votes: number; [k: string]: any }; series: any[] }>(
				{ queryKey: ['item-activity', itemId], exact: false },
				(old) => {
					if (!old) return old;
					return { ...old, totals: { ...old.totals, votes: old.totals.votes + voteDelta } };
				}
			);

			return { previousVotes };
		},
		onSuccess: (data) => {
			// Update cache with server data to ensure consistency
			// setQueryData will automatically trigger a re-render
			if (data) {
				queryClient.setQueryData<ItemVoteResponse>(['item-votes', itemId], data);
			}
			// Sync the Statistics card with the authoritative server count
			queryClient.invalidateQueries({ queryKey: ['item-activity', itemId] });
		},
		onError: (error, _, context) => {
			if (context?.previousVotes) {
				queryClient.setQueryData(['item-votes', itemId], context.previousVotes);
			}
			// Revert the optimistic Statistics update
			queryClient.invalidateQueries({ queryKey: ['item-activity', itemId] });
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
