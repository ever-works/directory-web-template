import { useSettings } from '@/components/providers/settings-provider';

/**
 * Client-side hook to check if categories are enabled
 * Reads from SettingsProvider context for instant access (no loading delay)
 * @returns boolean - true if categories are enabled, false otherwise
 */
export function useCategoriesEnabled(): {
	categoriesEnabled: boolean;
	loading: boolean;
	error: Error | null;
} {
	const { categoriesEnabled } = useSettings();

	// No loading state since value comes from server-rendered context
	return { categoriesEnabled, loading: false, error: null };
}
