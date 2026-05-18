'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import type {
	NotificationListItem,
	NotificationListQuery,
	NotificationListResponse
} from '@/lib/notifications/types';

export const CLIENT_NOTIFICATION_KEYS = {
	all: ['client', 'notifications'] as const,
	list: (filters: NotificationListQuery) =>
		[...CLIENT_NOTIFICATION_KEYS.all, 'list', stableHash(filters)] as const,
	stats: () => [...CLIENT_NOTIFICATION_KEYS.all, 'stats'] as const,
	preferences: () => [...CLIENT_NOTIFICATION_KEYS.all, 'preferences'] as const
};

function stableHash(input: Record<string, unknown>): string {
	const keys = Object.keys(input).sort();
	const sorted: Record<string, unknown> = {};
	for (const k of keys) {
		const v = input[k];
		if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
		sorted[k] = v;
	}
	return JSON.stringify(sorted);
}

function toQueryString(filters: NotificationListQuery, cursor?: string): string {
	const params = new URLSearchParams();
	if (filters.tab) params.set('tab', filters.tab);
	if (filters.q) params.set('q', filters.q);
	if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
	if (filters.dateTo) params.set('dateTo', filters.dateTo);
	if (filters.limit) params.set('limit', String(filters.limit));
	if (cursor) params.set('cursor', cursor);
	if (filters.type) {
		const types = Array.isArray(filters.type) ? filters.type : [filters.type];
		types.forEach((t) => params.append('type', t));
	}
	if (filters.priority) {
		const ps = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
		ps.forEach((p) => params.append('priority', p));
	}
	const qs = params.toString();
	return qs ? `?${qs}` : '';
}

async function fetchPage(filters: NotificationListQuery, cursor?: string): Promise<NotificationListResponse> {
	const response = await serverClient.get<{ success: boolean; data: NotificationListResponse; error?: string }>(
		`/api/client/notifications${toQueryString(filters, cursor)}`
	);
	if (!apiUtils.isSuccess(response) || !response.data?.data) {
		throw new Error(response.data?.error || apiUtils.getErrorMessage(response) || 'Failed to fetch notifications');
	}
	return response.data.data;
}

export function useNotifications(filters: NotificationListQuery = {}) {
	const queryClient = useQueryClient();

	const query = useInfiniteQuery({
		queryKey: CLIENT_NOTIFICATION_KEYS.list(filters),
		queryFn: ({ pageParam }: { pageParam?: string }) => fetchPage(filters, pageParam),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (last) => last.nextCursor ?? undefined,
		staleTime: 30 * 1000,
		refetchOnWindowFocus: false
	});

	const notifications = useMemo<NotificationListItem[]>(() => {
		if (!query.data) return [];
		return query.data.pages.flatMap((p) => p?.notifications ?? []).filter((n): n is NotificationListItem => Boolean(n));
	}, [query.data]);

	const unreadCount = query.data?.pages[0]?.unreadCount ?? 0;

	return {
		notifications,
		unreadCount,
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		isError: query.isError,
		error: query.error,
		fetchNextPage: query.fetchNextPage,
		hasNextPage: query.hasNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
		refetch: query.refetch,
		invalidate: () => queryClient.invalidateQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.all })
	};
}
