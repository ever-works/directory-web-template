'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import type { NotificationListQuery, NotificationListResponse, NotificationStatsResponse } from '@/lib/notifications/types';

export const CLIENT_NOTIFICATION_KEYS = {
	all: ['client', 'notifications'] as const,
	list: (filters: NotificationListQuery) =>
		[...CLIENT_NOTIFICATION_KEYS.all, 'list', stableHash(filters)] as const,
	stats: () => [...CLIENT_NOTIFICATION_KEYS.all, 'stats'] as const,
	preferences: () => [...CLIENT_NOTIFICATION_KEYS.all, 'preferences'] as const
};

function stableHash(input: object): string {
	const entries = Object.entries(input).sort(([a], [b]) => a.localeCompare(b));
	const sorted: Record<string, unknown> = {};
	for (const [k, v] of entries) {
		if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
		sorted[k] = v;
	}
	return JSON.stringify(sorted);
}

/** Recovers the `NotificationListQuery` filters encoded in a list query key by `CLIENT_NOTIFICATION_KEYS.list`. */
export function getListQueryFilters(queryKey: readonly unknown[]): NotificationListQuery {
	const raw = queryKey[3];
	if (typeof raw !== 'string') return {};
	try {
		return JSON.parse(raw) as NotificationListQuery;
	} catch {
		return {};
	}
}

/** Tab a cached list query targets — defaults to `'all'` when the filter was omitted. */
export function getQueryTab(queryKey: readonly unknown[]): NotificationListQuery['tab'] {
	return getListQueryFilters(queryKey).tab ?? 'all';
}

/** True when a cached list query has no extra filters beyond tab/page/limit (e.g. the dropdown's plain views). */
export function isPlainListQuery(queryKey: readonly unknown[]): boolean {
	const filters = getListQueryFilters(queryKey);
	return !filters.q && !filters.type && !filters.priority && !filters.dateFrom && !filters.dateTo;
}

/**
 * Optimistically adjusts the cached unread stats (bell badge, tab dot
 * indicators) by `delta` so they update instantly instead of waiting on a
 * refetch. Pass `system: true` when the affected notification also counts
 * toward the System tab's unread total.
 */
export function adjustStatsCache(
	qc: ReturnType<typeof useQueryClient>,
	delta: number,
	options: { system?: boolean } = {}
) {
	qc.setQueryData<NotificationStatsResponse>(CLIENT_NOTIFICATION_KEYS.stats(), (current) => {
		if (!current) return current;
		const unread = Math.max(0, current.unread + delta);
		return {
			...current,
			unread,
			byTab: {
				...current.byTab,
				all: unread,
				unread,
				system: options.system ? Math.max(0, current.byTab.system + delta) : current.byTab.system
			}
		};
	});
}

/** Zeroes out the cached unread stats — used by "mark all read". */
export function resetStatsCache(qc: ReturnType<typeof useQueryClient>) {
	qc.setQueryData<NotificationStatsResponse>(CLIENT_NOTIFICATION_KEYS.stats(), (current) => {
		if (!current) return current;
		return { ...current, unread: 0, byTab: { ...current.byTab, all: 0, unread: 0, system: 0 } };
	});
}

function toQueryString(filters: NotificationListQuery): string {
	const params = new URLSearchParams();
	if (filters.tab) params.set('tab', filters.tab);
	if (filters.q) params.set('q', filters.q);
	if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
	if (filters.dateTo) params.set('dateTo', filters.dateTo);
	if (filters.limit) params.set('limit', String(filters.limit));
	if (filters.page && filters.page > 1) params.set('page', String(filters.page));
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

async function fetchPage(filters: NotificationListQuery): Promise<NotificationListResponse> {
	const response = await serverClient.get<{ success: boolean; data: NotificationListResponse; error?: string }>(
		`/api/client/notifications${toQueryString(filters)}`
	);
	if (!apiUtils.isSuccess(response) || !response.data?.data) {
		throw new Error(response.data?.error || apiUtils.getErrorMessage(response) || 'Failed to fetch notifications');
	}
	return response.data.data;
}

export function useNotifications(filters: NotificationListQuery = {}) {
	const queryClient = useQueryClient();

	const query = useQuery({
		queryKey: CLIENT_NOTIFICATION_KEYS.list(filters),
		queryFn: () => fetchPage(filters),
		staleTime: 30 * 1000,
		refetchOnWindowFocus: false,
		placeholderData: (prev) => prev
	});

	const notifications = query.data?.notifications ?? [];
	const total = query.data?.total ?? 0;
	const totalPages = query.data?.totalPages ?? 1;
	const page = query.data?.page ?? filters.page ?? 1;
	const unreadCount = query.data?.unreadCount ?? 0;

	return {
		notifications,
		total,
		totalPages,
		page,
		unreadCount,
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		isError: query.isError,
		error: query.error,
		refetch: query.refetch,
		invalidate: () => queryClient.invalidateQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.all })
	};
}
