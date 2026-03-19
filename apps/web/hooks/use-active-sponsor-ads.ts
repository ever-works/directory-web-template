import { useQuery } from "@tanstack/react-query";
import type { SponsorWithItem } from "@/lib/types/sponsor-ad";

// ######################### Types #########################

interface ActiveSponsorAdsResponse {
	success: boolean;
	data: SponsorWithItem[];
}

interface UseActiveSponsorAdsOptions {
	limit?: number;
	enabled?: boolean;
}

interface UseActiveSponsorAdsReturn {
	sponsors: SponsorWithItem[];
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	refetch: () => void;
}

// ######################### Query Keys #########################

export const activeSponsorAdsQueryKeys = {
	all: ["active-sponsor-ads"] as const,
	list: (limit: number) => [...activeSponsorAdsQueryKeys.all, "list", limit] as const,
};

// ######################### API Functions #########################

async function fetchActiveSponsorAds(limit: number): Promise<SponsorWithItem[]> {
	const params = new URLSearchParams();
	if (limit) params.set("limit", limit.toString());

	const response = await fetch(`/api/sponsor-ads?${params.toString()}`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch active sponsor ads");
	}

	const result: ActiveSponsorAdsResponse = await response.json();

	if (!result.success) {
		throw new Error("Failed to fetch active sponsor ads");
	}

	return result.data;
}

// ######################### Hook #########################

/**
 * Hook for fetching active sponsor ads for public display
 * Used on homepage layouts and item detail sidebar
 */
export function useActiveSponsorAds(
	options: UseActiveSponsorAdsOptions = {}
): UseActiveSponsorAdsReturn {
	const { limit = 10, enabled = true } = options;

	const {
		data: sponsors = [],
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery({
		queryKey: activeSponsorAdsQueryKeys.list(limit),
		queryFn: () => fetchActiveSponsorAds(limit),
		enabled,
		staleTime: 1000 * 60 * 5, // 5 minutes - sponsors don't change often
		gcTime: 1000 * 60 * 10, // 10 minutes cache
		refetchOnWindowFocus: false,
	});

	return {
		sponsors,
		isLoading,
		isError,
		error: error as Error | null,
		refetch,
	};
}
