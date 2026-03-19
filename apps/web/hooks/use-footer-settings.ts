import { useSettings } from '@/components/providers/settings-provider';
import type { FooterSettings } from '@/lib/content';

/**
 * Client-side hook to check footer settings
 * Reads from SettingsProvider context for instant access (no loading delay)
 * @returns FooterSettings with loading and error states
 */
export function useFooterSettings(): {
	settings: FooterSettings;
	loading: boolean;
	error: Error | null;
} {
	const { footerSettings } = useSettings();

	// No loading state since value comes from server-rendered context
	return {
		settings: footerSettings,
		loading: false,
		error: null,
	};
}
