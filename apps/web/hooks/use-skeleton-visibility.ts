import { useNavigation } from '@/components/providers';

/**
 * Hook to determine if skeleton should be shown
 * Skeletons only show on initial page load, not during client-side navigation
 *
 * @param isLoading - Current loading state from data fetching
 * @param hasData - Whether data exists (e.g., items.length > 0)
 * @returns boolean indicating if skeleton should be shown
 */
export function useSkeletonVisibility(isLoading: boolean, hasData: boolean = false): boolean {
	const { isInitialLoad } = useNavigation();

	// Show skeleton only when:
	// 1. This is the initial page load (not client navigation)
	// 2. Data is loading
	// 3. No data exists yet
	return isInitialLoad && isLoading && !hasData;
}
