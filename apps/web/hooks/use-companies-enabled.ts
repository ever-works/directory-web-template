import { useSettings } from '@/components/providers/settings-provider';

/**
 * Client-side hook to check if companies are enabled
 * Reads from SettingsProvider context for instant access (no loading delay)
 * @returns boolean - true if companies are enabled, false otherwise
 */
export function useCompaniesEnabled(): {
	companiesEnabled: boolean;
	loading: boolean;
	error: Error | null;
} {
	const { companiesEnabled } = useSettings();

	// No loading state since value comes from server-rendered context
	return { companiesEnabled, loading: false, error: null };
}
