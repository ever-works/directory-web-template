'use client';

import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User } from 'next-auth';

export const CURRENT_USER_QUERY_KEY = ['auth-session'] as const;
const STALE_TIME = 10 * 60 * 1000; // Increased from 5min to 10min for session data
const GC_TIME = 30 * 60 * 1000;

interface UseCurrentUserError {
	message: string;
	status?: number;
}

const fetchCurrentUser = async (): Promise<User> => {
	const response = await serverClient.get<User>('/api/current-user');
	if (!apiUtils.isSuccess(response)) {
		const errorMessage = apiUtils.getErrorMessage(response) || 'Failed to fetch current user';
		throw {
			message: errorMessage,
			status: 'status' in response ? response.status : undefined
		};
	}
	if (!response.data) {
		throw {
			message: 'No user data received from server',
			status: 204
		};
	}
	return response.data;
};

export function useCurrentUser() {
	const queryClient = useQueryClient();

	const {
		data: user,
		isLoading,
		isError,
		error,
		refetch
	} = useQuery<User, UseCurrentUserError>({
		queryKey: CURRENT_USER_QUERY_KEY,
		queryFn: async () => {
			try {
				return await fetchCurrentUser();
			} catch (err) {
				if (err && typeof err === 'object' && 'message' in err) {
					throw err as UseCurrentUserError;
				}

				const error = err as Error;
				throw {
					message: error?.message || 'Failed to fetch current user',
					status: undefined
				} as UseCurrentUserError;
			}
		},
		staleTime: STALE_TIME,
		gcTime: GC_TIME,
		refetchOnWindowFocus: false, // Don't refetch on window focus for session data
		refetchOnMount: false, // Don't refetch if cache is fresh
		retry: (failureCount, error) => {
			// Don't retry authentication errors
			if (error.status === 401 || error.status === 403) {
				return false;
			}

			// Don't retry if user is not found (expected for logged out users)
			if (error.status === 204 || error.message.includes('No user data')) {
				return false;
			}

			// Retry network errors and server errors once (reduced from 2 to minimize timeouts)
			return failureCount < 2;
		}
	});

	const invalidateUserCache = () => {
		queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY });
	};

	const prefetchUser = async () => {
		await queryClient.prefetchQuery({
			queryKey: CURRENT_USER_QUERY_KEY,
			queryFn: fetchCurrentUser,
			staleTime: STALE_TIME
		});
	};

	const setUserData = (userData: User | null) => {
		queryClient.setQueryData(CURRENT_USER_QUERY_KEY, userData);
	};

	return {
		user,
		isLoading,
		isError,
		error,
		refetch,
		invalidateUserCache,
		prefetchUser,
		setUserData
	};
}

/**
 * Utility hook for managing user cache across the application
 */
export function useUserCache() {
	const queryClient = useQueryClient();

	const invalidateAllUserData = () => {
		queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
	};

	const clearUserCache = () => {
		queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY });
	};

	const getUserFromCache = (): User | undefined => {
		return queryClient.getQueryData(CURRENT_USER_QUERY_KEY);
	};

	const setUserInCache = (userData: User | null) => {
		queryClient.setQueryData(CURRENT_USER_QUERY_KEY, userData);
	};

	const isUserCached = (): boolean => {
		const cachedData = queryClient.getQueryData(CURRENT_USER_QUERY_KEY);
		return cachedData !== undefined;
	};

	return {
		invalidateAllUserData,
		clearUserCache,
		getUserFromCache,
		setUserInCache,
		isUserCached
	};
}
