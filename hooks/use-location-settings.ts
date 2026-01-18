import { useSettings } from '@/components/providers/settings-provider';
import type { LocationSettings } from '@/lib/types/location';

/**
 * Client-side hook to access location settings (camelCase runtime type)
 * Reads from SettingsProvider context for instant access (no loading delay)
 * @returns LocationSettings with loading and error states
 */
export function useLocationSettings(): {
	settings: LocationSettings;
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
