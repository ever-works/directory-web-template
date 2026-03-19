import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import type { ItemAuditActionValues } from '@/lib/db/schema';

// ===================== Types =====================

export interface ItemAuditLogEntry {
	id: string;
	itemId: string;
	itemName: string;
	action: ItemAuditActionValues;
	previousStatus: string | null;
	newStatus: string | null;
	changes: Record<string, { old: unknown; new: unknown }> | null;
	performedBy: string | null;
	performedByName: string | null;
	notes: string | null;
	metadata: Record<string, unknown> | null;
	createdAt: string;
	performer: {
		id: string;
		email: string | null;
	} | null;
}

export interface ItemHistoryResponse {
	success: boolean;
	data: {
		logs: ItemAuditLogEntry[];
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};
	error?: string;
}

export interface UseItemHistoryParams {
	itemId: string;
	page?: number;
	limit?: number;
	actionFilter?: ItemAuditActionValues[];
	enabled?: boolean;
}

// ===================== Query Keys =====================

export const ITEM_HISTORY_QUERY_KEYS = {
	all: ['admin', 'items', 'history'] as const,
	item: (itemId: string) => [...ITEM_HISTORY_QUERY_KEYS.all, itemId] as const,
	itemWithParams: (itemId: string, params: { page?: number; actionFilter?: ItemAuditActionValues[] }) =>
		[...ITEM_HISTORY_QUERY_KEYS.item(itemId), params] as const,
} as const;

// ===================== API Functions =====================

const fetchItemHistory = async (
	itemId: string,
	params: { page?: number; limit?: number; actionFilter?: ItemAuditActionValues[] }
): Promise<ItemHistoryResponse['data']> => {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set('page', params.page.toString());
	if (params.limit) searchParams.set('limit', params.limit.toString());
	if (params.actionFilter && params.actionFilter.length > 0) {
		searchParams.set('action', params.actionFilter.join(','));
	}

	const url = `/api/admin/items/${encodeURIComponent(itemId)}/history?${searchParams.toString()}`;
	const response = await serverClient.get<ItemHistoryResponse>(url);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	return response.data.data;
};

// ===================== Hook =====================

/**
 * Hook to fetch item audit history
 * @param params - Query parameters
 * @returns Query result with history data
 */
export function useItemHistory(params: UseItemHistoryParams) {
	const { itemId, page = 1, limit = 20, actionFilter, enabled = true } = params;

	return useQuery({
		queryKey: ITEM_HISTORY_QUERY_KEYS.itemWithParams(itemId, { page, actionFilter }),
		queryFn: () => fetchItemHistory(itemId, { page, limit, actionFilter }),
		enabled: enabled && !!itemId,
		staleTime: 30 * 1000, // 30 seconds
		placeholderData: keepPreviousData,
	});
}

export default useItemHistory;
