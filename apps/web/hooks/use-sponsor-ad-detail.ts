import { useQuery } from '@tanstack/react-query';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import type { SponsorAd } from '@/lib/db/schema';

// ######################### Types #########################

interface SponsorAdDetailResponse {
	success: boolean;
	data: SponsorAd;
}

// ######################### Query Keys #########################

export const sponsorAdDetailQueryKeys = {
	all: ['sponsor-ad-detail'] as const,
	detail: (id: string) => [...sponsorAdDetailQueryKeys.all, id] as const,
};

// ######################### API Function #########################

const fetchSponsorAdById = async (id: string): Promise<SponsorAd> => {
	const response = await serverClient.get<SponsorAdDetailResponse>(
		`/api/sponsor-ads/user/${id}`
	);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	return response.data.data;
};

// ######################### Hook #########################

export function useSponsorAdDetail(id: string | null) {
	return useQuery({
		queryKey: sponsorAdDetailQueryKeys.detail(id || ''),
		queryFn: () => fetchSponsorAdById(id!),
		enabled: !!id,
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 5 * 60 * 1000, // 5 minutes
	});
}
