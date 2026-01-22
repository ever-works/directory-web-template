import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { serverClient, apiUtils } from "@/lib/api/server-api-client";
import type {
	SponsorAdStatus,
	SponsorAdIntervalType,
	SponsorAdStats,
} from "@/lib/types/sponsor-ad";
import type { SponsorAd } from "@/lib/db/schema";

// ######################### Types #########################

interface SponsorAdsResponse {
	success: boolean;
	data: SponsorAd[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
	stats: SponsorAdStats;
}

interface SponsorAdResponse {
	success: boolean;
	data: SponsorAd;
	message?: string;
}

type SponsorAdSortBy = "createdAt" | "updatedAt" | "startDate" | "endDate" | "status";

interface UseAdminSponsorAdsOptions {
	page?: number;
	limit?: number;
	status?: SponsorAdStatus;
	interval?: SponsorAdIntervalType;
	search?: string;
	sortBy?: SponsorAdSortBy;
	sortOrder?: "asc" | "desc";
}

interface UseAdminSponsorAdsReturn {
	// Data
	sponsorAds: SponsorAd[];
	stats: SponsorAdStats | null;

	// Loading states
	isLoading: boolean;
	isSubmitting: boolean;

	// Pagination
	currentPage: number;
	totalPages: number;
	totalItems: number;

	// Sorting
	sortBy: SponsorAdSortBy;
	sortOrder: "asc" | "desc";

	// Actions
	approveSponsorAd: (id: string, forceApprove?: boolean) => Promise<{ success: boolean; requiresForceApprove?: boolean }>;
	rejectSponsorAd: (id: string, reason: string) => Promise<boolean>;
	cancelSponsorAd: (id: string, reason?: string) => Promise<boolean>;
	deleteSponsorAd: (id: string) => Promise<boolean>;

	// Setters
	setSortBy: (sortBy: SponsorAdSortBy) => void;
	setSortOrder: (order: "asc" | "desc") => void;
	setCurrentPage: (page: number) => void;

	// Utility
	refreshData: () => void;
}

// ######################### Query Keys #########################

const sponsorAdsQueryKeys = {
	all: ["sponsor-ads"] as const,
	lists: () => [...sponsorAdsQueryKeys.all, "list"] as const,
	list: (filters: Record<string, unknown>) =>
		[...sponsorAdsQueryKeys.lists(), filters] as const,
	details: () => [...sponsorAdsQueryKeys.all, "detail"] as const,
	detail: (id: string) => [...sponsorAdsQueryKeys.details(), id] as const,
};

// ######################### API Functions #########################

const fetchSponsorAds = async (
	params: UseAdminSponsorAdsOptions
): Promise<SponsorAdsResponse> => {
	const queryParams = apiUtils.createQueryString({
		page: params.page,
		limit: params.limit,
		status: params.status,
		interval: params.interval,
		search: params.search,
		sortBy: params.sortBy,
		sortOrder: params.sortOrder,
	});

	const response = await serverClient.get<SponsorAdsResponse>(
		`/api/admin/sponsor-ads?${queryParams}`
	);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	return response.data;
};

const approveSponsorAdApi = async (
	id: string,
	forceApprove: boolean = false
): Promise<SponsorAdResponse> => {
	const response = await serverClient.post<SponsorAdResponse>(
		`/api/admin/sponsor-ads/${id}/approve`,
		{ forceApprove }
	);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	return response.data;
};

const rejectSponsorAdApi = async (
	id: string,
	rejectionReason: string
): Promise<SponsorAdResponse> => {
	const response = await serverClient.post<SponsorAdResponse>(
		`/api/admin/sponsor-ads/${id}/reject`,
		{ rejectionReason }
	);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	return response.data;
};

const cancelSponsorAdApi = async (
	id: string,
	cancelReason?: string
): Promise<SponsorAdResponse> => {
	const response = await serverClient.post<SponsorAdResponse>(
		`/api/admin/sponsor-ads/${id}/cancel`,
		{ cancelReason }
	);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	return response.data;
};

const deleteSponsorAdApi = async (
	id: string
): Promise<{ success: boolean; message: string }> => {
	const response = await serverClient.delete<{
		success: boolean;
		message: string;
	}>(`/api/admin/sponsor-ads/${id}`);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	return response.data;
};

// ######################### Hook #########################

export function useAdminSponsorAds(
	options: UseAdminSponsorAdsOptions = {}
): UseAdminSponsorAdsReturn {
	const {
		page: initialPage = 1,
		limit = 10,
		status,
		interval,
		search,
		sortBy: initialSortBy = "createdAt",
		sortOrder: initialSortOrder = "desc",
	} = options;

	// State for pagination and sorting only (filters are now passed in)
	const [currentPage, setCurrentPage] = useState(initialPage);
	const [sortBy, setSortBy] = useState<SponsorAdSortBy>(initialSortBy);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialSortOrder);

	// Sync internal page state when external page prop changes
	// This ensures filter changes that reset page externally are reflected
	useEffect(() => {
		setCurrentPage(initialPage);
	}, [initialPage]);

	// Wrapped sort setters that reset pagination
	const handleSetSortBy = useCallback((newSortBy: SponsorAdSortBy) => {
		setSortBy(newSortBy);
		setCurrentPage(1);
	}, []);

	const handleSetSortOrder = useCallback((order: "asc" | "desc") => {
		setSortOrder(order);
		setCurrentPage(1);
	}, []);

	// Query client for cache management
	const queryClient = useQueryClient();

	// Query parameters - memoized to prevent unnecessary re-renders
	const queryParams = useMemo(() => ({
		page: currentPage,
		limit,
		status,
		interval,
		search: search || undefined,
		sortBy,
		sortOrder,
	}), [currentPage, limit, status, interval, search, sortBy, sortOrder]);

	// Fetch sponsor ads
	const {
		data: sponsorAdsData,
		isLoading,
	} = useQuery({
		queryKey: sponsorAdsQueryKeys.list(queryParams),
		queryFn: () => fetchSponsorAds(queryParams),
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 5 * 60 * 1000, // 5 minutes
	});

	// Mutations - use refetchQueries for immediate UI update
	const approveMutation = useMutation({
		mutationFn: ({ id, forceApprove }: { id: string; forceApprove: boolean }) =>
			approveSponsorAdApi(id, forceApprove),
		onSuccess: async () => {
			await queryClient.refetchQueries({ queryKey: sponsorAdsQueryKeys.all });
			toast.success("Sponsor ad approved and activated");
		},
		onError: (error: Error) => {
			// Don't show toast for PAYMENT_NOT_RECEIVED - handled by UI
			if (error.message !== "PAYMENT_NOT_RECEIVED") {
				toast.error(`Failed to approve: ${error.message}`);
			}
		},
	});

	const rejectMutation = useMutation({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			rejectSponsorAdApi(id, reason),
		onSuccess: async () => {
			await queryClient.refetchQueries({ queryKey: sponsorAdsQueryKeys.all });
			toast.success("Sponsor ad rejected");
		},
		onError: (error: Error) => {
			toast.error(`Failed to reject: ${error.message}`);
		},
	});

	const cancelMutation = useMutation({
		mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
			cancelSponsorAdApi(id, reason),
		onSuccess: async () => {
			await queryClient.refetchQueries({ queryKey: sponsorAdsQueryKeys.all });
			toast.success("Sponsor ad cancelled");
		},
		onError: (error: Error) => {
			toast.error(`Failed to cancel: ${error.message}`);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: deleteSponsorAdApi,
		onSuccess: async () => {
			await queryClient.refetchQueries({ queryKey: sponsorAdsQueryKeys.all });
			toast.success("Sponsor ad deleted");
		},
		onError: (error: Error) => {
			toast.error(`Failed to delete: ${error.message}`);
		},
	});

	// Derived data
	const sponsorAds = sponsorAdsData?.data || [];
	const stats = sponsorAdsData?.stats || null;
	const isSubmitting =
		approveMutation.isPending ||
		rejectMutation.isPending ||
		cancelMutation.isPending ||
		deleteMutation.isPending;
	const totalPages = sponsorAdsData?.pagination.totalPages || 1;
	const totalItems = sponsorAdsData?.pagination.total || 0;

	// Refresh data
	const refreshData = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: sponsorAdsQueryKeys.all });
	}, [queryClient]);

	// Action handlers
	const handleApprove = useCallback(
		async (id: string, forceApprove: boolean = false): Promise<{ success: boolean; requiresForceApprove?: boolean }> => {
			try {
				await approveMutation.mutateAsync({ id, forceApprove });
				return { success: true };
			} catch (error) {
				// Check if it's a payment not received error
				if (error instanceof Error && error.message === "PAYMENT_NOT_RECEIVED") {
					return { success: false, requiresForceApprove: true };
				}
				return { success: false };
			}
		},
		[approveMutation]
	);

	const handleReject = useCallback(
		async (id: string, reason: string): Promise<boolean> => {
			try {
				await rejectMutation.mutateAsync({ id, reason });
				return true;
			} catch {
				return false;
			}
		},
		[rejectMutation]
	);

	const handleCancel = useCallback(
		async (id: string, reason?: string): Promise<boolean> => {
			try {
				await cancelMutation.mutateAsync({ id, reason });
				return true;
			} catch {
				return false;
			}
		},
		[cancelMutation]
	);

	const handleDelete = useCallback(
		async (id: string): Promise<boolean> => {
			try {
				await deleteMutation.mutateAsync(id);
				return true;
			} catch {
				return false;
			}
		},
		[deleteMutation]
	);

	return {
		// Data
		sponsorAds,
		stats,

		// Loading states
		isLoading,
		isSubmitting,

		// Pagination
		currentPage,
		totalPages,
		totalItems,

		// Sorting
		sortBy,
		sortOrder,

		// Actions
		approveSponsorAd: handleApprove,
		rejectSponsorAd: handleReject,
		cancelSponsorAd: handleCancel,
		deleteSponsorAd: handleDelete,

		// Setters
		setSortBy: handleSetSortBy,
		setSortOrder: handleSetSortOrder,
		setCurrentPage,

		// Utility
		refreshData,
	};
}
