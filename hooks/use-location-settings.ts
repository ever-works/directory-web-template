import { useSettings } from '@/components/providers/settings-provider';
import type { LocationConfigSettings } from '@/lib/content';

/**
 * Client-side hook to access location settings
 * Reads from SettingsProvider context for instant access (no loading delay)
 * @returns LocationConfigSettings with loading and error states
 */
export function useLocationSettings(): {
	settings: LocationConfigSettings;
	loading: boolean;
	error: Error | null;
} {
	const { locationSettings } = useSettings();

	// No loading state since value comes from server-rendered context
	return {
		settings: locationSettings,
		loading: false,
		error: null,
	};
}
