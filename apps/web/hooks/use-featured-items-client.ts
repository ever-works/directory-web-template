import { useQuery } from '@tanstack/react-query';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

export interface FeaturedItem {
	id: string;
	itemSlug: string;
	itemName: string;
	itemIconUrl?: string;
	itemCategory?: string;
	itemDescription?: string;
	featuredOrder: number;
	featuredUntil?: string;
	isActive: boolean;
	featuredBy: string;
	featuredAt: string;
	createdAt: string;
	updatedAt: string;
}

interface FeaturedItemsResponse {
	success: boolean;
	data: FeaturedItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}

interface UseFeaturedItemsOptions {
	enabled?: boolean;
}

// Query keys for React Query
const featuredItemsQueryKeys = {
	all: ['featured-items-client'] as const,
	lists: () => [...featuredItemsQueryKeys.all, 'list'] as const,
	list: (filters: Record<string, any>) => [...featuredItemsQueryKeys.lists(), filters] as const
};

const fetchFeaturedItems = async (): Promise<FeaturedItem[]> => {
	const response = await serverClient.get<FeaturedItemsResponse>('/api/featured-items');

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	return response.data.data;
};

export function useFeaturedItems(options: UseFeaturedItemsOptions = {}) {
	const { enabled = true } = options;
	const { features } = useFeatureFlagsWithSimulation();

	const {
		data: featuredItems = [],
		isLoading,
		error,
		refetch
	} = useQuery({
		queryKey: featuredItemsQueryKeys.list({ enabled }),
		enabled: features.featuredItems && enabled,
		queryFn: fetchFeaturedItems,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		retry: (failureCount, error) => {
			if (error instanceof Error && error.message?.includes('Database not configured')) {
				return false;
			}
			return failureCount < 2;
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
	});

	return {
		featuredItems,
		isLoading,
		error,
		refetch
	};
}
