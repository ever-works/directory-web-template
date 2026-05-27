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

/**
 * Subscribe to the current authenticated user via `/api/current-user`.
 *
 * Caching is tuned for session data: 10-minute stale time, 30-minute
 * GC, and `refetchOnWindowFocus`/`refetchOnMount` BOTH disabled. The
 * intent is that a logged-in user navigating the app doesn't trigger
 * a re-fetch per page mount; call `refetch()` or `invalidateUserCache()`
 * explicitly when the user's state may have changed (post-login,
 * profile update, etc.).
 *
 * Retry policy: 401/403 are never retried (auth errors), 204 / "No
 * user data" is never retried (the documented "logged-out" signal),
 * everything else is retried up to twice.
 *
 * **Misnomer alert**: `invalidateUserCache()` on the return object
 * calls `removeQueries`, NOT `invalidateQueries` — it deletes the
 * cached value entirely rather than marking it stale. If you want
 * the "mark stale + refetch on next mount" semantics, use
 * `useUserCache().invalidateAllUserData()` from the sibling hook
 * below; if you want "delete the cached user entirely", either is
 * fine but the sibling hook's `clearUserCache()` is named more
 * honestly.
 */
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
 * Cache-management surface for the current-user query, decoupled from
 * subscribing to the value itself. Use this when a component only
 * needs to mutate the cache (login flow, logout flow, manual refresh)
 * and doesn't want to re-render on every session change.
 *
 * Naming convention vs {@link useCurrentUser}:
 * - `invalidateAllUserData()` → `invalidateQueries` (mark stale +
 *   refetch on next observer)
 * - `clearUserCache()` → `removeQueries` (delete entirely; matches
 *   `useCurrentUser().invalidateUserCache` which is misnamed)
 *
 * Both hooks point at the same {@link CURRENT_USER_QUERY_KEY}, so
 * a `setUserInCache` here is visible to all subscribers of
 * `useCurrentUser` on the next render.
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
