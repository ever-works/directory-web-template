import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import type {
	ReportStatusValues,
	ReportContentTypeValues,
	ReportReasonValues,
	ReportResolutionValues
} from '@/lib/db/schema';

// Types
export interface AdminReportReporter {
	id: string;
	name: string;
	email: string;
	avatar: string | null;
}

export interface AdminReportReviewer {
	id: string;
	email: string | null;
}

export interface AdminReportItem {
	id: string;
	contentType: ReportContentTypeValues;
	contentId: string;
	reason: ReportReasonValues;
	details: string | null;
	status: ReportStatusValues;
	resolution: ReportResolutionValues | null;
	reportedBy: string;
	reviewedBy: string | null;
	reviewNote: string | null;
	createdAt: string;
	updatedAt: string;
	reviewedAt: string | null;
	resolvedAt: string | null;
	reporter: AdminReportReporter | null;
	reviewer: AdminReportReviewer | null;
}

export interface ReportsListResponse {
	reports: AdminReportItem[];
	pagination: {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};
}

export interface ReportStats {
	total: number;
	byStatus: Record<string, number>;
	byContentType: Record<string, number>;
	byReason: Record<string, number>;
	pendingCount: number;
	resolvedCount: number;
}

export interface ReportsListParams {
	page?: number;
	limit?: number;
	search?: string;
	status?: ReportStatusValues;
	contentType?: ReportContentTypeValues;
	reason?: ReportReasonValues;
}

export interface UpdateReportParams {
	status?: ReportStatusValues;
	resolution?: ReportResolutionValues;
	reviewNote?: string;
}

// Query keys for React Query
const reportsQueryKeys = {
	all: ['admin-reports'] as const,
	lists: () => [...reportsQueryKeys.all, 'list'] as const,
	list: (params: ReportsListParams) => [...reportsQueryKeys.lists(), params] as const,
	details: () => [...reportsQueryKeys.all, 'detail'] as const,
	detail: (id: string) => [...reportsQueryKeys.details(), id] as const,
	stats: () => [...reportsQueryKeys.all, 'stats'] as const
};

// API functions
const fetchReports = async (params: ReportsListParams): Promise<ReportsListResponse> => {
	const queryParams: Record<string, string> = {
		page: params.page?.toString() || '1',
		limit: params.limit?.toString() || '10'
	};

	if (params.search) queryParams.search = params.search;
	if (params.status) queryParams.status = params.status;
	if (params.contentType) queryParams.contentType = params.contentType;
	if (params.reason) queryParams.reason = params.reason;

	const queryString = apiUtils.createQueryString(queryParams);
	const response = await serverClient.get<{ success: boolean; data: ReportsListResponse }>(
		`/api/admin/reports?${queryString}`
	);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	return response.data.data;
};

const fetchReportById = async (id: string): Promise<AdminReportItem> => {
	const response = await serverClient.get<{ success: boolean; data: AdminReportItem }>(`/api/admin/reports/${id}`);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	return response.data.data;
};

const fetchReportStats = async (): Promise<ReportStats> => {
	const response = await serverClient.get<{ success: boolean; data: ReportStats }>('/api/admin/reports/stats');

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	return response.data.data;
};

const updateReport = async (id: string, data: UpdateReportParams): Promise<AdminReportItem> => {
	const response = await serverClient.put<{ success: boolean; data: AdminReportItem }>(`/api/admin/reports/${id}`, data);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	return response.data.data;
};

interface UseAdminReportsOptions {
	page?: number;
	limit?: number;
	search?: string;
	status?: ReportStatusValues;
	contentType?: ReportContentTypeValues;
	reason?: ReportReasonValues;
}

interface UseAdminReportsReturn {
	// Data
	reports: AdminReportItem[];
	stats: ReportStats | null;

	// Loading states
	isLoading: boolean;
	isLoadingStats: boolean;
	isFiltering: boolean;
	isUpdating: string | null;

	// Pagination
	totalPages: number;
	totalReports: number;

	// Actions
	updateReport: (id: string, data: UpdateReportParams) => Promise<boolean>;
	getReportById: (id: string) => Promise<AdminReportItem | null>;

	// Utility
	refetch: () => void;
	refreshData: () => void;
}

export function useAdminReports(options: UseAdminReportsOptions = {}): UseAdminReportsReturn {
	const { page = 1, limit = 10, search, status, contentType, reason } = options;

	// Mutation tracking state
	const [isUpdating, setIsUpdating] = useState<string | null>(null);

	// Query client for cache management
	const queryClient = useQueryClient();

	// Memoize query params to ensure stable references
	const queryParams = useMemo(
		() => ({
			page,
			limit,
			search: search || undefined,
			status,
			contentType,
			reason
		}),
		[page, limit, search, status, contentType, reason]
	);

	// React Query hooks for reports list
	const {
		data: reportsData,
		isLoading,
		refetch
	} = useQuery({
		queryKey: reportsQueryKeys.list(queryParams),
		queryFn: () => fetchReports(queryParams),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		refetchInterval: 5 * 60 * 1000, // 5 minutes
		retry: 3
	});

	// React Query hooks for stats
	const { data: statsData, isLoading: isLoadingStats } = useQuery({
		queryKey: reportsQueryKeys.stats(),
		queryFn: fetchReportStats,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000,
		retry: 3
	});

	// Update mutation
	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateReportParams }) => updateReport(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: reportsQueryKeys.all });
			toast.success('Report updated successfully');
		},
		onError: (error: Error) => {
			toast.error(`Failed to update report: ${error.message}`);
		}
	});

	// Derived data
	const reports = reportsData?.reports || [];
	const isFiltering = isLoading && page === 1;
	const totalPages = reportsData?.pagination?.totalPages || 1;
	const totalReports = reportsData?.pagination?.total || 0;
	const stats = statsData || null;

	// Wrapper function for update
	const handleUpdateReport = useCallback(
		async (id: string, data: UpdateReportParams): Promise<boolean> => {
			if (!id) return false;

			try {
				setIsUpdating(id);
				await updateMutation.mutateAsync({ id, data });
				return true;
			} catch (error) {
				console.error('Failed to update report:', error);
				return false;
			} finally {
				setIsUpdating(null);
			}
		},
		[updateMutation]
	);

	// Get single report by ID
	const handleGetReportById = useCallback(async (id: string): Promise<AdminReportItem | null> => {
		try {
			return await fetchReportById(id);
		} catch (error) {
			console.error('Failed to get report:', error);
			return null;
		}
	}, []);

	// Refresh all data
	const refreshData = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: reportsQueryKeys.all });
	}, [queryClient]);

	return {
		// Data
		reports,
		stats,

		// Loading states
		isLoading,
		isLoadingStats,
		isFiltering,
		isUpdating,

		// Pagination
		totalPages,
		totalReports,

		// Actions
		updateReport: handleUpdateReport,
		getReportById: handleGetReportById,

		// Utility
		refetch,
		refreshData
	};
}
