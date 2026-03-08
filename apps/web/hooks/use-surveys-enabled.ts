import { useSettings } from '@/components/providers/settings-provider';

/**
 * Client-side hook to check if surveys are enabled
 * Reads from SettingsProvider context for instant access (no loading delay)
 * @returns boolean - true if surveys are enabled, false otherwise
 */
export function useSurveysEnabled(): {
	surveysEnabled: boolean;
	loading: boolean;
	error: Error | null;
} {
	const { surveysEnabled } = useSettings();

	// No loading state since value comes from server-rendered context
	return { surveysEnabled, loading: false, error: null };
}
