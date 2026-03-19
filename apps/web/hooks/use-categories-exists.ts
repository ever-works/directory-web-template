import { useSettings } from '@/components/providers/settings-provider';

interface CategoriesExistsResult {
	exists: boolean;
}

/**
 * Client-side hook to check if categories exist
 * Reads from SettingsProvider context for instant access (no loading delay)
 * @returns Object with exists flag - true if categories exist in database
 */
export function useCategoriesExists(): {
	data: CategoriesExistsResult | undefined;
	isLoading: boolean;
	error: Error | null;
} {
	const { hasCategories } = useSettings();

	// No loading state since value comes from server-rendered context
	return {
		data: { exists: hasCategories },
		isLoading: false,
		error: null
	};
}
