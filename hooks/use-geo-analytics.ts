import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Custom HTTP error class for better error handling (matches use-admin-stats.ts pattern)
class HttpError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.name = 'HttpError';
		this.status = status;
	}
}

// ===================== Types =====================

export interface IndexHealth {
	synced: boolean;
	indexCount: number;
	expectedCount: number;
}

export interface GeoAnalyticsStats {
	totalIndexed: number;
	totalItems: number;
	itemsWithLocation: number;
	itemsRemote: number;
	coveragePercent: number;
	indexHealth: IndexHealth;
	citiesCount: number;
	countriesCount: number;
	remoteCount: number;
	lastIndexedAt: string | null;
	lastRebuildAt: string | null;
}

export interface CountryDistribution {
	name: string;
	count: number;
}

export interface CityDistribution {
	name: string;
	count: number;
}

export interface ServiceAreaDistribution {
	area: string;
	count: number;
}

export interface GeoLocation {
	itemSlug: string;
	latitude: number;
	longitude: number;
	city: string | null;
	country: string | null;
	isRemote: boolean;
}

export interface HeatmapPoint {
	lat: number;
	lng: number;
}

export interface GeoAnalyticsData {
	stats: GeoAnalyticsStats;
	distributions: {
		byCountry: CountryDistribution[];
		byCity: CityDistribution[];
		byServiceArea: ServiceAreaDistribution[];
	};
	locations: GeoLocation[];
	heatmapData: HeatmapPoint[];
}

interface GeoAnalyticsApiResponse {
	success: boolean;
	data: GeoAnalyticsData;
	error?: string;
}

export interface RebuildIndexResult {
	totalProcessed: number;
	indexed: number;
	skipped: number;
	failed: number;
	errors: Array<{ slug: string; error: string }>;
	durationMs: number;
}

export interface ClearIndexResult {
	cleared: number;
}

interface IndexActionApiResponse {
	success: boolean;
	data: RebuildIndexResult | ClearIndexResult;
	error?: string;
}

// ===================== Hooks =====================

/**
 * Fetch geographic analytics data for the admin dashboard.
 * Mirrors the useAdminStats() pattern with 5-minute staleTime and retry logic.
 */
export function useGeoAnalytics() {
	return useQuery<GeoAnalyticsData>({
		queryKey: ['admin-geo-analytics'],
		queryFn: async ({ signal }) => {
			const response = await fetch('/api/admin/geo-analytics', {
				signal,
				credentials: 'include',
				headers: { Accept: 'application/json' },
			});

			if (!response.ok) {
				let message = `Request failed: ${response.status}`;
				try {
					const errBody = await response.json();
					if (errBody?.error) message = String(errBody.error);
				} catch {
					// ignore parse errors
				}
				throw new HttpError(message, response.status);
			}

			const result: GeoAnalyticsApiResponse = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Failed to fetch geo analytics');
			}

			return result.data;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: (failureCount, error) => {
			if (error instanceof HttpError && error.status < 500) return false;
			return failureCount < 3;
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
	});
}

/**
 * Mutation hook for location index actions (rebuild/clear).
 * Invalidates geo-analytics query on success.
 */
export function useLocationIndexAction() {
	const queryClient = useQueryClient();

	return useMutation<RebuildIndexResult | ClearIndexResult, Error, 'rebuild' | 'clear'>({
		mutationFn: async (action) => {
			const response = await fetch('/api/admin/location-index', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				body: JSON.stringify({ action }),
			});

			if (!response.ok) {
				let message = `Request failed: ${response.status}`;
				try {
					const errBody = await response.json();
					if (errBody?.error) message = String(errBody.error);
				} catch {
					// ignore parse errors
				}
				throw new HttpError(message, response.status);
			}

			const result: IndexActionApiResponse = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Action failed');
			}

			return result.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['admin-geo-analytics'] });
		},
	});
}
