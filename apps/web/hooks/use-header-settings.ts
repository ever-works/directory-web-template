import { useSettings } from '@/components/providers/settings-provider';
import type { HeaderSettings } from '@/lib/content';

/**
 * Client-side hook to check header settings
 * Reads from SettingsProvider context for instant access (no loading delay)
 * @returns HeaderSettings with loading and error states
 */
export function useHeaderSettings(): {
	settings: HeaderSettings;
	loading: boolean;
	error: Error | null;
} {
	const { headerSettings } = useSettings();

	// No loading state since value comes from server-rendered context
	return {
		settings: headerSettings,
		loading: false,
		error: null,
	};
}
